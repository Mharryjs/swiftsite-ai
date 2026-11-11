export type TeamPerson = "mharry" | "dua";

const PEOPLE = {
  mharry: {
    name: "MharryJS",
    role: "Owner · Full-stack web developer",
    about: "Owner of SwiftSite. Built the front end, back end, database, AI chat, login and dashboard.",
    photo: "/images/mharryjs.png",
    links: [
      { label: "LinkedIn", href: "https://www.linkedin.com/in/m-harry-js-98076442a" },
      { label: "GitHub", href: "https://github.com/Mharryjs" },
    ],
  },
  dua: {
    name: "Hiba Kashif",
    role: "Structure & design · Full-stack web developer",
    about: "Full-stack web developer. Shaped SwiftSite's structure, visual design and image & video tools.",
    photo: "/images/hiba.jpg",
    links: [
      { label: "Instagram · SwiftSite", href: "https://www.instagram.com/swif.site/" },
      { label: "LinkedIn", href: "https://www.linkedin.com/in/hiba-kashif-70b66b288" },
    ],
  },
};

export function TeamCards({ people }: { people: TeamPerson[] }) {
  return (
    <div className="space-y-3">
      {people.map((key) => {
        const p = PEOPLE[key];
        return (
          <div key={key} className="flex gap-4 rounded-2xl border border-white/90 bg-white/75 p-4 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.photo}
              alt={p.name}
              className="h-24 w-24 shrink-0 rounded-2xl border-2 border-amber-300 object-cover object-top shadow"
            />
            <div className="min-w-0">
              <p className="font-bold text-leaf-950">{p.name}</p>
              <p className="text-sm font-semibold text-leaf-700">{p.role}</p>
              <p className="mt-1 text-sm text-leaf-950/70">{p.about}</p>
              {p.links.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {p.links.map((l) => (
                    <a key={l.label} href={l.href} target="_blank" rel="noreferrer" className="btn btn-ghost !px-3 !py-1 !text-xs">
                      {l.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
