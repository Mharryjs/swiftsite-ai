"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Images, LayoutDashboard, MessageSquare } from "lucide-react";

const TABS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/tools", label: "Studio", icon: Images },
];

// Phone-only bottom navigation so the whole site feels like one app.
export function MobileTabBar({ boardHref = "/dashboard" }: { boardHref?: string }) {
  const pathname = usePathname();
  const tabs = [...TABS, { href: boardHref, label: "Board", icon: LayoutDashboard }];

  return (
    <nav
      aria-label="App navigation"
      className="glass-strong fixed inset-x-2 bottom-1.5 z-40 flex items-stretch justify-around gap-0.5 rounded-[1.25rem] px-1 py-1 pb-[max(0.25rem,env(safe-area-inset-bottom))] shadow-[0_10px_28px_-12px_rgba(20,45,25,0.45)] sm:hidden"
    >
      {tabs.map((tab) => {
        const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`font-accent flex min-w-[3.75rem] flex-col items-center gap-0.5 rounded-xl px-1.5 py-1 text-[9.5px] font-bold transition-colors active:scale-95 ${
              active ? "bg-leaf-200/80 text-leaf-900" : "text-leaf-950/55"
            }`}
          >
            <tab.icon className="h-4 w-4" strokeWidth={active ? 2.4 : 2} />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
