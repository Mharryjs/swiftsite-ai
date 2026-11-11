"use client";

import { useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlignLeft,
  ArrowLeftRight,
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
  Loader2,
  Play,
  Wrench,
} from "lucide-react";
import { TOOL_CATALOG, type ToolResult } from "@/lib/tools";
import { ToolResultCard } from "@/components/ToolResultCard";

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

export function ToolsExplorer() {
  const [selected, setSelected] = useState(TOOL_CATALOG[0]!.name);
  const [input, setInput] = useState(TOOL_CATALOG[0]!.example.replace(/^\/calc\s*/, ""));
  const [result, setResult] = useState<ToolResult | null>(null);
  const [loading, setLoading] = useState(false);

  const meta = TOOL_CATALOG.find((t) => t.name === selected)!;

  const pick = (name: string) => {
    const m = TOOL_CATALOG.find((t) => t.name === name)!;
    setSelected(name);
    setInput(m.example.replace(new RegExp(`^/${name}\\s*`), ""));
    setResult(null);
  };

  const run = async (e?: FormEvent) => {
    e?.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/tools/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: selected, input: input.trim() }),
      });
      const data = (await res.json()) as ToolResult & { error?: string };
      setResult(typeof data.tool === "string" ? data : {
        ok: false, tool: selected, input, title: "", value: "", details: [],
        error: data.error ?? "The server refused that command.",
      });
    } catch {
      setResult({ ok: false, tool: selected, input, title: "", value: "", details: [], error: "Network hiccup — the server didn't answer." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto w-full min-w-0 max-w-6xl overflow-x-clip px-3 pt-24 pb-24 sm:px-6 sm:pt-40">
      <div className="mx-auto max-w-2xl text-center">
        <span className="chip">Built-in tools</span>
        <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-leaf-950 sm:text-5xl">
          Twelve commands.
          <br />
          <span className="bg-gradient-to-r from-leaf-600 to-emerald-700 bg-clip-text text-transparent">
            Zero latency.
          </span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-leaf-950/70">
          Each one is a chat command and a standalone page. Pick a tool, press Run — exact
          answers, computed on the server.
        </p>
      </div>

      <div className="mt-7 grid min-w-0 grid-cols-2 gap-2 sm:mt-12 sm:gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {TOOL_CATALOG.map((t) => {
          const Icon = ICONS[t.name] ?? Wrench;
          const active = selected === t.name;
          return (
            <button
              key={t.name}
              onClick={() => pick(t.name)}
              className={`group min-w-0 cursor-pointer overflow-hidden rounded-2xl p-3 text-left transition-all duration-200 sm:p-4 ${
                active
                  ? "glass-strong bg-white/85 ring-2 ring-leaf-500/60"
                  : "glass hover:-translate-y-0.5 hover:bg-white/80"
              }`}
            >
              <span className={`grid h-10 w-10 place-items-center rounded-xl border shadow-sm transition-transform group-hover:scale-110 ${active ? "border-leaf-300 bg-leaf-100 text-leaf-700" : "border-white/90 bg-white/70 text-leaf-700"}`}>
                <Icon className="h-4.5 w-4.5" />
              </span>
              <span className="mt-3 block font-mono text-sm font-bold text-leaf-950">/{t.name}</span>
              <span className="mt-1 line-clamp-2 block text-[12px] leading-snug text-leaf-950/60">
                {t.description}
              </span>
            </button>
          );
        })}
      </div>

      <div className="glass-strong mx-auto mt-6 w-full min-w-0 max-w-3xl overflow-hidden rounded-2xl p-3 sm:mt-8 sm:rounded-[1.75rem] sm:p-7">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="break-words font-mono text-[12px] font-bold text-leaf-950 sm:text-base">{meta.usage}</h2>
            <p className="mt-0.5 text-xs text-leaf-950/60">{meta.description}</p>
          </div>
          <span className="chip font-accent shrink-0">
            <span className="h-2 w-2 animate-pulse-dot rounded-full bg-leaf-500" />
            Online
          </span>
        </div>

        <form onSubmit={run} className="mt-4 flex gap-2">
          <div className="relative min-w-0 flex-1">
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-sm font-bold text-leaf-600">
              /{selected}
            </span>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              autoComplete="off"
              placeholder={meta.example.replace(new RegExp(`^/${selected}\\s*`), "")}
              className="field font-mono !text-[0.85rem]"
              style={{ paddingLeft: `${meta.name.length * 8.4 + 26}px` }}
            />
          </div>
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <Loader2 width={14} height={14} className="animate-spin" /> : <Play width={14} height={14} fill="currentColor" />}
            Run
          </button>
        </form>

        <div className="mt-4">
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key={`${result.tool}-${result.input}-${result.value.slice(0, 12)}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.2, 0.7, 0.2, 1] }}
              >
                <ToolResultCard result={result} tone="panel" />
              </motion.div>
            ) : (
              <motion.div
                key="hint"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="dot-grid grid h-[128px] place-items-center rounded-2xl border border-dashed border-leaf-900/20 bg-leaf-50/50"
              >
                <p className="px-6 text-center font-mono text-xs text-leaf-950/50">
                  Example: <span className="font-semibold text-leaf-800">{meta.example}</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
