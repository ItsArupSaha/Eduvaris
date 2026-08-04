/**
 * Deterministic grader — pure, server-only, no LLM, no clock, no network.
 *
 * Given an exam form + an answers map it returns a Grade. Grading rules:
 *
 *   skim / synonym / distractor — option index must equal correctOption.
 *   tfng                        — verdict match + (for T/F) proof-sentence
 *                                 match. NG has nothing else to check.
 *   scan / audioFill /
 *   sentenceComplete / replay   — text must equal one of
 *                                 [answer, ...acceptAlternatives] after
 *                                 normalization. Typos fail. Spelling counts.
 *
 * For Listening, the replay station carries NO independent score — it
 * re-grades the sentenceComplete answers in place. Its perQuestion map is
 * therefore a copy of the source station's results. But the grader also
 * computes a ReplayChangeReport when a reviewSnapshot is present: it compares
 * each review question's answer at snapshot vs at final, flagging
 * deteriorations (correct→wrong) and improvements (wrong→correct).
 */
import type {
  AnyStation,
  ExamForm,
  ScanQuestion,
  SkimQuestion,
  SynonymQuestion,
  DistractorQuestion,
  TfngQuestion,
  AudioFillQuestion,
  SentenceCompleteQuestion,
  ReplayQuestion,
} from "./content-types";
import type {
  AnswerPayload,
  AnswersMap,
  Grade,
  ReplayChangeReport,
  StationGrade,
} from "./attempt-types";
import { answerKey } from "./attempt-types";

