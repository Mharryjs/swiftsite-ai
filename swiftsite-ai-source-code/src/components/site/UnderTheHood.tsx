import { KeySquare, Languages, RefreshCw, ShieldCheck } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const STACK = ["TypeScript", "Next.js", "PostgreSQL", "Drizzle ORM", "Live previews", "Server streaming"];

const POINTS = [
  {
    icon: KeySquare,
    title: "Private workspaces",
    body: "Visitors have separate anonymous histories. Only the PIN-protected owner dashboard can see activity across workspaces.",
  },
  {
    icon: ShieldCheck,
    title: "Private by workspace",
    body: "Every visitor gets an isolated workspace; nobody sees anyone else's chats.",
  },
  {
    icon: RefreshCw,
    title: "Built to keep going",
    body: "If one response path is busy, the assistant can try another while your conversation stays in place.",
  },
  {
    icon: Languages,
    title: "No eval, ever",
    body: "The calculator uses its own parser, so pasted expressions can't run code.",
  },
];

export function UnderTheHood() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-24">
      <Reveal>
        <div className="glass-strong grid gap-10 rounded-[2rem] p-7 sm:p-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="chip">Under the hood</span>
            <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-leaf-950 sm:text-4xl">
               How it&apos;s built
            </h2>
            <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-leaf-950/70">
              Your message goes to our server, which either runs a quick tool or asks the AI and sends
              the answer back. Chats are saved in a normal Postgres database.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {STACK.map((t) => (
                <span key={t} className="chip !px-3 !py-1.5 font-mono">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {POINTS.map((p) => (
              <li key={p.title} className="rounded-2xl border border-white/80 bg-white/60 p-4">
                <p.icon className="h-5 w-5 text-leaf-600" />
                <p className="mt-2.5 text-sm font-bold text-leaf-950">{p.title}</p>
                <p className="mt-1 text-[13px] leading-relaxed text-leaf-950/65">{p.body}</p>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </section>
  );
}
