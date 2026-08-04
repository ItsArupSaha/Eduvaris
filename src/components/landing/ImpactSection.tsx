"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Target, Crosshair, BrainCircuit } from "lucide-react";

/**
 * "Impact & Data" — premium SaaS redesign.
 *
 * Two alternating content blocks (Motive, Method) followed by a 3-column bold-
 * statistic grid. Large numbers, clean white cards, subtle reveal on scroll.
 * No use of the banned term "MRI".
 */
export function ImpactSection() {
  return (
    <section className="px-4 py-24 md:py-32 bg-white border-t border-amber-200/40">
      <div className="mx-auto max-w-6xl">
        {/* Section eyebrow */}
        <div className="text-center mb-20">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500 mb-3">
            Why Eduvaris
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800">
            Diagnosis before practice.
          </h2>
        </div>

        {/* Block 1 — Motive (text left, visual right) */}
        <AlternatingBlock
          flip={false}
          icon={<Target className="w-7 h-7" />}
          label="The Motive"
          title="A Deep Diagnostic, not another course."
          body="We don't sell courses. We are a Deep Diagnostic tool. Before you spend 20,000 BDT on the real exam, spend 50 BDT to find out exactly where your English is breaking down."
          visual={
            <PriceComparison />
          }
        />

        {/* Block 2 — Method (visual left, text right) */}
        <AlternatingBlock
          flip
          icon={<Crosshair className="w-7 h-7" />}
          label="The Method"
          title="We eliminate 'Happy Guessing.'"
          body="We use Micro-Tagging to track your response time, ask for 'Proof' on True/False questions, and use AI to analyze every line of your writing and speaking to expose true root causes."
          visual={
            <div className="grid grid-cols-3 gap-3">
              <MethodTag label="Response Time" />
              <MethodTag label="Proof Mechanic" />
              <MethodTag label="AI Analysis" />
            </div>
          }
        />

        {/* The Data — bold statistics */}
        <div className="mt-28">
          <div className="text-center mb-12">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500 mb-3">
              The Data
            </p>
            <h3 className="text-2xl md:text-3xl font-bold text-slate-800">
              The proof is in the numbers.
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <BigStat
              icon={<Target className="w-6 h-6" />}
              stat="0.5–1.0"
              unit="Band Improvement"
              body="Students who diagnose micro-skills before mock testing improve faster."
            />
            <BigStat
              icon={<Crosshair className="w-6 h-6" />}
              stat="72%"
              unit="Stuck at 6.0"
              body="of Band 6.0 students remain stuck because they guess on T/F/NG questions. Our Proof Mechanic exposes this."
            />
            <BigStat
              icon={<BrainCircuit className="w-6 h-6" />}
              stat="40%"
              unit="More Errors Caught"
              body="AI-assisted grammar analysis on a single body paragraph catches more structural errors than standard checkers."
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AlternatingBlock({
  flip,
  icon,
  label,
  title,
  body,
  visual,
}: {
  flip: boolean;
  icon: React.ReactNode;
  label: string;
  title: string;
  body: string;
  visual: React.ReactNode;
}) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 30 }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6 }}
      className={`grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16 items-center mb-24 last:mb-0 ${
        flip ? "md:[&>*:first-child]:order-2" : ""
      }`}
    >
      {/* Text */}
      <div>
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-100 to-orange-100 text-orange-600 mb-5">
          {icon}
        </div>
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-orange-500 mb-3">
          {label}
        </p>
        <h3 className="text-2xl md:text-4xl font-bold text-slate-800 mb-4 leading-tight">
          {title}
        </h3>
        <p className="text-base md:text-lg text-slate-600 leading-relaxed max-w-xl">
          {body}
        </p>
      </div>
      {/* Visual */}
      <div>{visual}</div>
    </motion.div>
  );
}

function PriceComparison() {
  return (
    <div className="rounded-2xl border border-amber-100 bg-amber-50 p-8 shadow-sm">
      <div className="flex items-end justify-center gap-8">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">
            Real Exam
          </p>
          <p className="text-4xl font-bold text-slate-800">20,000</p>
          <p className="text-sm text-slate-500">BDT</p>
        </div>
        <div className="text-3xl text-slate-300 pb-2">vs</div>
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-orange-500 mb-2">
            Eduvaris
          </p>
          <p className="text-4xl font-bold text-gradient">50</p>
          <p className="text-sm text-slate-500">BDT</p>
        </div>
      </div>
      <p className="text-center text-xs text-slate-500 mt-6">
        Know your weaknesses <span className="font-semibold">before</span> you pay 400× more.
      </p>
    </div>
  );
}

function MethodTag({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-center shadow-sm">
      <p className="text-sm font-semibold text-slate-700">{label}</p>
    </div>
  );
}

function BigStat({
  icon,
  stat,
  unit,
  body,
}: {
  icon: React.ReactNode;
  stat: string;
  unit: string;
  body: string;
}) {
  const prefersReducedMotion = useReducedMotion();
  return (
    <motion.div
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 30 }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6 }}
      className="rounded-2xl border border-slate-100 bg-white p-8 shadow-lg shadow-slate-200/50 text-center"
    >
      <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-orange-500 text-white mb-5">
        {icon}
      </div>
      <div className="flex items-baseline justify-center gap-2 mb-3">
        <span className="text-5xl font-bold text-gradient">{stat}</span>
      </div>
      <p className="text-sm font-semibold text-slate-800 mb-2">{unit}</p>
      <p className="text-sm text-slate-600 leading-relaxed">{body}</p>
    </motion.div>
  );
}
