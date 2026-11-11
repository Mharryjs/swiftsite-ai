import { Reveal } from "@/components/Reveal";

const STEPS = [
  {
    n: "01",
    title: "Open a chat",
    body: "Open the assistant — no email or password needed. This browser gets its own private workspace automatically.",
  },
  {
    n: "02",
    title: "Ask or build",
    body: "Ask a question, describe the website you want, or type / for a quick calculator or conversion.",
  },
  {
    n: "03",
    title: "Keep what works",
    body: "Try a website in the live preview, download the HTML, and pick up the conversation later.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="mx-auto max-w-6xl scroll-mt-28 px-4 py-12 sm:px-6 lg:py-24">
      <Reveal>
        <span className="chip">How it works</span>
        <h2 className="mt-4 max-w-xl text-3xl font-extrabold tracking-tight text-leaf-950 sm:text-4xl">
          How it works
        </h2>
      </Reveal>

      <ol className="mt-10 grid gap-4 md:grid-cols-3">
        {STEPS.map((s, i) => (
          <Reveal key={s.n} delay={i * 0.09}>
            <li className="glass h-full rounded-3xl p-6">
              <span className="font-mono text-3xl font-extrabold text-leaf-600/30">{s.n}</span>
              <h3 className="mt-4 text-base font-bold tracking-tight text-leaf-950">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-leaf-950/70">{s.body}</p>
            </li>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
