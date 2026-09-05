import { NextResponse } from 'next/server';
import { getSession, type SessionUser } from './auth';
import { prisma } from './db';

export async function requireAuth(role?: string): Promise<SessionUser | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Majburiy logout: token tokenVersion'i DB bilan mos kelmasa — sessiya bekor
  const claimed = (session as SessionUser & { tokenVersion?: number }).tokenVersion;
  if (claimed !== undefined) {
    const u = await prisma.user.findUnique({ where: { id: session.id }, select: { tokenVersion: true, status: true } });
    if (!u || u.tokenVersion !== claimed || u.status !== 'active') {
      return NextResponse.json({ error: 'Sessiya bekor qilingan' }, { status: 401 });
    }
  }
  if (role) {
    // superadmin has all admin privileges
    if (role === 'admin' && (session.role === 'admin' || session.role === 'superadmin')) {
      return session;
    }
    if (session.role !== role) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }
  return session;
}

// O'zbekiston vaqti bo'yicha hozirgi vaqtni olish
function getNowUz(): Date {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
}

export function isLessonActive(scheduledDate: string, scheduledTime: string, duration: string): boolean {
  const now = getNowUz();
  const [year, month, day] = scheduledDate.split('-').map(Number);
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  const lessonStart = new Date(year, month - 1, day, hours, minutes, 0);
  const durationMatch = duration.match(/([\d.]+)/);
  const durationHours = durationMatch ? parseFloat(durationMatch[1]) : 1.5;
  const lessonEnd = new Date(lessonStart.getTime() + durationHours * 60 * 60 * 1000);
  return now >= lessonStart && now <= lessonEnd;
}

export function isLessonPast(scheduledDate: string, scheduledTime: string, duration: string): boolean {
  const now = getNowUz();
  const [year, month, day] = scheduledDate.split('-').map(Number);
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  const lessonStart = new Date(year, month - 1, day, hours, minutes, 0);
  const durationMatch = duration.match(/([\d.]+)/);
  const durationHours = durationMatch ? parseFloat(durationMatch[1]) : 1.5;
  const lessonEnd = new Date(lessonStart.getTime() + durationHours * 60 * 60 * 1000);
  return now > lessonEnd;
}

export function getTodayUz(): string {
  const now = getNowUz();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Dars tugagach davomat belgilash uchun qo'shimcha muhlat (grace): 2 soat. */
export const ATTENDANCE_GRACE_MS = 2 * 60 * 60 * 1000;

/** Duration matnidan soatni ajratadi ("3 soat" → 3, "1.5 soat" → 1.5; default 1.5). */
export function parseDurationHours(duration?: string | null): number {
  const m = (duration || '').match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 1.5;
}

/**
 * Teacher davomat belgilash oynasi (sof funksiya — test qilinadigan).
 *  - windowStart: dars boshlanishidan 15 min oldin (bundan oldin belgilab bo'lmaydi)
 *  - lessonEnd:   dars tugashi (start + duration)
 *  - windowEnd:   dars tugashi + 2 soat grace (bundan keyin faqat admin tuzatadi)
 */
export function attendanceWindow(scheduledDate: string, scheduledTime: string, duration?: string | null) {
  const [y, m, d] = scheduledDate.split('-').map(Number);
  const [h, min] = scheduledTime.split(':').map(Number);
  const start = new Date(y, m - 1, d, h, min);
  const lessonEnd = new Date(start.getTime() + parseDurationHours(duration) * 3600000);
  const windowStart = new Date(start.getTime() - 15 * 60000);
  const windowEnd = new Date(lessonEnd.getTime() + ATTENDANCE_GRACE_MS);
  return { windowStart, lessonEnd, windowEnd };
}

/** Berilgan vaqtda teacher davomatni belgilay oladimi? */
export function canTeacherMark(scheduledDate: string, scheduledTime: string, duration: string | null | undefined, now: Date): boolean {
  const { windowStart, windowEnd } = attendanceWindow(scheduledDate, scheduledTime, duration);
  return now >= windowStart && now <= windowEnd;
}
