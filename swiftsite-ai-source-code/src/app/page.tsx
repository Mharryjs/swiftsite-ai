import { Navbar } from "@/components/site/Navbar";
import { MobileTabBar } from "@/components/MobileTabBar";
import { Hero } from "@/components/site/Hero";
import { Features } from "@/components/site/Features";
import { Modes } from "@/components/site/Modes";
import { HowItWorks } from "@/components/site/HowItWorks";
import { ToolsSection } from "@/components/site/ToolsSection";
import { UnderTheHood } from "@/components/site/UnderTheHood";
import { Faq } from "@/components/site/Faq";
import { Studio } from "@/components/site/Studio";
import { CtaBand } from "@/components/site/CtaBand";
import { Footer } from "@/components/site/Footer";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <>
      <Navbar />
      <main id="main" className="pb-[5.2rem] sm:pb-0">
        <Hero />
        <Features />
        <Modes />
        <HowItWorks />
        <ToolsSection />
        <UnderTheHood />
        <Faq />
        <Studio />
        <CtaBand />
      </main>
      <Footer />
      <MobileTabBar />
    </>
  );
}
