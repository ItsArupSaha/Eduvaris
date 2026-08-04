"use client";

import { Reveal, RevealGroup, RevealItem } from "./Reveal";
import { ShieldQuestion, Clock, Bot, Tag } from "lucide-react";

/**
 * MethodSection — vertical timeline.
 *
 * Premium 2026 pattern: a sticky-feeling vertical timeline that walks the user
 * through the 4 mechanics Eduvaris uses to eliminate "Happy Guessing" and
 * surface true root causes. Alternating copy/icons on a center rail on desktop,
 * single column on mobile.
 */
export function MethodSection() {
  return (
    <section className="px-4 py-24 md:py-32 bg-white border-t border-amber-200/40">
      <div className="mx-auto max-w-6xl">
        <Reveal className="text-center max-w-2xl mx-auto mb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500 mb-4">
            The Method
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-800 leading-[1.12]">
            We end <span className="text-gradient">&ldquo;Happy Guessing.&rdquo;</span>
          </h2>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed">
            A right answer isn&apos;t always a real strength. These four mechanics
            strip away the luck so your true English shows.
          </p>
        </Reveal>

        <div className="relative">
          {/* Center rail (desktop) / left rail (mobile) */}
          <div
            className="absolute top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-orange-200 to-transparent md:left-1/2 left-5"
            aria-hidden
          />

          <RevealGroup className="space-y-12 md:space-y-16">
            {STEPS.map((step, i) => (
              <RevealItem key={step.title}>
                <TimelineRow index={i} {...step} />
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </div>
    </section>
  );
}

const STEPS = [
  {
    icon: <Clock className="w-6 h-6" />,
    kicker: "Response Time",
    title: "Speed reveals luck",
    body: "We track how long every answer takes. A hard question answered correctly in 3 seconds isn't mastery — it's a guess. We flag it as a hidden weakness, not a strength.",
  },
  {
    icon: <ShieldQuestion className="w-6 h-6" />,
    kicker: "The Proof Mechanic",
    title: "Prove it, or you don't know it",
    body: "On True/False questions you must highlight the exact sentence that proves your choice. If you can't show the proof in time, the mark doesn't count as real.",
  },
  {
    icon: <Tag className="w-6 h-6" />,
    kicker: "Micro-Tagging",
    title: "Not &quot;weak at Reading&quot;",
    body: "Every item is tagged by sub-skill, difficulty, and common mistake. So instead of a vague label, you learn that your Synonym Inference is the real bottleneck.",
  },
  {
    icon: <Bot className="w-6 h-6" />,
    kicker: "AI Deep Analysis",
    title: "Every line of your writing & speaking",
    body: "Our AI reads your essays line by line and listens to your speech — catching structural and grammatical root causes standard checkers completely miss.",
  },
];

function TimelineRow({
  index,
  icon,
  kicker,
  title,
  body,
}: {
  index: number;
  icon: React.ReactNode;
  kicker: string;
  title: string;
  body: string;
}) {
  const isLeft = index % 2 === 0;
  return (
    <div className="relative md:grid md:grid-cols-2 md:gap-16 items-center pl-14 md:pl-0">
      {/* Node */}
      <div
        className="absolute left-5 md:left-1/2 top-0 -translate-x-1/2 z-10"
        aria-hidden
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-orange-300 shadow-md text-orange-600">
          {icon}
        </div>
      </div>

      {/* Card — alternates side on desktop */}
      <div
        className={`${
          isLeft ? "md:col-start-1" : "md:col-start-2"
        } rounded-2xl border border-slate-100 bg-white p-6 md:p-7 shadow-sm`}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-500 mb-2">
          {kicker}
        </p>
        <h3
          className="text-xl md:text-2xl font-bold text-slate-800 mb-2"
          dangerouslySetInnerHTML={{ __html: title }}
        />
        <p className="text-slate-600 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}
