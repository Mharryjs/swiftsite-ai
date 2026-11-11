"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Installed SwiftSite opens as an assistant, not the marketing website.
// The PIN-protected dashboard remains available to the owner via shortcut.
export function PwaOnlyChat() {
  const pathname = usePathname();
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone && pathname !== "/chat" && pathname !== "/dashboard") {
      window.location.replace("/chat");
    }
  }, [pathname]);
  return null;
}
