import { NextResponse } from 'next/server';
import { getSession, type SessionUser } from './auth';

export async function requireAuth(role?: string): Promise<SessionUser | NextResponse> {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (role && session.role !== role) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return session;
}

export function isLessonActive(scheduledDate: string, scheduledTime: string, duration: string): boolean {
  const now = new Date();
  const [year, month, day] = scheduledDate.split('-').map(Number);
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  const lessonStart = new Date(year, month - 1, day, hours, minutes, 0);
  const durationMatch = duration.match(/([\d.]+)/);
  const durationHours = durationMatch ? parseFloat(durationMatch[1]) : 1.5;
  const lessonEnd = new Date(lessonStart.getTime() + durationHours * 60 * 60 * 1000);
  return now >= lessonStart && now <= lessonEnd;
}

export function isLessonPast(scheduledDate: string, scheduledTime: string, duration: string): boolean {
  const now = new Date();
  const [year, month, day] = scheduledDate.split('-').map(Number);
  const [hours, minutes] = scheduledTime.split(':').map(Number);
  const lessonStart = new Date(year, month - 1, day, hours, minutes, 0);
  const durationMatch = duration.match(/([\d.]+)/);
  const durationHours = durationMatch ? parseFloat(durationMatch[1]) : 1.5;
  const lessonEnd = new Date(lessonStart.getTime() + durationHours * 60 * 60 * 1000);
  return now > lessonEnd;
}
