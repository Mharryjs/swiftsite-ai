import type { Metadata } from "next";
import { Navbar } from "@/components/site/Navbar";
import { Footer } from "@/components/site/Footer";
import { MobileTabBar } from "@/components/MobileTabBar";
import { ToolsExplorer } from "@/components/site/ToolsExplorer";

export const metadata: Metadata = {
  title: "Built-in tools — SwiftSite",
  description: "Twelve instant, server-side utilities: calculator, converter, world clock, dates, passwords, UUIDs, hashes, Base64, JSON, word counts, case conversion and randomness.",
};

export const dynamic = "force-dynamic";

export default function ToolsPage() {
  return (
    <>
      <Navbar />
      <main id="main">
        <ToolsExplorer />
      </main>
      <Footer />
      <MobileTabBar />
    </>
  );
}
