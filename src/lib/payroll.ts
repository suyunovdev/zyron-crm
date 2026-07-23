import { prisma } from '@/lib/db';
import { perLessonRate, computeBillable } from '@/lib/billing';
import { getTodayUz } from '@/lib/api-utils';

/** Ustoz oyligi = guruh tushumi × ulush%. Sof funksiya (test qilinadi). */
export function teacherSalary(revenue: number, sharePercent: number): number {
  return Math.round(revenue * (sharePercent / 100));
}

export interface TeacherPayroll {
  teacherId: string;
  name: string;
  subject: string | null;
  level: string | null;
  salaryShare: number;      // %
  revenue: number;          // guruhlar tushumi (qatnashuvga asoslangan)
  salary: number;           // to'lanadigan oylik
  groups: { id: string; name: string; revenue: number }[];
}

/**
 * Barcha ustozlar oyligini hisoblaydi.
 * Guruh tushumi = qatnashgan darslar × (narx ÷ oyiga darslar), student/balance bilan bir xil model.
 * @param defaultShare ustozda salaryShare bo'lmasa ishlatiladigan standart ulush (%)
 * @param month        "2026-07" formatda — faqat o'sha oy darslari hisoblanadi (bo'sh bo'lsa butun davr)
 */
export async function computePayroll(defaultShare = 0, month?: string): Promise<TeacherPayroll[]> {
  const teachers = await prisma.user.findMany({
    where: { role: 'teacher' },
    select: {
      id: true, name: true, subject: true, level: true, salaryShare: true,
      teacherGroups: {
        where: { status: 'active' },
        select: { id: true, name: true, price: true, lessonsPerMonth: true },
      },
    },
  });

  // Butun tarix davomatlari (grace streak butun tarixni talab qiladi), xronologik.
  // Billable darslar keyin o'z oyiga yoziladi.
  const rows = await prisma.attendance.findMany({
    select: { studentId: true, present: true, lesson: { select: { groupId: true, scheduledDate: true, order: true } } },
    orderBy: [{ lesson: { scheduledDate: 'asc' } }, { lesson: { order: 'asc' } }],
  });
  const recByKey = new Map<string, { groupId: string; recs: { scheduledDate: string; present: boolean }[] }>();
  for (const r of rows) {
    const key = `${r.studentId}:${r.lesson.groupId}`;
    let e = recByKey.get(key);
    if (!e) { e = { groupId: r.lesson.groupId, recs: [] }; recByKey.set(key, e); }
    e.recs.push({ scheduledDate: r.lesson.scheduledDate, present: r.present });
  }
  // Guruh bo'yicha, tanlangan oyga tushadigan billable darslar soni
  const monthBillableByGroup = new Map<string, number>();
  for (const { groupId, recs } of recByKey.values()) {
    const { billableDates } = computeBillable(recs);
    const inMonth = month ? billableDates.filter(d => d.startsWith(month)).length : billableDates.length;
    if (inMonth) monthBillableByGroup.set(groupId, (monthBillableByGroup.get(groupId) || 0) + inMonth);
  }

  const result: TeacherPayroll[] = [];
  for (const t of teachers) {
    const share = t.salaryShare ?? defaultShare;
    let revenue = 0;
    const groups = t.teacherGroups.map(g => {
      const attended = monthBillableByGroup.get(g.id) || 0;
      const gRev = Math.round(attended * perLessonRate(g.price, g.lessonsPerMonth));
      revenue += gRev;
      return { id: g.id, name: g.name, revenue: gRev };
    });
    result.push({
      teacherId: t.id, name: t.name, subject: t.subject, level: t.level,
      salaryShare: share, revenue, salary: teacherSalary(revenue, share), groups,
    });
  }
  return result.sort((a, b) => b.salary - a.salary);
}

export interface TeacherSalaryDaily {
  date: string;
  billableCount: number; // o'sha kuni hisoblangan davomatlar (o'tilgan dars × qatnashuv)
  revenue: number;
  earning: number;       // ustoz kunlik ulushi
}

