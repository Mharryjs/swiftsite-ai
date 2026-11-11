"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowUp, BookOpen, ChevronDown, CirclePlus, LockKeyhole, Menu, Paperclip,
  RotateCcw, Search, Sparkles, Trash2, X,
} from "lucide-react";
import { LogoMark } from "@/components/Logo";
import { PwaInstall } from "@/components/PwaInstall";
import { ToolResultCard } from "@/components/ToolResultCard";
import { TOOL_CATALOG, type ToolResult } from "@/lib/tools";
import { MODES, type ModeId, type TeamPerson } from "@/lib/assistant";
import { readChatStream, ChatStreamError, type ChatStreamEvent } from "@/lib/chat-stream";
import { detectLanguage } from "@/lib/language";
import type { PublicSettings } from "@/lib/site-settings";
import { AttachmentList, PendingTray, uploadFile, type Attachment, type Pending } from "./Attachments";
import { Markdown } from "./Markdown";
import { MediaCard, type Media } from "./MediaCard";
import { TeamCards } from "./TeamCards";

type Conversation = { id: string; title: string; createdAt: string };
type Reply = { content: string; tool: ToolResult | null; media: Media | null; suggestions: string[]; team: TeamPerson[] | null };
type Msg = { id: string; role: "user" | "assistant"; content: string; tool: ToolResult | null; media: Media | null; team: TeamPerson[] | null; attachments: Attachment[]; suggestions: string[]; fresh?: boolean };
type Failed = { message: string; atts: Attachment[]; requestId: string; conversationId: string | null; userId: string; assistantId: string };

const STARTERS = [
  { label: "Explain something", prompt: "Explain how the internet works, simply" },
  { label: "Roman Urdu", prompt: "Mujhe ek acha sa birthday message likh do dost ke liye" },
  { label: "10s video", prompt: "make a video of a rocket launching into space" },
  { label: "Simple website", prompt: "Make a simple website for a coffee shop in HTML CSS and JavaScript" },
  { label: "3D glass login", prompt: "Make a login page with HTML CSS JavaScript and 3D transparent effects" },
  { label: "Make an image", prompt: "ek pahar par sunset ki image banao" },
];
const PROMPTS = [
  { label: "Draft an email", text: "Draft a friendly email about {{topic}} to {{person}}" },
  { label: "Explain a concept", text: "Explain {{topic}} simply with two real-world examples" },
  { label: "Review code", text: "Review this {{language}} code and suggest improvements: {{code}}" },
];
const EMPTY: Pick<Msg, "tool" | "media" | "team" | "attachments" | "suggestions"> = { tool: null, media: null, team: null, attachments: [], suggestions: [] };
const newId = () => crypto.randomUUID();

function historyMessage(row: { id: string; role: string; content: string; toolOutput: unknown }): Msg {
  const output = row.toolOutput as Record<string, unknown> | null;
  const tool = output && "ok" in output ? output as ToolResult : null;
  return {
    id: row.id,
    role: row.role === "user" ? "user" : "assistant",
    content: row.content,
    tool,
    media: output?.media as Media | null ?? null,
    team: output?.team as TeamPerson[] | null ?? null,
    attachments: output?.attachments as Attachment[] ?? [],
    suggestions: [],
  };
}

