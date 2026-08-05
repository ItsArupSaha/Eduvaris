"use client";

import { useExamStore } from "@/store/exam-store";
import { answerKey } from "@/lib/exam/attempt-types";
import type { BodyParagraphStation } from "@/lib/exam/content-types";

/**
 * Writing Station 3 — Pressure Production.
 *
 * One IELTS prompt; the student writes ONE body paragraph (min 100 words).
 * Live word counter. Free-text answer saved to the engine store and
 * auto-saved to Firestore on the normal cadence. The min-word target is a
 * soft signal — the student can submit below it, but the counter turns red.
 */
export function BodyParagraphStationView({
  station,
}: {
  station: BodyParagraphStation;
}) {
  const answers = useExamStore((s) => s.answers);
  const setText = useExamStore((s) => s.setText);
  const touchQuestion = useExamStore((s) => s.touchQuestion);

  const q = station.questions[0];
  const key = answerKey(station.id, q.id);
  const rec = answers[key];
  const text = rec?.payload?.kind === "bodyParagraph" ? rec.payload.text : "";

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  // Counter color tiers: rose below 200, amber 200-249, green 250+.
  const tier =
    wordCount >= q.minWords
      ? "text-emerald-600"
      : wordCount >= q.minWords - 50
      ? "text-amber-600"
      : "text-rose-600";
  const meetsMin = wordCount >= q.minWords;

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold text-slate-900">{station.title}</h2>
      <p className="mb-5 text-sm text-slate-500">
        Write ONE body paragraph responding to the prompt. Minimum{" "}
        {q.minWords} words.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Prompt
          </p>
          <p className="mt-1 text-sm font-medium leading-relaxed text-slate-800">
            {q.prompt}
          </p>
        </div>

        <label className="block">
          <span className="text-xs font-medium text-slate-500">
            Your body paragraph
          </span>
          <textarea
            value={text}
            onChange={(e) => {
              touchQuestion(station.id, q.id);
              setText(station.id, q.id, e.target.value, "bodyParagraph");
            }}
            rows={12}
            placeholder="Write your paragraph here…"
            className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
          />
        </label>

        <div className="mt-3 flex items-center justify-between">
          <span className={`text-xs font-semibold ${tier}`}>
            {wordCount} / {q.minWords} words{" "}
            {meetsMin ? "✓" : wordCount >= q.minWords - 50 ? "(almost there)" : "(below minimum)"}
          </span>
        </div>
      </div>
    </section>
  );
}
