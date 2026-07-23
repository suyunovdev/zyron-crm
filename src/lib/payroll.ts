import { prisma } from '@/lib/db';
import { perLessonRate, computeBillable } from '@/lib/billing';

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
