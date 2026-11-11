import Link from "next/link";
import { ArrowRight, BadgeCheck, Radio, ShieldCheck, Zap } from "lucide-react";
import { TryLive } from "./TryLive";
import { WorldClock } from "@/components/WorldClock";

export function Hero() {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-24 pb-14 sm:px-6 sm:pt-40 lg:grid-cols-[1.1fr_1fr] lg:gap-14 lg:pb-24">
      <div className="animate-fade-up">
        <span className="chip font-accent !px-3.5 !py-1.5 !text-xs">
          <Zap width={13} height={13} className="text-amber-500" fill="currentColor" />
          Chat · Tools · Automation in one workspace
        </span>

        <h1 className="mt-5 text-4xl leading-[1.08] font-extrabold tracking-tight text-leaf-950 sm:text-5xl lg:text-[3.6rem]">
          An AI assistant that actually{" "}
          <span className="font-serif-display bg-gradient-to-r from-leaf-600 to-emerald-700 bg-clip-text pr-1 text-transparent italic">
            gets things done.
          </span>
        </h1>

        <p className="mt-5 max-w-xl text-base leading-relaxed text-leaf-950/85 sm:text-lg">
          Ask a question, build a web page or run a quick tool — all in one place. Describe what you want in English, Urdu or Roman Urdu.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link className="btn btn-primary !px-6 !py-3 !text-[0.95rem]" href="/chat">
            Start chatting <ArrowRight width={16} height={16} />
          </Link>
          <a className="btn btn-ghost !px-6 !py-3 !text-[0.95rem]" href="#tools">
            See what it can do
          </a>
        </div>

        <div className="mt-6 flex justify-start">
          <WorldClock variant="strip" />
        </div>

        <ul className="font-accent mt-5 flex flex-wrap gap-x-5 gap-y-2 text-[12.5px] font-bold text-leaf-950/75">
          <li className="inline-flex items-center gap-1.5">
            <BadgeCheck width={16} height={16} className="text-leaf-600" />
            Your own workspace
          </li>
          <li className="inline-flex items-center gap-1.5">
            <Radio width={16} height={16} className="text-leaf-600" />
            Streaming replies
          </li>
          <li className="inline-flex items-center gap-1.5">
            <ShieldCheck width={16} height={16} className="text-leaf-600" />
            Your data, your workspace
          </li>
        </ul>
      </div>

      <div className="animate-fade-up [animation-delay:120ms]">
        <TryLive />
      </div>
    </section>
  );
}
