"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Activity, ArrowLeft, Check, ChevronRight, CircleHelp, Clock3, Download, Eye, EyeOff,
  FileUp, KeyRound, Loader2, LockKeyhole, MessageSquare, Radio, RefreshCw,
  Save, Search, Settings2, ShieldCheck, Trash2, Users, Wrench, X,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { Markdown } from "@/components/assistant/Markdown";
import { GEMINI_MODELS, type GeminiModel } from "@/lib/gemini-models";

type Stats = { visitors: number; chats: number; questions: number; today: number; online: number; tools: number; uploads: number };
type Person = { id: string; label: string; createdAt: string; lastSeenAt: string; chats: number; questions: number };
type Event = {
  id: string; role: string; content: string; kind: string | null; createdAt: string;
  conversationId: string; title: string; visitorId: string | null;
};
type Conversation = { id: string; title: string; visitorId: string | null; createdAt: string; messageCount: number };
type FullMessage = { id: string; role: string; content: string; toolName: string | null; createdAt: string };
type Settings = {
  appName: string; welcomeTitle: string; welcomeSubtitle: string; systemPrompt: string;
  model: GeminiModel; geminiKeySet: boolean; keySource: string | null; updatedAt: string;
};
type Data = { stats: Stats; people: Person[]; activity: Event[]; recentChats: Conversation[]; hasMore: boolean; updatedAt: string };
type Tab = "overview" | "visitors" | "conversations" | "settings";

const labelFor = (id: string | null) => id ? `Visitor ${id.slice(0, 6).toUpperCase()}` : "Older workspace";
const relative = (value: string) => {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  return seconds < 60 ? "just now" : seconds < 3600 ? `${Math.floor(seconds / 60)}m ago` : seconds < 86400 ? `${Math.floor(seconds / 3600)}h ago` : new Date(value).toLocaleDateString();
};

