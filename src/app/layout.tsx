import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import ThemeProvider from "@/components/ThemeProvider";
import { BRAND_NAME, BRAND_SHORT, BRAND_COLORS, APP_URL } from "@/lib/brand";
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="uz"
      className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script
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
