import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { computeStudentBalance } from '@/lib/billing';

// Parent's children — with groups, attendance, payments, balance, rankings
export async function GET() {
  const auth = await requireAuth('parent');
  if (auth instanceof NextResponse) return auth;

  const children = await prisma.user.findMany({
    where: { parentId: auth.id, role: 'student' },
    select: {
      id: true,
      name: true,
      login: true,
      phone: true,
      status: true,
      groupStudents: {
        include: {
          group: {
            select: {
              id: true, name: true, subject: true, price: true, lessonsPerMonth: true,
              time: true, dayType: true, room: true, meetLink: true, mode: true,
              teacher: { select: { id: true, name: true, phone: true } },
              _count: { select: { students: true, lessons: true } },
              students: {
                select: {
                  student: {
                    select: {
                      id: true,
                      name: true,
                      attendances: {
                        select: {
                          present: true,
                          scoreAttend: true,
                          scoreHomework: true,
                          scoreActivity: true,
                          lesson: { select: { groupId: true } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      attendances: {
        select: { present: true, lesson: { select: { groupId: true, scheduledDate: true } } },
        orderBy: { markedAt: 'desc' },
      },
      payments: {
        select: { amount: true, month: true, method: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  const enriched = await Promise.all(children.map(async child => {
    // Balans — yagona billing manbasidan (grace qoidasi bilan, student/admin bilan bir xil)
    const bal = await computeStudentBalance(child.id);
    const { totalPaid, totalCost, balance } = bal;

    // Attendance stats
    const totalPresent = child.attendances.filter(a => a.present).length;
    const totalMarked = child.attendances.length;
    const attendancePct = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

    // Rankings per group
    const groupsWithRanking = child.groupStudents.map(gs => {
      const g = gs.group;
      const groupId = g.id;

      // Calculate total score for each student in this group
      const studentStats = g.students.map(gsItem => {
        const s = gsItem.student;
        const groupAttendances = s.attendances.filter(a => a.lesson.groupId === groupId);
        const present = groupAttendances.filter(a => a.present).length;
        const total = groupAttendances.length;
        const pct = total > 0 ? Math.round((present / total) * 100) : 0;
        const totalScore = groupAttendances.reduce((sum, a) => sum + (a.scoreAttend || 0) + (a.scoreHomework || 0) + (a.scoreActivity || 0), 0);
        const maxScore = total * 15; // har darsda max 15 ball
        return { id: s.id, name: s.name, present, total, pct, totalScore, maxScore };
      });

      // Sort by total score descending, then attendance % descending
      studentStats.sort((a, b) => b.totalScore - a.totalScore || b.pct - a.pct || b.present - a.present);

      // Find child's rank
      const childRank = studentStats.findIndex(s => s.id === child.id) + 1;

      const { students: _s, ...groupData } = g;

      return {
        ...groupData,
        ranking: {
          childRank,
          totalStudents: studentStats.length,
          leaderboard: studentStats.map((s, i) => ({
            rank: i + 1,
            name: s.name,
            present: s.present,
            total: s.total,
            pct: s.pct,
            totalScore: s.totalScore,
            maxScore: s.maxScore,
            isChild: s.id === child.id,
          })),
        },
      };
    });

    return {
      id: child.id,
      name: child.name,
      status: child.status,
      groups: groupsWithRanking,
      balance: { totalPaid, totalCost, balance },
      attendance: { present: totalPresent, total: totalMarked, pct: attendancePct },
      recentPayments: child.payments.slice(0, 5),
    };
  }));

  return NextResponse.json(enriched);
}
