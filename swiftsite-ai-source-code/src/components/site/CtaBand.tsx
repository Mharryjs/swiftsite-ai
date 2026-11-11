import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Reveal } from "@/components/Reveal";

export function CtaBand() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <Reveal>
        <div className="glass-strong rounded-[2rem] px-6 py-12 text-center sm:px-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-leaf-950 sm:text-4xl">
            Ready when you are
          </h2>
          <p className="mx-auto mt-3 max-w-lg text-leaf-950/70">
            Make a page, ask a question, or pick up where you left off. Your workspace is ready
            whenever you are.
          </p>
          <Link className="btn btn-primary mt-7 !px-7 !py-3 !text-[0.95rem]" href="/chat">
            Start chatting <ArrowRight width={16} height={16} />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}
