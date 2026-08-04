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
  | { kind: "replay"; text: string };

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

/**
 * Replay-review change tracking (Listening Station 4).
 *
 * Snapshotted at review-start; on submit the grader compares each review
 * question's snapshot vs final. A "deterioration" is a question that was
 * correct at snapshot but wrong at final — the overconfidence signal the
 * blueprint asks for. Null on modules without a replay station.
 */
export interface ReplayChangeReport {
  /** Epoch ms when the review snapshot was taken. */
  snapshotAt: number;
  /** Question keys that were correct at snapshot, wrong at final. */
  deteriorated: string[];
  /** Question keys that were wrong at snapshot, correct at final. */
  improved: string[];
}

/** Overall grade attached on submit/expire. */
export interface Grade {
  totalCorrect: number;
  totalQuestions: number;
  fraction: number;
  stations: StationGrade[];
  gradedAt: number;
  /** Listening only. Null otherwise. */
  replay?: ReplayChangeReport | null;
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
   * Snapshot of answers at the moment the Listening review phase began.
   * Server stores this so the grader can detect correct→wrong changes. Null
   * on modules without a replay station.
   */
  reviewSnapshot: AnswersMap | null;
}

/** The forward-progress fields the PATCH route is allowed to merge. */
export const PATCHABLE_FIELDS = [
  "stationIndex",
  "answers",
  "tabSwitchCount",
  "reviewSnapshot",
] as const;
export type PatchableField = (typeof PATCHABLE_FIELDS)[number];

/** Build the stable per-question key from station + question ids. */
export function answerKey(stationId: string, questionId: string): string {
  return `${stationId}.${questionId}`;
}
