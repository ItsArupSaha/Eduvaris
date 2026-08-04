"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "framer-motion";

/**
 * DataSection — full-width dark editorial band (Linear/Stripe aesthetic).
 *
 * Design intent: instead of three tidy "stat cards", the numbers get to
 * breathe on a near-black canvas with oversized type and scroll-triggered
 * count-up animations. This reads as a premium trust signal, not a feature
 * grid. One outcome per metric, generous whitespace, tight captions.
 *
 * The band deliberately breaks the amber/white alternation — a dark interlude
 * that makes the data land harder.
 */

interface Stat {
  /** Numeric end value for the count-up. */
  value: number;
  /** Prefix shown before the number (e.g. "0.5" rendered via value=0.5). */
  decimals: number;
  /** Suffix unit, e.g. "%" or "+". */
  suffix?: string;
  /** Optional leading symbol like "~". */
  prefix?: string;
  /** Short trust label. */
  label: string;
  /** One-line human explanation. */
  caption: string;
}

const STATS: Stat[] = [
  {
    value: 1.0,
    decimals: 1,
    prefix: "0.5–",
    label: "Band Improvement",
    caption:
      "Students who diagnose micro-skills before mock testing climb faster than those grinding blind practice.",
  },
  {
    value: 72,
    decimals: 0,
    suffix: "%",
    label: "Guessers Exposed",
    caption:
      "of Band 6.0 students stay stuck because they guess on True/False/Not Given. Our Proof Mechanic strips away the luck.",
  },
  {
    value: 40,
    decimals: 0,
    suffix: "%",
    label: "More Errors Caught",
    caption:
      "AI-assisted analysis of a single body paragraph catches more structural errors than standard grammar checkers.",
  },
];

export function DataSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.3 });

  return (
    <section
      ref={sectionRef}
      className="px-4 py-20 md:py-28 bg-slate-900 relative overflow-hidden"
    >
      {/* Ambient glows */}
      <div className="absolute -left-20 top-0 h-72 w-72 rounded-full bg-orange-500/10 blur-3xl" aria-hidden />
      <div className="absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl" aria-hidden />

      <div className="mx-auto max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-400 mb-4">
            The Data
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-white leading-[1.12]">
            The proof is in the numbers.
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-y-12 md:gap-x-10">
          {STATS.map((stat, i) => (
            <StatBlock key={stat.label} stat={stat} inView={inView} delay={i * 0.15} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StatBlock({
  stat,
  inView,
  delay,
}: {
  stat: Stat;
  inView: boolean;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay }}
      className="text-center md:px-4 md:border-l md:first:border-l-0 border-white/10"
    >
      <div className="flex items-baseline justify-center">
        {stat.prefix && (
          <span className="text-4xl md:text-6xl font-black text-white/90 mr-0.5">
            {stat.prefix}
          </span>
        )}
        <CountUp
          end={stat.value}
          decimals={stat.decimals}
          active={inView}
          className="text-6xl md:text-7xl font-black bg-gradient-to-b from-amber-200 to-orange-400 bg-clip-text text-transparent"
        />
        {stat.suffix && (
          <span className="text-4xl md:text-6xl font-black text-white/90 ml-0.5">
            {stat.suffix}
          </span>
        )}
      </div>
      <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-orange-300">
        {stat.label}
      </p>
      <p className="mt-3 text-sm text-slate-400 leading-relaxed max-w-xs mx-auto">
        {stat.caption}
      </p>
    </motion.div>
  );
}

/**
 * Lightweight count-up using requestAnimationFrame. Starts only when `active`
 * flips true (driven by the section entering the viewport). Honors reduced
 * motion by snapping straight to the end value.
 */
function CountUp({
  end,
  decimals,
  active,
  className,
}: {
  end: number;
  decimals: number;
  active: boolean;
  className?: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active) return;
    if (prefersReducedMotion) {
      setDisplay(end);
      return;
    }
    const duration = 1400;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(end * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
      else setDisplay(end);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, end, prefersReducedMotion]);

  return <span className={className}>{display.toFixed(decimals)}</span>;
}
