import { NextResponse } from 'next/server';
import { getSession, type SessionUser } from './auth';

export async function requireAuth(role?: string): Promise<SessionUser | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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

/**
 * Teacher davomat belgilash oynasi (sof funksiya — test qilinadigan).
 *  - windowStart: dars boshlanishidan 15 min oldin (bundan oldin belgilab bo'lmaydi)
 *  - dayEnd:      dars kuni oxiri = ertasi kun 00:00 (bundan keyin faqat admin)
 */
export function attendanceWindow(scheduledDate: string, scheduledTime: string) {
  const [y, m, d] = scheduledDate.split('-').map(Number);
  const [h, min] = scheduledTime.split(':').map(Number);
  const start = new Date(y, m - 1, d, h, min);
  const windowStart = new Date(start.getTime() - 15 * 60000);
  const dayEnd = new Date(y, m - 1, d + 1, 0, 0, 0);
  return { windowStart, dayEnd };
}

/** Berilgan vaqtda teacher davomatni belgilay oladimi? */
export function canTeacherMark(scheduledDate: string, scheduledTime: string, now: Date): boolean {
  const { windowStart, dayEnd } = attendanceWindow(scheduledDate, scheduledTime);
  return now >= windowStart && now < dayEnd;
}