export function Chat({ initialSettings }: { initialSettings: PublicSettings }) {
  const params = useSearchParams();
  const [settings, setSettings] = useState(initialSettings);
  const [visitor, setVisitor] = useState<{ id: string; label: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [draft, setDraft] = useState("");
  const [mode, setMode] = useState<ModeId>("assistant");
  const [modeOpen, setModeOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [sending, setSending] = useState(false);
  const [replyStarted, setReplyStarted] = useState(false);
  const [status, setStatus] = useState("Thinking…");
  const [loadingChat, setLoadingChat] = useState(false);
  const [error, setError] = useState("");
  const [failed, setFailed] = useState<Failed | null>(null);
  const [pending, setPending] = useState<Pending[]>([]);
  const [template, setTemplate] = useState<(typeof PROMPTS)[number] | null>(null);
  const [variables, setVariables] = useState<Record<string, string>>({});

  const messagesRef = useRef<HTMLDivElement>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const busyRef = useRef(false);
  const swipe = useRef<{ x: number; y: number } | null>(null);

  const scrollDown = useCallback(() => {
    const el = messagesRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, []);

  const loadConversation = useCallback(async (id: string) => {
    if (busyRef.current) return;
    setLoadingChat(true);
    setError("");
    try {
      const res = await fetch(`/api/conversations/${id}`, { cache: "no-store" });
      if (!res.ok) throw new Error("This conversation could not be opened.");
      const body = await res.json() as { messages: { id: string; role: string; content: string; toolOutput: unknown }[] };
      setActiveId(id);
      setMessages(body.messages.filter((m) => !/^(?:Sorry, the AI didn't answer in time|Maazrat, AI ne waqt par jawab nahi diya)/i.test(m.content) || m.role === "user").map(historyMessage));
      setMenuOpen(false);
      setFailed(null);
      window.history.replaceState(null, "", `/chat?c=${id}`);
      setTimeout(scrollDown, 40);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to open conversation.");
    } finally { setLoadingChat(false); }
  }, [scrollDown]);

  const refreshSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/config", { cache: "no-store" });
      if (res.ok) setSettings(await res.json() as PublicSettings);
    } catch { /* the last known settings remain visible */ }
  }, []);

  useEffect(() => {
    const m = params.get("mode");
    if (m && MODES.some((item) => item.id === m)) setMode(m as ModeId);
    (async () => {
      try {
        const session = await fetch("/api/visitor", { cache: "no-store" });
        if (!session.ok) throw new Error("Couldn't open your private workspace. Please refresh.");
        setVisitor((await session.json() as { visitor: { id: string; label: string } }).visitor);
        const res = await fetch("/api/conversations", { cache: "no-store" });
        if (res.ok) setConversations((await res.json() as { conversations: Conversation[] }).conversations);
        const id = params.get("c");
        if (id && /^[0-9a-f-]{36}$/i.test(id)) await loadConversation(id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not start the assistant. Please refresh.");
      } finally { setReady(true); }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setInterval(refreshSettings, 5000);
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("ss_settings") : null;
    if (channel) channel.onmessage = refreshSettings;
    window.addEventListener("focus", refreshSettings);
    return () => { clearInterval(t); channel?.close(); window.removeEventListener("focus", refreshSettings); };
  }, [refreshSettings]);

  useEffect(() => {
    const keydown = (event: globalThis.KeyboardEvent) => {
      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "z") {
        event.preventDefault();
        window.location.assign("/dashboard");
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);

  function freshChat() {
    if (busyRef.current) return;
    setActiveId(null); setMessages([]); setFailed(null); setError(""); setMenuOpen(false);
    window.history.replaceState(null, "", "/chat");
    textarea.current?.focus();
  }

  async function removeConversation(id: string) {
    if (!window.confirm("Delete this chat and all its messages?")) return;
    const res = await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    if (!res.ok) { setError("Could not delete that chat."); return; }
    setConversations((items) => items.filter((item) => item.id !== id));
    if (activeId === id) freshChat();
  }

  function addFiles(input: FileList | File[]) {
    const items = Array.from(input).slice(0, Math.max(0, 6 - pending.length));
    for (const file of items) {
      const key = newId();
      const preview = /^(image|video)\//.test(file.type) ? URL.createObjectURL(file) : null;
      const error = file.size > 20 * 1024 * 1024 ? "20 MB maximum" : null;
      setPending((prev) => [...prev, { key, file, preview, att: null, error }]);
      if (!error) uploadFile(file)
        .then((att) => setPending((prev) => prev.map((item) => item.key === key ? { ...item, att } : item)))
        .catch((err: Error) => setPending((prev) => prev.map((item) => item.key === key ? { ...item, error: err.message } : item)));
    }
  }

  const uploading = pending.some((item) => !item.att && !item.error);
  const attachments = pending.flatMap((item) => item.att ? [item.att] : []);

  async function send(text?: string, retry?: Failed) {
    const message = retry?.message ?? (text ?? draft).trim();
    const atts = retry?.atts ?? (text ? [] : attachments);
    if ((!message && !atts.length) || busyRef.current || uploading) return;
    const requestId = retry?.requestId ?? newId();
    const userId = retry?.userId ?? newId();
    const assistantId = retry?.assistantId ?? newId();
    let conversationId = retry?.conversationId ?? activeId;
    let added = Boolean(retry && messages.some((m) => m.id === assistantId));
    let started = false;
    let answered = false;
    let accumulated = "";
    let flushTimer: ReturnType<typeof setTimeout> | null = null;
    busyRef.current = true;
    setSending(true); setReplyStarted(false); setStatus("Thinking…"); setError(""); setFailed(null);
    if (!retry) {
      setDraft(""); if (!text) setPending([]);
      if (textarea.current) textarea.current.style.height = "auto";
      setMessages((prev) => [...prev, { id: userId, role: "user", content: message, ...EMPTY, attachments: atts }]);
      setTimeout(scrollDown, 35);
    }

    const show = (patch: Partial<Msg>) => {
      if (!added) {
        added = true;
        setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "", ...EMPTY, ...patch, fresh: true }]);
      } else setMessages((prev) => prev.map((m) => m.id === assistantId ? { ...m, ...patch } : m));
      setReplyStarted(true);
      setTimeout(scrollDown, 15);
    };
    const flush = () => { flushTimer = null; if (accumulated) show({ content: accumulated }); };
    const event = (e: ChatStreamEvent) => {
      if (e.type === "meta") {
        started = true; conversationId = e.conversationId; setActiveId(e.conversationId);
        setConversations((prev) => prev.some((c) => c.id === e.conversationId) ? prev : [{ id: e.conversationId, title: e.title, createdAt: new Date().toISOString() }, ...prev]);
        window.history.replaceState(null, "", `/chat?c=${e.conversationId}`);
      } else if (e.type === "status") setStatus(e.text);
      else if (e.type === "heartbeat") setStatus("Still working…");
      else if (e.type === "delta") { accumulated += e.text; if (!flushTimer) flushTimer = setTimeout(flush, 90); }
      else if (e.type === "reset") { if (flushTimer) clearTimeout(flushTimer); flushTimer = null; accumulated = e.text; show({ content: accumulated }); }
      else if (e.type === "done") {
        if (flushTimer) clearTimeout(flushTimer);
        flushTimer = null; answered = true;
        if (e.retryable) {
          if (added) setMessages((prev) => prev.filter((m) => m.id !== assistantId));
          setFailed({ message, atts, requestId, conversationId, userId, assistantId });
          setError(detectLanguage(message) === "english" ? "The assistant is busy. Your question is safe — tap Retry." : "Assistant abhi busy hai. Sawaal safe hai — Retry dabao.");
        } else {
          const reply = e.reply as Reply;
          show({ content: reply.content, tool: reply.tool, media: reply.media, team: reply.team, suggestions: reply.suggestions });
        }
      }
    };

    try {
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await fetch("/api/chat", {
            method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
            body: JSON.stringify({ message, conversationId, mode, requestId, attachments: atts.map((a) => a.id) }),
          });
          await readChatStream(response, event);
          break;
        } catch (err) {
          if (err instanceof ChatStreamError && err.status === 401) throw err;
          if (attempt === 0 && !started) { setStatus("Trying another route…"); await new Promise((r) => setTimeout(r, 700)); continue; }
          throw err;
        }
      }
    } catch (err) {
      setFailed({ message, atts, requestId, conversationId, userId, assistantId });
      setError(err instanceof Error && err.message !== "network error" ? err.message : "Connection interrupted. Your question is safe — tap Retry.");
      if (!answered && !added) setReplyStarted(false);
    } finally {
      if (flushTimer) clearTimeout(flushTimer);
      busyRef.current = false;
      setSending(false); setReplyStarted(false);
    }
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); }
  }

  function pickTemplate(prompt: (typeof PROMPTS)[number]) {
    setTemplate(prompt);
    const keys = [...prompt.text.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]!);
    setVariables(Object.fromEntries(keys.map((key) => [key, ""])));
    setMenuOpen(false);
  }

  function applyTemplate() {
    if (!template) return;
    let value = template.text;
    for (const [key, text] of Object.entries(variables)) value = value.replaceAll(`{{${key}}}`, text.trim() || `{{${key}}}`);
    setDraft(value); setTemplate(null);
    textarea.current?.focus();
  }

  const commands = draft.startsWith("/") && !draft.includes(" ")
    ? [{ name: "build", description: "Make a complete HTML/CSS/JS page" }, ...TOOL_CATALOG].filter((item) => `/${item.name}`.startsWith(draft.toLowerCase())).slice(0, 12)
    : [];
  const filteredChats = conversations.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));
  const currentMode = MODES.find((item) => item.id === mode)!;

  return (
    <main className="relative flex h-dvh w-full min-w-0 overflow-hidden p-0 sm:p-3"
      onTouchStart={(e) => { const t = e.touches[0]; swipe.current = t && (menuOpen || t.clientX < 34) ? { x: t.clientX, y: t.clientY } : null; }}
      onTouchEnd={(e) => { const a = swipe.current; swipe.current = null; const b = e.changedTouches[0]; if (!a || !b || window.innerWidth > 640) return; const dx = b.clientX - a.x; if (Math.abs(dx) < 80 || Math.abs(dx) < Math.abs(b.clientY - a.y) * 1.4) return; if (menuOpen && dx < 0) setMenuOpen(false); else if (!menuOpen && a.x < 34 && dx > 0) setMenuOpen(true); }}
      onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files); }}>
      {menuOpen && <button aria-label="Close conversation menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 cursor-pointer bg-leaf-950/25 backdrop-blur-[2px]" />}
      <aside className={`glass-strong fixed inset-y-0 left-0 z-40 flex w-[min(22rem,90vw)] flex-col overflow-hidden rounded-r-3xl border-r border-white/80 shadow-2xl transition-transform duration-300 sm:inset-y-3 sm:left-3 sm:w-80 sm:rounded-3xl ${menuOpen ? "translate-x-0" : "-translate-x-[110%]"}`}>
        <div className="flex items-center justify-between gap-2 border-b border-leaf-950/10 px-4 py-3">
          <div className="flex items-center gap-2.5"><LogoMark size={32} /><span className="font-display text-[15px] font-extrabold text-leaf-950">Swift<span className="text-amber-500">Site</span></span></div>
          <button aria-label="Close menu" onClick={() => setMenuOpen(false)} className="grid h-8 w-8 cursor-pointer place-items-center rounded-xl bg-white/70"><X className="h-4 w-4" /></button>
        </div>
        <button onClick={freshChat} disabled={sending} className="btn btn-primary mx-3 mt-3 !rounded-2xl !py-2.5 !text-xs"><CirclePlus className="h-4 w-4" /> New chat</button>
        <div className="mx-3 mt-3 flex items-center gap-2 rounded-xl border border-white/80 bg-white/60 px-3"><Search className="h-4 w-4 text-leaf-900/50" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search conversations" className="w-full bg-transparent py-2.5 text-xs outline-none placeholder:text-leaf-900/40" /></div>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          <p className="px-2 pb-2 font-mono text-[10px] font-semibold tracking-widest text-leaf-900/55 uppercase">Recent chats</p>
          {filteredChats.map((c) => <div key={c.id} className={`group flex items-center gap-1 rounded-xl px-2 py-1.5 ${activeId === c.id ? "bg-leaf-200/80" : "hover:bg-white/60"}`}><button onClick={() => loadConversation(c.id)} className="min-w-0 flex-1 truncate py-1 text-left text-xs font-semibold text-leaf-950">{c.title}</button><button title="Delete chat" onClick={() => removeConversation(c.id)} className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-leaf-950/45 opacity-70 hover:bg-red-50 hover:text-red-700 sm:opacity-0 sm:group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5" /></button></div>)}
          {filteredChats.length === 0 && <p className="px-2 py-4 text-xs text-leaf-950/50">{search ? "No matching chats." : "Your first chat starts here."}</p>}
          <p className="mt-5 px-2 pb-2 font-mono text-[10px] font-semibold tracking-widest text-leaf-900/55 uppercase">Saved ideas</p>
          {PROMPTS.map((item) => <button key={item.label} onClick={() => pickTemplate(item)} className="block w-full rounded-xl px-2 py-2 text-left text-xs font-medium text-leaf-900 hover:bg-white/65"><Sparkles className="mr-2 inline h-3.5 w-3.5 text-leaf-600" />{item.label}</button>)}
        </div>
        <div className="border-t border-leaf-950/10 p-3">
          <p className="text-xs font-semibold text-leaf-900">{visitor?.label ?? "Private workspace"}</p>
          <p className="mt-0.5 text-[10px] leading-snug text-leaf-950/55">No email needed. This browser keeps its own history.</p>
          <a href="/dashboard" className="mt-3 flex items-center gap-2 rounded-xl bg-white/60 px-3 py-2 text-xs font-semibold text-leaf-800 hover:bg-white"><LockKeyhole className="h-3.5 w-3.5" /> Owner dashboard <span className="ml-auto text-[9px] text-leaf-900/50">PIN protected</span></a>
          <p className="mt-2 text-[10px] text-leaf-950/45">Shortcut: Win + Ctrl + Shift + Z · fallback Ctrl + Shift + Z</p>
        </div>
      </aside>

      <div className="glass-strong flex min-w-0 flex-1 flex-col overflow-hidden rounded-none border-x-0 sm:rounded-[2rem] sm:border">
        <header className="z-20 shrink-0 border-b border-leaf-950/10 bg-white/60 px-3 py-2.5 backdrop-blur-lg sm:px-5 sm:py-3">
          <div className="flex items-center gap-2.5">
            <button onClick={() => setMenuOpen(true)} aria-label="Open conversation menu" className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-xl border border-white/75 bg-white/75 text-leaf-900 hover:bg-white"><Menu className="h-4 w-4" /></button>
            <div className="min-w-0 flex-1"><div className="flex min-w-0 items-center gap-2"><h1 className="truncate text-[13px] font-extrabold text-leaf-950 sm:text-base">{settings.appName}</h1><span className="hidden rounded-full bg-leaf-200/70 px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-leaf-900 uppercase sm:inline">SwiftSite AI</span></div><p className="flex items-center gap-1 text-[10px] font-medium text-leaf-900/60"><span className="h-1.5 w-1.5 rounded-full bg-leaf-500" /> Private conversation</p></div>
            <div className="relative">
              <button onClick={() => setModeOpen((v) => !v)} aria-label="Choose assistant mode" className="flex h-9 cursor-pointer items-center gap-1 rounded-xl border border-white/80 bg-white/75 px-2.5 text-[11px] font-semibold text-leaf-900 sm:px-3 sm:text-xs">{currentMode.label}<ChevronDown className="h-3.5 w-3.5" /></button>
              {modeOpen && <><button aria-label="Close mode menu" onClick={() => setModeOpen(false)} className="fixed inset-0 z-30 cursor-default" /><div className="glass-strong absolute right-0 z-40 mt-2 w-60 rounded-2xl p-1.5 shadow-xl">{MODES.map((m) => <button key={m.id} onClick={() => { setMode(m.id); setModeOpen(false); }} className={`block w-full rounded-xl px-3 py-2 text-left hover:bg-white ${mode === m.id ? "bg-leaf-100" : ""}`}><span className="block text-xs font-bold text-leaf-950">{m.label}</span><span className="text-[10px] text-leaf-950/60">{m.blurb}</span></button>)}</div></>}
            </div>
            <PwaInstall />
          </div>
          <button onClick={freshChat} disabled={sending} className="mt-2.5 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/80 bg-white/60 px-3 py-2 text-[11px] font-bold text-leaf-900 transition-colors hover:bg-white sm:mt-0 sm:hidden"><CirclePlus className="h-3.5 w-3.5" /> New chat</button>
        </header>
        <div ref={messagesRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 sm:px-5">
          {!ready || loadingChat ? <div className="grid h-full place-items-center text-xs text-leaf-900/60">Opening your workspace…</div>
            : messages.length === 0 ? <div className="mx-auto flex min-h-full w-full max-w-[780px] flex-col items-center justify-center py-8 text-center"><LogoMark size={52} /><h2 className="mt-4 text-2xl font-extrabold text-leaf-950 sm:text-3xl">{settings.welcomeTitle}</h2><p className="mt-2 max-w-lg text-xs leading-relaxed text-leaf-950/65 sm:text-sm">{settings.welcomeSubtitle}</p><div className="mt-7 grid w-full grid-cols-2 gap-2 sm:gap-3">{STARTERS.map((item) => <button key={item.label} onClick={() => send(item.prompt)} className="glass min-w-0 cursor-pointer overflow-hidden rounded-2xl px-3 py-3 text-left transition-all hover:-translate-y-0.5 hover:bg-white/80"><span className="flex min-w-0 items-center gap-1.5 text-xs font-bold text-leaf-950"><Sparkles className="h-3.5 w-3.5 shrink-0 text-leaf-600" /><span className="truncate">{item.label}</span></span><span className="mt-1 block truncate font-mono text-[10px] text-leaf-950/55">{item.prompt}</span></button>)}</div></div>
            : <div className="mx-auto w-full max-w-3xl space-y-6 py-6 sm:space-y-8 sm:py-8">{messages.map((m) => <motion.div key={m.id} initial={m.fresh ? { opacity: 0, y: 8 } : false} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="min-w-0"><div className="flex items-start gap-3"><div className={`grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-bold ${m.role === "user" ? "bg-white/80 text-leaf-900" : "bg-gradient-to-br from-leaf-500 to-leaf-800 text-white"}`}>{m.role === "user" ? "Y" : "S"}</div><div className="min-w-0 flex-1"><p className="mb-1.5 text-[10px] font-semibold text-leaf-950/55">{m.role === "user" ? "You" : `${settings.appName} · ${currentMode.label}`}</p>{m.attachments.length > 0 && <AttachmentList items={m.attachments} />}{m.role === "user" ? <div className="inline-block max-w-full rounded-2xl bg-white/80 px-3.5 py-2.5 text-xs font-medium leading-relaxed break-words text-leaf-950 shadow-sm sm:text-sm">{m.content.startsWith("(sent ") && m.attachments.length ? "Attached files" : m.content}</div> : <div className="chat-copy min-w-0 max-w-full text-[13px] leading-relaxed text-leaf-950 sm:text-sm"><Markdown text={m.content} />{m.tool && <div className="mt-3 max-w-lg"><ToolResultCard result={m.tool} /></div>}{m.team && <div className="mt-3 max-w-xl"><TeamCards people={m.team} /></div>}{m.media && <div className="mt-3 max-w-xl"><MediaCard media={m.media} /></div>}{m.suggestions.length > 0 && <div className="mt-3 flex flex-wrap gap-1.5">{m.suggestions.map((suggestion) => <button key={suggestion} onClick={() => send(suggestion)} className="rounded-full border border-white/80 bg-white/60 px-3 py-1.5 font-mono text-[10px] text-leaf-900 hover:bg-white">{suggestion}</button>)}</div>}</div>}</div></div></motion.div>)}
                {sending && !replyStarted && <div className="flex items-center gap-2 text-xs font-medium text-leaf-950/60" role="status"><span className="grid h-8 w-8 place-items-center rounded-xl bg-leaf-500 font-bold text-white">S</span><span className="inline-flex gap-1">{[0, 1, 2].map((i) => <span key={i} className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-leaf-600" style={{ animationDelay: `${i * 0.2}s` }} />)}</span>{status}</div>}
                {failed && !sending && <div role="alert" className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/30 bg-white/80 p-3 text-xs text-leaf-900"><span>{error}</span><button onClick={() => send(undefined, failed)} className="btn btn-primary !px-3 !py-1.5 !text-xs"><RotateCcw className="h-3.5 w-3.5" /> Retry</button></div>}
              </div>}
          {error && !failed && ready && messages.length === 0 && <div role="alert" className="mx-auto max-w-lg rounded-xl bg-white/75 p-3 text-center text-xs text-red-700">{error} <button onClick={() => window.location.reload()} className="ml-2 font-bold underline">Refresh</button></div>}
        </div>
        <div className="shrink-0 px-2.5 pt-2 pb-[max(0.65rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-3">
          <div className="relative mx-auto w-full max-w-3xl">
            {commands.length > 0 && <div className="glass-strong absolute inset-x-0 bottom-full z-20 mb-2 max-h-60 overflow-y-auto rounded-2xl p-1.5 shadow-xl">{commands.map((cmd) => <button key={cmd.name} onClick={() => { setDraft(`/${cmd.name} `); textarea.current?.focus(); }} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-white/70"><code className="w-24 shrink-0 font-mono text-xs font-bold text-leaf-700">/{cmd.name}</code><span className="min-w-0 truncate text-[11px] text-leaf-900/65">{cmd.description}</span></button>)}</div>}
            <PendingTray items={pending} onRemove={(key) => setPending((prev) => prev.filter((item) => item.key !== key))} />
            <form onSubmit={(e: FormEvent) => { e.preventDefault(); send(); }} className="glass-strong flex min-w-0 flex-col rounded-[1.6rem] p-2.5 shadow-[0_12px_35px_-15px_rgba(31,62,25,0.38)] sm:p-3">
              <textarea ref={textarea} value={draft} rows={1} onChange={(e) => { setDraft(e.target.value); e.target.style.height = "auto"; e.target.style.height = `${Math.min(148, e.target.scrollHeight)}px`; }} onKeyDown={onKeyDown} onPaste={(e) => { const files = e.clipboardData.files; if (files.length) { e.preventDefault(); addFiles(files); } }} placeholder="Message SwiftSite… (type / for tools)" className="min-h-10 max-h-36 w-full resize-none bg-transparent px-2 py-1.5 text-[16px] leading-relaxed text-leaf-950 outline-none placeholder:text-leaf-950/45 sm:text-sm" />
              <div className="mt-1 flex items-center justify-between gap-2"><div className="flex items-center gap-2"><input ref={fileInput} type="file" multiple hidden accept="image/*,video/*,application/pdf,text/*,.md,.json,.csv,.js,.ts,.tsx,.py,.html,.css,.sql,.txt" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} /><button type="button" onClick={() => fileInput.current?.click()} title="Attach a file" className="grid h-8 w-8 place-items-center rounded-full text-leaf-900/70 hover:bg-white/70"><Paperclip className="h-4 w-4" /></button><span className="hidden text-[10px] text-leaf-950/50 sm:inline">Files · images · videos</span></div><button type="submit" disabled={!ready || sending || uploading || (!draft.trim() && !attachments.length)} title="Send message" className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-b from-leaf-500 to-leaf-700 text-white shadow-md transition-all hover:brightness-105 disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button></div>
            </form>
            <p className="mt-1.5 text-center text-[10px] text-leaf-950/50">Enter to send · Shift+Enter for a new line · Your workspace stays private</p>
          </div>
        </div>
      </div>

      {template && <div className="fixed inset-0 z-[70] grid place-items-center bg-leaf-950/35 p-4 backdrop-blur-sm" onClick={() => setTemplate(null)}><div className="glass-strong w-full max-w-sm rounded-3xl p-5" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between"><h3 className="font-bold text-leaf-950">{template.label}</h3><button onClick={() => setTemplate(null)} className="grid h-8 w-8 place-items-center rounded-full bg-white/70"><X className="h-4 w-4" /></button></div><p className="mt-1 text-xs text-leaf-950/55">Fill in the blanks to use this prompt.</p><div className="mt-4 space-y-3">{Object.entries(variables).map(([key, value]) => <label key={key} className="block text-xs font-semibold text-leaf-900">{key}<input className="field mt-1" autoFocus={key === Object.keys(variables)[0]} value={value} onChange={(e) => setVariables((prev) => ({ ...prev, [key]: e.target.value }))} /></label>)}</div><button onClick={applyTemplate} className="btn btn-primary mt-5 w-full !text-xs"><BookOpen className="h-4 w-4" /> Use prompt</button></div></div>}
    </main>
  );
}