export function Dashboard() {
  const [tab, setTab] = useState<Tab>("overview");
  const [data, setData] = useState<Data | null>(null);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [older, setOlder] = useState<Event[]>([]);
  const [selected, setSelected] = useState<{ title: string; who: string; messages: FullMessage[]; id: string } | null>(null);
  const [search, setSearch] = useState("");
  const [saveState, setSaveState] = useState("");
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [running, setRunning] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin${filter ? `?user=${filter}` : ""}`, { cache: "no-store" });
      if (res.status === 403) { window.location.reload(); return; }
      if (res.ok) setData(await res.json() as Data);
    } catch { setError("Dashboard could not refresh. Check your connection."); }
  }, [filter]);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/admin/settings", { cache: "no-store" });
    if (res.ok) setSettings(await res.json() as Settings);
  }, []);

  useEffect(() => { refresh(); loadSettings(); }, [refresh, loadSettings]);
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(refresh, 4000);
    return () => clearInterval(timer);
  }, [refresh, running]);

  async function openChat(id: string, title: string, visitorId: string | null) {
    const res = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
    if (!res.ok) { setError("Could not load this conversation."); return; }
    const body = await res.json() as { messages: FullMessage[] };
    setSelected({ id, title, who: labelFor(visitorId), messages: body.messages });
  }

  async function deleteChat(id: string) {
    if (!window.confirm("Delete this entire conversation and its messages? This cannot be undone.")) return;
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (res.ok) { setSelected(null); await refresh(); }
    else setError("Could not delete the conversation.");
  }

  async function saveSettings() {
    if (!settings || saving) return;
    setSaving(true); setSaveState("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", ...settings, geminiKey: keyInput }),
      });
      const result = await res.json() as { ok?: boolean; error?: string; warning?: string };
      if (!res.ok) throw new Error(result.error ?? "Settings could not be saved.");
      setSaveState(result.warning ?? "Saved. The next AI reply uses these settings; the chat screen updates automatically.");
      setKeyInput(""); setShowKey(false);
      await loadSettings();
      try { new BroadcastChannel("ss_settings").postMessage({ type: "updated" }); } catch { /* polling still works */ }
    } catch (err) { setSaveState(err instanceof Error ? err.message : "Settings could not be saved."); }
    finally { setSaving(false); }
  }

  async function testGemini() {
    if (!settings || testing) return;
    setTesting(true); setSaveState("");
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "test", key: keyInput, model: settings.model }),
      });
      const result = await res.json() as { ok?: boolean; error?: string; quota?: boolean };
      setSaveState(result.quota ? result.error ?? "Gemini quota is full; try again later." : result.ok ? "Gemini replied successfully. Your connection is working." : result.error ?? "Gemini could not answer.");
    } catch { setSaveState("Could not reach the server to test the key."); }
    finally { setTesting(false); }
  }

  async function clearGemini() {
    if (!window.confirm("Remove the dashboard Gemini key?")) return;
    const res = await fetch("/api/admin/settings", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "clearKey" }) });
    if (res.ok) { await loadSettings(); setSaveState("Dashboard key removed."); }
  }

  async function lock() {
    await fetch("/api/admin/session", { method: "DELETE" });
    window.location.replace("/chat");
  }

  function exportVisible() {
    const payload = { exportedAt: new Date().toISOString(), visitors: data?.people ?? [], chats: data?.recentChats ?? [], activity: [...(data?.activity ?? []), ...older] };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a"); a.href = url; a.download = "swiftsite-dashboard.json"; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function moreActivity() {
    const next = offset + 100;
    const res = await fetch(`/api/admin?offset=${next}${filter ? `&user=${filter}` : ""}`, { cache: "no-store" });
    if (res.ok) { const result = await res.json() as Data; setOlder((prev) => [...prev, ...result.activity]); setOffset(next); }
  }

  function changeFilter(id: string | null) { setFilter(id); setOlder([]); setOffset(0); setTab("overview"); }
  const counts = data?.stats;
  const metrics = [
    { label: "Visitors", value: counts?.visitors, icon: Users },
    { label: "Online · 5 min", value: counts?.online, icon: Radio },
    { label: "Conversations", value: counts?.chats, icon: MessageSquare },
    { label: "Questions", value: counts?.questions, icon: CircleHelp },
    { label: "Today", value: counts?.today, icon: Clock3 },
    { label: "Tool runs", value: counts?.tools, icon: Wrench },
    { label: "Files", value: counts?.uploads, icon: FileUp },
  ];
  const feed = [...(data?.activity ?? []), ...older].filter((item) => !search || `${item.title} ${item.content} ${labelFor(item.visitorId)}`.toLowerCase().includes(search.toLowerCase()));

  return (
    <main className="mx-auto min-h-dvh w-full max-w-[1320px] px-3 py-4 pb-20 sm:px-6 sm:py-8">
      <header className="glass-strong flex flex-wrap items-center justify-between gap-3 rounded-3xl px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3"><LogoMark size={34} /><div><p className="text-[11px] font-bold tracking-widest text-leaf-700 uppercase">SwiftSite</p><h1 className="text-lg font-extrabold text-leaf-950">Control room</h1></div></div>
        <div className="flex items-center gap-2">
          <Link href="/chat" className="btn btn-ghost !rounded-full !px-3 !py-2 !text-xs"><ArrowLeft className="h-4 w-4" /> Assistant</Link>
          <button onClick={() => setRunning((value) => !value)} className="btn btn-ghost !rounded-full !px-3 !py-2 !text-xs"><Radio className={`h-3.5 w-3.5 ${running ? "text-green-600" : "text-leaf-950/40"}`} />{running ? "Live · 4s" : "Paused"}</button>
          <button onClick={lock} className="btn btn-ghost !rounded-full !px-3 !py-2 !text-xs"><LockKeyhole className="h-3.5 w-3.5" /> Lock</button>
        </div>
      </header>
      <p className="mx-1 mt-3 text-xs text-leaf-950/60">Visitors use random workspace IDs, not email accounts. Their real-world identity is unknown.</p>
      {error && <p role="alert" className="mt-3 rounded-xl bg-red-50 px-4 py-2 text-xs text-red-700">{error}</p>}

      <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4 lg:grid-cols-7">
        {metrics.map(({ label, value, icon: Icon }) => <div key={label} className="glass-strong min-w-0 rounded-2xl p-3.5 sm:p-4"><Icon className="h-4 w-4 text-leaf-600" /><p className="mt-2 font-display text-2xl font-extrabold text-leaf-950">{value ?? "—"}</p><p className="text-[11px] font-medium text-leaf-950/60">{label}</p></div>)}
      </div>
      <nav aria-label="Dashboard sections" className="mt-5 flex flex-wrap gap-2">
        {(["overview", "visitors", "conversations", "settings"] as const).map((item) => <button key={item} onClick={() => setTab(item)} className={`rounded-full px-4 py-2 text-xs font-semibold capitalize transition-colors ${tab === item ? "bg-leaf-800 text-white shadow-md" : "glass bg-white/60 text-leaf-900 hover:bg-white"}`}>{item}</button>)}
        <button onClick={exportVisible} className="glass ml-auto inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold text-leaf-900"><Download className="h-3.5 w-3.5" /> Export view</button>
      </nav>

      {tab === "settings" ? <section className="glass-strong mt-4 rounded-3xl p-4 sm:p-7">
        <div className="flex items-center gap-2"><Settings2 className="h-5 w-5 text-leaf-700" /><h2 className="text-lg font-extrabold text-leaf-950">Live assistant settings</h2></div>
        <p className="mt-1 text-xs leading-relaxed text-leaf-950/60">Save changes here: new AI replies use them immediately. Open chat screens refresh their titles every few seconds.</p>
        {!settings ? <Loader2 className="mt-6 h-5 w-5 animate-spin text-leaf-600" /> : <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <div className="space-y-4">
            <label className="block text-xs font-semibold text-leaf-900">App name<input className="field mt-1.5" value={settings.appName} maxLength={60} onChange={(e) => setSettings({ ...settings, appName: e.target.value })} /></label>
            <label className="block text-xs font-semibold text-leaf-900">Welcome heading<input className="field mt-1.5" value={settings.welcomeTitle} maxLength={110} onChange={(e) => setSettings({ ...settings, welcomeTitle: e.target.value })} /></label>
            <label className="block text-xs font-semibold text-leaf-900">Welcome text<textarea className="field mt-1.5 min-h-20 resize-y" value={settings.welcomeSubtitle} maxLength={220} onChange={(e) => setSettings({ ...settings, welcomeSubtitle: e.target.value })} /></label>
            <label className="block text-xs font-semibold text-leaf-900">Assistant instructions<textarea className="field mt-1.5 min-h-44 resize-y" value={settings.systemPrompt} maxLength={4000} onChange={(e) => setSettings({ ...settings, systemPrompt: e.target.value })} /><span className="mt-1 block font-normal text-leaf-950/50">Added to every AI reply. Keep private details out of this field.</span></label>
          </div>
          <div>
            <div className="rounded-2xl border border-leaf-900/10 bg-white/55 p-4">
              <div className="flex items-start justify-between gap-2"><div><p className="text-sm font-bold text-leaf-950">Google Gemini API</p><p className="mt-1 text-xs text-leaf-950/60">Official API connection, not an embedded gemini.google.com page.</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${settings.geminiKeySet ? "bg-green-100 text-green-800" : "bg-amber-100 text-amber-900"}`}>{settings.geminiKeySet ? "Key configured" : "Key needed"}</span></div>
              <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-semibold text-leaf-700 underline underline-offset-2">Get a key from Google AI Studio ↗</a>
              <label className="mt-4 block text-xs font-semibold text-leaf-900">Gemini model<select className="field mt-1.5" value={settings.model} onChange={(e) => setSettings({ ...settings, model: e.target.value as GeminiModel })}>{GEMINI_MODELS.map((model) => <option key={model} value={model}>{model}</option>)}</select></label>
              <label className="mt-4 block text-xs font-semibold text-leaf-900">Add or replace API key<div className="relative mt-1.5"><input className="field !pr-12" type={showKey ? "text" : "password"} value={keyInput} onChange={(e) => setKeyInput(e.target.value)} placeholder={settings.geminiKeySet ? "Configured · enter a new key to replace" : "Paste your Gemini API key"} autoComplete="off" /><button type="button" title={showKey ? "Hide key" : "Show key"} onClick={() => setShowKey((v) => !v)} className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg hover:bg-leaf-100">{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
              <div className="mt-4 flex flex-wrap gap-2"><button onClick={testGemini} disabled={testing || (!keyInput && !settings.geminiKeySet)} className="btn btn-ghost !text-xs">{testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Test connection</button>{settings.keySource === "dashboard" && <button onClick={clearGemini} className="btn btn-ghost !text-xs !text-red-700"><Trash2 className="h-3.5 w-3.5" /> Remove key</button>}</div>
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-leaf-100/80 p-3 text-xs leading-relaxed text-leaf-950/70"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-leaf-700" /><span>The key is encrypted on the server and never sent back to the browser or added to GitHub.</span></div>
            </div>
          </div>
          <div className="lg:col-span-2 flex flex-wrap items-center gap-3 border-t border-leaf-950/10 pt-4"><button onClick={saveSettings} disabled={saving} className="btn btn-primary !rounded-xl">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save & apply now</button>{saveState && <p role="status" className="text-xs font-medium text-leaf-800">{saveState}</p>}</div>
        </div>}
      </section> : <div className="mt-4 grid gap-4 lg:grid-cols-[310px_minmax(0,1fr)]">
        <section className="glass-strong min-w-0 rounded-3xl p-4">
          <div className="flex items-center justify-between"><h2 className="text-sm font-bold text-leaf-950">Visitors</h2><span className="text-[10px] text-leaf-950/55">{data?.people.length ?? 0} recent</span></div>
          <p className="mt-1 text-[11px] leading-relaxed text-leaf-950/55">Anonymous IDs: you can see chats, not personal names.</p>
          <div className="mt-3 max-h-[440px] space-y-1 overflow-y-auto">
            {data?.people.map((person) => <button key={person.id} onClick={() => changeFilter(filter === person.id ? null : person.id)} className={`flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-left hover:bg-white/75 ${filter === person.id ? "bg-leaf-200/80" : ""}`}><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-leaf-200 text-xs font-bold text-leaf-900">{person.id.slice(0, 1).toUpperCase()}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-leaf-950">{person.label}</span><span className="block text-[10px] text-leaf-950/55">{person.chats} chats · {person.questions} questions</span></span><span className="text-[10px] text-leaf-950/45">{relative(person.lastSeenAt)}</span></button>)}
            {!data?.people.length && <p className="py-5 text-center text-xs text-leaf-950/50">No visitors yet. Open chat to create a workspace.</p>}
          </div>
        </section>
        <section className="glass-strong min-w-0 rounded-3xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-bold text-leaf-950">{tab === "conversations" ? "Conversations" : tab === "visitors" ? "Visitor activity" : "Live conversation feed"}</h2><p className="mt-1 text-[11px] text-leaf-950/55">{filter ? `Showing ${labelFor(filter)} · ` : ""}Updated {data ? relative(data.updatedAt) : "…"}</p></div>{filter && <button onClick={() => changeFilter(null)} className="chip cursor-pointer"><X className="h-3 w-3" /> All visitors</button>}</div>
          {tab !== "conversations" && <label className="relative mt-3 block"><Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-leaf-800/50" /><input className="field !pl-9 !text-xs" placeholder="Search questions and answers…" value={search} onChange={(e) => setSearch(e.target.value)} /></label>}
          <div className="mt-3 max-h-[530px] space-y-2 overflow-y-auto pr-0.5">
            {tab === "conversations" ? data?.recentChats.map((chat) => <button key={chat.id} onClick={() => openChat(chat.id, chat.title, chat.visitorId)} className="flex w-full items-center justify-between gap-2 rounded-xl border border-white/75 bg-white/55 px-3 py-2.5 text-left hover:bg-white"><div className="min-w-0"><p className="truncate text-xs font-semibold text-leaf-950">{chat.title}</p><p className="mt-1 text-[10px] text-leaf-950/50">{labelFor(chat.visitorId)} · {chat.messageCount} messages · {relative(chat.createdAt)}</p></div><ChevronRight className="h-4 w-4 shrink-0 text-leaf-700" /></button>) : feed.map((item) => <button key={item.id} onClick={() => openChat(item.conversationId, item.title, item.visitorId)} className={`block w-full rounded-xl border px-3 py-2.5 text-left transition-colors hover:bg-white/80 ${item.role === "user" ? "border-white/80 bg-white/65" : "border-transparent bg-leaf-100/45"}`}><div className="flex items-center justify-between gap-2 text-[10px] text-leaf-950/55"><span className="truncate font-semibold">{item.role === "user" ? labelFor(item.visitorId) : `SwiftSite → ${labelFor(item.visitorId)}`}</span><span className="shrink-0">{relative(item.createdAt)}</span></div><p className="mt-1 line-clamp-2 text-xs leading-relaxed text-leaf-950">{item.content}</p>{item.kind && <span className="mt-1 inline-block rounded bg-leaf-100 px-1.5 py-0.5 font-mono text-[9px] text-leaf-700">/{item.kind}</span>}</button>)}
            {data && !data.recentChats.length && !data.activity.length && <p className="py-7 text-center text-xs text-leaf-950/55">Nothing to show yet.</p>}
          </div>
          {tab !== "conversations" && data?.hasMore && <button onClick={moreActivity} className="btn btn-ghost mt-3 w-full !text-xs">Load older activity</button>}
        </section>
      </div>}

      {selected && <div className="fixed inset-0 z-50 grid place-items-center bg-leaf-950/40 p-3 backdrop-blur-sm" onClick={() => setSelected(null)}><div className="glass-strong flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between gap-3 border-b border-leaf-900/10 p-4"><div className="min-w-0"><h3 className="truncate text-sm font-bold text-leaf-950">{selected.title}</h3><p className="text-[11px] text-leaf-950/55">{selected.who} · {selected.messages.length} messages</p></div><div className="flex items-center gap-1"><button onClick={() => deleteChat(selected.id)} title="Delete conversation" className="grid h-8 w-8 place-items-center rounded-xl text-red-700 hover:bg-red-50"><Trash2 className="h-4 w-4" /></button><button onClick={() => setSelected(null)} title="Close" className="grid h-8 w-8 place-items-center rounded-xl hover:bg-white/70"><X className="h-4 w-4" /></button></div></div><div className="space-y-3 overflow-y-auto p-4">{selected.messages.map((m) => <div key={m.id} className={`max-w-[93%] rounded-2xl p-3 text-xs leading-relaxed ${m.role === "user" ? "ml-auto bg-leaf-800 text-white" : "border border-white/70 bg-white/70 text-leaf-950"}`}><span className={`mb-1 block text-[9px] font-bold uppercase tracking-widest ${m.role === "user" ? "text-leaf-100" : "text-leaf-600"}`}>{m.role === "user" ? selected.who : "SwiftSite"} · {relative(m.createdAt)}</span>{m.role === "user" ? <span className="whitespace-pre-wrap">{m.content}</span> : <Markdown text={m.content} />}</div>)}</div></div></div>}
    </main>
  );
}
