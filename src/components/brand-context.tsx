'use client';

import { createContext, useContext } from 'react';
import { resolveBrand, type Brand } from '@/lib/brand';

// Server (layout) getBrand() natijasini client komponentlarga uzatadi.
// Provider yo'q joyda (masalan, testlar) env standart brendi.
const BrandContext = createContext<Brand>(resolveBrand());

export function BrandProvider({ value, children }: { value: Brand; children: React.ReactNode }) {
  return <BrandContext.Provider value={value}>{children}</BrandContext.Provider>;
}

export function useBrand(): Brand {
  return useContext(BrandContext);
}
