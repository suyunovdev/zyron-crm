import { prisma } from '@/lib/db';
import { computeLessonDates } from '@/lib/schedule';
import { lessonDefaultsFromGroup } from '@/lib/lesson-fields';

interface GenerateOptions {
  groupId: string;
  startDate: string;  // "2026-07-01" formatda
  months?: number;    // necha oy uchun (endDate berilmasa; default: 12)
  endDate?: string;   // "2026-12-31" — shu sanagacha (berilsa months o'rniga ishlatiladi)
  dayType: string;    // "toq" | "juft"
}

/**
 * Berilgan guruh uchun darslarni avtomatik generatsiya qiladi.
 * Sanalar sof `computeLessonDates` (schedule.ts) bilan hisoblanadi; dars maydonlari
 * (vaqt/davomiylik/narx snapshot) esa `lessonDefaultsFromGroup` (yagona manba) dan olinadi —
 * shu bilan har joyda bir xil default. Mavjud sanalar bilan duplikat bo'lmaydi.
 */
export async function generateLessons(opts: GenerateOptions) {
  const { groupId, startDate, months = 12, endDate, dayType } = opts;

  // Guruh sozlamasi — dars maydonlari uchun yagona manba
  const grp = await prisma.group.findUnique({
    where: { id: groupId },
    select: { price: true, lessonsPerMonth: true, time: true, duration: true },
  });
  if (!grp) throw new Error('Guruh topilmadi');
  const fields = lessonDefaultsFromGroup(grp); // { scheduledTime, duration, perLessonRate }

  // Sof kalendar hisobi (toq/juft dan boshqa dayType → throw)
  const dates = computeLessonDates({ startDate, dayType, months, endDate });

  // Mavjud darslar sanalari (duplikat oldini olish)
  const existingLessons = await prisma.lesson.findMany({ where: { groupId }, select: { scheduledDate: true } });
  const existingDates = new Set(existingLessons.map(l => l.scheduledDate));

  // Oxirgi tartib raqami
  const lastLesson = await prisma.lesson.findFirst({ where: { groupId }, orderBy: { order: 'desc' }, select: { order: true } });
  let order = lastLesson?.order ?? 0;

  const lessonsToCreate = dates
    .filter(d => !existingDates.has(d))
    .map(scheduledDate => ({ groupId, scheduledDate, ...fields, order: ++order }));

  if (lessonsToCreate.length === 0) {
    return { created: 0, message: 'Yangi darslar topilmadi (barcha sanalar allaqachon mavjud)' };
  }

  const result = await prisma.lesson.createMany({ data: lessonsToCreate });
  return {
    created: result.count,
    message: `${result.count} ta dars yaratildi (${startDate} dan ${endDate || `${months} oy`} gacha)`,
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
    select: { dayType: true },
  });
  if (!group) throw new Error('Guruh topilmadi');

  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  return generateLessons({
    groupId,
    startDate,
    months: 1,
    dayType: group.dayType || 'toq',
  });
}
