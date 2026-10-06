import Link from "next/link";

const footerColumns = [
  {
    title: "Product",
    links: [
      { label: "How it works", href: "#how-it-works" },
      { label: "Modes", href: "#modes" },
      { label: "Pricing", href: "#pricing" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "FAQ", href: "#faq" },
      { label: "Contact", href: "mailto:hello@zolid.app" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Terms", href: "/terms" },
      { label: "Privacy", href: "/privacy" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="border-t border-slate-800 bg-[#070b13] px-5 py-12 sm:px-8">
      <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr]">
        <div>
          <div className="text-lg font-bold text-white">Zolid</div>
          <p className="mt-3 max-w-[29ch] text-sm leading-6 text-slate-400">
            Turn one image into an interactive depth relief.
          </p>
        </div>

        {footerColumns.map((column) => (
          <div key={column.title}>
            <div className="mb-3 text-sm font-bold text-slate-100">
              {column.title}
            </div>
            <div className="space-y-2 text-sm text-slate-400">
              {column.links.map((link) => (
                <Link
                  key={link.label}
                  href={
                    link.href.startsWith("/")
                      ? `mailto:hello@zolid.app?subject=${encodeURIComponent(link.label)}`
                      : link.href
                  }
                  className="block transition hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-8 max-w-6xl border-t border-slate-800 pt-6 text-sm text-slate-500">
        Zolid
      </div>
    </footer>
  );
}
