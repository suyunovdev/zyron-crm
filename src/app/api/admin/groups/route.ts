import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { requireAuth } from '@/lib/api-utils';
import { parseBody, zTrim } from '@/lib/validate';
import { generateLessons } from '@/lib/generate-lessons';
import { reconcileFutureLessons, type GroupConfigChange } from '@/lib/reconcile-lessons';
import { logger } from '@/lib/logger';
import { scopedBranchId } from '@/lib/branch-scope';

const CreateGroupSchema = z.object({
  name: zTrim(120, 1),
  subject: zTrim(80, 1),
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
  name: zTrim(120, 1).optional(),
  subject: zTrim(80, 1).optional(),
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
  branchId: z.string().nullable().optional(), // filial biriktirish/o'zgartirish (faqat superadmin)
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
  const teacher = await prisma.user.findUnique({ where: { id: teacherId }, select: { branchId: true } });
  if (bId) {
    if (!teacher || teacher.branchId !== bId) {
      return NextResponse.json({ error: 'O\'qituvchi boshqa filialga tegishli' }, { status: 403 });
    }
  }
  // Guruh filiali: admin filiali (bo'lsa), aks holda o'qituvchi filialini meros qiladi.
  // Aks holda filialsiz guruh qolib, filialga biriktirilgan adminlar uni ochа olmasdi (403).
  const groupBranchId = bId || teacher?.branchId || null;

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
      branchId: groupBranchId,
    },
    include: { teacher: { select: { name: true } } },
  });

  // Darslarni avtomatik generatsiya qilish (12 oy). Dars maydonlari (vaqt/davomiylik/narx)
  // generateLessons ichida guruhdan (lessonDefaultsFromGroup) olinadi — yagona manba.
  // Faqat toq/juft uchun; "boshqa" (maxsus jadval) da avtomatik generatsiya qilinmaydi.
  {
    const dt = dayType || 'toq';
    if (dt === 'toq' || dt === 'juft') {
      const now = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tashkent' }));
      const sd = startDate || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      try {
        await generateLessons({ groupId: group.id, startDate: sd, months: 12, dayType: dt });
      } catch (e) {
        logger.error('[Auto-generate lessons]', e);
      }
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
    // F2-4: biznes-qoidalar serverda — rol, arxiv guruh, sig'im, atomiklik.
    const [stu, dest, already] = await Promise.all([
      prisma.user.findUnique({ where: { id: moveStudentId }, select: { role: true } }),
      prisma.group.findUnique({ where: { id: toGroupId }, select: { status: true, maxStudents: true, branchId: true } }),
      prisma.groupStudent.findUnique({ where: { groupId_studentId: { groupId: toGroupId, studentId: moveStudentId } }, select: { id: true } }),
    ]);
    if (!stu || stu.role !== 'student') return NextResponse.json({ error: 'Faqat o\'quvchini ko\'chirish mumkin' }, { status: 400 });
    if (!dest) return NextResponse.json({ error: 'Nishon guruh topilmadi' }, { status: 404 });
    if (dest.status === 'archived') return NextResponse.json({ error: 'Arxivlangan guruhga ko\'chirib bo\'lmaydi' }, { status: 400 });
    if (!already) {
      const cnt = await prisma.groupStudent.count({ where: { groupId: toGroupId } });
      if (cnt >= dest.maxStudents) return NextResponse.json({ error: 'Nishon guruh to\'lgan (sig\'im chegarasi)' }, { status: 400 });
    }
    // Atomik: manbadan o'chirish + nishonga qo'shish bitta tranzaksiyada (a'zolik yo'qolib qolmasin)
    await prisma.$transaction([
      prisma.groupStudent.deleteMany({ where: { groupId: id, studentId: moveStudentId } }),
      prisma.groupStudent.upsert({
        where: { groupId_studentId: { groupId: toGroupId, studentId: moveStudentId } },
        update: {},
        create: { groupId: toGroupId, studentId: moveStudentId },
      }),
    ]);
    // O'quvchi nishon guruh filialiga o'tadi (moslik)
    if (dest.branchId) await prisma.user.update({ where: { id: moveStudentId }, data: { branchId: dest.branchId } });
    return NextResponse.json({ ok: true, message: "O'quvchi ko'chirildi" });
  }

  // Add student to group
  if (addStudentId) {
    // F2-4: biznes-qoidalar serverda — rol/status, arxiv guruh, sig'im, dublikat.
    const [stu, grp, cnt] = await Promise.all([
      prisma.user.findUnique({ where: { id: addStudentId }, select: { role: true, status: true } }),
      prisma.group.findUnique({ where: { id }, select: { status: true, maxStudents: true, branchId: true } }),
      prisma.groupStudent.count({ where: { groupId: id } }),
    ]);
    if (!stu || stu.role !== 'student') return NextResponse.json({ error: 'Faqat o\'quvchini qo\'shish mumkin' }, { status: 400 });
    if (stu.status === 'archived') return NextResponse.json({ error: 'Arxivlangan o\'quvchini qo\'shib bo\'lmaydi' }, { status: 400 });
    if (!grp) return NextResponse.json({ error: 'Guruh topilmadi' }, { status: 404 });
    if (grp.status === 'archived') return NextResponse.json({ error: 'Arxivlangan guruhga qo\'shib bo\'lmaydi' }, { status: 400 });
    if (cnt >= grp.maxStudents) return NextResponse.json({ error: 'Guruh to\'lgan (sig\'im chegarasi)' }, { status: 400 });
    try {
      await prisma.groupStudent.create({ data: { groupId: id, studentId: addStudentId } });
    } catch (e) {
      if (e && typeof e === 'object' && (e as { code?: string }).code === 'P2002') {
        return NextResponse.json({ error: 'O\'quvchi allaqachon bu guruhda' }, { status: 409 });
      }
      throw e;
    }
    // O'quvchi guruhning filialini meros qiladi (student va guruh doim bir filialda)
    if (grp.branchId) await prisma.user.update({ where: { id: addStudentId }, data: { branchId: grp.branchId } });
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

  // Eski qiymatlar — o'zgarishni aniqlash (reconciler) va branch auto-heal uchun
  const before = await prisma.group.findUnique({
    where: { id },
    select: { dayType: true, time: true, duration: true, price: true, lessonsPerMonth: true, startDate: true, branchId: true, teacherId: true },
  });
  if (!before) return NextResponse.json({ error: 'Guruh topilmadi' }, { status: 404 });

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

  // branchId: faqat filialsiz (superadmin/global) admin ixtiyoriy o'zgartira oladi.
  // Filialga biriktirilgan admin guruhni boshqa filialga ko'chira olmaydi.
  if (v.branchId !== undefined) {
    if (bId) {
      if (v.branchId !== bId) return NextResponse.json({ error: 'Guruh filialini o\'zgartirishga ruxsat yo\'q' }, { status: 403 });
    } else {
      data.branchId = v.branchId;
    }
  }
  // Auto-heal: guruh filialsiz (null) qolgan bo'lsa — o'qituvchi filialini meros qiladi.
  // Aks holda filialsiz guruh filial adminига "Guruh topilmadi" bo'lib ko'rinadi.
  const willBranch = (data.branchId as string | null | undefined) ?? before.branchId;
  if (willBranch == null) {
    const tId = (data.teacherId as string) || before.teacherId;
    const t = tId ? await prisma.user.findUnique({ where: { id: tId }, select: { branchId: true } }) : null;
    if (t?.branchId) data.branchId = t.branchId;
  }

  const group = await prisma.group.update({ where: { id }, data });

  // Jadval/narx o'zgarishlarini darslarga YAGONA reconciler orqali tarqatamiz
  // (vaqt, davomiylik, dars kunlari regeneratsiyasi, kelajak narx snapshot).
  const change: GroupConfigChange = {};
  if (v.dayType !== undefined && v.dayType !== before.dayType) change.dayType = v.dayType;
  if (v.time !== undefined && v.time !== before.time) change.time = v.time;
  if (v.duration !== undefined && v.duration !== before.duration) change.duration = v.duration;
  if (v.price !== undefined && v.price !== before.price) change.price = v.price;
  if (v.lessonsPerMonth !== undefined && v.lessonsPerMonth !== before.lessonsPerMonth) change.lessonsPerMonth = v.lessonsPerMonth;
  if (v.startDate !== undefined && v.startDate !== before.startDate) change.startDate = v.startDate;
  if (Object.keys(change).length > 0) {
    try {
      await reconcileFutureLessons(id, change);
    } catch (e) {
      logger.error('[groups PATCH — reconcile]', e);
    }
  }

  return NextResponse.json(group);
}
