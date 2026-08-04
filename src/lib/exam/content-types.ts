/**
 * Exam content model — module-agnostic, versioned, deterministic-answer-key.
 *
 * Each module (reading, listening, ...) ships a `*Exam` form. Every question
 * carries an authoritative answer key so grading is pure data lookup — no
 * LLM, immune to judge variance. Content lives as typed TS under
 * src/lib/exam/<module>/ and never leaves the repo, so a content bump behind
 * a new `version` doesn't retroactively change a past attempt's grading.
 *
 * The Station + Question unions are intentionally extended per new module.
 * The grader + store dispatch on question `kind`.
 */
import type { ModuleKey } from "@/lib/firebase/user-types";

/** The station archetypes. Extended as modules ship. */
export type StationKind =
  | "skim" // reading
  | "synonym" // reading
  | "proof" // reading
  | "scan" // reading
  | "distractor" // listening
  | "audioFill" // listening
  | "sentenceComplete" // listening
  | "replay"; // listening review

/** T/F/NG verdicts (reading Station 3). */
export type TfngVerdict = "true" | "false" | "not_given";

/** Base fields every question shares. */
interface BaseQuestion {
  /** Stable id within a station; combined with station id it's globally unique. */
  id: string;
  /** Marks awarded (always 1 for v1; field exists for future weighting). */
  marks: number;
}

/* --------------------------------- READING ------------------------------- */

/** Station 1 — choose the best summary / heading for each paragraph. */
export interface SkimQuestion extends BaseQuestion {
  kind: "skim";
  paragraphIndex: number;
  prompt: string;
  options: string[];
  correctOption: number;
}
export interface SkimStation {
  kind: "skim";
  id: "skim";
  title: string;
  instructions: string;
  paragraphs: string[];
  questions: SkimQuestion[];
}

/** Station 2 — pick the sentence/option matching a paraphrase. */
export interface SynonymQuestion extends BaseQuestion {
  kind: "synonym";
  prompt: string;
  options: string[];
  correctOption: number;
}
export interface SynonymStation {
  kind: "synonym";
  id: "synonym";
  title: string;
  instructions: string;
  passage: string;
  questions: SynonymQuestion[];
}

/** Station 3 — T/F/NG with a "click the proving sentence" mechanic. */
export interface TfngQuestion extends BaseQuestion {
  kind: "tfng";
  statement: string;
  verdict: TfngVerdict;
  proofSentenceIndex: number | null;
}
export interface ProofStation {
  kind: "proof";
  id: "proof";
  title: string;
  instructions: string;
  passage: { sentences: string[] };
  questions: TfngQuestion[];
  perQuestionSeconds: number;
}

/** Station 4 — fill-in-the-blank, exact-after-normalize match. */
export interface ScanQuestion extends BaseQuestion {
  kind: "scan";
  contextSentence: string;
  answer: string;
  acceptAlternatives?: string[];
}
export interface ScanStation {
  kind: "scan";
  id: "scan";
  title: string;
  instructions: string;
  passage: string;
  questions: ScanQuestion[];
}

/* -------------------------------- LISTENING ------------------------------ */

/**
 * Station 1 — The Distractor Trap.
 *
 * One short audio clip per question. The audio plays ONCE — the client
 * disables the play button after first play. The script (shown on results,
 * never during the attempt) embeds the self-correction trap: option A is
 * mentioned, then the speaker says "Actually..." and corrects to option B.
 */
export interface DistractorQuestion extends BaseQuestion {
  kind: "distractor";
  /** Path under /public. Played once. */
  audioSrc: string;
  prompt: string;
  options: string[];
  correctOption: number;
  /** Full transcript — revealed on results only, never during the attempt. */
  transcript: string;
}
export interface DistractorStation {
  kind: "distractor";
  id: "distractor";
  title: string;
  instructions: string;
  questions: DistractorQuestion[];
}

