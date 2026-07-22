import { prisma } from '@/lib/db';
import { perLessonRate } from '@/lib/billing';

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
 */
export async function computePayroll(defaultShare = 0): Promise<TeacherPayroll[]> {
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

  // Har bir guruh uchun qatnashgan darslar soni (present)
  const presentRows = await prisma.attendance.findMany({
    where: { present: true },
    select: { lesson: { select: { groupId: true } } },
  });
  const attendedByGroup = new Map<string, number>();
  for (const r of presentRows) {
    attendedByGroup.set(r.lesson.groupId, (attendedByGroup.get(r.lesson.groupId) || 0) + 1);
  }

  const result: TeacherPayroll[] = [];
  for (const t of teachers) {
    const share = t.salaryShare ?? defaultShare;
    let revenue = 0;
    const groups = t.teacherGroups.map(g => {
      const attended = attendedByGroup.get(g.id) || 0;
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
