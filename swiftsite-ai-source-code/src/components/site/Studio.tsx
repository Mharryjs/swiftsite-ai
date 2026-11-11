import Link from "next/link";
import { Reveal } from "@/components/Reveal";

const HIBA_LINKEDIN = "https://www.linkedin.com/in/hiba-kashif-70b66b288";

const people = [
  {
    name: "MharryJS",
    role: "Owner · Development",
    work: ["Front end", "Back end", "Database", "AI chat", "Login & dashboard"],
    photo: "/images/mharryjs.png",
    about:
      "Founded SwiftSite and built its core — the front end, back end, database, AI conversations, sign-in and dashboard.",
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/in/m-harry-js-98076442a" },
      { label: "GitHub", href: "https://github.com/Mharryjs" },
    ],
  },
  {
    name: "Hiba Kashif",
    role: "Structure & design · Full-stack developer",
    work: ["Site structure", "Page layouts", "Visual design", "Image & video tools"],
    photo: "/images/hiba.jpg",
    about:
      "Full-stack web developer behind SwiftSite's structure, page design and image and video tools.",
    links: [
      { label: "Instagram · SwiftSite", href: "https://www.instagram.com/swif.site/" },
      { label: "LinkedIn", href: HIBA_LINKEDIN },
    ],
  },
];

export function Studio() {
  return (
    <section id="team" className="mx-auto max-w-6xl scroll-mt-44 px-4 pt-14 pb-16 sm:px-6">
      <Reveal>
        <div className="mb-8 max-w-xl">
          <span className="chip">The team</span>
          <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-leaf-950 sm:text-4xl">
            Who built what
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-leaf-950/70">
            Hiba Kashif shaped the site and its media tools. MharryJS built the core platform.
          </p>
        </div>
      </Reveal>

      <div className="grid gap-4 md:grid-cols-2">
        {people.map((p, i) => (
          <Reveal key={p.name} delay={i * 0.08}>
            <article className="glass-strong flex h-full flex-col rounded-[1.75rem] p-6 sm:p-7">
              <div className="flex items-center gap-4">
                {p.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.photo}
                    alt={p.name}
                    width={72}
                    height={72}
                    className="h-[72px] w-[72px] rounded-full border-2 border-white object-cover object-top shadow-md"
                  />
                ) : (
                  <span className="grid h-[72px] w-[72px] place-items-center rounded-full border-2 border-white bg-gradient-to-br from-amber-200 to-rose-200 text-2xl font-extrabold text-leaf-900 shadow-md">
                    HK
                  </span>
                )}
                <div>
                  <h3 className="text-xl font-extrabold tracking-tight text-leaf-950">{p.name}</h3>
                  <p className="font-accent text-sm font-semibold text-leaf-700">{p.role}</p>
                </div>
              </div>
              <p className="mt-5 text-[15px] leading-relaxed text-leaf-950/75">{p.about}</p>
              <div className="mt-4 flex flex-1 flex-wrap content-start gap-1.5">
                {p.work.map((w) => (
                  <span key={w} className="chip !px-2.5 !py-1">
                    {w}
                  </span>
                ))}
              </div>
              {p.links.length > 0 && (
                <div className="mt-5 flex flex-wrap gap-2">
                  {p.links.map((l) => (
                    <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="btn btn-ghost !text-[0.8rem]">
                      {l.label}
                    </a>
                  ))}
                </div>
              )}
            </article>
          </Reveal>
        ))}
      </div>

      <p className="mt-6 text-center text-sm text-leaf-950/60">
        Current version is 1.6 — see what changed in the{" "}
        <Link href="/changelog" className="font-semibold text-leaf-700 underline underline-offset-2">
          changelog
        </Link>
        .
      </p>
    </section>
  );
}
