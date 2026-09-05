// Dars (Lesson) sana-bo'lmagan maydonlarining YAGONA manbasi.
// Barcha dars-yaratuvchi joylar (generator, admin/attendance, admin/lessons) shu yerdan
// foydalanadi — aks holda har joy o'z default'ini (masalan '00:00', '1.5 soat', null rate)
// qo'yib, guruh sozlamasidan "drift" qilardi.

import { perLessonRate } from '@/lib/billing-core';

export const DEFAULT_LESSON_TIME = '14:00';

export interface GroupLessonConfig {
  time: string | null;
  duration: string;
  price: number;
  lessonsPerMonth: number;
}

/**
 * Guruhdan darsning sana-bo'lmagan maydonlarini (vaqt, davomiylik, narx snapshot) hosil qiladi.
 * scheduledTime: guruh vaqti, bo'lmasa DEFAULT_LESSON_TIME.
 * duration: DOIM guruhniki (hech qachon literal).
 * perLessonRate: yaratilgan paytdagi narx snapshot'i (billing-core).
 */
export function lessonDefaultsFromGroup(g: GroupLessonConfig): {
  scheduledTime: string;
  duration: string;
  perLessonRate: number;
} {
  return {
    scheduledTime: g.time || DEFAULT_LESSON_TIME,
    duration: g.duration,
    perLessonRate: perLessonRate(g.price, g.lessonsPerMonth),
  };
}
