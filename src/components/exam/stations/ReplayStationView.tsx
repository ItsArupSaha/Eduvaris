"use client";

import { useEffect, useRef } from "react";
import { useExamStore } from "@/store/exam-store";
import { answerKey } from "@/lib/exam/attempt-types";
import type { ReplayStation } from "@/lib/exam/content-types";
import { PlayOnceAudio } from "./PlayOnceAudio";
import { saveAttempt } from "@/lib/exam/exam-api";

/**
 * Station 4 — The "Replay Proof" Mechanic (review phase).
 *
 * NOT a fresh exam station: it is a review of Station 3's answers. On entry,
 * the component snapshots the current Station-3 answers and pushes the
 * snapshot to the server via the PATCH route (forward-progress field
 * `reviewSnapshot`). The grader later compares snapshot vs final to detect
 * correct→wrong deteriorations — the overconfidence signal.
 *
 * For each Station-3 question the student may:
 *   - replay a bounded 15s segment of the Station-3 audio (once)
 *   - change their answer (the change is stored under the replay station's
 *     key, so the original Station-3 answer is preserved in the snapshot)
 *
 * The grader prefers the replay answer when present, else falls back to the
 * source sentenceComplete answer.
 */
export function ReplayStationView({ station }: { station: ReplayStation }) {
  const exam = useExamStore((s) => s.exam);
  const answers = useExamStore((s) => s.answers);
  const setText = useExamStore((s) => s.setText);
  const attemptId = useExamStore((s) => s.attemptId);

  const snapshottedRef = useRef(false);

  // Locate the source sentenceComplete station so we can read the original
  // answers + question stems for display.
  const sourceStation = exam?.stations.find((s) => s.kind === "sentenceComplete");
  const sourceQuestions =
    sourceStation && sourceStation.kind === "sentenceComplete"
      ? sourceStation.questions
      : [];

  // Snapshot once on entry. Push to server immediately so the grader has it
  // even if the user tabs-out or the timer expires mid-review.
  useEffect(() => {
    if (snapshottedRef.current || !attemptId || !sourceStation) return;
    snapshottedRef.current = true;
    // Deep-ish copy of the relevant source answers.
    const snap: Record<string, unknown> = {};
    for (const sq of sourceQuestions) {
      const k = answerKey(sourceStation.id, sq.id);
      const rec = answers[k];
      if (rec) snap[k] = JSON.parse(JSON.stringify(rec));
    }
    void saveAttempt(attemptId, {
      reviewSnapshot: snap as Parameters<typeof saveAttempt>[1]["reviewSnapshot"],
    }).catch(() => {
      // Non-fatal — the autosave debouncer will retry.
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId]);

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold text-slate-900">{station.title}</h2>
      <p className="mb-5 text-sm text-slate-500">
        Review your Station 3 answers. You may replay a 15-second segment once
        per question and change your answer.{" "}
        <span className="font-medium text-amber-700">
          Changing a correct answer to a wrong one will lower your score.
        </span>
      </p>

      {/* Transcript now revealed — review is allowed to see it. */}
      <details className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-slate-500">
          Show full transcript
        </summary>
        <p className="mt-3 text-sm leading-relaxed text-slate-700">
          {station.transcript}
        </p>
      </details>

      <div className="space-y-4">
        {station.questions.map((rq, qi) => {
          const srcQ = sourceQuestions.find((sq) => sq.id === rq.sourceQuestionId);
          if (!srcQ || srcQ.kind !== "sentenceComplete") return null;

          const replayKey = answerKey(station.id, rq.id);
          const sourceKey = answerKey(sourceStation!.id, srcQ.id);
          const replayRec = answers[replayKey];
          const sourceRec = answers[sourceKey];
          // Show the replay text if the student changed it, else the source.
          const hasReplayChange =
            replayRec?.payload?.kind === "replay" && replayRec.payload.text.trim();
          const displayText = hasReplayChange
            ? (replayRec!.payload as { text: string }).text
            : sourceRec?.payload?.kind === "sentenceComplete"
            ? sourceRec.payload.text
            : "";

          const parts = srcQ.stem.split("____");
          return (
            <div
              key={rq.id}
              className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Question {qi + 1} review
                </p>
                {hasReplayChange && (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Changed
                  </span>
                )}
              </div>

              <PlayOnceAudio
                src={station.audioSrc}
                segmentStart={rq.segmentStart}
                segmentEnd={rq.segmentEnd}
              />

              <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-slate-800">
                {parts.length > 1 ? (
                  <>
                    <span>{parts[0]}</span>
                    <input
                      type="text"
                      value={displayText}
                      onChange={(e) =>
                        setText(station.id, rq.id, e.target.value, "replay")
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
                  <span>{srcQ.stem}</span>
                )}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}
