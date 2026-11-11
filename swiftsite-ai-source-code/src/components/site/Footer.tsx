import Link from "next/link";
import { LogoMark } from "@/components/Logo";

const COLS = [
  {
    title: "Product",
    links: [
      { label: "Assistant", href: "/chat" },
      { label: "Tools", href: "/tools" },
      { label: "Prompt library", href: "/chat" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Docs", href: "/docs" },
      { label: "Changelog", href: "/changelog" },
      { label: "FAQ", href: "/#faq" },
    ],
  },
  {
    title: "Community",
    links: [
      { label: "Instagram", href: "https://www.instagram.com/swif.site/" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/m-harry-js-98076442a" },
      { label: "GitHub", href: "https://github.com/Mharryjs" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="px-3 pb-6">
      <div className="glass mx-auto max-w-6xl rounded-[2rem] px-6 py-8 sm:px-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <Link href="/" className="inline-flex items-center gap-2.5">
              <LogoMark size={36} />
              <span className="text-lg font-bold tracking-tight">
                <span className="text-leaf-900">Swift</span>
                <span className="bg-gradient-to-r from-amber-600 to-amber-500 bg-clip-text text-transparent">
                  Site
                </span>
              </span>
            </Link>
            <p className="font-accent mt-4 max-w-xs text-sm leading-relaxed font-medium text-leaf-950/65">
              A place to chat, build web pages and get things done. Made in Pakistan 🇵🇰
            </p>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="font-mono text-[11px] font-bold tracking-[0.18em] text-leaf-700 uppercase">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith("http") ? (
                      <a
                        href={l.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-leaf-950/60 transition-colors hover:text-leaf-800"
                      >
                        {l.label}
                      </a>
                    ) : (
                      <Link
                        href={l.href}
                        className="text-sm text-leaf-950/60 transition-colors hover:text-leaf-800"
                      >
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-leaf-950/10 pt-5 text-xs text-leaf-950/50">
          <span>© 2026 SwiftSite · made by MharryJS & Hiba Kashif</span>
          
        </div>
      </div>
    </footer>
  );
}
