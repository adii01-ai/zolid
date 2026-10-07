"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import SignOutButton from "@/components/auth/SignOutButton";

export default function SiteHeader({
  isAuthenticated,
  userEmail,
  credits,
}: {
  isAuthenticated: boolean;
  userEmail: string | null;
  credits: number | null;
}) {
  const pathname = usePathname();
  const displayEmail = userEmail ?? "Account";
  const userInitial = displayEmail.charAt(0).toUpperCase();

  if (pathname === "/billing") {
    return (
      <header className="border-b border-[#24221E] bg-[#100F0D]">
        <nav
          aria-label="Billing navigation"
          className="mx-auto flex min-h-[50px] w-full max-w-[602px] items-center justify-between px-4 sm:px-0"
        >
          <Link
            href="/"
            className="text-[13px] font-bold text-[#F5F3EE] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFB547]"
          >
            Zolid
          </Link>
          <Link
            href="/studio"
            className="text-[9px] text-[#D4D0C7] hover:text-[#FFB547] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFB547]"
          >
            <span aria-hidden="true">‹</span> Back to studio
          </Link>
        </nav>
      </header>
    );
  }

  const appLinks = [
    { label: "Studio", href: "/studio" },
    { label: "Gallery", href: "/gallery" },
    { label: "Billing", href: "/billing" },
  ];

  return (
    <header className="border-b border-neutral-800 bg-neutral-950">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6"
      >
        <Link
          href="/"
          className="text-lg font-semibold text-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFB547]"
        >
          Zolid
        </Link>

        {isAuthenticated ? (
          <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-4">
            <div className="hidden items-center gap-5 text-sm text-neutral-300 md:flex">
              {appLinks.map((item) => (
                <Link key={item.href} href={item.href} className="hover:text-[#FFB547] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFB547]">
                  {item.label}
                </Link>
              ))}
            </div>
            <details className="group relative md:hidden">
              <summary className="cursor-pointer list-none rounded-md border border-neutral-700 px-3 py-2 text-sm text-neutral-200 hover:border-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB547]">
                Menu
              </summary>
              <div className="absolute right-0 top-full z-50 mt-2 grid min-w-40 gap-1 rounded-md border border-neutral-700 bg-neutral-900 p-2 shadow-xl">
                {appLinks.map((item) => (
                  <Link key={item.href} href={item.href} className="rounded px-3 py-2 text-sm text-neutral-200 hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-[#FFB547]">
                    {item.label}
                  </Link>
                ))}
              </div>
            </details>
            <span className="rounded-md border border-[#66502D] bg-[#1D1A15] px-2.5 py-2 text-xs font-medium text-[#FFB547] sm:px-3 sm:text-sm">
              {credits === null ? "Credits unavailable" : `${credits} credits`}
            </span>
            <details className="group relative">
              <summary aria-label="Account menu" className="flex cursor-pointer list-none items-center gap-2 rounded-full border border-neutral-700 py-1 pl-1 pr-2 sm:py-1.5 sm:pl-1.5 sm:pr-3 sm:text-sm text-neutral-200 hover:border-[#66502D] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB547]">
                <span className="flex size-8 items-center justify-center rounded-full bg-[#34291C] font-semibold text-[#FFB547]">
                  {userInitial}
                </span>
                <span className="hidden max-w-40 truncate sm:block">{displayEmail}</span>
                <span aria-hidden="true" className="text-xs text-neutral-400">⌄</span>
              </summary>
              <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-md border border-neutral-700 bg-neutral-900 p-4 shadow-xl">
                <p className="text-xs text-neutral-400">Signed in as</p>
                <p className="mt-1 truncate text-sm font-medium text-neutral-100" title={displayEmail}>
                  {displayEmail}
                </p>
                <div className="mt-4 border-t border-neutral-800 pt-3">
                  <SignOutButton />
                </div>
              </div>
            </details>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="rounded-md px-3 py-2 text-sm font-medium text-neutral-200 hover:bg-neutral-900 hover:text-[#FFB547] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB547]"
            >
              Sign in
            </Link>
            <Link
              href="/auth/signup"
              className="rounded-md bg-[#FFB547] px-3 py-2 text-sm font-semibold text-[#15130F] hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FFB547]"
            >
              Create account
            </Link>
          </div>
        )}
      </nav>
    </header>
  );
}