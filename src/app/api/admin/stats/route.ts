import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';

export async function GET() {
  try {
    const auth = await requireAuth('admin');
    if (auth instanceof NextResponse) return auth;

    const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

  const [
    totalStudents,
    activeStudents,
    frozenStudents,
    archivedStudents,
    totalTeachers,
    activeTeachers,
    totalGroups,
    activeGroups,
    archivedGroups,
    totalLessons,
    totalAttendance,
    presentAttendance,
    totalLeads,
    enrolledLeads,
    allPayments,
    todayPayments,
    paidStudentIds,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'student' } }),
    prisma.user.count({ where: { role: 'student', status: 'active' } }),
    prisma.user.count({ where: { role: 'student', status: 'frozen' } }),
    prisma.user.count({ where: { role: 'student', status: 'archived' } }),
    prisma.user.count({ where: { role: 'teacher' } }),
    prisma.user.count({ where: { role: 'teacher', status: 'active' } }),
    prisma.group.count(),
    prisma.group.count({ where: { status: 'active' } }),
    prisma.group.count({ where: { status: 'archived' } }),
    prisma.lesson.count(),
    prisma.attendance.count(),
    prisma.attendance.count({ where: { present: true } }),
    prisma.lead.count(),
    prisma.lead.count({ where: { status: 'enrolled' } }),
    // All payments for current month
    prisma.payment.findMany({
      where: { month: currentMonth },
      select: { amount: true },
    }),
    // Today's payments
    prisma.payment.findMany({
      where: {
        createdAt: { gte: todayStart, lte: todayEnd },
      },
      select: { amount: true },
    }),
    // Students who paid this month
    prisma.payment.findMany({
      where: { month: currentMonth },
      select: { studentId: true },
      distinct: ['studentId'],
    }),
  ]);

  const umumiyTushum = allPayments.reduce((s, p) => s + p.amount, 0);
  const bugungiTushum = todayPayments.reduce((s, p) => s + p.amount, 0);

  // Qarzdorlar = active students who haven't paid this month
  const paidIds = new Set(paidStudentIds.map(p => p.studentId));
  const qarzdorlar = activeStudents - paidIds.size;

  // Konversiya = enrolled leads / total leads * 100
  const konversiya = totalLeads > 0 ? Math.round((enrolledLeads / totalLeads) * 100) : 0;

  return NextResponse.json({
    totalStudents,
    activeStudents,
    frozenStudents,
    archivedStudents,
    totalTeachers,
    activeTeachers,
    totalGroups,
    activeGroups,
    archivedGroups,
    totalLessons,
    totalAttendance,
    presentAttendance,
    // New fields
    konversiya,
    totalLeads,
    enrolledLeads,
    qarzdorlar,
    qarzdorlarPercent: activeStudents > 0 ? Math.round((qarzdorlar / activeStudents) * 100) : 0,
    umumiyTushum,
    bugungiTushum,
    umumiyQarzdorlik: 0, // placeholder — real debt needs subscription pricing
  });
  } catch (error) {
    console.error("[GET /api/admin/stats]", error);
    return NextResponse.json({ error: "Server xatosi" }, { status: 500 });
  }
}
