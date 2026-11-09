import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
    { media: "(prefers-color-scheme: light)", color: "#f4f4f6" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Remidify",
  description: "Fast swipe-card reminders with workspaces.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Remidify",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body className="h-[100dvh] w-full flex justify-center bg-black overflow-hidden">
        <Providers>
          {/* Mobile viewport container (390px-430px centered frame on desktop, edge-to-edge on iPhone) */}
          <div className="w-full max-w-[430px] h-[100dvh] bg-[var(--background)] flex flex-col relative overflow-hidden shadow-2xl">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
