import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MODES } from "@/lib/assistant";
import { Reveal } from "@/components/Reveal";

export function Modes() {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
      <Reveal>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {MODES.map((m, i) => (
            <Reveal key={m.id} delay={i * 0.05}>
              <Link
                href={`/chat?mode=${m.id}`}
                className="group glass flex h-full items-center justify-between gap-3 rounded-2xl px-5 py-4 transition-all hover:-translate-y-0.5 hover:bg-white/80"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-leaf-950">{m.label}</p>
                  <p className="mt-0.5 truncate text-xs text-leaf-950/60">{m.blurb}</p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-leaf-600 opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100" />
              </Link>
            </Reveal>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
