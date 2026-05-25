import type { Metadata } from "next";
import { Manrope, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// 1. Primary Body Font (Clean, modern)
const manrope = Manrope({
  variable: "--font-sans",
  subsets: ["latin"],
});

// 2. Display Heading Font (Wide, elegant, tech-forward)
const sora = Sora({
  variable: "--font-heading", // Swapped to a more generic name!
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Frags: Premium WebGL Shaders | Ready to Paste",
  description: "High-performance, interactive React backgrounds powered by lightweight WebGL.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${sora.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans bg-[#050505] text-zinc-50">
        {children}
      </body>
    </html>
  );
}