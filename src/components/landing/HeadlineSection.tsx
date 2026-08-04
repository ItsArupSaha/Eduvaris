"use client";

import { Reveal } from "./Reveal";

/**
 * HeadlineSection — the immediate scroll-below-the-hero moment.
 *
 * Directly under the locked hero. One job: land the emotional thesis in a calm,
 * centered way before the rest of the narrative unpacks it. No buttons, no
 * cards — just breathing room and a single idea.
 */
export function HeadlineSection() {
  return (
    <section className="px-4 py-28 md:py-40 bg-amber-50">
      <Reveal className="mx-auto max-w-4xl text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500 mb-6">
          Stop guessing. Start knowing.
        </p>
        <h2 className="text-4xl md:text-6xl font-bold tracking-tight text-slate-800 leading-[1.08]">
          Don&apos;t take another mock test.
          <br />
          <span className="text-gradient">Find your real weaknesses first.</span>
        </h2>
        <p className="mt-8 text-lg md:text-xl text-slate-600 leading-relaxed max-w-2xl mx-auto">
          Eduvaris is a 25-minute deep look at your English — not a band score,
          not another practice test. Before you invest months of prep or pay for
          the real exam, find out exactly where you shine and where you break down.
        </p>
      </Reveal>
    </section>
  );
}
