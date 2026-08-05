"use client";

import { useExamStore } from "@/store/exam-store";
import { answerKey } from "@/lib/exam/attempt-types";
import type { ParaphraseStation } from "@/lib/exam/content-types";
import { Countdown } from "./Countdown";

/**
 * Writing Station 1 — Paraphrasing.
 *
 * 3 prompts, one at a time, 2 minutes each. The student rewrites the prompt
 * in 1-2 sentences without using the banned words. Free-text answer saved to
 * the engine store; the per-question timer auto-advances to the next prompt.
 *
 * The active prompt is the first one whose answer is not locked. Locking
 * happens on timer-elapsed or when the student explicitly clicks Next.
 */
export function ParaphraseStationView({ station }: { station: ParaphraseStation }) {
  const answers = useExamStore((s) => s.answers);
  const setText = useExamStore((s) => s.setText);
  const lockText = useExamStore((s) => s.lockText);
  const touchQuestion = useExamStore((s) => s.touchQuestion);

  // Active = first non-locked question.
  const firstUnlocked = station.questions.findIndex((q) => {
    const rec = answers[answerKey(station.id, q.id)];
    return !rec?.locked;
  });
  const activeIndex = firstUnlocked === -1 ? station.questions.length - 1 : firstUnlocked;

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold text-slate-900">{station.title}</h2>
      <p className="mb-5 text-sm text-slate-500">
        Rewrite each prompt in 1-2 sentences without using the banned words.
        2 minutes per prompt.
      </p>

      <div className="space-y-4">
        {station.questions.map((q, qi) => {
          const key = answerKey(station.id, q.id);
          const rec = answers[key];
          const text = rec?.payload?.kind === "paraphrase" ? rec.payload.text : "";
          const locked = rec?.locked ?? false;
          const isActive = qi === activeIndex;
          return (
            <div
              key={q.id}
              className={`rounded-xl border p-5 transition-colors ${
                isActive
                  ? "border-amber-300 bg-amber-50/40 shadow-sm"
                  : locked
                  ? "border-slate-200 bg-white opacity-70"
                  : "border-slate-200 bg-white"
              }`}
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Prompt {qi + 1} of {station.questions.length}
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {q.prompt}
                  </p>
                </div>
                {isActive && !locked && (
                  <Countdown
                    key={q.id}
                    seconds={q.perQuestionSeconds}
                    onElapsed={() => lockText(station.id, q.id, "paraphrase")}
                  />
                )}
                {locked && (
                  <span className="flex-none text-xs font-semibold text-emerald-600">
                    ✓ locked
                  </span>
                )}
              </div>

              <div className="mb-3 flex flex-wrap gap-2">
                <span className="text-xs font-medium text-slate-500">
                  Banned words:
                </span>
                {q.bannedWords.map((w) => (
                  <span
                    key={w}
                    className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700"
                  >
                    {w}
                  </span>
                ))}
              </div>

              <textarea
                value={text}
                onChange={(e) => {
                  touchQuestion(station.id, q.id);
                  setText(station.id, q.id, e.target.value, "paraphrase");
                }}
                disabled={locked || !isActive}
                rows={3}
                placeholder="Your paraphrase (1-2 sentences)…"
                className="w-full resize-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200 disabled:bg-slate-50 disabled:text-slate-500"
              />

              {isActive && !locked && (
                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => lockText(station.id, q.id, "paraphrase")}
                    className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    Lock answer →
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
