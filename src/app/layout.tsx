import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";

export const viewport: Viewport = {
  themeColor: "#141614",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Remidify",
  description: "Your tasks, notes, and next steps. All in one clear space.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Remidify",
  },
  icons: {
    apple: "/apple-touch-icon.png",
    icon: "/icons/brand.svg",
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
          <div className="app-frame">
            {children}
          </div>
        </Providers>
      </body>
    </html>
  );
}
