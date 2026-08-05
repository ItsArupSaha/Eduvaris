"use client";

import { useEffect, useRef } from "react";
import { useExamStore } from "@/store/exam-store";
import { answerKey } from "@/lib/exam/attempt-types";
import type { ImageFluencyStation, ImageFluencyQuestion } from "@/lib/exam/content-types";
import { Countdown } from "./Countdown";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { useIsAnyMicActive } from "@/hooks/mic-lock";
import { enqueueSpeakingUpload } from "@/lib/exam/upload-queue";

/**
 * Speaking Station 1 — Spontaneous Fluency.
 *
 * 3 images, one at a time. Audio captured by MediaRecorder (universal
 * browser support), uploaded to Firebase Storage IN THE BACKGROUND, then
 * transcribed by Whisper on submit.
 *
 * Flow per image:
 *   - 15s analysis countdown + "Start speaking now" button.
 *   - On start: mic opens, waveform visualizer reacts, 60s speak countdown.
 *   - "Lock & Next": stops the recorder, LOCKS the answer immediately
 *     (student advances with no upload wait), and enqueues a background
 *     upload that fills in the audioPath when it lands. The store's autosave
 *     syncs the audioPath once it resolves.
 *
 * When the LAST image is locked, the station auto-advances to the next
 * station (the button literally says "Lock AND Next"). The station
 * unmounts on advance, so the auto-advance effect never re-fires.
 *
 * Uploads never block the student. The final "Finish & grade" button in
 * StationRouter gates on pending uploads = 0 so Whisper never runs before
 * the audioPaths are on the server.
 */
export function ImageFluencyStationView({
  station,
  onComplete,
}: {
  station: ImageFluencyStation;
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
      rec?.payload?.kind !== "imageFluency" || !rec.payload.audioPath
    );
  });
  const allDone = firstUnanswered === -1;

  // When every image is locked, fire onComplete. Guarded by a ref so it
  // fires exactly once per "all done" transition. For non-last stations the
  // station unmounts on advance; the ref defends against a rapid store
  // update re-rendering before unmount.
  const advancedRef = useRef(false);
  useEffect(() => {
    if (allDone && !advancedRef.current) {
      advancedRef.current = true;
      onComplete();
    }
  }, [allDone, onComplete]);

  // No active question to record when all are done — the auto-advance is
  // already in flight. Render the last image as "done" so the UI is never
  // in an undefined state during the brief window before unmount.
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
            rec?.payload?.kind === "imageFluency" ? rec.payload.audioPath : "";
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
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Image {qi + 1} of {station.questions.length}
              </p>

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={q.imageSrc}
                alt={`Speaking prompt ${qi + 1}`}
                className={`mx-auto mb-4 max-h-64 rounded-lg border border-slate-200 object-contain ${
                  isActive ? "" : "grayscale"
                }`}
              />

              {isActive ? (
                <ImageRecorder stationId={station.id} question={q} />
              ) : isDone ? (
                <p className="text-center text-xs font-semibold text-emerald-600">
                  ✓ Recorded
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* --------------------------- Per-question recorder ------------------------- */

function ImageRecorder({
  stationId,
  question,
}: {
  stationId: string;
  question: ImageFluencyQuestion;
}) {
  const attemptId = useExamStore((s) => s.attemptId);
  const setAudioPath = useExamStore((s) => s.setAudioPath);
  const lockAudio = useExamStore((s) => s.lockAudio);
  const touchQuestion = useExamStore((s) => s.touchQuestion);
  const anyMicActive = useIsAnyMicActive();

  const { state, start, stop } = useMediaRecorder({
    micId: `${stationId}.${question.id}`,
    onAudioStop: (blob, mimeType) => {
      // Background upload — never blocks the student. On success it fills the
      // audioPath; the autosave syncs it. On failure (after retries) the
      // answer stays locked-empty and grades as "not submitted" (honest).
      void enqueueSpeakingUpload({
        attemptId: attemptId ?? "",
        stationId,
        questionId: question.id,
        blob,
        mimeType,
      })
        .then((audioPath) => {
          setAudioPath(stationId, question.id, audioPath, "imageFluency");
        })
        .catch((err) => {
          console.error(
            `[imageFluency] background upload failed for ${question.id}:`,
            err
          );
        });
    },
  });

  // Two phases: "analysis" (15s countdown, button visible) → "speak" (60s).
  const phase: "analysis" | "speak" =
    state.recording || state.stream ? "speak" : "analysis";

  const beginSpeak = () => {
    void start();
  };

  const lockAndNext = () => {
    // Lock IMMEDIATELY so the student advances with no upload wait. If they
    // never recorded, the lock still lands (honest "not submitted" grade).
    if (state.recording) {
      stop(); // fires onAudioStop → background upload
    }
    touchQuestion(stationId, question.id);
    lockAudio(stationId, question.id, "imageFluency");
  };

  return (
    <div>
      {phase === "analysis" && (
        <>
          <p className="mb-3 text-center text-sm font-medium text-amber-700">
            You have 15 seconds to analyse the image. The recording will start
            automatically, or you can start speaking now.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Countdown
              key={`analysis-${question.id}`}
              seconds={question.analysisSeconds}
              onElapsed={beginSpeak}
            />
            <button
              type="button"
              onClick={beginSpeak}
              disabled={anyMicActive}
              className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-semibold text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ▶ Start speaking now
            </button>
          </div>
          {anyMicActive && (
            <p className="mt-2 text-center text-xs text-slate-400">
              Another recording is in progress — please wait.
            </p>
          )}
          {state.error && (
            <p className="mt-2 text-center text-xs text-rose-600">
              Microphone error: {state.error}. Check browser permissions.
            </p>
          )}
        </>
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
              key={`speak-${question.id}`}
              seconds={question.speakSeconds}
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
