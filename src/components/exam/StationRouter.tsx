"use client";

import { useCallback } from "react";
import { useExamStore } from "@/store/exam-store";
import type { TimerView } from "@/hooks/useExamTimer";
import { saveAttempt, submitAttempt } from "@/lib/exam/exam-api";
import { answerKey } from "@/lib/exam/attempt-types";
import { SkimStationView } from "./stations/SkimStationView";
import { SynonymStationView } from "./stations/SynonymStationView";
import { ProofStationView } from "./stations/ProofStationView";
import { ScanStationView } from "./stations/ScanStationView";
import { DistractorStationView } from "./stations/DistractorStationView";
import { AudioFillStationView } from "./stations/AudioFillStationView";
import { SentenceCompleteStationView } from "./stations/SentenceCompleteStationView";
import { InferenceStationView } from "./stations/InferenceStationView";
import { ParaphraseStationView } from "./stations/ParaphraseStationView";
import { CohesionStationView } from "./stations/CohesionStationView";
import { BodyParagraphStationView } from "./stations/BodyParagraphStationView";
import { ImageFluencyStationView } from "./stations/ImageFluencyStationView";
import { RapidFireStationView } from "./stations/RapidFireStationView";
import { CueCardStationView } from "./stations/CueCardStationView";
import { AbstractAnswerStationView } from "./stations/AbstractAnswerStationView";
import { usePendingUploadCount } from "@/lib/exam/upload-queue";

/**
 * Routes to the correct station component by index + renders the station
 * advance button. Module-agnostic — dispatches on station.kind.
 *
 * The advance button is enabled when every question is "answered":
 *   - MCQ kinds (skim/synonym/distractor/inference) → optionIndex >= 0
 *   - tfng / scan → locked
 *   - paraphrase → locked
 *   - cohesion → order + transition chosen
 *   - audioFill / sentenceComplete / bodyParagraph → has any text
 *   - imageFluency / rapidFire / cueCard / abstractAnswer → has any audio path
 *
 * Hard-blocking would let a frozen timer trap the user. We warn, we don't
 * block. Unanswered questions grade as incorrect.
 */
