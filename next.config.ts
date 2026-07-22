import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Bir nechta lockfile bo'lganda Turbopack workspace root'ni noto'g'ri
  // aniqlamasligi uchun loyiha papkasini aniq belgilaymiz.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
