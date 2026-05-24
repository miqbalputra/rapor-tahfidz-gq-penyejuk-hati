import type { Metadata, Viewport } from "next";
import { PwaInstallPrompt } from "@/components/pwa/pwa-install-prompt";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rapor Tahfidz GQ Penyejuk Hati",
  description: "Aplikasi input data, penilaian, presensi, dan cetak rapor tahfidz.",
  applicationName: "Rapor GQ",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Rapor GQ",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#1f7a5c",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        {/* Anti-FOUC: terapkan tema dari localStorage sebelum body render agar tidak ada flash putih ke gelap. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('rapor-gq-theme');if(t==='dark'||(!t&&window.matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        {children}
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
