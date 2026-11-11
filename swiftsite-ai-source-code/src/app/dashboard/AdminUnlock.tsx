"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { LogoMark } from "@/components/Logo";

export function AdminUnlock({ configured }: { configured: boolean }) {
  const [pin, setPin] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!configured || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/session", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not unlock dashboard.");
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unlock dashboard.");
      setBusy(false);
    }
  }

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-12">
      <div className="w-full max-w-sm">
        <Link href="/chat" className="mb-5 inline-flex items-center gap-2 text-xs font-semibold text-leaf-800 hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to assistant
        </Link>
        <div className="glass-strong rounded-[1.8rem] p-6 shadow-xl sm:p-8">
          <div className="flex items-center gap-3">
            <LogoMark size={40} />
            <span className="rounded-full border border-leaf-800/15 bg-white/70 px-3 py-1 text-[11px] font-semibold text-leaf-800">Owner only</span>
          </div>
          <h1 className="mt-6 text-2xl font-bold text-leaf-950">SwiftSite control room</h1>
          <p className="mt-1.5 text-sm leading-relaxed text-leaf-950/65">
            Enter your owner PIN to see live conversations and change assistant settings.
          </p>
          <form onSubmit={submit} className="mt-6 space-y-3">
            <label htmlFor="admin-pin" className="block text-xs font-bold text-leaf-800">Owner PIN</label>
            <div className="relative">
              <input
                id="admin-pin" type={show ? "text" : "password"}
                inputMode="numeric" pattern="[0-9]*" autoComplete="off" maxLength={12}
                value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                placeholder="Enter PIN" className="field !pr-12 font-mono !text-base tracking-[0.22em]" required
              />
              <button type="button" aria-label={show ? "Hide PIN" : "Show PIN"} onClick={() => setShow((v) => !v)}
                className="absolute top-1/2 right-2 grid h-9 w-9 -translate-y-1/2 cursor-pointer place-items-center rounded-xl text-leaf-900/60 hover:bg-white/70">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {error && <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
            {!configured && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">The owner must set ADMIN_PIN_HASH and ADMIN_ENCRYPTION_KEY on the server.</p>}
            <button type="submit" disabled={!configured || busy || !pin} className="btn btn-primary w-full !py-2.5">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
              Unlock dashboard
            </button>
          </form>
          <div className="mt-6 border-t border-leaf-950/10 pt-4 text-xs leading-relaxed text-leaf-950/60">
            <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-leaf-700" /> Only a PIN hash is stored server-side.</p>
            <p className="mt-2">Shortcut: Windows + Ctrl + Shift + Z. If Windows intercepts it, try Ctrl + Shift + Z or open /dashboard.</p>
          </div>
        </div>
      </div>
    </main>
  );
}
