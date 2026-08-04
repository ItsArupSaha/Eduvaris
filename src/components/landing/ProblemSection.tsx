"use client";

import { Reveal, RevealGroup, RevealItem } from "./Reveal";

/**
 * ProblemSection — empathy first, product second.
 *
 * Name the pain every candidate feels: test after test, a number, no "why".
 * Two contrasting cards frame the loop they're stuck in vs. the shift Eduvaris
 * offers. No mention of the exam by trademarked name — kept generic ("the real
 * exam").
 */
export function ProblemSection() {
  return (
    <section className="px-4 py-24 md:py-32 bg-white border-t border-amber-200/40">
      <div className="mx-auto max-w-5xl">
        <Reveal className="text-center mb-16 md:mb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-rose-400 mb-5">
            Sound familiar?
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-800 leading-[1.12]">
            You took the test. You got a score.
            <br />
            <span className="text-gradient">Nobody told you why.</span>
          </h2>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            So you register for another mock. Then another. The number barely
            moves. You&apos;re spending time, money, and hope — guessing at what to
            study next.
          </p>
        </Reveal>

        <RevealGroup className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <RevealItem>
            <div className="h-full rounded-3xl border border-rose-100 bg-rose-50/40 p-8 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-rose-400 mb-6">
                The loop you&apos;re stuck in
              </p>
              <ul className="space-y-4 text-slate-700">
                <PainItem>Take a mock test</PainItem>
                <PainItem>Get a band number — and nothing else</PainItem>
                <PainItem>Guess what to study next</PainItem>
                <PainItem>Repeat. Score barely moves.</PainItem>
              </ul>
            </div>
          </RevealItem>

          <RevealItem>
            <div className="h-full rounded-3xl border border-emerald-100 bg-emerald-50/40 p-8 md:p-10">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500 mb-6">
                What changes with Eduvaris
              </p>
              <ul className="space-y-4 text-slate-700">
                <WinItem>One 25-minute deep look at your English</WinItem>
                <WinItem>See your real strengths clearly</WinItem>
                <WinItem>Pinpoint the exact root causes holding you back</WinItem>
                <WinItem>Walk away with a roadmap — not a guess</WinItem>
              </ul>
            </div>
          </RevealItem>
        </RevealGroup>
      </div>
    </section>
  );
}

function PainItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-500 text-sm font-bold">
        ✕
      </span>
      <span className="leading-snug">{children}</span>
    </li>
  );
}

function WinItem({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-sm font-bold">
        ✓
      </span>
      <span className="leading-snug">{children}</span>
    </li>
  );
}
