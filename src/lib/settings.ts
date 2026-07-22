import { prisma } from '@/lib/db';

/** Tizim sozlamalari — standart qiymatlar bilan. */
export const SETTING_DEFAULTS: Record<string, string> = {
  centerName: 'Aka-Uka Ta\'lim Markazi',
  defaultPrice: '400000',
  defaultLessonsPerMonth: '12',
  defaultSalaryShare: '40', // ustoz standart ulushi (%)
  currency: 'so\'m',
};

export async function getSettings(): Promise<Record<string, string>> {
  const rows = await prisma.setting.findMany();
  const map: Record<string, string> = { ...SETTING_DEFAULTS };
  for (const r of rows) map[r.key] = r.value;
  return map;
}

export async function getSetting(key: string): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? SETTING_DEFAULTS[key] ?? '';
}

export async function setSettings(values: Record<string, string>): Promise<void> {
  await Promise.all(
    Object.entries(values).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } }),
    ),
  );
}
