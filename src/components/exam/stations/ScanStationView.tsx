"use client";

import { useExamStore } from "@/store/exam-store";
import { answerKey } from "@/lib/exam/attempt-types";
import type { ScanStation } from "@/lib/exam/content-types";

/**
 * Station 4 — Precision Scanning.
 *
 * Fill-in-the-blank, exact-after-normalize match. The user types into each
 * blank, then clicks "Lock answer" per question. Once locked, the input is
 * disabled. The advance button is enabled regardless — but unanswered or
 * unlocked questions are graded as incorrect.
 *
 * The context sentence shows the blank inline (as an input) so the student
 * reads + types in the same line. The full passage renders above for scanning
 * practice.
 */
export function ScanStationView({ station }: { station: ScanStation }) {
  const answers = useExamStore((s) => s.answers);
  const setText = useExamStore((s) => s.setText);
  const lockText = useExamStore((s) => s.lockText);

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold text-slate-900">{station.title}</h2>
      <p className="mb-5 text-sm text-slate-500">
        Scan the passage. Fill each blank with the exact word. Spelling counts.
      </p>

      <div className="mb-8 rounded-xl border border-slate-200 bg-white p-5 text-sm leading-relaxed text-slate-700">
        {station.passage}
      </div>

      <div className="space-y-5">
        {station.questions.map((q, qi) => {
          const key = answerKey(station.id, q.id);
          const rec = answers[key];
          const text = rec?.payload?.kind === "scan" ? rec.payload.text : "";
          const locked = rec?.locked ?? false;

          // Split the context sentence on the blank marker so the input
          // renders inline where the word belongs.
          const parts = q.contextSentence.split("____");

          return (
            <div
              key={q.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Question {qi + 1}
              </p>
              <p className="flex flex-wrap items-center gap-2 text-sm text-slate-800">
                {parts.length > 1 ? (
                  <>
                    <span>{parts[0]}</span>
                    <input
                      type="text"
                      value={text}
                      disabled={locked}
                      onChange={(e) => setText(station.id, q.id, e.target.value, "scan")}
                      placeholder="…"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      className={`min-w-[8rem] flex-1 rounded-lg border px-3 py-1.5 font-mono text-sm uppercase tracking-wide focus:outline-none focus:ring-2 ${
                        locked
                          ? "border-slate-200 bg-slate-50 text-slate-500"
                          : "border-amber-300 bg-amber-50/40 text-slate-900 focus:border-amber-500 focus:ring-amber-200"
                      }`}
                    />
                    <span>{parts[1]}</span>
                  </>
                ) : (
                  <span>{q.contextSentence}</span>
                )}
              </p>

              <div className="mt-3 flex items-center justify-between">
                {locked ? (
                  <span className="text-xs font-medium text-emerald-600">
                    ✓ Answer locked
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">
                    Type the exact word, then lock.
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => lockText(station.id, q.id, "scan")}
                  disabled={locked || !text.trim()}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {locked ? "Locked" : "Lock answer"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
