import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody } from '@/lib/validate';
import { generateLessons } from '@/lib/generate-lessons';
import { logger } from '@/lib/logger';
import { scopedBranchId } from '@/lib/branch-scope';

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
  duration: z.string().max(20).optional(),
  price: z.coerce.number().int().min(0).optional(),
  lessonsPerMonth: z.coerce.number().int().min(1).max(60).optional(),
  mode: z.enum(['offline', 'online']).optional(),
});

// Guruh ma'lumotini yangilash (PATCH info) uchun sxema — POST bilan bir xil qat'iylik.
// Avval PATCH `req.json()` dan xom o'qib `parseInt` qilardi: manfiy narx yoki
// lessonsPerMonth=0 o'tib ketardi va butun guruh qarzdorligini buzardi (K-3).
const UpdateGroupInfoSchema = z.object({
  name: z.string().min(1, 'nomi kerak').max(120).optional(),
  subject: z.string().min(1, 'fani kerak').max(80).optional(),
  schedule: z.string().max(200).optional(),
  meetLink: z.string().max(300).optional(),
  status: z.enum(['active', 'archived']).optional(),
  maxStudents: z.coerce.number().int().min(1).max(100).optional(),
  startDate: z.string().max(20).nullable().optional(),
  room: z.string().max(40).nullable().optional(),
  dayType: z.enum(['toq', 'juft', 'boshqa']).optional(),
  time: z.string().max(10).nullable().optional(),
  duration: z.string().max(20).optional(),
  price: z.coerce.number().int().min(0).optional(),
  lessonsPerMonth: z.coerce.number().int().min(1).max(60).optional(),
  mode: z.enum(['offline', 'online']).optional(),
  teacherId: z.string().min(1).optional(),
});

