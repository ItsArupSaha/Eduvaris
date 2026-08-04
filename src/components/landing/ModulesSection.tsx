"use client";

import { Reveal, RevealGroup, RevealItem } from "./Reveal";
import { BookOpen, Headphones, PenTool, Mic } from "lucide-react";

/**
 * ModulesSection — the four micro-tests.
 *
 * Clean 4-column grid. Each module is a short, surgical assessment — not a
 * full-length exhaustion test. Kept tight and scannable: icon, name, time, and
 * the specific sub-skill it targets.
 */
export function ModulesSection() {
  return (
    <section className="px-4 py-24 md:py-32 bg-amber-50 border-t border-amber-200/40">
      <div className="mx-auto max-w-6xl">
        <Reveal className="max-w-2xl mb-14">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-orange-500 mb-4">
            The Modules
          </p>
          <h2 className="text-3xl md:text-5xl font-bold text-slate-800 leading-[1.12]">
            Four short tests. <span className="text-gradient">One full picture.</span>
          </h2>
          <p className="mt-5 text-lg text-slate-600 leading-relaxed">
            We don&apos;t run you through a draining full-length exam. Each module
            is a focused 15–30 minute look at one skill, designed to map your
            real cognitive profile.
          </p>
        </Reveal>

        <RevealGroup className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {MODULES.map((mod) => (
            <RevealItem key={mod.id}>
              <div className="group h-full rounded-2xl border border-slate-100 bg-white p-6 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-center justify-between mb-5">
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl ${mod.lightColor} ${mod.textColor}`}
                  >
                    {mod.icon}
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-full">
                    {mod.time}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-slate-800">{mod.title}</h3>
                <div className="h-px w-full bg-slate-100 my-4" />
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Targets
                </p>
                <p className="text-sm text-slate-600 leading-snug">{mod.focus}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}

const MODULES = [
  {
    id: "reading",
    title: "Reading",
    time: "25–30 min",
    icon: <BookOpen className="w-5 h-5" />,
    focus: "Precision scanning & the Proof Mechanic",
    lightColor: "bg-blue-50",
    textColor: "text-blue-600",
  },
  {
    id: "listening",
    title: "Listening",
    time: "25–30 min",
    icon: <Headphones className="w-5 h-5" />,
    focus: "Distractor traps & phonetic capture",
    lightColor: "bg-emerald-50",
    textColor: "text-emerald-600",
  },
  {
    id: "writing",
    title: "Writing",
    time: "25 min",
    icon: <PenTool className="w-5 h-5" />,
    focus: "Pressure production & cohesion",
    lightColor: "bg-amber-50",
    textColor: "text-amber-600",
  },
  {
    id: "speaking",
    title: "Speaking",
    time: "15–20 min",
    icon: <Mic className="w-5 h-5" />,
    focus: "Spontaneous fluency & tense control",
    lightColor: "bg-purple-50",
    textColor: "text-purple-600",
  },
];
