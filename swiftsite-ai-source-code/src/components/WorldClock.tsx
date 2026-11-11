"use client";

import { useEffect, useState } from "react";
import { Clock3 } from "lucide-react";

const CITIES: { label: string; zone: string; flag: string }[] = [
  { label: "Karachi", zone: "Asia/Karachi", flag: "🇵🇰" },
  { label: "London", zone: "Europe/London", flag: "🇬🇧" },
  { label: "New York", zone: "America/New_York", flag: "🇺🇸" },
  { label: "Tokyo", zone: "Asia/Tokyo", flag: "🇯🇵" },
  { label: "Dubai", zone: "Asia/Dubai", flag: "🇦🇪" },
];

function parts(zone: string, now: Date) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  return fmt.format(now);
}

// Small, cute world clock. "card" fits the chat sidebar, "strip" is a compact
// horizontal row for auth and landing pages.
export function WorldClock({ variant = "card" }: { variant?: "card" | "strip" }) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const first = setTimeout(() => setNow(new Date()), 0);
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => { clearTimeout(first); clearInterval(timer); };
  }, []);

  if (variant === "strip") {
    return (
      <div className="glass mx-auto flex w-fit max-w-full flex-wrap items-center justify-center gap-1.5 rounded-full px-2.5 py-1.5">
        <Clock3 className="ml-0.5 h-3 w-3 shrink-0 text-leaf-600" />
        {CITIES.map((city) => (
          <span
            key={city.zone}
            className="flex items-center gap-1 rounded-full bg-white/75 px-2 py-1 text-[10.5px] leading-none"
          >
            <span>{city.flag}</span>
            <span className="font-display max-w-[4.5rem] truncate font-bold text-leaf-950/70">{city.label}</span>
            <span className="font-mono font-semibold text-leaf-900">
              {now ? parts(city.zone, now).slice(0, 5) : "--:--"}
            </span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-white/70 bg-white/55 p-3">
      <p className="font-display flex items-center gap-1.5 text-[10px] font-bold tracking-[0.16em] text-leaf-700 uppercase">
        <Clock3 className="h-3 w-3" /> World clock
      </p>
      <div className="mt-2 space-y-1.5">
        {CITIES.slice(0, 4).map((city) => (
          <span key={city.zone} className="flex items-center justify-between gap-1 text-[11px]">
            <span className="truncate text-leaf-950/60">
              {city.flag} {city.label}
            </span>
            <span className="font-mono font-semibold text-leaf-950">
              {now ? parts(city.zone, now) : "--:--:--"}
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
