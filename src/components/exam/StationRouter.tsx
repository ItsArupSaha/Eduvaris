"use client";

import { useExamStore } from "@/store/exam-store";
import type { TimerView } from "@/hooks/useExamTimer";
import { submitAttempt } from "@/lib/exam/exam-api";
import { answerKey } from "@/lib/exam/attempt-types";
import { SkimStationView } from "./stations/SkimStationView";
import { SynonymStationView } from "./stations/SynonymStationView";
import { ProofStationView } from "./stations/ProofStationView";
import { ScanStationView } from "./stations/ScanStationView";
import { DistractorStationView } from "./stations/DistractorStationView";
import { AudioFillStationView } from "./stations/AudioFillStationView";
import { SentenceCompleteStationView } from "./stations/SentenceCompleteStationView";
import { InferenceStationView } from "./stations/InferenceStationView";

/**
 * Routes to the correct station component by index + renders the station
 * advance button. Module-agnostic — dispatches on station.kind.
 *
 * The advance button is enabled when every question is "answered":
 *   - MCQ kinds (skim/synonym/distractor/inference) → optionIndex >= 0
 *   - tfng → locked
 *   - scan → locked
 *   - audioFill / sentenceComplete → has any text
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

  if (!exam) return null;
  const station = exam.stations[stationIndex];

  const answeredCount = station.questions.reduce<number>((acc, q) => {
    const key = answerKey(station.id, q.id);
    const rec = answers[key];
    if (!rec) return acc;
    switch (q.kind) {
      case "skim":
      case "synonym":
      case "distractor":
      case "inference":
        return (
          acc +
          (rec.payload.kind === q.kind && rec.payload.optionIndex >= 0 ? 1 : 0)
        );
      case "tfng":
      case "scan":
        return acc + (rec.locked ? 1 : 0);
      case "audioFill":
      case "sentenceComplete":
        return (
          acc +
          (rec.payload.kind === q.kind && rec.payload.text.trim() ? 1 : 0)
        );
    }
  }, 0);
  const total = station.questions.length;
  const allAnswered = answeredCount === total;
  const isLast = stationIndex === exam.stations.length - 1;

  const handleAdvance = async () => {
    if (isLast) {
      if (!attemptId) return;
      beginSubmit();
      try {
        const res = await submitAttempt(attemptId, "user-submit");
        finishSubmit(res.status, res.grade);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Submit failed.");
      }
    } else {
      nextStation();
    }
  };

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

      <div className="mt-8 flex items-center justify-between">
        <span className="text-xs text-slate-400">
          {allAnswered
            ? "All questions answered"
            : `${answeredCount} / ${total} answered — you can advance, but blanks are wrong`}
        </span>
        <button
          type="button"
          onClick={handleAdvance}
          className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          {isLast ? "Finish & grade" : "Next station →"}
        </button>
      </div>
    </div>
  );
}