/**
 * Station 2 — Precision & Spelling.
 *
 * One audio clip; multiple fill-in-the-blank questions (spelled names, tricky
 * numbers). Same exact-after-normalize match as Reading scan.
 */
export interface AudioFillQuestion extends BaseQuestion {
  kind: "audioFill";
  prompt: string;
  answer: string;
  acceptAlternatives?: string[];
}
export interface AudioFillStation {
  kind: "audioFill";
  id: "audioFill";
  title: string;
  instructions: string;
  /** Single clip for the whole station. Played once. */
  audioSrc: string;
  transcript: string;
  questions: AudioFillQuestion[];
}

/**
 * Station 3 — Paraphrase Logic.
 *
 * One academic audio; sentence-completion questions where the spoken
 * paraphrase must map to the written completion. Exact-after-normalize match.
 */
export interface SentenceCompleteQuestion extends BaseQuestion {
  kind: "sentenceComplete";
  /** Sentence with `____` where the answer belongs. */
  stem: string;
  answer: string;
  acceptAlternatives?: string[];
}
export interface SentenceCompleteStation {
  kind: "sentenceComplete";
  id: "sentenceComplete";
  title: string;
  instructions: string;
  audioSrc: string;
  transcript: string;
  questions: SentenceCompleteQuestion[];
}

/**
 * Station 4 — The "Replay Proof" Mechanic (review phase).
 *
 * Not a content-driven station in the same way: it is a review of Station 3's
 * questions. The student may replay a bounded 15-second window of the
 * Station-3 audio per question and may change their answer. The grader
 * snapshots answers at review-start and compares to final to detect
 * "correct → wrong" deteriorations.
 *
 * To keep the engine uniform, the review window definitions are listed here
 * as content. Each entry references a Station-3 question id + audio segment.
 */
export interface ReplayQuestion extends BaseQuestion {
  kind: "replay";
  /** References a Station-3 sentenceComplete question id. */
  sourceQuestionId: string;
  /** Start/end of the 15s review window into the Station-3 audio, in seconds. */
  segmentStart: number;
  segmentEnd: number;
}
export interface ReplayStation {
  kind: "replay";
  id: "replay";
  title: string;
  instructions: string;
  /** Same audio as Station 3 — replay windows index into it. */
  audioSrc: string;
  /** The Station-3 transcript, shown now that review is allowed. */
  transcript: string;
  questions: ReplayQuestion[];
}

/* ----------------------------- Station union ----------------------------- */

export type AnyStation =
  | SkimStation
  | SynonymStation
  | ProofStation
  | ScanStation
  | DistractorStation
  | AudioFillStation
  | SentenceCompleteStation
  | ReplayStation;

/** Any question, any module. Used by the grader's flatten helper. */
export type AnyQuestion =
  | SkimQuestion
  | SynonymQuestion
  | TfngQuestion
  | ScanQuestion
  | DistractorQuestion
  | AudioFillQuestion
  | SentenceCompleteQuestion
  | ReplayQuestion;

/** A whole exam form (reading or listening). */
export interface ExamForm {
  id: string;
  version: number;
  module: ModuleKey;
  durationSeconds: number;
  /** Stations in fixed order for this module. */
  stations: AnyStation[];
}

/** Reading-shaped form (helper — narrows the stations tuple). */
export interface ReadingExam extends ExamForm {
  module: "reading";
  stations: [SkimStation, SynonymStation, ProofStation, ScanStation];
}

/** Listening-shaped form. */
export interface ListeningExam extends ExamForm {
  module: "listening";
  stations: [
    DistractorStation,
    AudioFillStation,
    SentenceCompleteStation,
    ReplayStation
  ];
}

/**
 * Flatten all questions across all stations. Used by graders for deterministic
 * iteration. Returns stationId + question pairs.
 */
export function flattenQuestions(exam: ExamForm): Array<{
  stationId: string;
  question: AnyQuestion;
}> {
  return exam.stations.flatMap((s) =>
    s.questions.map((q) => ({ stationId: s.id, question: q }))
  );
}