export function StationRouter({
  stationIndex,
}: {
  stationIndex: number;
  timer: TimerView;
}) {
  const exam = useExamStore((s) => s.exam);
  const answers = useExamStore((s) => s.answers);
  const nextStation = useExamStore((s) => s.nextStation);
  const beginSubmit = useExamStore((s) => s.beginSubmit);
  const finishSubmit = useExamStore((s) => s.finishSubmit);
  const setError = useExamStore((s) => s.setError);
  const attemptId = useExamStore((s) => s.attemptId);
  const tabSwitchCount = useExamStore((s) => s.tabSwitchCount);
  // Speaking audio uploads run in the background while the student moves on.
  // We only block the FINAL submit so Whisper never runs before audioPaths
  // have landed on the server. Non-last stations never see this.
  const pendingUploads = usePendingUploadCount();

  // isLast is derived from the store snapshot so the hooks below can be
  // declared BEFORE the early `if (!exam) return null` — hooks can't be
  // conditional. exam?.stations length is read safely.
  const isLast = exam
    ? stationIndex === exam.stations.length - 1
    : false;

  const handleAdvance = useCallback(async () => {
    if (isLast) {
      if (!attemptId) return;
      // Speaking: don't submit until background uploads finish, else Whisper
      // would miss audios whose audioPath hadn't synced yet. The button shows
      // "Saving recordings…" while pendingUploads > 0.
      if (pendingUploads > 0) return;
      beginSubmit();
      try {
        // Force-flush the latest store state (including any audioPaths that
        // just resolved) BEFORE submit. Submit reads from the server, so we
        // must guarantee the autosave isn't still in its debounce window.
        await saveAttempt(attemptId, {
          stationIndex,
          answers,
          tabSwitchCount,
        });
        const res = await submitAttempt(attemptId, "user-submit");
        finishSubmit(res.status, res.grade);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submit failed.");
      }
    } else {
      nextStation();
    }
  }, [
    isLast,
    attemptId,
    pendingUploads,
    beginSubmit,
    stationIndex,
    answers,
    tabSwitchCount,
    finishSubmit,
    setError,
    nextStation,
  ]);

  // Stations with per-question Lock & Next (the Speaking stations) call this
  // when their LAST question locks. For non-last stations we advance; for the
  // last station we re-enter handleAdvance so the upload-gate + submit path
  // is shared with the manual button. Stable identity (useCallback) so the
  // station's "fire once" effect dependency doesn't churn.
  const handleStationComplete = useCallback(() => {
    handleAdvance();
  }, [handleAdvance]);

  if (!exam) return null;
  const station = exam.stations[stationIndex];

  const answeredCount = station.questions.reduce<number>((acc, q) => {
    const key = answerKey(station.id, q.id);
    const rec = answers[key];
    if (!rec) return acc;
    const p = rec.payload;
    switch (q.kind) {
      case "skim":
      case "synonym":
      case "distractor":
      case "inference":
        return acc + (p.kind === q.kind && p.optionIndex >= 0 ? 1 : 0);
      case "tfng":
      case "scan":
        return acc + (rec.locked ? 1 : 0);
      case "paraphrase":
        return acc + (rec.locked ? 1 : 0);
      case "cohesion":
        return (
          acc +
          (p.kind === "cohesion" &&
          p.orderedIndices.length === q.scrambledSentences.length &&
          p.transitionPlacement >= 0
            ? 1
            : 0)
        );
      case "audioFill":
      case "sentenceComplete":
      case "bodyParagraph":
        return acc + (p.kind === q.kind && p.text.trim() ? 1 : 0);
      case "imageFluency":
      case "rapidFire":
      case "cueCard":
      case "abstractAnswer":
        // Speaking answers: a non-empty Storage path = recorded.
        return acc + (p.kind === q.kind && p.audioPath ? 1 : 0);
    }
  }, 0);
  const total = station.questions.length;
  const allAnswered = answeredCount === total;

  return (
    <div>
      {station.kind === "skim" && <SkimStationView station={station} />}
      {station.kind === "synonym" && <SynonymStationView station={station} />}
      {station.kind === "proof" && <ProofStationView station={station} />}
      {station.kind === "scan" && <ScanStationView station={station} />}
      {station.kind === "distractor" && <DistractorStationView station={station} />}
      {station.kind === "audioFill" && <AudioFillStationView station={station} />}
      {station.kind === "sentenceComplete" && (
        <SentenceCompleteStationView station={station} />
      )}
      {station.kind === "inference" && <InferenceStationView station={station} />}
      {station.kind === "paraphrase" && <ParaphraseStationView station={station} />}
      {station.kind === "cohesion" && <CohesionStationView station={station} />}
      {station.kind === "bodyParagraph" && (
        <BodyParagraphStationView station={station} />
      )}
      {station.kind === "imageFluency" && (
        <ImageFluencyStationView station={station} onComplete={handleStationComplete} />
      )}
      {station.kind === "rapidFire" && (
        <RapidFireStationView station={station} onComplete={handleStationComplete} />
      )}
      {station.kind === "cueCard" && <CueCardStationView station={station} />}
      {station.kind === "abstractAnswer" && (
        <AbstractAnswerStationView station={station} onComplete={handleStationComplete} />
      )}

      <div className="mt-8 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {allAnswered
            ? "All questions answered"
            : `${answeredCount} / ${total} answered — you can advance, but blanks are wrong`}
        </span>
        <button
          type="button"
          onClick={handleAdvance}
          disabled={isLast && pendingUploads > 0}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLast
            ? pendingUploads > 0
              ? `Saving recordings… (${pendingUploads})`
              : "Finish & grade"
            : "Next station →"}
        </button>
      </div>
    </div>
  );
}
