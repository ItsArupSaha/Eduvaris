"use client";

import { Reveal } from "./Reveal";
import { motion, useReducedMotion } from "framer-motion";

/**
 * FinalCTA — the emotional close.
 *
 * Last stop before Login. Warm, human, low-pressure. Restates the value once
 * more and hands them the coral gradient button. Mirrors the hero CTA styling
 * for visual rhyme.
 */
export function FinalCTA() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="px-4 py-28 md:py-40 bg-white border-t border-amber-200/40">
      <Reveal className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl md:text-5xl font-bold text-slate-800 leading-[1.12]">
          Your dream of studying abroad
          <br />
          <span className="text-gradient">is worth 25 minutes.</span>
        </h2>
        <p className="mt-6 text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Stop guessing at your English. Spend 50 BDT, find your real strengths
          and the exact weaknesses holding you back — and walk into your prep
          with a plan.
        </p>

        <div className="mt-10">
          <motion.a
            href="/login"
            className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 px-9 py-4 text-lg font-bold text-white shadow-xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:brightness-105 transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-300"
            {...(prefersReducedMotion
              ? {}
              : {
                  initial: { scale: 1 },
                  whileHover: { scale: 1.04 },
                  transition: { type: "spring", stiffness: 400, damping: 17 },
                })}
          >
            Get Started
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </motion.a>
          <p className="mt-4 text-sm text-slate-500">
            1 free demo · 50 BDT per module · Google sign-in
          </p>
        </div>
      </Reveal>
    </section>
  );
}
