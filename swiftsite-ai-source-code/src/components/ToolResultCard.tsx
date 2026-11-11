"use client";

import { useState } from "react";
import {
  AlignLeft,
  ArrowLeftRight,
  Binary,
  Calculator,
  CalendarDays,
  Check,
  CircleAlert,
  Clock3,
  Copy,
  Fingerprint,
  Hash,
  KeyRound,
  Link2,
} from "lucide-react";
import type { ToolResult } from "@/lib/tools";

const TOOL_ICONS: Record<string, typeof Calculator> = {
  calc: Calculator,
  convert: ArrowLeftRight,
  time: Clock3,
  days: CalendarDays,
  password: KeyRound,
  hash: Hash,
  uuid: Fingerprint,
  base64: Binary,
  slug: Link2,
  count: AlignLeft,
};

export function ToolResultCard({ result, tone = "light" }: { result: ToolResult; tone?: "light" | "panel" }) {
  const [copied, setCopied] = useState(false);
  const Icon = TOOL_ICONS[result.tool] ?? Calculator;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(result.value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable */
    }
  };

  if (!result.ok) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50/90 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-red-700">
          <CircleAlert className="h-4 w-4" />
          /{result.tool} ran into a problem
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-red-600">{result.error}</p>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border shadow-[0_10px_30px_rgba(14,45,29,0.08)] ${
        tone === "panel" ? "border-white/70 bg-white/80" : "border-pine-900/10 bg-white"
      } backdrop-blur`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-pine-900/8 bg-gradient-to-r from-emerald-50/80 to-transparent px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-emerald-500 to-green-700 text-white shadow-sm">
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="truncate font-mono text-xs font-medium text-pine-700">{result.title}</span>
        </div>
        <span className="shrink-0 rounded-full border border-emerald-600/20 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-emerald-700">
          /{result.tool}
        </span>
      </div>

      <div className="px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 font-mono text-[15px] font-semibold leading-relaxed break-all whitespace-pre-wrap text-pine-900">
            {result.value}
          </p>
          <button
            onClick={copy}
            aria-label="Copy result"
            className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border transition-all ${
              copied
                ? "border-emerald-500 bg-emerald-500 text-white"
                : "border-pine-900/15 bg-white text-pine-700 hover:border-emerald-400 hover:text-emerald-600"
            }`}
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        {result.details.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {result.details.map((d, idx) => (
              <span
                key={`${d.label}-${idx}`}
                className="inline-flex items-center gap-1.5 rounded-full border border-pine-900/10 bg-cream-100/80 px-2.5 py-1 text-[11px] text-pine-800"
              >
                <span className="font-semibold uppercase tracking-wide text-pine-600/80">{d.label}</span>
                <span className="font-mono">{d.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
