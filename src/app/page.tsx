"use client";

import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { AntiGravityBackground } from "@/components/landing/AntiGravityBackground";
import { BookConversation } from "@/components/landing/BookConversation";
import { HeadlineSection } from "@/components/landing/HeadlineSection";
import { ProblemSection } from "@/components/landing/ProblemSection";
import { MotiveSection } from "@/components/landing/MotiveSection";
import { MethodSection } from "@/components/landing/MethodSection";
import { ModulesSection } from "@/components/landing/ModulesSection";
import { DataSection } from "@/components/landing/DataSection";
import { ReportSection } from "@/components/landing/ReportSection";
import { FinalCTA } from "@/components/landing/FinalCTA";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main className="flex-1 flex flex-col">
        {/* ===== HERO — STRICT 100vh, NO BUTTONS OR TEXT, ONLY FLOATING WORDS & REALISTIC NOTEBOOK ===== */}
        <section className="relative h-[calc(100vh-60px)] min-h-[500px] w-full flex items-center justify-center px-4 overflow-hidden bg-[#fffbeb]">
          {/* Anti-gravity deep-colored keyword field (hero-only, continuous constant speed drift) */}
          <AntiGravityBackground />

          {/* Centerpiece: Fixed-size realistic notebook conversation */}
          <div className="relative z-10 w-full flex justify-center items-center">
            <BookConversation />
          </div>
        </section>

        {/* ===== Below-hero narrative ===== */}
        <HeadlineSection />
        <ProblemSection />
        <MotiveSection />
        <MethodSection />
        <ModulesSection />
        <DataSection />
        <ReportSection />
        <FinalCTA />
      </main>
      <Footer />
    </>
  );
}
