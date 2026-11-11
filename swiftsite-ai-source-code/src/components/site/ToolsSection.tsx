"use client";

import Link from "next/link";
import {
  AlignLeft,
  ArrowLeftRight,
  ArrowRight,
  ArrowUpRight,
  Binary,
  Braces,
  Calculator,
  CalendarDays,
  CaseSensitive,
  Clock3,
  Dices,
  Fingerprint,
  Hash,
  KeyRound,
  Wrench,
} from "lucide-react";
import { TOOL_CATALOG } from "@/lib/tools";
import { Reveal } from "@/components/Reveal";

const ICONS: Record<string, typeof Calculator> = {
  calc: Calculator,
  convert: ArrowLeftRight,
  time: Clock3,
  days: CalendarDays,
  password: KeyRound,
  uuid: Fingerprint,
  hash: Hash,
  base64: Binary,
  json: Braces,
  count: AlignLeft,
  case: CaseSensitive,
  random: Dices,
};

export function ToolsSection() {
  const tryTool = (example: string) => {
    window.dispatchEvent(new CustomEvent("swiftsite:prefill", { detail: example }));
  };

  return (
    <section id="tools" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-12 sm:px-6 lg:py-24">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-xl">
            <span className="chip">Built-in tools</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-leaf-950 sm:text-4xl">
              Quick tools
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-leaf-950/70">
              Small things you need all the time. Type them in chat with a slash, or tap a card to try.
            </p>
          </div>
          <Link href="/tools" className="btn btn-ghost">
            Open the tools <ArrowRight width={15} height={15} />
          </Link>
        </div>
      </Reveal>

      <div className="mt-6 grid min-w-0 grid-cols-2 gap-2 sm:mt-10 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">
        {TOOL_CATALOG.map((t, i) => {
          const Icon = ICONS[t.name] ?? Wrench;
          return (
            <Reveal key={t.name} delay={(i % 4) * 0.05}>
              <button
                onClick={() => tryTool(t.example)}
                className="group glass flex h-full min-w-0 w-full cursor-pointer flex-col overflow-hidden rounded-2xl p-3 text-left transition-all duration-300 hover:-translate-y-1 hover:bg-white/80 sm:rounded-3xl sm:p-5"
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-white/90 bg-white/70 text-leaf-700 shadow-sm transition-transform duration-300 group-hover:scale-110 sm:h-10 sm:w-10">
                    <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5" />
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-white/90 bg-white/55 px-2 py-0.5 font-mono text-[0.65rem] font-semibold text-leaf-800 transition-colors group-hover:bg-white">
                    Try it
                    <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </span>
                </div>
                <h3 className="mt-4 font-mono text-sm font-bold text-leaf-950">/{t.name}</h3>
                <p className="mt-1.5 flex-1 text-[11px] leading-snug text-leaf-950/65 sm:text-[13px] sm:leading-relaxed">
                  {t.description}
                </p>
                <code className="mt-3 block w-full min-w-0 overflow-hidden rounded-lg border border-leaf-950/10 bg-leaf-950 px-2 py-1.5 font-mono text-[9px] text-leaf-200 sm:mt-4 sm:rounded-xl sm:px-3 sm:py-2 sm:text-[11px]">
                  <span className="block max-w-full truncate">{t.example}</span>
                </code>
              </button>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
