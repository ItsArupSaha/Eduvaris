"use client";

import { useEffect, useRef, useState } from "react";
import { useExamStore } from "@/store/exam-store";
import { answerKey } from "@/lib/exam/attempt-types";
import type {
  AbstractAnswerStation,
  AbstractAnswerQuestion,
} from "@/lib/exam/content-types";
import { Countdown } from "./Countdown";
import { PlayOnceAudio } from "./PlayOnceAudio";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { useIsAnyMicActive } from "@/hooks/mic-lock";
import { enqueueSpeakingUpload } from "@/lib/exam/upload-queue";

/**
 * Speaking Station 4 — Abstract Articulation (Part 3 audio examiner).
 *
 * 4 Part 3 questions, one at a time. Examiner audio auto-plays, then a
 * "Start Speaking" button. `answerSeconds` (90) to answer, smart cut-off via
 * Lock & Next. Audio captured by MediaRecorder, uploaded in the background,
 * transcribed by Whisper on submit.
 */
export function AbstractAnswerStationView({
  station,
  onComplete,
}: {
  station: AbstractAnswerStation;
  /** Fired once when every question in this station is answered. The router
   * decides whether to advance or submit (last station). */
  onComplete: () => void;
}) {
  const answers = useExamStore((s) => s.answers);

  const firstUnanswered = station.questions.findIndex((q) => {
    const rec = answers[answerKey(station.id, q.id)];
    if (!rec) return true;
    if (rec.locked) return false;
    return (
      rec?.payload?.kind !== "abstractAnswer" || !rec.payload.audioPath
    );
  });
  const allDone = firstUnanswered === -1;

  const advancedRef = useRef(false);
  useEffect(() => {
    if (allDone && !advancedRef.current) {
      advancedRef.current = true;
      onComplete();
    }
  }, [allDone, onComplete]);

  const activeIndex = allDone ? -1 : firstUnanswered;

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold text-slate-900">{station.title}</h2>
      <p className="mb-5 text-sm text-slate-500">{station.instructions}</p>

      <div className="space-y-4">
        {station.questions.map((q, qi) => {
          const key = answerKey(station.id, q.id);
          const rec = answers[key];
          const audioPath =
            rec?.payload?.kind === "abstractAnswer" ? rec.payload.audioPath : "";
          const isActive = qi === activeIndex;
          const isDone = !isActive && (rec?.locked || audioPath.length > 0);

          return (
            <div
              key={q.id}
              className={`rounded-xl border p-5 transition-colors ${
                isActive
                  ? "border-amber-300 bg-amber-50/40 shadow-sm"
                  : isDone
                  ? "border-slate-200 bg-white opacity-80"
                  : "border-slate-200 bg-white opacity-50"
              }`}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Question {qi + 1} of {station.questions.length}
                </p>
                {isDone && (
                  <span className="text-xs font-semibold text-emerald-600">
                    ✓ Recorded
                  </span>
                )}
              </div>

              {isActive ? (
                <AbstractRecorder stationId={station.id} question={q} />
              ) : isDone ? (
                <p className="text-sm text-slate-500">
                  Examiner question: &ldquo;{q.question}&rdquo;
                </p>
              ) : (
                <p className="text-sm text-slate-400">Awaiting your turn.</p>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* --------------------------- Per-question recorder ------------------------- */

function AbstractRecorder({
  stationId,
  question,
}: {
  stationId: string;
  question: AbstractAnswerQuestion;
}) {
  const attemptId = useExamStore((s) => s.attemptId);
  const setAudioPath = useExamStore((s) => s.setAudioPath);
  const lockAudio = useExamStore((s) => s.lockAudio);
  const touchQuestion = useExamStore((s) => s.touchQuestion);
  const anyMicActive = useIsAnyMicActive();

  const [audioDone, setAudioDone] = useState(false);

  const { state, start, stop } = useMediaRecorder({
    micId: `${stationId}.${question.id}`,
    onAudioStop: (blob, mimeType) => {
      void enqueueSpeakingUpload({
        attemptId: attemptId ?? "",
        stationId,
        questionId: question.id,
        blob,
        mimeType,
      })
        .then((audioPath) => {
          setAudioPath(stationId, question.id, audioPath, "abstractAnswer");
        })
        .catch((err) => {
          console.error(
            `[abstractAnswer] background upload failed for ${question.id}:`,
            err
          );
        });
    },
  });

  // Two phases: "audio" (examiner speaking) → "speak" (mic live). The mic
  // auto-opens when the examiner audio finishes — no manual button. If the
  // grant fails we fall back to a "ready" view with a manual retry.
  const phase: "audio" | "speak" | "ready" = state.recording
    ? "speak"
    : audioDone && state.error
    ? "ready"
    : audioDone
    ? "audio"
    : "audio";

  // Examiner finished → open the mic immediately.
  const beginSpeak = () => {
    void start();
  };

  const lockAndNext = () => {
    if (state.recording) {
      stop();
    }
    touchQuestion(stationId, question.id);
    lockAudio(stationId, question.id, "abstractAnswer");
  };

  return (
    <div>
      <p className="mb-4 text-sm font-medium text-slate-900">
        {question.question}
      </p>

      {phase === "audio" && (
        <>
          <PlayOnceAudio
            src={question.examinerAudioSrc}
            autoPlay
            // Mic auto-opens the moment the examiner finishes. No manual
            // button — seamless examiner→student handoff.
            onPlayed={() => {
              setAudioDone(true);
              beginSpeak();
            }}
          />
          <p className="mt-2 text-xs text-slate-400">
            The examiner is asking the question. The mic opens automatically
            when it finishes — start speaking right away.
          </p>
        </>
      )}

      {phase === "ready" && (
        // Only shown when the auto-open mic grant failed. Manual fallback.
        <div className="flex flex-col items-center gap-3 py-2">
          <p className="text-xs text-rose-600">
            Microphone error: {state.error}. Grant mic access and try again.
          </p>
          <button
            type="button"
            onClick={() => void start()}
            disabled={anyMicActive}
            className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ▶ Start speaking
          </button>
        </div>
      )}

      {phase === "speak" && (
        <>
          <WaveformVisualizer stream={state.stream} />
          <div className="mb-3 mt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  state.recording ? "animate-pulse bg-rose-500" : "bg-slate-300"
                }`}
              />
              <span className="text-xs font-medium text-slate-600">
                {state.recording ? "Recording…" : "Mic paused"}
              </span>
            </div>
            <Countdown
              key={`answer-${question.id}`}
              seconds={question.answerSeconds}
              onElapsed={lockAndNext}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={lockAndNext}
              className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
            >
              Lock &amp; Next →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
