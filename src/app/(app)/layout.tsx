import type { ReactNode } from "react";
import SiteHeader from "@/components/layout/SiteHeader";

export default function AppLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <>
      <SiteHeader />
      {children}
    </>
  );
}
