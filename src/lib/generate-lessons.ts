import { prisma } from '@/lib/db';

// Toq kunlar: Dushanba(1), Chorshanba(3), Juma(5)
// Juft kunlar: Seshanba(2), Payshanba(4), Shanba(6)
const DAY_MAP: Record<string, number[]> = {
  toq: [1, 3, 5],   // Mon, Wed, Fri
  juft: [2, 4, 6],  // Tue, Thu, Sat
};

interface GenerateOptions {
  groupId: string;
  startDate: string;  // "2026-07-01" formatda
  months: number;     // necha oy uchun generatsiya qilish (default: 12)
  dayType: string;    // "toq" | "juft"
  time: string;       // "14:00"
  duration?: string;  // "1.5 soat"
}

/**
 * Berilgan guruh uchun darslarni avtomatik generatsiya qiladi.
 * dayType bo'yicha kalendar kunlarini hisoblab, Lesson yaratadi.
 * Mavjud darslar bilan duplikat bo'lmasligi uchun tekshiradi.
 */
export async function generateLessons(opts: GenerateOptions) {
  const { groupId, startDate, months = 12, dayType, time, duration = '1.5 soat' } = opts;

  const allowedDays = DAY_MAP[dayType];
  if (!allowedDays) {
    throw new Error(`Noto'g'ri dayType: ${dayType}. "toq" yoki "juft" bo'lishi kerak.`);
  }

  // Hisoblash: startDate dan boshlab, months oy davomida
  const start = new Date(startDate);
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);

  // Mavjud darslarning sanalarini olish (duplikat oldini olish)
  const existingLessons = await prisma.lesson.findMany({
    where: { groupId },
    select: { scheduledDate: true },
  });
  const existingDates = new Set(existingLessons.map(l => l.scheduledDate));

  // Oxirgi dars tartib raqamini olish
  const lastLesson = await prisma.lesson.findFirst({
    where: { groupId },
    orderBy: { order: 'desc' },
    select: { order: true },
  });
  let order = (lastLesson?.order ?? 0);

  // Sanalarni generatsiya qilish
  const lessonsToCreate: {
    groupId: string;
    scheduledDate: string;
    scheduledTime: string;
    duration: string;
    order: number;
  }[] = [];

  const current = new Date(start);
  while (current < end) {
    const dayOfWeek = current.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat

    if (allowedDays.includes(dayOfWeek)) {
      const dateStr = formatDate(current);

      if (!existingDates.has(dateStr)) {
        order++;
        lessonsToCreate.push({
          groupId,
          scheduledDate: dateStr,
          scheduledTime: time || '14:00',
          duration,
          order,
        });
      }
    }

    current.setDate(current.getDate() + 1);
  }

  if (lessonsToCreate.length === 0) {
    return { created: 0, message: 'Yangi darslar topilmadi (barcha sanalar allaqachon mavjud)' };
  }

  // Batch yaratish
  const result = await prisma.lesson.createMany({
    data: lessonsToCreate,
  });

  return {
    created: result.count,
    message: `${result.count} ta dars yaratildi (${formatDate(start)} dan ${formatDate(end)} gacha)`,
  };
}

/**
 * Bitta oy uchun darslarni generatsiya qiladi.
 * Masalan: generateLessonsForMonth(groupId, 2026, 8)
 */
export async function generateLessonsForMonth(
  groupId: string,
  year: number,
  month: number, // 1-12
) {
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { dayType: true, time: true, startDate: true },
  });

  if (!group) throw new Error('Guruh topilmadi');

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;

  return generateLessons({
    groupId,
    startDate,
    months: 1,
    dayType: group.dayType || 'toq',
    time: group.time || '14:00',
  });
}

function formatDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
