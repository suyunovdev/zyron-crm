import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import { computeStudentBalance } from '@/lib/billing';
import { todayTz } from '@/lib/date';

// Ota-ona farzand(lar)i hisoboti — guruhlar, davomat, to'lovlar, balans, reyting.
// Yagona manba: parent dashboard (GET /api/parent/children) VA Telegram bot shundan
// foydalanadi. Billing yagona yadrosidan (computeStudentBalance) — hamma joyda bir xil.

export interface ChildReport {
  id: string;
  name: string;
  status: string;
  groups: Array<Record<string, unknown> & {
    id: string;
    name: string;
    subject?: string;
    price?: number;
    time?: string | null;
    dayType?: string | null;
    room?: string | null;
    teacher?: { id: string; name: string; phone?: string | null };
    ranking: {
      childRank: number;
      totalStudents: number;
      leaderboard: Array<{
        rank: number; name: string; present: number; total: number;
        pct: number; totalScore: number; maxScore: number; isChild: boolean;
      }>;
    };
  }>;
  balance: { totalPaid: number; totalCost: number; balance: number };
  attendance: { present: number; total: number; pct: number };
  recentLessons: Array<{ topic: string | null; date: string; groupName: string; present: boolean | null; isToday: boolean }>;
  recentPayments: Array<{ amount: number; month: string; method: string; createdAt: Date }>;
}

/** Yadro — berilgan filtr bo'yicha farzandlar hisoboti (parentId YOKI chat orqali). */
async function childrenReport(childWhere: Prisma.UserWhereInput): Promise<ChildReport[]> {
  const children = await prisma.user.findMany({
    where: { role: 'student', ...childWhere },
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

  const today = todayTz();

  return Promise.all(children.map(async child => {
    // Balans — yagona billing manbasidan (grace qoidasi bilan, student/admin bilan bir xil)
    const bal = await computeStudentBalance(child.id);
    const { totalPaid, totalCost, balance } = bal;

    // O'tilgan mavzular — farzand guruhlaridagi so'nggi (bugungi + oldingi) darslar
    const groupIds = child.groupStudents.map(gs => gs.group.id);
    const lessonRows = groupIds.length ? await prisma.lesson.findMany({
      where: { groupId: { in: groupIds }, scheduledDate: { lte: today } },
      select: {
        topic: true, scheduledDate: true,
        group: { select: { name: true } },
        attendances: { where: { studentId: child.id }, select: { present: true } },
      },
      orderBy: [{ scheduledDate: 'desc' }, { order: 'desc' }],
      take: 6,
    }) : [];
    const recentLessons = lessonRows.map(l => ({
      topic: l.topic || null,
      date: l.scheduledDate,
      groupName: l.group.name,
      present: l.attendances.length ? l.attendances[0].present : null,
      isToday: l.scheduledDate === today,
    }));

    // Attendance stats
    const totalPresent = child.attendances.filter(a => a.present).length;
    const totalMarked = child.attendances.length;
    const attendancePct = totalMarked > 0 ? Math.round((totalPresent / totalMarked) * 100) : 0;

    // Rankings per group
    const groupsWithRanking = child.groupStudents.map(gs => {
      const g = gs.group;
      const groupId = g.id;

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

      studentStats.sort((a, b) => b.totalScore - a.totalScore || b.pct - a.pct || b.present - a.present);
      const childRank = studentStats.findIndex(s => s.id === child.id) + 1;
      // `students` maydonini javobdan chiqarib tashlaymiz (faqat ranking hisoblash uchun kerak edi)
      const groupData = { ...g, students: undefined };
      delete (groupData as { students?: unknown }).students;

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
      recentLessons,
      recentPayments: child.payments.slice(0, 5),
    };
  }));
}

/** Parent panel (GET /api/parent/children) — bitta ota-ona akkauntining farzand(lar)i (parentId). */
export function getChildrenReport(parentId: string): Promise<ChildReport[]> {
  return childrenReport({ parentId });
}

/** Telegram bot — chatga bog'langan BARCHA farzandlar (aka-uka; bir chatga bir nechta parent akkaunti). */
export function getChildrenReportByChat(chatId: string): Promise<ChildReport[]> {
  return childrenReport({ parent: { telegramChatId: chatId } });
}

/** Bitta farzand — EGALIK parentId bo'yicha (parent panel). */
export async function getChildReport(parentId: string, childId: string): Promise<ChildReport | null> {
  const child = await prisma.user.findUnique({ where: { id: childId }, select: { parentId: true } });
  if (!child || child.parentId !== parentId) return null;
  const all = await getChildrenReport(parentId);
  return all.find(c => c.id === childId) || null;
}

/** Bitta farzand — EGALIK chat bo'yicha (bot callback'lari). */
export async function getChildReportByChat(chatId: string, childId: string): Promise<ChildReport | null> {
  const child = await prisma.user.findUnique({
    where: { id: childId },
    select: { parent: { select: { telegramChatId: true } } },
  });
  if (!child || child.parent?.telegramChatId !== chatId) return null;
  const all = await getChildrenReportByChat(chatId);
  return all.find(c => c.id === childId) || null;
}

export interface LessonItem {
  topic: string | null;
  date: string;        // "YYYY-MM-DD"
  month: string;       // "YYYY-MM"
  groupName: string;
  present: boolean | null;
  isToday: boolean;
}

/**
 * Farzandning BARCHA o'tilgan darslari (mavzular) — oylik filter uchun.
 * EGALIK tekshiruvi bilan. months — mavjud oylar (kamayish tartibida, filter chiplari uchun).
 */
async function childLessons(
  ownerWhere: Prisma.UserWhereInput,
  childId: string,
): Promise<{ months: string[]; lessons: LessonItem[] }> {
  // Egalik so'rov ichida: farzand id + ega (parentId yoki chat) mos kelishi shart.
  const child = await prisma.user.findFirst({
    where: { id: childId, ...ownerWhere },
    select: { groupStudents: { select: { groupId: true } } },
  });
  if (!child) return { months: [], lessons: [] };

  const groupIds = child.groupStudents.map(gs => gs.groupId);
  if (groupIds.length === 0) return { months: [], lessons: [] };

  const today = todayTz();
  const rows = await prisma.lesson.findMany({
    where: { groupId: { in: groupIds }, scheduledDate: { lte: today } },
    select: {
      topic: true, scheduledDate: true,
      group: { select: { name: true } },
      attendances: { where: { studentId: childId }, select: { present: true } },
    },
    orderBy: [{ scheduledDate: 'desc' }, { order: 'desc' }],
  });

  const lessons: LessonItem[] = rows.map(l => ({
    topic: l.topic || null,
    date: l.scheduledDate,
    month: l.scheduledDate.slice(0, 7),
    groupName: l.group.name,
    present: l.attendances.length ? l.attendances[0].present : null,
    isToday: l.scheduledDate === today,
  }));

  const months = [...new Set(lessons.map(l => l.month))]; // allaqachon kamayish tartibida
  return { months, lessons };
}

/** Parent panel — farzand darslari, EGALIK parentId bo'yicha. */
export function getChildLessons(parentId: string, childId: string) {
  return childLessons({ parentId }, childId);
}

/** Telegram bot — farzand darslari, EGALIK chat bo'yicha. */
export function getChildLessonsByChat(chatId: string, childId: string) {
  return childLessons({ parent: { telegramChatId: chatId } }, childId);
}
