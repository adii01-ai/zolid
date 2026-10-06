import Link from "next/link";

const navItems = [
  { label: "How it works", href: "#how-it-works" },
  { label: "Modes", href: "#modes" },
  { label: "Pricing", href: "#pricing" },
  { label: "FAQ", href: "#faq" },
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#070b13]/90 backdrop-blur-md">
      <nav
        aria-label="Main navigation"
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6"
      >
        <Link
          href="#top"
          className="shrink-0 text-xl font-bold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
        >
          Zolid<span className="text-cyan-300">.</span>
        </Link>

        <div className="order-3 flex w-full items-center justify-center gap-4 overflow-x-auto pb-1 text-xs lg:order-none lg:w-auto lg:gap-6 lg:pb-0 lg:text-sm">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-slate-300 transition hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300"
            >
              {item.label}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <Link
            href="/auth/login"
            className="rounded-md px-3 py-2 text-sm font-medium text-slate-200 transition hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            Log in
          </Link>
          <Link
            href="/auth/signup"
            className="rounded-md bg-cyan-300 px-3 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
          >
            Get started
          </Link>
        </div>
      </nav>
    </header>
  );
}
