"use client";

import { useEffect, useRef, useState } from "react";
import { useExamStore } from "@/store/exam-store";
import { answerKey } from "@/lib/exam/attempt-types";
import type { ProofStation, TfngVerdict } from "@/lib/exam/content-types";

/**
 * Station 3 — the "Proof Mechanic".
 *
 * For each statement the student first decides True, False, or Not Given.
 *   - True or False → they MUST then click the exact sentence in the passage
 *     that proves their verdict. The answer locks at that click.
 *   - Not Given → the answer locks immediately (no proof sentence exists).
 *
 * A 15-second per-question timer auto-locks an unanswered question.
 *
 * The passage sentences render as discrete, hoverable, clickable blocks
 * (SentenceBlock). Correct/wrong reveal happens ONLY on the results screen —
 * during the attempt a picked sentence shows neutral selected styling, never
 * green/red.
 *
 * This component owns:
 *   - which question is currently active (one at a time, single focus)
 *   - the per-question timer lifecycle
 *   - the verdict selection + proof-sentence click wiring
 */
export function ProofStationView({ station }: { station: ProofStation }) {
  const answers = useExamStore((s) => s.answers);
  const setTfngVerdict = useExamStore((s) => s.setTfngVerdict);
  const lockTfngProof = useExamStore((s) => s.lockTfngProof);
  const timeoutTfng = useExamStore((s) => s.timeoutTfng);
  const touchQuestion = useExamStore((s) => s.touchQuestion);

  // The active question is the first non-locked one. The student progresses
  // sequentially through the 4 statements — matches the timed, high-pressure
  // feel of the mechanic.
  const firstUnlockedIndex = station.questions.findIndex((q) => {
    const rec = answers[answerKey(station.id, q.id)];
    return !rec?.locked;
  });
  const activeIndex = firstUnlockedIndex === -1 ? station.questions.length - 1 : firstUnlockedIndex;
  const activeQuestion = station.questions[activeIndex];

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold text-slate-900">{station.title}</h2>
      <p className="mb-5 text-sm text-slate-500">
        Decide True, False, or Not Given for each statement. If True or False,
        click the proving sentence. 15 seconds per statement.
      </p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* LEFT — the passage, sentences as discrete blocks */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Passage
          </h3>
          <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-4">
            {station.passage.sentences.map((sentence, i) => {
              const activeRec = activeQuestion
                ? answers[answerKey(station.id, activeQuestion.id)]
                : undefined;
              const picked =
                activeRec?.payload?.kind === "tfng" &&
                activeRec.payload.proofSentenceIndex === i;
              const isAwaitingProof =
                activeRec?.payload?.kind === "tfng" &&
                (activeRec.payload.verdict === "true" ||
                  activeRec.payload.verdict === "false") &&
                !activeRec.locked;
              return (
                <SentenceBlock
                  key={i}
                  index={i}
                  text={sentence}
                  picked={picked}
                  clickable={isAwaitingProof ?? false}
                  onPick={() =>
                    activeQuestion &&
                    lockTfngProof(station.id, activeQuestion.id, i)
                  }
                />
              );
            })}
          </div>
        </div>

        {/* RIGHT — the 4 statements, one active at a time */}
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Statements
          </h3>
          <div className="space-y-3">
            {station.questions.map((q, qi) => {
              const rec = answers[answerKey(station.id, q.id)];
              const verdict = rec?.payload?.kind === "tfng" ? rec.payload.verdict : null;
              const locked = rec?.locked ?? false;
              const isActive = qi === activeIndex;
              return (
                <div
                  key={q.id}
                  className={`rounded-xl border p-4 transition-colors ${
                    isActive
                      ? "border-amber-300 bg-amber-50/50 shadow-sm"
                      : locked
                      ? "border-slate-200 bg-white opacity-70"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-900">
                      <span className="mr-2 text-slate-400">{qi + 1}.</span>
                      {q.statement}
                    </p>
                    {isActive && !locked && (
                      <ProofTimer
                        seconds={station.perQuestionSeconds}
                        onTimeout={() => timeoutTfng(station.id, q.id)}
                      />
                    )}
                    {locked && (
                      <span className="flex-none text-xs font-semibold text-emerald-600">
                        ✓ locked
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2">
                    {(["true", "false", "not_given"] as TfngVerdict[]).map((v) => {
                      const active = verdict === v;
                      const disabled = locked || !isActive;
                      return (
                        <button
                          key={v}
                          type="button"
                          disabled={disabled}
                          onClick={() => {
                            touchQuestion(station.id, q.id);
                            setTfngVerdict(station.id, q.id, v);
                          }}
                          className={`flex-1 rounded-lg border px-3 py-2 text-xs font-semibold capitalize transition-colors ${
                            active
                              ? "border-amber-500 bg-amber-500 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-amber-300 disabled:opacity-50"
                          } ${disabled && !active ? "cursor-not-allowed" : ""}`}
                        >
                          {v === "not_given" ? "Not Given" : v}
                        </button>
                      );
                    })}
                  </div>

                  {/* Prompt under the verdict row */}
                  {isActive && !locked && (
                    <ProofPrompt verdict={verdict} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

/* --------------------------- Sentence block ----------------------------- */

function SentenceBlock({
  index,
  text,
  picked,
  clickable,
  onPick,
}: {
  index: number;
  text: string;
  picked: boolean;
  clickable: boolean;
  onPick: () => void;
}) {
  // Visual states during the attempt. Correct/wrong colors appear only on
  // the results screen, never here.
  const base =
    "relative block w-full rounded-lg px-3 py-2 text-left text-sm leading-relaxed transition-colors";
  const state = picked
    ? "bg-amber-100 text-slate-900 ring-1 ring-amber-300"
    : clickable
    ? "bg-white text-slate-700 hover:bg-amber-50 hover:text-slate-900 cursor-pointer ring-1 ring-transparent hover:ring-amber-200"
    : "bg-white text-slate-600";

  return (
    <button
      type="button"
      disabled={!clickable && !picked}
      onClick={onPick}
      className={`${base} ${state}`}
    >
      <span className="mr-2 select-none text-xs font-mono text-slate-300">
        {String(index + 1).padStart(2, "0")}
      </span>
      {text}
    </button>
  );
}

/* ----------------------------- Proof prompt ----------------------------- */

function ProofPrompt({ verdict }: { verdict: TfngVerdict | null }) {
  if (!verdict) {
    return (
      <p className="mt-2 text-xs text-slate-500">
        Pick True, False, or Not Given.
      </p>
    );
  }
  if (verdict === "not_given") {
    return (
      <p className="mt-2 text-xs font-medium text-amber-700">
        Not Given = the passage doesn&apos;t prove this either way. Your answer
        is locked.
      </p>
    );
  }
  return (
    <p className="mt-2 text-xs font-medium text-amber-700">
      Now click the sentence in the passage that proves your answer.
    </p>
  );
}

/* ------------------------------ Proof timer ----------------------------- */

/**
 * Per-question 15-second countdown. Local state, not engine state — it only
 * needs to survive while its question is active. Calls onTimeout at 0, which
 * the parent wires to engine.timeoutTfng.
 */
function ProofTimer({
  seconds,
  onTimeout,
}: {
  seconds: number;
  onTimeout: () => void;
}) {
  const [remaining, setRemaining] = useState(seconds);
  const firedRef = useRef(false);

  // Reset when `seconds` changes (a new question became active). Adjusting
  // state during render against a previous-value ref — React's blessed
  // pattern, avoids setState-in-effect cascades.
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/refs
  const prevSecondsRef = useRef(seconds);
  if (prevSecondsRef.current !== seconds) {
    prevSecondsRef.current = seconds;
    setRemaining(seconds);
    firedRef.current = false;
  }

  useEffect(() => {
    const handle = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (!firedRef.current) {
            firedRef.current = true;
            // Defer the timeout call so we don't update the parent during
            // this setter's own commit.
            setTimeout(onTimeout, 0);
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onTimeout]);

  const urgent = remaining <= 5;
  return (
    <span
      className={`flex-none rounded-full px-2 py-0.5 font-mono text-xs font-bold tabular-nums ${
        urgent ? "bg-rose-100 text-rose-700 animate-pulse" : "bg-slate-100 text-slate-600"
      }`}
    >
      {remaining}s
    </span>
  );
}
