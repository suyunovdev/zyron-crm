import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import { BRAND_COLORS, APP_URL } from "@/lib/brand";
import { getBrand } from "@/lib/brand-server";
import { BrandProvider } from "@/components/brand-context";

// CSP nonce faqat dynamic render qilinganda inject qilinadi — butun ilovani
// dynamic render'ga o'tkazamiz (kam trafikli, auth-gated CRM; SSG shart emas).
export const dynamic = "force-dynamic";
import { Toaster } from "@/components/toast";
import { ConfirmDialog } from "@/components/confirm-dialog";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Brend nomi DB'dan (superadmin "Markaz profili") — har so'rovda.
export async function generateMetadata(): Promise<Metadata> {
  const { name, short } = await getBrand();
  return {
    metadataBase: new URL(APP_URL),
    applicationName: name,
    title: {
      default: `${name} — Boshqaruv tizimi`,
      template: `%s — ${name}`,
    },
    description: `${name} boshqaruv tizimi: o'quvchilar, guruhlar, davomat va to'lovlar.`,
    // Private CRM — hech qayerda indekslanmasin (login/dashboard qidiruvga tushmasin).
    robots: {
      index: false,
      follow: false,
      googleBot: { index: false, follow: false },
    },
    // iOS'da to'liq ekranli ilova ko'rinishi.
    appleWebApp: {
      capable: true,
      title: short,
      statusBarStyle: "default",
    },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Mobil brauzer paneli rangi — yorug'/qorong'i rejimga mos.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: BRAND_COLORS.ink },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const brand = await getBrand();
  return (
    <html
      lang="uz"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
      style={
        {
          // Brend rangi butun UI ga (globals.css --brand-* orqali). Har instance
          // o'z rangini oladi (DB'dagi tanlov > env; generic'da nomdan hosil bo'ladi).
          '--brand-primary': brand.colors.primary,
          '--brand-primary-dark': brand.colors.primaryDark,
          '--brand-primary-light': brand.colors.primaryLight,
        } as CSSProperties
      }
    >
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||((!t)&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen">
        <BrandProvider value={brand}>
          <ThemeProvider>{children}</ThemeProvider>
        </BrandProvider>
        <Toaster />
        <ConfirmDialog />
      </body>
    </html>
  );
}
