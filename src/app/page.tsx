"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Navbar } from "@/components/landing/Navbar";
import { Footer } from "@/components/landing/Footer";
import { AntiGravityBackground } from "@/components/landing/AntiGravityBackground";
import { BookConversation } from "@/components/landing/BookConversation";
import { ImpactSection } from "@/components/landing/ImpactSection";

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

        {/* ===== HEADLINE — directly below the 100vh hero ===== */}
        <HeadlineSection />

        {/* ===== IMPACT & DATA ===== */}
        <ImpactSection />
      </main>
      <Footer />
    </>
  );
}

function HeadlineSection() {
  const prefersReducedMotion = useReducedMotion();
  return (
    <section className="px-4 py-24 md:py-32 bg-amber-50 border-t border-amber-200/40">
      <motion.h2
        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 20 }}
        whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.6 }}
        className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-slate-800 leading-[1.1] max-w-4xl mx-auto text-center"
      >
        Don&apos;t take another mock test.
        <br />
        <span className="text-gradient">Find your real weaknesses first.</span>
      </motion.h2>
    </section>
  );
}
