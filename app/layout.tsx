import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { SwRegister } from "@/components/SwRegister";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MY GYM",
  description: "Gestor d'entrenaments de gimnàs",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "MY GYM",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f2f2f7",
  colorScheme: "light",
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ca" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col bg-canvas text-label">
        {children}
        <SwRegister />
      </body>
    </html>
  );
}
