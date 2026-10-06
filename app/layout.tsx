import type { Metadata, Viewport } from "next";
import DemoBanner from "@/components/DemoBanner";

export const metadata: Metadata = {
  title: "Citizen Bank",
  description: "Citizen Bank mobile banking with the Citizen AI voice assistant.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/favicon.png", apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Citizen Bank", statusBarStyle: "black-translucent" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#07060d",
};

import AccessPanel from "@/components/AccessPanel";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <body>
        {children}
        <DemoBanner />
        <AccessPanel />
      </body>
    </html>
  );
}
