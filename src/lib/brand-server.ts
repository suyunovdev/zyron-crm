import { cache } from 'react';
import { getSettings } from '@/lib/settings';
import { resolveBrand, type Brand } from '@/lib/brand';

// Joriy brend: DB (superadmin "Markaz profili") ustidan env standartlari.
// React cache — bitta so'rov ichida DB bir marta o'qiladi.
export const getBrand = cache(async (): Promise<Brand> => {
  const s = await getSettings();
  return resolveBrand({ brandName: s.brandName, brandColor: s.brandColor, brandLogo: s.brandLogo });
});
