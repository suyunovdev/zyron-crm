import type { MetadataRoute } from 'next';

// Private CRM — indekslash X-Robots-Tag/meta orqali (har javobda noindex).
// robots.txt'da "Disallow: /" QO'YMAYMIZ: aks holda bot sahifani o'qiy
// olmaydi va noindex'ni ko'rmaydi (URL-only ko'rinishda qolib ketardi).
// Shu sabab crawl'ga ruxsat beramiz — bot kirib noindex'ni ko'rib chiqarib tashlaydi.
// API'ni esa umuman ochmaymiz.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/'],
    },
  };
}
