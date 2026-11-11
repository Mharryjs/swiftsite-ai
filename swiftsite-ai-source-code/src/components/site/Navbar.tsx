"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { LogoWord } from "@/components/Logo";

const LINKS = [
  { label: "Features", href: "/#features" },
  { label: "How it works", href: "/#how" },
  { label: "Tools", href: "/#tools" },
  { label: "Docs", href: "/docs" },
  { label: "FAQ", href: "/#faq" },
];

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-50 px-0 sm:top-4 sm:px-4">
      <header
        className={`glass mx-auto flex max-w-6xl items-center justify-between rounded-none px-4 py-2.5 transition-shadow duration-300 sm:rounded-full sm:py-2 sm:pr-2 sm:pl-5 ${
          scrolled ? "shadow-[0_20px_50px_-20px_rgba(40,100,30,0.45)]" : ""
        }`}
      >
        <LogoWord />

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {LINKS.map((l) => (
            <Link
              key={l.label}
              href={l.href}
              className="rounded-full px-4 py-2 text-sm font-semibold text-leaf-950/70 transition hover:bg-white/70 hover:text-leaf-950"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">

          <Link className="btn btn-primary !rounded-full !px-3.5 !py-2 !text-[13px] sm:!px-4 sm:!py-2 sm:!text-sm" href="/chat">
            <span className="hidden sm:inline">Open assistant</span><span className="sm:hidden">Chat</span> <ArrowRight width={15} height={15} />
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
            className="grid h-10 w-10 place-items-center rounded-full border border-white/90 bg-white/70 text-leaf-900 md:hidden"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="glass-strong absolute inset-x-0 top-full mt-2 rounded-3xl p-3 md:hidden">
            {LINKS.map((l) => (
              <Link
                key={l.label}
                href={l.href}
                onClick={() => setOpen(false)}
                className="block rounded-2xl px-4 py-2.5 text-sm font-semibold text-leaf-950/80 hover:bg-white/70"
              >
                {l.label}
              </Link>
            ))}
            <Link href="/chat" onClick={() => setOpen(false)} className="btn btn-primary mt-2 w-full">
              Open assistant <ArrowRight width={15} height={15} />
            </Link>
          </div>
        )}
      </header>
    </div>
  );
}
