"use client";

import { useState } from "react";
import { useExamStore } from "@/store/exam-store";
import { answerKey } from "@/lib/exam/attempt-types";
import type { CueCardStation } from "@/lib/exam/content-types";
import { Countdown } from "./Countdown";
import { PlayOnceAudio } from "./PlayOnceAudio";
import { WaveformVisualizer } from "./WaveformVisualizer";
import { useMediaRecorder } from "@/hooks/useMediaRecorder";
import { enqueueSpeakingUpload } from "@/lib/exam/upload-queue";

/**
 * Speaking Station 3 — Narrative Tense Control (Part 2 cue card).
 *
 * Phases: prep (60s) → cue → speak (full 120s, no cut-off, endurance test)
 * → done. Audio captured by MediaRecorder, uploaded in the background,
 * transcribed by Whisper on submit.
 */
export function CueCardStationView({ station }: { station: CueCardStation }) {
  const answers = useExamStore((s) => s.answers);
  const attemptId = useExamStore((s) => s.attemptId);
  const setAudioPath = useExamStore((s) => s.setAudioPath);
  const lockAudio = useExamStore((s) => s.lockAudio);
  const touchQuestion = useExamStore((s) => s.touchQuestion);

  const q = station.questions[0];
  const key = answerKey(station.id, q.id);
  const rec = answers[key];
  const audioPath = rec?.payload?.kind === "cueCard" ? rec.payload.audioPath : "";

  const [phase, setPhase] = useState<"prep" | "cue" | "speak" | "done">(
    rec?.locked || audioPath ? "done" : "prep"
  );

  const { state, start, stop } = useMediaRecorder({
    micId: `${station.id}.${q.id}`,
    onAudioStop: (blob, mimeType) => {
      void enqueueSpeakingUpload({
        attemptId: attemptId ?? "",
        stationId: station.id,
        questionId: q.id,
        blob,
        mimeType,
      })
        .then((path) => {
          setAudioPath(station.id, q.id, path, "cueCard");
        })
        .catch((err) => {
          console.error(
            `[cueCard] background upload failed for ${q.id}:`,
            err
          );
        });
    },
  });

  const beginCue = () => setPhase("cue");
  const beginSpeak = async () => {
    setPhase("speak");
    await start();
  };
  const finishSpeak = () => {
    // Full 120s elapsed. Lock immediately; the background upload fills the
    // audioPath when it lands.
    if (state.recording) {
      stop();
    }
    touchQuestion(station.id, q.id);
    lockAudio(station.id, q.id, "cueCard");
    setPhase("done");
  };

  return (
    <section>
      <h2 className="mb-1 text-lg font-bold text-slate-900">{station.title}</h2>
      <p className="mb-5 text-sm text-slate-500">{station.instructions}</p>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Cue card — always visible */}
        <div className="mb-5 rounded-lg border-2 border-amber-300 bg-amber-50/60 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
            Cue card
          </p>
          <p className="mt-1 text-base font-bold text-slate-900">{q.topic}</p>
          <p className="mt-2 text-xs text-slate-500">You should say:</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-sm text-slate-700">
            {q.prompts.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            {phase === "prep"
              ? "Preparation"
              : phase === "cue"
              ? "Starting"
              : phase === "speak"
              ? "Speaking"
              : "Recorded"}
          </span>
          {phase === "prep" && (
            <Countdown
              key={`prep-${q.id}`}
              seconds={q.prepSeconds}
              onElapsed={beginCue}
            />
          )}
          {phase === "speak" && (
            <Countdown
              key={`speak-${q.id}`}
              seconds={q.speakSeconds}
              onElapsed={finishSpeak}
            />
          )}
        </div>

        {phase === "prep" && (
          <p className="text-center text-sm font-medium text-amber-700">
            Read the cue card and plan silently. The recording will start
            automatically when the timer ends.
          </p>
        )}

        {phase === "cue" && (
          <div className="text-center">
            <PlayOnceAudio
              src={q.startCueSrc}
              autoPlay
              onPlayed={beginSpeak}
            />
            <p className="mt-2 text-xs text-slate-400">
              The mic opens the moment the cue ends.
            </p>
          </div>
        )}

        {phase === "speak" && (
          <>
            <WaveformVisualizer stream={state.stream} />
            <div className="mt-3 flex items-center justify-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  state.recording ? "animate-pulse bg-rose-500" : "bg-slate-300"
                }`}
              />
              <span className="text-xs font-medium text-slate-600">
                {state.recording
                  ? "Recording — speak for the full time"
                  : "Mic paused"}
              </span>
            </div>
            {state.error && (
              <p className="mt-2 text-center text-xs text-rose-600">
                Microphone error: {state.error}. Check browser permissions.
              </p>
            )}
          </>
        )}

        {phase === "done" && (
          <p className="text-center text-sm font-semibold text-emerald-700">
            ✓ Recorded
          </p>
        )}
      </div>
    </section>
  );
}
