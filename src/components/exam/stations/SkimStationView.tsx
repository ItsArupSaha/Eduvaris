"use client";

import { useExamStore } from "@/store/exam-store";
import { answerKey } from "@/lib/exam/attempt-types";
import type { SkimStation } from "@/lib/exam/content-types";

/**
 * Station 1 — Skimming.
 *
 * Each question is tied to a paragraph; the student picks the best heading
 * from four options. Selection is free (no lock) — the engine records the
 * latest pick. The advance button in StationRouter is always enabled.
 *
 * The paragraphs render above the questions so the student can skim first
 * and match second.
 */
export function SkimStationView({ station }: { station: SkimStation }) {
  const answers = useExamStore((s) => s.answers);
  const setOption = useExamStore((s) => s.setOption);

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold text-slate-900">{station.title}</h2>
      <p className="mb-5 text-sm text-slate-500">Read each paragraph. Choose its best heading.</p>

      {/* Paragraphs */}
      <div className="mb-8 space-y-4">
        {station.paragraphs.map((p, i) => (
          <div
            key={i}
            className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700"
          >
            <span className="mr-2 font-bold text-slate-400">
              {String.fromCharCode(65 + i)}
            </span>
            {p}
          </div>
        ))}
      </div>

      {/* Questions */}
      <div className="space-y-5">
        {station.questions.map((q, qi) => {
          const key = answerKey(station.id, q.id);
          const rec = answers[key];
          const selected =
            rec?.payload?.kind === "skim" ? rec.payload.optionIndex : -1;
          return (
            <div
              key={q.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="mb-3 text-sm font-semibold text-slate-900">
                {qi + 1}. {q.prompt}
              </p>
              <div className="grid gap-2">
                {q.options.map((opt, oi) => {
                  const active = selected === oi;
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => setOption(station.id, q.id, oi, "skim")}
                      className={`flex items-start gap-3 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
                        active
                          ? "border-amber-500 bg-amber-50 text-slate-900"
                          : "border-slate-200 bg-white text-slate-700 hover:border-amber-300"
                      }`}
                    >
                      <span
                        className={`mt-0.5 flex h-5 w-5 flex-none items-center justify-center rounded-full border text-xs font-semibold ${
                          active
                            ? "border-amber-500 bg-amber-500 text-white"
                            : "border-slate-300 text-slate-400"
                        }`}
                      >
                        {active ? "✓" : String.fromCharCode(65 + oi)}
                      </span>
                      <span>{opt.replace(/^[A-D]\.\s*/, "")}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