export interface TeacherSalaryDetail {
  teacherId: string;
  name: string;
  subject: string | null;
  level: string | null;
  salaryShare: number;
  month: string;
  revenue: number;       // oy tushumi
  salary: number;        // oylik (revenue × ulush%)
  todayDate: string;
  todayEarning: number;  // bugungi maosh
  daily: TeacherSalaryDaily[];
  groups: { id: string; name: string; revenue: number; salary: number }[];
}

/**
 * Bitta ustozning o'z maoshini kunlik taqsimot bilan hisoblaydi (ustoz profili uchun).
 * Har kun = o'sha kuni o'tilgan darslardagi hisoblanadigan (billable) davomatlar × dars narxi × ulush%.
 * Grace qoidasi (billing.computeBillable) bilan bir xil — butun tarix streak'i asosida.
 */
export async function computeTeacherSalary(
  teacherId: string,
  month: string,
  defaultShare = 0,
): Promise<TeacherSalaryDetail | null> {
  const teacher = await prisma.user.findUnique({
    where: { id: teacherId },
    select: {
      id: true, name: true, subject: true, level: true, salaryShare: true, role: true,
      teacherGroups: {
        where: { status: 'active' },
        select: { id: true, name: true, price: true, lessonsPerMonth: true },
      },
    },
  });
  if (!teacher || teacher.role !== 'teacher') return null;

  const share = teacher.salaryShare ?? defaultShare;
  const rateByGroup = new Map(teacher.teacherGroups.map(g => [g.id, perLessonRate(g.price, g.lessonsPerMonth)]));

  // Ustoz guruhlaridagi barcha davomat (butun tarix — streak uchun), xronologik
  const rows = await prisma.attendance.findMany({
    where: { lesson: { group: { teacherId } } },
    select: { studentId: true, present: true, lesson: { select: { groupId: true, scheduledDate: true, order: true } } },
    orderBy: [{ lesson: { scheduledDate: 'asc' } }, { lesson: { order: 'asc' } }],
  });
  const recByKey = new Map<string, { groupId: string; recs: { scheduledDate: string; present: boolean }[] }>();
  for (const r of rows) {
    const key = `${r.studentId}:${r.lesson.groupId}`;
    let e = recByKey.get(key);
    if (!e) { e = { groupId: r.lesson.groupId, recs: [] }; recByKey.set(key, e); }
    e.recs.push({ scheduledDate: r.lesson.scheduledDate, present: r.present });
  }

  const dayRevenue = new Map<string, number>();
  const dayCount = new Map<string, number>();
  const groupRevenue = new Map<string, number>();
  for (const { groupId, recs } of recByKey.values()) {
    const rate = rateByGroup.get(groupId) || 0;
    const { billableDates } = computeBillable(recs);
    for (const d of billableDates) {
      if (!d.startsWith(month)) continue; // faqat tanlangan oy kunlari
      dayRevenue.set(d, (dayRevenue.get(d) || 0) + rate);
      dayCount.set(d, (dayCount.get(d) || 0) + 1);
      groupRevenue.set(groupId, (groupRevenue.get(groupId) || 0) + rate);
    }
  }

  const daily: TeacherSalaryDaily[] = [...dayRevenue.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, rev]) => ({
      date, billableCount: dayCount.get(date) || 0,
      revenue: Math.round(rev), earning: Math.round(rev * share / 100),
    }));

  const revenue = Math.round([...dayRevenue.values()].reduce((s, v) => s + v, 0));
  const salary = teacherSalary(revenue, share);
  const todayDate = getTodayUz();
  const todayEarning = Math.round((dayRevenue.get(todayDate) || 0) * share / 100);

  const groups = teacher.teacherGroups.map(g => {
    const gRev = Math.round(groupRevenue.get(g.id) || 0);
    return { id: g.id, name: g.name, revenue: gRev, salary: teacherSalary(gRev, share) };
  });

  return {
    teacherId: teacher.id, name: teacher.name, subject: teacher.subject, level: teacher.level,
    salaryShare: share, month, revenue, salary, todayDate, todayEarning, daily, groups,
  };
}