/** Normalize a fill-blank answer: lowercase, trim, collapse spaces, strip punctuation. */
export function normalizeFillBlank(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Grade a single tfng question. */
function gradeTfng(q: TfngQuestion, payload: AnswerPayload): boolean {
  if (payload.kind !== "tfng") return false;
  if (payload.verdict !== q.verdict) return false;
  if (q.verdict === "not_given") return true;
  if (q.proofSentenceIndex == null) return false;
  return payload.proofSentenceIndex === q.proofSentenceIndex;
}

/** Grade one question of any kind against its answer record.
 *  NOTE: replay questions are NOT graded here — they re-grade Station 3 and
 *  are handled inline in gradeExam. */
function gradeQuestion(
  stationId: string,
  q:
    | SkimQuestion
    | SynonymQuestion
    | TfngQuestion
    | ScanQuestion
    | DistractorQuestion
    | AudioFillQuestion
    | SentenceCompleteQuestion,
  answers: AnswersMap
): boolean {
  const key = answerKey(stationId, q.id);
  const record = answers[key];
  if (!record) return false;
  const p = record.payload;
  switch (q.kind) {
    case "skim":
    case "synonym":
    case "distractor":
      return p.kind === q.kind && p.optionIndex === q.correctOption;
    case "tfng":
      return gradeTfng(q, p);
    case "scan":
    case "audioFill":
    case "sentenceComplete": {
      if (p.kind !== q.kind) return false;
      const norm = normalizeFillBlank(p.text);
      const accepted = [q.answer, ...(q.acceptAlternatives ?? [])].map(
        normalizeFillBlank
      );
      return accepted.includes(norm);
    }
  }
}

/** Grade one station. */
function gradeStation(
  station: AnyStation,
  answers: AnswersMap
): StationGrade {
  // The replay station doesn't carry its own marks — it re-grades the
  // sentenceComplete answers in place. For perQuestion we mirror the source
  // station's results so the results UI can show the review question's outcome.
  if (station.kind === "replay") {
    const source = answers;
    const perQuestion: Record<string, boolean> = {};
    let correct = 0;
    // Replay questions reference sentenceComplete question ids. We look up
    // the source station to grade against its answer key.
    // (The exam form is needed for that — handled in gradeExam.)
    return { stationId: station.id, correct, total: station.questions.length, perQuestion };
    void source;
  }

  const perQuestion: Record<string, boolean> = {};
  let correct = 0;
  for (const q of station.questions) {
    const isCorrect = gradeQuestion(station.id, q, answers);
    perQuestion[answerKey(station.id, q.id)] = isCorrect;
    if (isCorrect) correct += 1;
  }
  return {
    stationId: station.id,
    correct,
    total: station.questions.length,
    perQuestion,
  };
}

/**
 * Run the full grader across all stations. Pure function.
 * `reviewSnapshot` is optional — only Listening provides it.
 */
export function gradeExam(
  exam: ExamForm,
  answers: AnswersMap,
  gradedAtEpochMs: number,
  reviewSnapshot?: AnswersMap | null
): Grade {
  // Grade each station. Replay station gets special handling below.
  const stationGrades: StationGrade[] = [];
  let totalCorrect = 0;
  let totalQuestions = 0;

  // Locate the sentenceComplete station (Listening) so the replay station can
  // mirror its answer key.
  const sentenceStation = exam.stations.find(
    (s) => s.kind === "sentenceComplete"
  );

  for (const station of exam.stations) {
    if (station.kind === "replay") {
      // Mirror the sentenceComplete station's perQuestion results, mapped onto
      // replay question ids.
      const perQuestion: Record<string, boolean> = {};
      let correct = 0;
      for (const rq of station.questions) {
        // The replay answer (if the student changed it) is keyed under the
        // replay station. If present, it overrides the source answer for
        // grading — that's the whole point of the review phase.
        const replayKey = answerKey(station.id, rq.id);
        const replayRec = answers[replayKey];
        const sourceStation = sentenceStation;
        let isCorrect = false;
        if (sourceStation && sourceStation.kind === "sentenceComplete") {
          const srcQ = sourceStation.questions.find(
            (sq) => sq.id === rq.sourceQuestionId
          );
          if (srcQ && srcQ.kind === "sentenceComplete") {
            if (replayRec && replayRec.payload.kind === "replay") {
              // Student changed their answer in review — grade the new text
              // against the original sentenceComplete key.
              const norm = normalizeFillBlank(replayRec.payload.text);
              const accepted = [srcQ.answer, ...(srcQ.acceptAlternatives ?? [])].map(
                normalizeFillBlank
              );
              isCorrect = accepted.includes(norm);
            } else {
              // No replay change — grade the original sentenceComplete answer.
              const srcKey = answerKey(sourceStation.id, srcQ.id);
              const srcRec = answers[srcKey];
              if (srcRec && srcRec.payload.kind === "sentenceComplete") {
                const norm = normalizeFillBlank(srcRec.payload.text);
                const accepted = [srcQ.answer, ...(srcQ.acceptAlternatives ?? [])].map(
                  normalizeFillBlank
                );
                isCorrect = accepted.includes(norm);
              }
            }
          }
        }
        perQuestion[replayKey] = isCorrect;
        if (isCorrect) correct += 1;
      }
      stationGrades.push({
        stationId: station.id,
        correct,
        total: station.questions.length,
        perQuestion,
      });
      // Replay marks are NOT added to the total — they re-grade Station 3.
      // (marks: 0 in content reflects this.)
      continue;
    }

    const sg = gradeStation(station, answers);
    stationGrades.push(sg);
    totalCorrect += sg.correct;
    totalQuestions += sg.total;
  }

  // Replay change report (Listening only).
  let replay: ReplayChangeReport | null = null;
  if (reviewSnapshot && sentenceStation && sentenceStation.kind === "sentenceComplete") {
    const replayStation = exam.stations.find((s) => s.kind === "replay");
    if (replayStation && replayStation.kind === "replay") {
      const deteriorated: string[] = [];
      const improved: string[] = [];
      for (const rq of replayStation.questions) {
        const srcQ = sentenceStation.questions.find(
          (sq) => sq.id === rq.sourceQuestionId
        );
        if (!srcQ || srcQ.kind !== "sentenceComplete") continue;

        const replayKey = answerKey(replayStation.id, rq.id);
        const srcKey = answerKey(sentenceStation.id, srcQ.id);

        // Snapshot answer = whatever was stored under the source key at snapshot.
        const snapRec = reviewSnapshot[srcKey];
        // Final answer = replay answer if changed, else source answer.
        const finalRec = answers[replayKey] ?? answers[srcKey];

        const accepted = [srcQ.answer, ...(srcQ.acceptAlternatives ?? [])].map(
          normalizeFillBlank
        );
        const snapCorrect =
          snapRec && snapRec.payload.kind === "sentenceComplete"
            ? accepted.includes(normalizeFillBlank(snapRec.payload.text))
            : false;
        const finalCorrect =
          finalRec &&
          (finalRec.payload.kind === "replay" ||
            finalRec.payload.kind === "sentenceComplete")
            ? accepted.includes(normalizeFillBlank(finalRec.payload.text))
            : false;

        if (snapCorrect && !finalCorrect) deteriorated.push(replayKey);
        if (!snapCorrect && finalCorrect) improved.push(replayKey);
      }
      replay = {
        snapshotAt: gradedAtEpochMs,
        deteriorated,
        improved,
      };
    }
  }

  return {
    totalCorrect,
    totalQuestions,
    fraction: totalQuestions === 0 ? 0 : totalCorrect / totalQuestions,
    stations: stationGrades,
    gradedAt: gradedAtEpochMs,
    replay,
  };
}

/** Back-compat alias for callers that named it explicitly. */
export function gradeReading(
  exam: ExamForm,
  answers: AnswersMap,
  gradedAtEpochMs: number
): Grade {
  return gradeExam(exam, answers, gradedAtEpochMs);
}
