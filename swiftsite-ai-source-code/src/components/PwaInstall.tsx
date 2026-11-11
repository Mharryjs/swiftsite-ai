"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

export function PwaInstall() {
  const [installEvent, setInstallEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    const standalone = window.matchMedia("(display-mode: standalone)");
    const sync = () => setInstalled(standalone.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    sync();
    standalone.addEventListener("change", sync);
    const ready = (event: Event) => { event.preventDefault(); setInstallEvent(event as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setInstallEvent(null); setShowHelp(false); };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      standalone.removeEventListener("change", sync);
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  async function install() {
    if (!installEvent) { setShowHelp(true); return; }
    await installEvent.prompt();
    const choice = await installEvent.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setInstallEvent(null);
  }

  return (
    <>
      <button onClick={install} title="Install SwiftSite" aria-label="Install app"
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/80 bg-white/70 px-3 text-[11px] font-bold text-leaf-900 transition-colors hover:bg-white sm:text-xs">
        <Download className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Install app</span>
      </button>
      {showHelp && <div className="fixed inset-0 z-[80] grid place-items-center bg-leaf-950/45 p-5 backdrop-blur-sm" onClick={() => setShowHelp(false)}>
        <div className="glass-strong w-full max-w-sm rounded-3xl p-5" onClick={(event) => event.stopPropagation()}>
          <div className="flex items-start justify-between gap-2"><h2 className="text-lg font-bold text-leaf-950">Install SwiftSite</h2><button onClick={() => setShowHelp(false)} title="Close" className="grid h-8 w-8 place-items-center rounded-full bg-white/70"><X className="h-4 w-4" /></button></div>
          <p className="mt-3 text-sm leading-relaxed text-leaf-950/75">On iPhone: tap <strong>Share → Add to Home Screen</strong>. On Android or desktop: open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home Screen</strong>.</p>
          <p className="mt-3 rounded-xl bg-leaf-100/80 p-3 text-xs text-leaf-900">The installed app opens straight to the assistant, with no email sign-in.</p>
        </div>
      </div>}
    </>
  );
}
