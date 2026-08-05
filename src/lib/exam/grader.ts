/**
 * Deterministic grader — pure, server-only, no LLM, no clock, no network.
 *
 * Given an exam form + an answers map it returns a Grade. Grading rules:
 *
 *   skim / synonym / distractor / inference
 *                                  — option index must equal correctOption.
 *   tfng                           — verdict match + (for T/F) proof-sentence
 *                                    match. NG has nothing else to check.
 *   scan / audioFill /
 *   sentenceComplete              — text must equal one of
 *                                    [answer, ...acceptAlternatives] after
 *                                    normalization. Typos fail. Spelling counts.
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
  InferenceQuestion,
} from "./content-types";
import type {
  AnswerPayload,
  AnswersMap,
  Grade,
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

/** Grade one question of any kind against its answer record. */
function gradeQuestion(
  stationId: string,
  q:
    | SkimQuestion
    | SynonymQuestion
    | TfngQuestion
    | ScanQuestion
    | DistractorQuestion
    | AudioFillQuestion
    | SentenceCompleteQuestion
    | InferenceQuestion,
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
    case "inference":
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

/** Run the full grader across all stations. Pure function. */
export function gradeExam(
  exam: ExamForm,
  answers: AnswersMap,
  gradedAtEpochMs: number
): Grade {
  const stationGrades: StationGrade[] = [];
  let totalCorrect = 0;
  let totalQuestions = 0;

  for (const station of exam.stations) {
    const sg = gradeStation(station, answers);
    stationGrades.push(sg);
    totalCorrect += sg.correct;
    totalQuestions += sg.total;
  }

  return {
    totalCorrect,
    totalQuestions,
    fraction: totalQuestions === 0 ? 0 : totalCorrect / totalQuestions,
    stations: stationGrades,
    gradedAt: gradedAtEpochMs,
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
