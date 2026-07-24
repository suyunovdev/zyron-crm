import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { generateLessons } from '@/lib/generate-lessons';
import { logger } from '@/lib/logger';

const CreateGroupSchema = z.object({
  name: z.string().min(1, 'nomi kerak').max(120),
  subject: z.string().min(1, 'fani kerak').max(80),
  teacherId: z.string().min(1, 'o\'qituvchi kerak'),
  schedule: z.string().max(200).optional(),
  meetLink: z.string().max(300).optional(),
  maxStudents: z.coerce.number().int().min(1).max(100).optional(),
  startDate: z.string().max(20).optional().nullable(),
  room: z.string().max(40).optional().nullable(),
  dayType: z.enum(['toq', 'juft', 'boshqa']).optional(),
  time: z.string().max(10).optional().nullable(),
  price: z.coerce.number().int().min(0).optional(),
  lessonsPerMonth: z.coerce.number().int().min(1).max(60).optional(),
  mode: z.enum(['offline', 'online']).optional(),
});

// Get all groups
export async function GET() {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const groups = await prisma.group.findMany({
    include: {
      teacher: { select: { id: true, name: true } },
      students: { include: { student: { select: { id: true, name: true, login: true, rawPass: true, status: true } } } },
      _count: { select: { lessons: true, students: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(groups);
}

// Create group
export async function POST(req: NextRequest) {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const parsed = await parseBody(req, CreateGroupSchema);
  if (parsed instanceof NextResponse) return parsed;
  const { name, subject, teacherId, schedule, meetLink, maxStudents, startDate, room, dayType, time, price, lessonsPerMonth, mode } = parsed;

  const group = await prisma.group.create({
    data: {
      name,
      subject,
      teacherId,
      schedule: schedule || '',
      meetLink: meetLink || '',
      maxStudents: maxStudents ?? 15,
      startDate: startDate || null,
      room: room || null,
      dayType: dayType || 'toq',
      time: time || null,
      mode: mode || 'offline',
      price: price ?? 0,
      lessonsPerMonth: lessonsPerMonth ?? 12,
    },
    include: { teacher: { select: { name: true } } },
  });

  // Darslarni avtomatik generatsiya qilish (12 oy)
  {
    const dt = dayType || 'toq';
    const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
    const sd = startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    try {
      await generateLessons({
        groupId: group.id,
        startDate: sd,
        months: 12,
        dayType: dt,
        time: time || '14:00',
      });
    } catch (e) {
      logger.error('[Auto-generate lessons]', e);
    }
  }

  return NextResponse.json(group, { status: 201 });
}

// Update group (status, info, add/remove students, move student)
export async function PATCH(req: NextRequest) {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const { id, name, schedule, meetLink, status, maxStudents, startDate, room, dayType, time, price, lessonsPerMonth, mode, addStudentId, removeStudentId, moveStudentId, toGroupId } = await req.json();
  if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

  // Move student from this group to another
  if (moveStudentId && toGroupId) {
    await prisma.groupStudent.deleteMany({
      where: { groupId: id, studentId: moveStudentId },
    });
    await prisma.groupStudent.create({
      data: { groupId: toGroupId, studentId: moveStudentId },
    });
    return NextResponse.json({ ok: true, message: "O'quvchi ko'chirildi" });
  }

  // Add student to group
  if (addStudentId) {
    await prisma.groupStudent.create({
      data: { groupId: id, studentId: addStudentId },
    });
    return NextResponse.json({ ok: true, message: "O'quvchi qo'shildi" });
  }

  // Remove student from group
  if (removeStudentId) {
    await prisma.groupStudent.deleteMany({
      where: { groupId: id, studentId: removeStudentId },
    });
    return NextResponse.json({ ok: true, message: "O'quvchi chiqarildi" });
  }

  // Update group info
  const data: Record<string, unknown> = {};
  if (name !== undefined) data.name = name;
  if (schedule !== undefined) data.schedule = schedule;
  if (meetLink !== undefined) data.meetLink = meetLink;
  if (status !== undefined) data.status = status;
  if (maxStudents !== undefined) data.maxStudents = parseInt(maxStudents);
  if (startDate !== undefined) data.startDate = startDate;
  if (room !== undefined) data.room = room;
  if (dayType !== undefined) data.dayType = dayType;
  if (time !== undefined) data.time = time;
  if (price !== undefined) data.price = parseInt(price);
  if (lessonsPerMonth !== undefined) data.lessonsPerMonth = parseInt(lessonsPerMonth);
  if (mode !== undefined) data.mode = mode;

  const group = await prisma.group.update({ where: { id }, data });
  return NextResponse.json(group);
}
