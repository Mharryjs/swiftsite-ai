"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Reveal } from "@/components/Reveal";

const FAQS = [
  {
    q: "How do I get started?",
    a: "Open the assistant and start typing. No email login is needed. You can ask questions, attach files, or describe a website and preview the HTML right in chat.",
  },
  {
    q: "Where is my data stored?",
    a: "Chats are saved in PostgreSQL under an anonymous workspace tied to your browser's private cookie. Only that browser can reopen its chats; the PIN-protected owner dashboard can view activity. Clearing browser cookies loses access to the old workspace.",
  },
  {
    q: "Who made SwiftSite?",
    a: "MharryJS built the core platform. Hiba Kashif shaped the structure and visual design and is credited for the image and video tools. Their profiles are below.",
  },
  {
    q: "What are the built-in tools?",
    a: "Twelve quick utilities, including a calculator, converter, world clock, password generator and JSON formatter. Type /help in a chat for the whole list.",
  },
  {
    q: "Can the AI be wrong?",
    a: "Yes. Language models can produce confident mistakes, so double-check anything important. The built-in tools, in contrast, always compute their results exactly.",
  },
];

export function Faq() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faq" className="mx-auto max-w-4xl scroll-mt-28 px-4 py-12 sm:px-6 lg:py-24">
      <Reveal>
        <span className="chip">FAQ</span>
        <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-leaf-950 sm:text-4xl">
          Questions people ask
        </h2>
      </Reveal>

      <div className="mt-10 space-y-3">
        {FAQS.map((f, i) => {
          const isOpen = open === i;
          return (
            <Reveal key={f.q} delay={i * 0.04}>
              <div
                className={`glass overflow-hidden rounded-3xl transition-all duration-300 ${
                  isOpen ? "bg-white/85" : "hover:bg-white/75"
                }`}
              >
                <button
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  className="flex w-full cursor-pointer items-center justify-between gap-4 px-6 py-5 text-left"
                >
                  <span className="text-[15px] font-bold tracking-tight text-leaf-950">{f.q}</span>
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-leaf-600 transition-transform duration-300 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-300 ease-out ${
                    isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="font-serif-display px-6 pb-6 text-[15px] leading-[1.75] text-leaf-950/75">{f.a}</p>
                  </div>
                </div>
              </div>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
