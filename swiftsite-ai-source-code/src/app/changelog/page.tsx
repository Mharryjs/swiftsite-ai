import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Tag } from "lucide-react";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Reveal } from "@/components/Reveal";

export const metadata: Metadata = {
  title: "Changelog — SwiftSite",
  description: "Release notes for SwiftSite — every feature shipped, nothing vaporware.",
};

export const dynamic = "force-dynamic";

const NOTES: { title: string; body: string }[] = [
  {
    title: "Streaming chat workspace",
    body: "Word-by-word replies with a stop-safe typewriter renderer, slash-command autocomplete and copy-ready tool cards. Conversations persist to PostgreSQL with cascade deletes.",
  },
  {
    title: "Six assistant modes",
    body: "Assistant, Developer, Writer, Translator, Analyst and Tutor — switchable from the sidebar or deep-linked via /chat?mode=translator.",
  },
  {
    title: "Twelve built-in tools",
    body: "calc, convert, time, days, password, uuid, hash, base64, json, count, case and random — each one both a chat command and a standalone runner under /tools.",
  },
  {
    title: "Prompt library with {{variables}}",
    body: "Templates with fill-in-the-blank variables that set the right mode and drop a finished prompt into the composer.",
  },
  {
    title: "More resilient conversations",
    body: "Replies arrive as they're written. If a connection is interrupted, the chat keeps your question and lets you retry without losing your place.",
  },
];

export default function ChangelogPage() {
  return (
    <>
      <Navbar />
      <main id="main" className="mx-auto max-w-3xl px-4 pt-32 pb-20 sm:px-6 sm:pt-40">
        <Reveal>
          <span className="chip">
            <Tag width={12} height={12} />
            Release notes
          </span>
          <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-leaf-950 sm:text-5xl">
            Changelog
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-leaf-950/70">
            Every feature below is implemented and working today. No roadmap theater.
          </p>
        </Reveal>

        <Reveal className="mt-10">
          <article className="glass-strong rounded-[2rem] p-7 sm:p-9">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-extrabold tracking-tight text-leaf-950">
                SwiftSite 1.5.0
              </h2>
              <span className="chip !px-3 !py-1.5 font-mono">October 2026</span>
            </div>

            <ul className="mt-7 space-y-6">
              {NOTES.map((n) => (
                <li key={n.title} className="relative border-l-2 border-leaf-300 pl-5">
                  <span className="absolute top-1.5 -left-[5px] h-2 w-2 rounded-full bg-leaf-500" />
                  <h3 className="text-[15px] font-bold text-leaf-950">{n.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-leaf-950/70">{n.body}</p>
                </li>
              ))}
            </ul>

            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/chat" className="btn btn-primary">
                Try it now <ArrowRight width={15} height={15} />
              </Link>
              <Link href="/docs" className="btn btn-ghost">
                Read the docs
              </Link>
            </div>
          </article>
        </Reveal>
      </main>
      <Footer />
      <MobileTabBar />
    </>
  );
}
