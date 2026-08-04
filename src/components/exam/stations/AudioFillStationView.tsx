"use client";

import { useExamStore } from "@/store/exam-store";
import { answerKey } from "@/lib/exam/attempt-types";
import type { AudioFillStation } from "@/lib/exam/content-types";
import { PlayOnceAudio } from "./PlayOnceAudio";

/**
 * Station 2 — Precision & Spelling.
 *
 * One clip for the whole station (played once via PlayOnceAudio). Four
 * fill-in-the-blank questions for spelled names, tricky numbers. Same
 * exact-after-normalize match as Reading scan.
 *
 * The transcript is NOT shown during the attempt — only on results.
 */
export function AudioFillStationView({ station }: { station: AudioFillStation }) {
  const answers = useExamStore((s) => s.answers);
  const setText = useExamStore((s) => s.setText);

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold text-slate-900">{station.title}</h2>
      <p className="mb-5 text-sm text-slate-500">
        Listen to the message once, then fill each blank. Spelling counts.
      </p>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Audio message
        </p>
        <PlayOnceAudio src={station.audioSrc} />
      </div>

      <div className="space-y-4">
        {station.questions.map((q, qi) => {
          const key = answerKey(station.id, q.id);
          const rec = answers[key];
          const text = rec?.payload?.kind === "audioFill" ? rec.payload.text : "";
          return (
            <div
              key={q.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <label className="block">
                <span className="text-xs font-medium text-slate-500">
                  {qi + 1}. {q.prompt}
                </span>
                <input
                  type="text"
                  value={text}
                  onChange={(e) =>
                    setText(station.id, q.id, e.target.value, "audioFill")
                  }
                  placeholder="Type the exact answer"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 font-mono text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                />
              </label>
            </div>
          );
        })}
      </div>
    </section>
  );
}
