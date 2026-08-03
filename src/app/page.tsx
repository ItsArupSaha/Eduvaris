"use client";

import { useState } from "react";
import { MangaChat } from "@/components/landing/MangaChat";
import { HeroCTA } from "@/components/landing/HeroCTA";

export default function LandingPage() {
  const [ctaVisible, setCtaVisible] = useState(false);

  return (
    <main className="flex-1 flex flex-col items-center justify-start px-4 py-12 md:py-16">
      {/* Headline */}
      <header className="text-center max-w-3xl mb-10">
        <span className="inline-block rounded-full bg-indigo-50 border border-indigo-100 px-3 py-1 text-xs font-medium text-indigo-600 mb-4">
          The Diagnostic MRI for English
        </span>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-slate-900 leading-tight">
          Don&apos;t take another mock test.
          <br />
          <span className="text-indigo-600">Find your real weaknesses first.</span>
        </h1>
        <p className="mt-4 text-base md:text-lg text-slate-600 max-w-2xl mx-auto">
          A 25-minute, 50 BDT micro-diagnostic that pinpoints your exact IELTS
          strengths and root-cause weaknesses — backed by evidence from your own
          performance.
        </p>
      </header>

      {/* Manga conversation */}
      <MangaChat onComplete={() => setCtaVisible(true)} />

      {/* CTA appears after conversation */}
      <HeroCTA visible={ctaVisible} />

      {/* Value props */}
      <section className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        <ValueCard
          status="critical"
          title="No Band Scores"
          body="We never tell you 'You are Band 5.5.' We tell you: '🔴 You struggle with subject-verb agreement under pressure.'"
        />
        <ValueCard
          status="emerging"
          title="Eliminate Happy Guessing"
          body="Guess-tracking, distractor traps, and proof mechanics expose weaknesses that mocks reward."
        />
        <ValueCard
          status="strength"
          title="Statistical Honesty"
          body="Every diagnosis is tiered: Early Signal, Emerging Pattern, or Confirmed Pattern — never a guess."
        />
      </section>
    </main>
  );
}

function ValueCard({
  status,
  title,
  body,
}: {
  status: "strength" | "emerging" | "critical";
  title: string;
  body: string;
}) {
  const accents = {
    strength: { dot: "bg-emerald-500", label: "Strength" },
    emerging: { dot: "bg-amber-500", label: "Emerging" },
    critical: { dot: "bg-red-500", label: "Critical" },
  }[status];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-2.5 h-2.5 rounded-full ${accents.dot}`} />
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">
          {accents.label}
        </span>
      </div>
      <h3 className="text-base font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
    </div>
  );
}
