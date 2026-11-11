import {
  BookMarked,
  History,
  Layers,
  MessagesSquare,
  Network,
  Zap,
} from "lucide-react";
import { Reveal } from "@/components/Reveal";

const FEATURES = [
  {
    icon: MessagesSquare,
    title: "Streaming conversations",
    body: "See replies as they're written. Code comes with a live preview, a copy button and a downloadable file.",
  },
  {
    icon: Layers,
    title: "Six assistant modes",
    body: "Choose Assistant, Developer, Writer, Translator, Analyst or Tutor to fit what you're working on.",
  },
  {
    icon: Zap,
    title: "Instant slash commands",
    body: "12 built-in tools for the little things: calculations, conversions, world clocks, hashes and more.",
  },
  {
    icon: BookMarked,
    title: "Prompt library",
    body: "Pick a ready-made prompt with {{variables}}, fill in the blanks and start without a blank page.",
  },
  {
    icon: Network,
    title: "Ask, build, keep going",
    body: "Go from a question to a complete website in one conversation. Ask for a clean page or something with depth and motion.",
  },
  {
    icon: History,
    title: "History that stays put",
    body: "Chats stay with your browser's private workspace. Pick up an old chat from the sidebar or delete it whenever you like.",
  },
];

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-12 sm:px-6 lg:py-24">
      <Reveal>
        <div className="max-w-2xl">
          <span className="chip">Features</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-leaf-950 sm:text-4xl">
            What you get
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-leaf-950/70">
            A chat that actually answers, plus a few handy tools we kept reaching for ourselves.
          </p>
        </div>
      </Reveal>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <Reveal key={f.title} delay={(i % 3) * 0.07}>
            <article className="glass group h-full rounded-3xl p-6 transition-transform duration-300 hover:-translate-y-1">
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/90 bg-white/70 text-leaf-700 shadow-sm transition-transform duration-300 group-hover:scale-110">
                <f.icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-base font-bold tracking-tight text-leaf-950">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-leaf-950/70">{f.body}</p>
            </article>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
