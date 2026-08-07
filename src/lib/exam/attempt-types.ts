/**
 * Attempt document model — Firestore `testAttempts/{attemptId}`.
 *
 * Server-write-only by security rules. The client never writes this doc; it
 * only sends raw inputs through the PATCH route, which the server merges as
 * forward-progress fields. Anti-cheat foundation: a tampering client cannot
 * lower its own responseMs, zero out tabSwitchCount, or pre-mark answers
 * correct, because it has no write path.
 *
 * All timestamps are Firestore Timestamp objects after a server read; the
 * client treats them opaquely and converts to epoch ms where it needs to.
 */
import type { ModuleKey } from "@/lib/firebase/user-types";
import type { TfngVerdict } from "./content-types";
import type { DiagnosticReport } from "@/lib/ai/diagnostic-schema";

/** Lifecycle of an attempt. */
export const ATTEMPT_STATUSES = [
  "in-progress",
  "completed",
  "expired",
] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

/**
 * Discriminated union of per-question answer payloads across all modules.
 * `kind` matches the question kind in content-types.ts.
 *
 * Speaking answers store a Storage object path (`audioPath`) captured by the
 * MediaRecorder API — universal browser support. The raw audio is uploaded to
 * Firebase Storage server-side via a Route Handler (storage rules stay
 * default-deny). On submit, the backend fetches each audio, runs Whisper, and
 * writes the resulting text into `TestAttempt.transcripts[key]`.
 */
export type AnswerPayload =
  | { kind: "skim"; optionIndex: number }
  | { kind: "synonym"; optionIndex: number }
  | {
      kind: "tfng";
      verdict: TfngVerdict | null;
      proofSentenceIndex: number | null;
    }
  | { kind: "scan"; text: string }
  | { kind: "distractor"; optionIndex: number }
  | { kind: "audioFill"; text: string }
  | { kind: "sentenceComplete"; text: string }
  | { kind: "inference"; optionIndex: number }
  | { kind: "paraphrase"; text: string }
  | {
      kind: "cohesion";
      /** Student's sentence order, as indices into scrambledSentences. */
      orderedIndices: number[];
      /** Index into transitionOptions of the placed chip, or -1 if unused. */
      transitionOption: number;
      /** Gap index where the chip is placed, or -1 if in the unused tray. */
      transitionPlacement: number;
    }
  | { kind: "bodyParagraph"; text: string }
  /** Speaking: audio captured by MediaRecorder, uploaded to Storage. */
  | { kind: "imageFluency"; audioPath: string }
  | { kind: "rapidFire"; audioPath: string }
  | { kind: "cueCard"; audioPath: string }
  | { kind: "abstractAnswer"; audioPath: string };

/**
 * One answer record. Keyed by `${stationId}.${questionId}` in `answers`.
 */
export interface AnswerRecord {
  payload: AnswerPayload;
  /** Epoch ms when this question first became active for the user. */
  firstSeenAt: number;
  /** Epoch ms when the answer was locked. */
  lockedAt: number | null;
  /** Epoch ms spent on this question. */
  timeSpentMs: number;
  /** True once the user locked the answer OR it timed out. */
  locked: boolean;
}

export type AnswersMap = Record<string, AnswerRecord>;

/** Per-station grading summary attached on finalization. */
export interface StationGrade {
  stationId: string;
  correct: number;
  total: number;
  perQuestion: Record<string, boolean>;
}

/** Overall grade attached on submit/expire. */
export interface Grade {
  totalCorrect: number;
  totalQuestions: number;
  fraction: number;
  stations: StationGrade[];
  gradedAt: number;
}

/** The full attempt document. */
export interface TestAttempt {
  uid: string;
  module: ModuleKey;
  status: AttemptStatus;
  startedAt: unknown;
  expiresAt: unknown;
  completedAt: unknown | null;
  examId: string;
  examVersion: number;
  stationIndex: number;
  answers: AnswersMap;
  tabSwitchCount: number;
  creditsConsumed: number;
  grade: Grade | null;
  /**
   * Whisper transcripts for speaking answers. Keyed by `${stationId}.${questionId}`.
   * Filled server-side on submit (speaking module only). Empty/absent for
   * reading/listening/writing.
   */
  transcripts?: Record<string, string>;
  /**
   * Deep Diagnostic AI pipeline state. Separate from the main `status` field
   * (which stays in-progress → completed|expired) so the existing status guards
   * are undisturbed.
   *   - "pending": pipeline scheduled, report not ready yet (frontend polls).
   *   - "ready":   diagnosticReport is populated.
   *   - "error":   pipeline failed after retries; frontend falls back gracefully.
   * Absent when OPENAI_API_KEY is unset (no pipeline run; deterministic grade only).
   */
  diagnosticStatus?: "pending" | "ready" | "error";
  /** The validated Deep Diagnostic Report. Present when diagnosticStatus === "ready". */
  diagnosticReport?: DiagnosticReport;
  /** Short reason string when diagnosticStatus === "error". */
  diagnosticError?: string;
}

/** The forward-progress fields the PATCH route is allowed to merge. */
export const PATCHABLE_FIELDS = [
  "stationIndex",
  "answers",
  "tabSwitchCount",
] as const;
export type PatchableField = (typeof PATCHABLE_FIELDS)[number];

/** Build the stable per-question key from station + question ids. */
export function answerKey(stationId: string, questionId: string): string {
  return `${stationId}.${questionId}`;
}