// Get all groups
export async function GET() {
  const auth = await requireAuth('admin');
  if (auth instanceof NextResponse) return auth;

  const bId = await scopedBranchId(auth);

  const groups = await prisma.group.findMany({
    where: bId ? { branchId: bId } : {},
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
  const { name, subject, teacherId, schedule, meetLink, maxStudents, startDate, room, dayType, time, duration, price, lessonsPerMonth, mode } = parsed;

  // Filial cheklovi: o'qituvchi shu filialdan bo'lishi shart, guruh o'sha filialga
  const bId = await scopedBranchId(auth);
  if (bId) {
    const t = await prisma.user.findUnique({ where: { id: teacherId }, select: { branchId: true } });
    if (!t || t.branchId !== bId) {
      return NextResponse.json({ error: 'O\'qituvchi boshqa filialga tegishli' }, { status: 403 });
    }
  }

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
      duration: duration || '2.5 soat',
      mode: mode || 'offline',
      price: price ?? 0,
      lessonsPerMonth: lessonsPerMonth ?? 12,
      branchId: bId || null,
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
        duration: duration || '2.5 soat',
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

  const { id, name, subject, schedule, meetLink, status, maxStudents, startDate, room, dayType, time, duration, price, lessonsPerMonth, mode, teacherId, addStudentId, removeStudentId, moveStudentId, toGroupId } = await req.json();
  if (!id) return NextResponse.json({ error: 'id kerak' }, { status: 400 });

  // Filial cheklovi
  const bId = await scopedBranchId(auth);
  const groupBranch = async (gid: string) => (await prisma.group.findUnique({ where: { id: gid }, select: { branchId: true } }))?.branchId ?? null;
  const studentBranch = async (sid: string) => (await prisma.user.findUnique({ where: { id: sid }, select: { branchId: true } }))?.branchId ?? null;
  if (bId) {
    const gBranch = await groupBranch(id);
    if (addStudentId) {
      // O'quvchi qo'shish/lidan o'tkazish: guruh admin filialida YOKI filialsiz (umumiy) bo'lsa ruxsat.
      // O'quvchi qo'shilgach guruhning filialini meros qiladi (moslik).
      if (gBranch != null && gBranch !== bId) return NextResponse.json({ error: 'Guruh boshqa filialga tegishli' }, { status: 403 });
      const sB = await studentBranch(addStudentId);
      if (sB != null && sB !== bId) return NextResponse.json({ error: 'O\'quvchi boshqa filialga tegishli' }, { status: 403 });
    } else {
      // Guruh tahriri / o'chirish / ko'chirish: guruh aynan admin filialida bo'lishi shart
      if (gBranch !== bId) return NextResponse.json({ error: 'Guruh boshqa filialga tegishli' }, { status: 403 });
      if (toGroupId && (await groupBranch(toGroupId)) !== bId) return NextResponse.json({ error: 'Nishon guruh boshqa filialga tegishli' }, { status: 403 });
      for (const sid of [removeStudentId, moveStudentId].filter(Boolean)) {
        if ((await studentBranch(sid)) !== bId) return NextResponse.json({ error: 'O\'quvchi boshqa filialga tegishli' }, { status: 403 });
      }
      // Yangi mentor (o'qituvchi) ham shu filialdan bo'lishi shart
      if (teacherId && (await studentBranch(teacherId)) !== bId) {
        return NextResponse.json({ error: 'O\'qituvchi boshqa filialga tegishli' }, { status: 403 });
      }
    }
  }

  // Move student from this group to another
  if (moveStudentId && toGroupId) {
    await prisma.groupStudent.deleteMany({
      where: { groupId: id, studentId: moveStudentId },
    });
    await prisma.groupStudent.create({
      data: { groupId: toGroupId, studentId: moveStudentId },
    });
    // O'quvchi nishon guruh filialiga o'tadi (moslik)
    const tb = await groupBranch(toGroupId);
    if (tb) await prisma.user.update({ where: { id: moveStudentId }, data: { branchId: tb } });
    return NextResponse.json({ ok: true, message: "O'quvchi ko'chirildi" });
  }

  // Add student to group
  if (addStudentId) {
    await prisma.groupStudent.create({
      data: { groupId: id, studentId: addStudentId },
    });
    // O'quvchi guruhning filialini meros qiladi (student va guruh doim bir filialda)
    const gb = await groupBranch(id);
    if (gb) await prisma.user.update({ where: { id: addStudentId }, data: { branchId: gb } });
    return NextResponse.json({ ok: true, message: "O'quvchi qo'shildi" });
  }

  // Remove student from group
  if (removeStudentId) {
    await prisma.groupStudent.deleteMany({
      where: { groupId: id, studentId: removeStudentId },
    });
    return NextResponse.json({ ok: true, message: "O'quvchi chiqarildi" });
  }

  // Update group info — POST bilan bir xil qat'iy validatsiya (manfiy narx / lessonsPerMonth=0 bloklandi)
  const infoParsed = UpdateGroupInfoSchema.safeParse({
    name, subject, schedule, meetLink, status, maxStudents, startDate,
    room, dayType, time, duration, price, lessonsPerMonth, mode, teacherId,
  });
  if (!infoParsed.success) {
    const first = infoParsed.error.issues[0];
    const field = first?.path.join('.') || 'input';
    return NextResponse.json(
      { error: `Noto'g'ri ma'lumot: ${field} — ${first?.message || 'validatsiya xatosi'}` },
      { status: 400 },
    );
  }
  const v = infoParsed.data;

  const data: Record<string, unknown> = {};
  if (v.name !== undefined) data.name = v.name;
  if (v.subject !== undefined) data.subject = v.subject;
  if (v.schedule !== undefined) data.schedule = v.schedule;
  if (v.meetLink !== undefined) data.meetLink = v.meetLink;
  if (v.status !== undefined) data.status = v.status;
  if (v.maxStudents !== undefined) data.maxStudents = v.maxStudents;
  if (v.startDate !== undefined) data.startDate = v.startDate;
  if (v.room !== undefined) data.room = v.room;
  if (v.dayType !== undefined) data.dayType = v.dayType;
  if (v.time !== undefined) data.time = v.time;
  if (v.duration !== undefined) data.duration = v.duration;
  if (v.price !== undefined) data.price = v.price;
  if (v.lessonsPerMonth !== undefined) data.lessonsPerMonth = v.lessonsPerMonth;
  if (v.mode !== undefined) data.mode = v.mode;
  if (v.teacherId) data.teacherId = v.teacherId;

  const group = await prisma.group.update({ where: { id }, data });

  // Davomiylik o'zgarsa — guruhning barcha darslariga qo'llaymiz (jadval/hisob izchil bo'lsin)
  if (v.duration !== undefined) {
    await prisma.lesson.updateMany({ where: { groupId: id }, data: { duration: v.duration } });
  }

  return NextResponse.json(group);
}
