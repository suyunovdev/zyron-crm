import type { NextConfig } from "next";

// Barcha javoblarga qo'yiladigan xavfsizlik + indekslash headerlari.
// Bu private CRM — hech qayerda indekslanmaydi va iframe'ga joylanmaydi.
const securityHeaders = [
  // HTTPS'ni majburiy qilish. includeSubDomains QO'YMAYMIZ — bitta build
  // ham crm./my. (akaukalarmarkazi.uz), ham demo (zyron.uz) uchun ishlaydi;
  // qo'shni subdomenlarni buzmaslik uchun faqat shu host bilan cheklaymiz.
  { key: "Strict-Transport-Security", value: "max-age=31536000" },
  // Clickjacking himoyasi — CRM'ni boshqa saytlar iframe'ga sololmaydi.
  { key: "X-Frame-Options", value: "DENY" },
  // MIME-sniffing'ni to'sish.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer sizishini cheklash (tashqi saytga to'liq URL ketmasin).
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Keraksiz brauzer imkoniyatlarini o'chirish.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // Butun ilovani qidiruv tizimlaridan chiqarish (login/dashboard indekslanmasin).
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
  // DNS prefetch (UX).
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  // "X-Powered-By: Next.js" ni olib tashlaymiz (texnologiyani oshkor qilmaslik).
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },

  // Bir nechta lockfile bo'lganda Turbopack workspace root'ni noto'g'ri
  // aniqlamasligi uchun loyiha papkasini aniq belgilaymiz.
  turbopack: {
    root: import.meta.dirname,
  },
};

export default nextConfig;
