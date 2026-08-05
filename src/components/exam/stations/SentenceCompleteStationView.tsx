"use client";

import { useExamStore } from "@/store/exam-store";
import { answerKey } from "@/lib/exam/attempt-types";
import type { SentenceCompleteStation } from "@/lib/exam/content-types";
import { PlayOnceAudio } from "./PlayOnceAudio";

/**
 * Station 3 — Paraphrase Logic.
 *
 * One academic clip (played once). Sentence-completion questions whose stems
 * paraphrase the spoken content; the student types the exact word/short
 * phrase. Same normalization as scan/audioFill.
 *
 * The transcript is NOT shown during the attempt — only on results. This
 * station tests listening + paraphrase inference.
 */
export function SentenceCompleteStationView({
  station,
}: {
  station: SentenceCompleteStation;
}) {
  const answers = useExamStore((s) => s.answers);
  const setText = useExamStore((s) => s.setText);

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold text-slate-900">{station.title}</h2>
      <p className="mb-5 text-sm text-slate-500">
        Listen to the talk once. Complete each sentence with the exact word or
        short phrase the speaker uses.
      </p>

      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
          Academic talk
        </p>
        <PlayOnceAudio src={station.audioSrc} />
      </div>

      <div className="space-y-4">
        {station.questions.map((q, qi) => {
          const key = answerKey(station.id, q.id);
          const rec = answers[key];
          const text =
            rec?.payload?.kind === "sentenceComplete" ? rec.payload.text : "";
          const parts = q.stem.split("____");
          return (
            <div
              key={q.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Question {qi + 1}
              </p>
              <p className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
                {parts.length > 1 ? (
                  <>
                    <span>{parts[0]}</span>
                    <input
                      type="text"
                      value={text}
                      onChange={(e) =>
                        setText(
                          station.id,
                          q.id,
                          e.target.value,
                          "sentenceComplete"
                        )
                      }
                      placeholder="…"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className="min-w-[8rem] flex-1 rounded-lg border border-amber-300 bg-amber-50/40 px-3 py-1.5 font-mono text-sm uppercase tracking-wide text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                    <span>{parts[1]}</span>
                  </>
                ) : (
                  <span>{q.stem}</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
