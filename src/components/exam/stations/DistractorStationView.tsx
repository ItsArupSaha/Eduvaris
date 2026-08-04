"use client";

import { useExamStore } from "@/store/exam-store";
import { answerKey } from "@/lib/exam/attempt-types";
import type { DistractorStation } from "@/lib/exam/content-types";
import { PlayOnceAudio } from "./PlayOnceAudio";

/**
 * Station 1 — The Distractor Trap.
 *
 * One short clip per question. Each clip plays ONCE via PlayOnceAudio; once
 * played, the play button disables forever. The transcript (which embeds the
 * self-correction trap) is NEVER shown here — only on the results screen.
 *
 * The student picks one MCQ per clip. Selection is free (no lock) — the
 * engine records the latest pick.
 */
export function DistractorStationView({ station }: { station: DistractorStation }) {
  const answers = useExamStore((s) => s.answers);
  const setOption = useExamStore((s) => s.setOption);

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold text-slate-900">{station.title}</h2>
      <p className="mb-5 text-sm text-slate-500">
        Each clip plays once — listen carefully, the speaker may correct
        themselves.
      </p>

      <div className="space-y-5">
        {station.questions.map((q, qi) => {
          const key = answerKey(station.id, q.id);
          const rec = answers[key];
          const selected =
            rec?.payload?.kind === "distractor" ? rec.payload.optionIndex : -1;
          return (
            <div
              key={q.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Clip {qi + 1} of {station.questions.length}
              </p>
              <PlayOnceAudio src={q.audioSrc} />

              <p className="mt-4 mb-3 text-sm font-semibold text-slate-900">
                {q.prompt}
              </p>
              <div className="grid gap-2">
                {q.options.map((opt, oi) => {
                  const active = selected === oi;
                  return (
                    <button
                      key={oi}
                      type="button"
                      onClick={() => setOption(station.id, q.id, oi, "distractor")}
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
