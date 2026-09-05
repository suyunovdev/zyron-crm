import { describe, it, expect } from 'vitest';
import { lessonDefaultsFromGroup, DEFAULT_LESSON_TIME } from '@/lib/lesson-fields';

describe('lessonDefaultsFromGroup — dars maydonlari yagona manbasi', () => {
  it('guruh vaqti bo\'lsa o\'shani, bo\'lmasa DEFAULT_LESSON_TIME', () => {
    expect(lessonDefaultsFromGroup({ time: '17:00', duration: '2 soat', price: 0, lessonsPerMonth: 12 }).scheduledTime).toBe('17:00');
    expect(lessonDefaultsFromGroup({ time: null, duration: '2 soat', price: 0, lessonsPerMonth: 12 }).scheduledTime).toBe(DEFAULT_LESSON_TIME);
    expect(DEFAULT_LESSON_TIME).toBe('14:00');
  });

  it('duration DOIM guruhniki (hech qachon literal)', () => {
    expect(lessonDefaultsFromGroup({ time: '14:00', duration: '3 soat', price: 0, lessonsPerMonth: 12 }).duration).toBe('3 soat');
  });

  it('perLessonRate = narx / oyiga darslar (snapshot)', () => {
    expect(lessonDefaultsFromGroup({ time: null, duration: '2 soat', price: 400000, lessonsPerMonth: 12 }).perLessonRate).toBeCloseTo(33333.33, 2);
  });

  it('lessonsPerMonth 0 → rate 0 (nolga bo\'lish yo\'q)', () => {
    expect(lessonDefaultsFromGroup({ time: null, duration: '2 soat', price: 400000, lessonsPerMonth: 0 }).perLessonRate).toBe(0);
  });
});
