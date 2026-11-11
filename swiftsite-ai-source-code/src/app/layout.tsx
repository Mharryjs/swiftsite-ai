import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Fraunces, JetBrains_Mono, Manrope, Plus_Jakarta_Sans, Sora } from "next/font/google";
import { PwaOnlyChat } from "@/components/PwaOnlyChat";
import "./globals.css";

const bodyFont = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta", display: "swap" });
const accentFont = Manrope({ subsets: ["latin"], variable: "--font-manrope", display: "swap" });
const serifFont = Fraunces({ subsets: ["latin"], variable: "--font-fraunces", display: "swap" });
const headingFont = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const codeFont = JetBrains_Mono({ subsets: ["latin"], variable: "--font-jbm", display: "swap" });

export const metadata: Metadata = {
  title: "SwiftSite — Your AI assistant",
  description: "Chat, create, build websites and use helpful tools in your own private SwiftSite workspace.",
  applicationName: "SwiftSite Assistant",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SwiftSite", statusBarStyle: "default" },
  icons: {
    icon: [{ url: "/icons/swiftsite-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/swiftsite-192.png", sizes: "192x192" }],
  },
};

export const viewport: Viewport = { themeColor: "#376f28", width: "device-width", initialScale: 1, viewportFit: "cover" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${bodyFont.variable} ${headingFont.variable} ${codeFont.variable} ${accentFont.variable} ${serifFont.variable}`}>
      <body><PwaOnlyChat />{children}</body>
    </html>
  );
}
