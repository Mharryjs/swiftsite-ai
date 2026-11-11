"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Play } from "lucide-react";
import { isTool, TOOL_CATALOG, type ToolResult } from "@/lib/tools";
import { ToolResultCard } from "@/components/ToolResultCard";

const CHIP_EXAMPLES: Record<string, string> = {
  calc: "/calc (1250 * 12) / 7 + sqrt(144)",
  convert: "/convert 5 miles to km",
  time: "/time karachi, london, new york",
  days: "/days today 2026-12-25",
  password: "/password 24",
  hash: "/hash sha256 hello swiftsite",
};

const CHIPS = Object.keys(CHIP_EXAMPLES);

type Run = { result: ToolResult; id: string };

export function TryLive() {
  const [value, setValue] = useState("calc (1250 * 12) / 7 + sqrt(144)");
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<string>).detail;
      setValue(detail.replace(/^\/+/, ""));
      setLocalError(null);
      document.getElementById("try")?.scrollIntoView({ behavior: "smooth", block: "center" });
      setTimeout(() => inputRef.current?.focus(), 450);
    };
    window.addEventListener("swiftsite:prefill", handler);
    return () => window.removeEventListener("swiftsite:prefill", handler);
  }, []);

  const run = async (e?: FormEvent) => {
    e?.preventDefault();
    const raw = value.trim();
    if (!raw || loading) return;

    const stripped = raw.replace(/^\/+/, "");
    const first = stripped.split(/\s+/, 1)[0]?.toLowerCase() ?? "";
    const tool = isTool(first) ? first : "calc";
    const input = isTool(first) ? stripped.slice(first.length).trim() : stripped;

    setLoading(true);
    setLocalError(null);
    try {
      const res = await fetch("/api/tools/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool, input }),
      });
      const data = (await res.json()) as ToolResult & { error?: string };
      if (typeof data.tool !== "string") {
        setLocalError(data.error ?? "The server refused that command.");
      } else {
        setRuns((prev) => [{ result: data, id: crypto.randomUUID() }, ...prev].slice(0, 4));
      }
    } catch {
      setLocalError("Network hiccup — the server didn't answer.");
    } finally {
      setLoading(false);
    }
  };

  const current = runs[0]?.result ?? null;
  const older = runs.slice(1, 4);

  return (
    <div id="try" className="glass-strong rounded-[1.75rem] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-leaf-950">Try it live</h2>
          <p className="text-xs text-leaf-950/60">Quick tools, answered instantly.</p>
        </div>
        <span className="chip">
          <span className="h-2 w-2 animate-pulse-dot rounded-full bg-leaf-500" />
          Online
        </span>
      </div>

      <form onSubmit={run} className="mt-4 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-mono text-sm font-bold text-leaf-600">
            /
          </span>
          <label htmlFor="demo-cmd" className="sr-only">
            Command
          </label>
          <input
            id="demo-cmd"
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="calc 15% of 2450"
            spellCheck={false}
            autoComplete="off"
            className="field !pl-7 font-mono !text-[0.85rem]"
          />
        </div>
        <button className="btn btn-primary" type="submit" disabled={loading}>
          {loading ? <Loader2 width={14} height={14} className="animate-spin" /> : <Play width={14} height={14} fill="currentColor" />}
          Run
        </button>
      </form>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {CHIPS.map((chip) => (
          <button
            key={chip}
            onClick={() => {
              setValue(CHIP_EXAMPLES[chip]!.replace(/^\/+/, ""));
              inputRef.current?.focus();
            }}
            className="cursor-pointer rounded-full border border-white/90 bg-white/55 px-3 py-1 font-mono text-[0.7rem] text-leaf-900 transition hover:bg-white"
          >
            {chip}
          </button>
        ))}
        <span className="self-center pl-1 font-mono text-[0.7rem] text-leaf-950/50">
          +{TOOL_CATALOG.length - CHIPS.length} more below
        </span>
      </div>

      <div className="mt-4 min-h-[148px]">
        <AnimatePresence mode="wait">
          {localError ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl border border-red-200 bg-red-50/90 px-4 py-3 text-sm font-medium text-red-600"
            >
              {localError}
            </motion.div>
          ) : current ? (
            <motion.div
              key={runs[0]!.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}
            >
              <ToolResultCard result={current} tone="panel" />
            </motion.div>
          ) : (
            <motion.div
              key="placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="dot-grid grid h-[148px] place-items-center rounded-2xl border border-dashed border-leaf-900/20 bg-leaf-50/50"
            >
              <p className="px-6 text-center font-mono text-xs leading-relaxed text-leaf-950/55">
                Press Run to see the answer here.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {older.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {older.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-2.5 rounded-xl border border-white/80 bg-white/55 px-3 py-1.5 text-xs"
              >
                <span className="shrink-0 rounded-md bg-leaf-900/8 px-1.5 py-0.5 font-mono font-semibold text-leaf-700">
                  /{r.result.tool}
                </span>
                <span className="min-w-0 flex-1 truncate font-mono text-leaf-950/80">
                  {r.result.ok ? r.result.value.split("\n")[0] : r.result.error}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
