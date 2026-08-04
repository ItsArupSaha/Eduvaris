"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";

/**
 * ReportSection — the "blueprint" payoff.
 *
 * Design intent: this is the single most important trust moment on the page.
 * Instead of vague marketing copy, we show a realistic, actionable diagnostic
 * report — the actual artifact the user gets. Three panels:
 *
 *   1. Skill Profile  — animated horizontal mastery bars (at-a-glance portrait)
 *   2. Root Causes    — evidence-backed weaknesses with the "why"
 *   3. Roadmap        — prioritized fix order, ranked by impact
 *
 * Research basis: a hybrid diagnostic-dashboard pattern — bars for precise
 * comparison + ranked roadmap for action. The report's job is to drive action,
 * not decorate (Medium, dashboard-design guidance).
 *
 * Dark "app surface" card to signal "this is a real product UI", set against
 * the cream section background.
 */

interface Skill {
  name: string;
  score: number; // 0–100 mastery
  status: "strength" | "watch" | "critical";
}

const SKILLS: Skill[] = [
  { name: "Detail Scanning", score: 92, status: "strength" },
  { name: "Vocabulary Range", score: 78, status: "strength" },
  { name: "Paraphrasing", score: 58, status: "watch" },
  { name: "True / False Logic", score: 31, status: "critical" },
  { name: "Grammar Accuracy", score: 44, status: "critical" },
];

const ROOT_CAUSES = [
  {
    tag: "Critical",
    title: "Confuses False with Not Given",
    evidence:
      "2 of 4 True/False answers selected 'False' where the text gave no information. Pattern repeats across passages.",
  },
  {
    tag: "Critical",
    title: "Lucky guesses masking gaps",
    evidence:
      "2 correct answers were answered in under 3 seconds without showing proof. Marked as hidden weaknesses.",
  },
];

const ROADMAP = [
  { rank: 1, focus: "Master the False vs. Not Given distinction", impact: "High" },
  { rank: 2, focus: "Drill T/F/NG with timed proof-highlighting", impact: "High" },
  { rank: 3, focus: "Tighten verb-tense accuracy in writing", impact: "Medium" },
];

export function ReportSection() {
  const prefersReducedMotion = useReducedMotion();

  const barVariants: Variants = {
    hidden: { width: 0 },
    visible: (score: number) => ({
      width: `${score}%`,
      transition: { duration: 1, ease: [0.22, 1, 0.36, 1] },
    }),
  };

  return (
    <section className="px-4 py-20 md:py-24 bg-amber-50 border-t border-amber-200/40">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.6 }}
          className="max-w-2xl mb-10"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500 mb-4">
            The Result
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-800 leading-[1.12]">
            A blueprint, <span className="text-gradient">not a score.</span>
          </h2>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed">
            No demotivating number. You get an evidence-backed map of exactly
            where your English is strong, where it breaks down, and the precise
            order to fix it.
          </p>
        </motion.div>

        {/* The report — a realistic "app surface" card */}
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 30 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7 }}
          className="rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-300/40 overflow-hidden"
        >
          {/* Report toolbar */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white text-xs font-bold">
                E
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Deep Diagnostic Report</p>
                <p className="text-xs text-slate-500">Reading · Generated today</p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Evidence-backed
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-px bg-slate-100">
            {/* Panel 1 — Skill Profile (wide) */}
            <div className="lg:col-span-3 bg-white p-6 md:p-8">
              <PanelTitle kicker="Skill Profile" title="Where you stand" />
              <div className="mt-6 space-y-5">
                {SKILLS.map((skill, i) => (
                  <SkillBar
                    key={skill.name}
                    skill={skill}
                    variants={barVariants}
                    delay={i * 0.1}
                    prefersReducedMotion={!!prefersReducedMotion}
                  />
                ))}
              </div>
              <div className="mt-6 flex flex-wrap gap-4 text-xs text-slate-500">
                <LegendDot className="bg-emerald-500" label="Strength" />
                <LegendDot className="bg-amber-500" label="Watch" />
                <LegendDot className="bg-rose-500" label="Critical" />
              </div>
            </div>

            {/* Panel 2 — Root Causes */}
            <div className="lg:col-span-2 bg-white p-6 md:p-8">
              <PanelTitle kicker="Root Causes" title="The real why" />
              <div className="mt-6 space-y-4">
                {ROOT_CAUSES.map((rc) => (
                  <div
                    key={rc.title}
                    className="rounded-xl border border-rose-100 bg-rose-50/40 p-4"
                  >
                    <span className="inline-block rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-rose-600 mb-2">
                      {rc.tag}
                    </span>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">
                      {rc.title}
                    </p>
                    <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                      {rc.evidence}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Panel 3 — Roadmap (full width) */}
            <div className="lg:col-span-5 bg-white p-6 md:p-8 border-t border-slate-100">
              <PanelTitle kicker="Your Roadmap" title="Fix in this order" />
              <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {ROADMAP.map((step) => (
                  <div
                    key={step.rank}
                    className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 flex items-start gap-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white text-sm font-bold">
                      {step.rank}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 leading-snug">
                        {step.focus}
                      </p>
                      <span className="mt-1.5 inline-block text-[10px] font-bold uppercase tracking-wider text-orange-500">
                        {step.impact} impact
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function PanelTitle({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-500">
        {kicker}
      </p>
      <h3 className="text-lg font-bold text-slate-800 mt-0.5">{title}</h3>
    </div>
  );
}

function SkillBar({
  skill,
  variants,
  delay,
  prefersReducedMotion,
}: {
  skill: Skill;
  variants: Variants;
  delay: number;
  prefersReducedMotion: boolean;
}) {
  const color =
    skill.status === "strength"
      ? "bg-emerald-500"
      : skill.status === "watch"
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-sm font-medium text-slate-700">{skill.name}</span>
        <span className="text-xs font-semibold text-slate-500">{skill.score}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          style={prefersReducedMotion ? { width: `${skill.score}%` } : undefined}
          variants={prefersReducedMotion ? undefined : variants}
          initial={prefersReducedMotion ? undefined : "hidden"}
          whileInView={prefersReducedMotion ? undefined : "visible"}
          viewport={{ once: true, amount: 0.6 }}
          custom={skill.score}
          transition={{ delay }}
        />
      </div>
    </div>
  );
}

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2 w-2 rounded-full ${className}`} />
      {label}
    </span>
  );
}
