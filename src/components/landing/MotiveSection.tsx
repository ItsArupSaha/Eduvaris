"use client";

import { Reveal } from "./Reveal";
import { ArrowRight } from "lucide-react";

/**
 * MotiveSection — editorial split, not a generic card grid.
 *
 * Design intent: the philosophy reads like a manifesto, the way an opinionated
 * product (Linear/Stripe) writes. Left = the belief, big and human. Right = a
 * stark "what it costs to be wrong" calculator: the price of a blind exam
 * attempt vs. a 50 BDT diagnosis. The visual does the convincing.
 *
 * Compact vertical rhythm; single screen feel.
 */
export function MotiveSection() {
  return (
    <section className="px-4 py-20 md:py-24 bg-amber-50 border-t border-amber-200/40">
      <div className="mx-auto max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
        {/* Left — the belief */}
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500 mb-5">
            The Motive
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-800 leading-[1.1]">
            Diagnose first.
            <br />
            <span className="text-gradient">Then prepare.</span>
          </h2>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed">
            Most candidates do it backwards. They pour months into prep and pay
            for the real exam before they know what&apos;s actually breaking in
            their English.
          </p>
          <p className="mt-4 text-lg text-slate-600 leading-relaxed">
            We flip the order. For <span className="font-semibold text-slate-800">50 BDT</span>,
            you learn your real strengths — and the exact root causes holding you
            back — <span className="italic">before</span> you spend a taka on heavy
            prep or a real exam seat.
          </p>
          <div className="mt-8 flex items-center gap-3 text-sm font-medium text-slate-500">
            <span className="h-px w-8 bg-orange-300" />
            Strategic prep starts with a diagnosis.
          </div>
        </Reveal>

        {/* Right — the cost of being wrong */}
        <Reveal delay={0.1}>
          <div className="rounded-3xl border border-blue-900/10 bg-white p-8 md:p-10 shadow-xl shadow-slate-200/40 relative overflow-hidden">
            <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-amber-100/70 blur-3xl" aria-hidden />
            <div className="relative z-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400 mb-6">
                The cost of a blind guess
              </p>

              {/* The two paths */}
              <div className="space-y-4">
                {/* Blind path */}
                <div className="rounded-2xl border border-rose-100 bg-rose-50/40 p-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-1">
                    Without a diagnosis
                  </p>
                  <p className="text-3xl font-bold text-slate-800">
                    20,000<span className="text-sm font-medium text-slate-500 ml-1">BDT</span>
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Real exam + blind prep, not knowing what to fix
                  </p>
                </div>

                {/* Arrow */}
                <div className="flex justify-center">
                  <ArrowRight className="w-5 h-5 text-slate-300 rotate-90" />
                </div>

                {/* Diagnosed path */}
                <div className="rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-amber-50 to-white p-5 shadow-sm">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-500 mb-1">
                    With Eduvaris
                  </p>
                  <p className="text-3xl font-bold text-gradient">
                    50<span className="text-sm font-medium text-slate-500 ml-1">BDT</span>
                  </p>
                  <p className="text-sm text-slate-500 mt-1">
                    Know exactly what to fix before you invest
                  </p>
                </div>
              </div>

              <p className="mt-6 text-center text-xs text-slate-400">
                0.25% of the cost. 100% of the clarity.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
