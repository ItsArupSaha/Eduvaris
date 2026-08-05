"use client";

import { useExamStore } from "@/store/exam-store";
import { answerKey } from "@/lib/exam/attempt-types";
import type { InferenceStation } from "@/lib/exam/content-types";
import { PlayOnceAudio } from "./PlayOnceAudio";

/**
 * Station 4 — Advanced Inference (the ceiling station).
 *
 * A single dense, fast Band 8-9 clip plays ONCE for the whole station. The
 * questions test implicit meaning and speaker attitude — tone, consequence,
 * purpose — the things you cannot scan for. No transcript is ever shown
 * during the attempt; that would turn a listening test into a reading test.
 *
 * Play-once is enforced by PlayOnceAudio's local state. Standard exact-match
 * MCQ selection via the store's `setOption` (kind: "inference").
 */
export function InferenceStationView({ station }: { station: InferenceStation }) {
  const answers = useExamStore((s) => s.answers);
  const setOption = useExamStore((s) => s.setOption);

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold text-slate-900">{station.title}</h2>
      <p className="mb-5 text-sm text-slate-500">
        One clip plays once for the whole station. These questions test what is
        <span className="font-medium text-slate-700"> implied </span> — tone,
        attitude, consequence — not facts you can scan for. There is no
        transcript. Listen once, decide carefully.
      </p>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Dense audio — play once
        </p>
        <PlayOnceAudio src={station.audioSrc} />
      </div>

      <div className="space-y-5">
        {station.questions.map((q, qi) => {
          const key = answerKey(station.id, q.id);
          const rec = answers[key];
          const selected =
            rec?.payload?.kind === "inference" ? rec.payload.optionIndex : -1;
          return (
            <div
              key={q.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Question {qi + 1} of {station.questions.length}
              </p>
              <p className="mb-3 text-sm font-semibold text-slate-900">
                {q.prompt}
              </p>
              <div className="grid gap-2">
                {q.options.map((opt, oi) => {
                  const active = selected === oi;
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => setOption(station.id, q.id, oi, "inference")}
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
                      <span>{opt}</span>
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
