import type { Metadata, Viewport } from "next";
import type { CSSProperties } from "react";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import { BRAND_NAME, BRAND_SHORT, BRAND_COLORS, APP_URL } from "@/lib/brand";

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

export const metadata: Metadata = {
  metadataBase: new URL(APP_URL),
  applicationName: BRAND_NAME,
  title: {
    default: `${BRAND_NAME} — Boshqaruv tizimi`,
    template: `%s — ${BRAND_NAME}`,
  },
  description: `${BRAND_NAME} boshqaruv tizimi: o'quvchilar, guruhlar, davomat va to'lovlar.`,
  // Private CRM — hech qayerda indekslanmasin (login/dashboard qidiruvga tushmasin).
  robots: {
    index: false,
    follow: false,
    googleBot: { index: false, follow: false },
  },
  // iOS'da to'liq ekranli ilova ko'rinishi.
  appleWebApp: {
    capable: true,
    title: BRAND_SHORT,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

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
  return (
    <html
      lang="uz"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
      style={
        {
          // Brend rangi butun UI ga (globals.css --brand-* orqali). Har instance
          // o'z BRAND_COLORS'ini oladi; generic brendda mijoz nomidan hosil bo'ladi.
          '--brand-primary': BRAND_COLORS.primary,
          '--brand-primary-dark': BRAND_COLORS.primaryDark,
          '--brand-primary-light': BRAND_COLORS.primaryLight,
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
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster />
        <ConfirmDialog />
      </body>
    </html>
  );
}
