import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen, Database, Layers, TerminalSquare, Wrench } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { Reveal } from "@/components/Reveal";
import { TOOL_CATALOG } from "@/lib/tools";
import { MODES } from "@/lib/assistant";

export const metadata: Metadata = {
  title: "Docs — SwiftSite",
  description: "Command reference and API documentation for the SwiftSite assistant.",
};

export const dynamic = "force-dynamic";

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-2xl border border-leaf-950/10 bg-leaf-950 px-5 py-4 font-mono text-[13px] leading-relaxed text-leaf-200">
      {children}
    </pre>
  );
}

export default function DocsPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto max-w-4xl px-4 pt-32 pb-20 sm:px-6 sm:pt-40">
        <Reveal>
          <span className="chip">
            <BookOpen width={12} height={12} /> Documentation
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-leaf-950 sm:text-5xl">
            Everything runs on the server.
            <br />
            <span className="bg-gradient-to-r from-leaf-600 to-emerald-700 bg-clip-text text-transparent">
              Here&apos;s the map.
            </span>
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-leaf-950/70">
            SwiftSite is a Next.js app whose assistant pairs streaming chat with deterministic
            TypeScript tools and PostgreSQL persistence. This page documents the slash language
            and the HTTP API.
          </p>
        </Reveal>

        <Reveal className="mt-12">
          <section className="glass-strong rounded-[2rem] p-7 sm:p-9">
            <h2 className="text-2xl font-extrabold tracking-tight text-leaf-950">Quickstart</h2>
            <ol className="mt-4 space-y-2.5 text-sm leading-relaxed text-leaf-950/75">
              <li className="flex gap-2.5">
                <span className="font-mono font-bold text-leaf-600">1.</span>
                Open a chat — no sign-up, no setup. Your workspace is created the moment you start.
              </li>
              <li className="flex gap-2.5">
                <span className="font-mono font-bold text-leaf-600">2.</span>
                Ask a question, or type{" "}
                <code className="rounded-md bg-leaf-950/8 px-1.5 py-0.5 font-mono text-leaf-700">/</code>{" "}
                to run an instant tool without waiting for a model.
              </li>
              <li className="flex gap-2.5">
                <span className="font-mono font-bold text-leaf-600">3.</span>
                Return to your chats from this browser&apos;s sidebar, or download a finished HTML page from its live preview.
              </li>
            </ol>
            <Link href="/chat" className="btn btn-primary mt-6">
              Open the assistant <ArrowRight width={15} height={15} />
            </Link>
          </section>
        </Reveal>

        <Reveal className="mt-8">
          <section className="glass-strong scroll-mt-28 rounded-[2rem] p-7 sm:p-9" id="commands">
            <div className="flex items-center gap-2.5">
              <Wrench className="h-5 w-5 text-leaf-600" />
              <h2 className="text-2xl font-extrabold tracking-tight text-leaf-950">Command reference</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-leaf-950/70">
              All twelve commands work in chat and over HTTP. Type{" "}
              <code className="rounded-md bg-leaf-950/8 px-1.5 py-0.5 font-mono text-leaf-700">/help</code>{" "}
              inside any conversation to list them.
            </p>
            <div className="mt-6 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead>
                  <tr className="border-b border-leaf-950/10 font-mono text-[11px] tracking-[0.14em] text-leaf-950/50 uppercase">
                    <th className="pb-3 pr-4">Command</th>
                    <th className="pb-3 pr-4">Usage</th>
                    <th className="pb-3">Example</th>
                  </tr>
                </thead>
                <tbody>
                  {TOOL_CATALOG.map((t) => (
                    <tr key={t.name} className="border-b border-leaf-950/6 last:border-0">
                      <td className="py-3 pr-4 font-mono text-[13px] font-bold text-leaf-700">/{t.name}</td>
                      <td className="py-3 pr-4 font-mono text-[12.5px] text-leaf-950/80">{t.usage}</td>
                      <td className="py-3 font-mono text-[12.5px] text-leaf-950/60">{t.example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-8">
          <section className="glass-strong rounded-[2rem] p-7 sm:p-9">
            <div className="flex items-center gap-2.5">
              <Layers className="h-5 w-5 text-leaf-600" />
              <h2 className="text-2xl font-extrabold tracking-tight text-leaf-950">Assistant modes</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-leaf-950/70">
              Deep-link a mode with <code className="rounded-md bg-leaf-950/8 px-1.5 py-0.5 font-mono text-leaf-700">/chat?mode=developer</code> or
              switch in the sidebar. Each mode tunes how the model thinks and answers once a
              provider key is connected.
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              {MODES.map((m) => (
                <div key={m.id} className="rounded-2xl border border-white/80 bg-white/55 px-4 py-3">
                  <p className="text-sm font-bold text-leaf-950">{m.label}</p>
                  <p className="mt-0.5 text-xs text-leaf-950/60">{m.blurb}</p>
                </div>
              ))}
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-8">
          <section className="glass-strong scroll-mt-28 rounded-[2rem] p-7 sm:p-9" id="api">
            <div className="flex items-center gap-2.5">
              <TerminalSquare className="h-5 w-5 text-leaf-600" />
              <h2 className="text-2xl font-extrabold tracking-tight text-leaf-950">HTTP API</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-leaf-950/70">
              Every tool is callable over HTTP — the landing page and /tools runners use exactly
              these endpoints.
            </p>
            <div className="mt-5 space-y-4">
              <Code>{`POST /api/tools/run
Content-Type: application/json

{ "tool": "calc", "input": "(1250 * 12) / 7 + sqrt(144)" }`}</Code>
              <Code>{`{
  "ok": true,
  "tool": "calc",
  "title": "(1250 * 12) / 7 + sqrt(144)",
  "value": "2,154.85714286",
  "details": []
}`}</Code>
              <Code>{`GET    /api/visitor                → create/resume a private browser workspace
POST   /api/chat                   → streamed chat (meta, delta and done events)
GET    /api/conversations          → list this visitor's chats
GET    /api/conversations/:id      → private message history
DELETE /api/conversations/:id      → delete an owned chat
POST   /api/upload                 → upload a private file (up to 20 MB)
GET    /api/config                 → public app name and welcome text
POST   /api/admin/session          → rate-limited owner PIN
GET    /api/admin                  → owner-only live statistics and activity
POST   /api/admin/settings         → change Gemini key/model/instructions
GET    /api/health                 → liveness probe`}</Code>
            </div>
          </section>
        </Reveal>

        <Reveal className="mt-8">
          <section className="glass-strong rounded-[2rem] p-7 sm:p-9">
            <div className="flex items-center gap-2.5">
              <Database className="h-5 w-5 text-leaf-600" />
              <h2 className="text-2xl font-extrabold tracking-tight text-leaf-950">Extending the assistant</h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-leaf-950/70">
              A tool is one pure function in{" "}
              <code className="rounded-md bg-leaf-950/8 px-1.5 py-0.5 font-mono text-leaf-700">src/lib/tools.ts</code>{" "}
              plus a catalog entry — it then appears in slash autocomplete, this reference and the
              tools grid automatically. Chat persistence lives in{" "}
              <code className="rounded-md bg-leaf-950/8 px-1.5 py-0.5 font-mono text-leaf-700">conversations</code>{" "}
              and{" "}
              <code className="rounded-md bg-leaf-950/8 px-1.5 py-0.5 font-mono text-leaf-700">messages</code>;
              every tool execution lands in{" "}
              <code className="rounded-md bg-leaf-950/8 px-1.5 py-0.5 font-mono text-leaf-700">tool_runs</code>.
            </p>
          </section>
        </Reveal>
      </main>
      <Footer />
    </>
  );
}
