import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Zolid | Image to 3D",
  description: "Turn a photo into an interactive 3D model.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-[#070b13] text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}
