/**
 * Zustand exam engine — module-agnostic client state for an in-progress attempt.
 *
 * The store holds a mirror of the server-owned attempt doc (position, answers,
 * tab-switch count, deadline, review snapshot). It NEVER owns lifecycle fields
 * the server controls (status, creditsConsumed, startedAt, grade). On hydrate
 * it pulls the server copy + resolves the content form by module.
 *
 * Anti-cheat posture: this store is convenience, not authority. The server
 * re-reads + re-validates on every save/submit.
 */
import { create } from "zustand";
import type { ExamForm } from "@/lib/exam/content-types";
import type { ModuleKey } from "@/lib/firebase/user-types";
import type { TfngVerdict } from "@/lib/exam/content-types";
import {
  answerKey,
  type AnswerPayload,
  type AnswerRecord,
  type AnswersMap,
} from "@/lib/exam/attempt-types";
import { getExamForm } from "@/lib/exam/exam-forms";
import type { HydratedAttempt } from "@/lib/exam/exam-api";

export type ExamPhase =
  | "loading"
  | "ready"
  | "active"
  | "submitting"
  | "completed"
  | "error";

export interface ExamState {
  phase: ExamPhase;
  error: string | null;

  attemptId: string | null;
  /** Resolved from the attempt's module on hydrate. */
  exam: ExamForm | null;
  expiresAtMs: number;
  resumed: boolean;

  stationIndex: number;
  introAcknowledged: boolean;

  answers: AnswersMap;
  tabSwitchCount: number;

  // persistence
  dirty: boolean;
  saveStatus: "idle" | "saving" | "saved" | "error";
  lastSavedAt: number | null;

  // result (filled on submit)
  result: { status: string; grade: HydratedAttempt["grade"] } | null;

  /* ----------------------------- actions ----------------------------- */
  hydrate: (attempt: HydratedAttempt, resumed: boolean) => void;
  setError: (msg: string | null) => void;
  acknowledgeIntro: () => void;
  goStation: (index: number) => void;
  nextStation: () => void;

  touchQuestion: (stationId: string, questionId: string) => void;

  /** MCQ selection for skim/synonym/distractor/inference. */
  setOption: (
    stationId: string,
    questionId: string,
    optionIndex: number,
    kind: "skim" | "synonym" | "distractor" | "inference"
  ) => void;

  setTfngVerdict: (stationId: string, questionId: string, verdict: TfngVerdict) => void;
  lockTfngProof: (stationId: string, questionId: string, proofSentenceIndex: number) => void;
  timeoutTfng: (stationId: string, questionId: string) => void;

  /** Fill-blank for scan/audioFill/sentenceComplete. */
  setText: (
    stationId: string,
    questionId: string,
    text: string,
    kind: "scan" | "audioFill" | "sentenceComplete"
  ) => void;
  /** Lock a fill-blank answer. */
  lockText: (
    stationId: string,
    questionId: string,
    kind: "scan" | "audioFill" | "sentenceComplete"
  ) => void;

  /** Mark a question as played (audio-once enforcement). */
  markPlayed: (stationId: string, questionId: string) => void;

  registerTabSwitch: () => void;

  markSaved: (savedAt: number) => void;
  setSaveStatus: (s: "idle" | "saving" | "saved" | "error") => void;

  beginSubmit: () => void;
  finishSubmit: (status: string, grade: HydratedAttempt["grade"]) => void;

  reset: () => void;
}

const now = () => Date.now();

function makeRecord(payload: AnswerPayload, existing?: AnswerRecord): AnswerRecord {
  return {
    payload,
    firstSeenAt: existing?.firstSeenAt ?? now(),
    lockedAt: existing?.lockedAt ?? null,
    timeSpentMs: existing?.timeSpentMs ?? 0,
    locked: existing?.locked ?? false,
  };
}

export const useExamStore = create<ExamState>((set, get) => ({
  phase: "loading",
  error: null,
  attemptId: null,
  exam: null,
  expiresAtMs: 0,
  resumed: false,
  stationIndex: 0,
  introAcknowledged: false,
  answers: {},
  tabSwitchCount: 0,
  dirty: false,
  saveStatus: "idle",
  lastSavedAt: null,
  result: null,

  hydrate: (attempt, resumed) => {
    const exam = getExamForm(attempt.examId, attempt.module as ModuleKey);
    if (!exam) {
      set({
        error: `Exam form "${attempt.examId}" not found. Contact support.`,
        phase: "error",
      });
      return;
    }
    set({
      phase: attempt.status === "in-progress" ? "ready" : "completed",
      attemptId: attempt.id,
      exam,
      stationIndex: attempt.stationIndex ?? 0,
      answers: attempt.answers ?? {},
      tabSwitchCount: attempt.tabSwitchCount ?? 0,
      expiresAtMs: attempt.expiresAtMs ?? 0,
      resumed,
      introAcknowledged: false,
      dirty: false,
    });
  },

  setError: (msg) => set({ error: msg, phase: msg ? "error" : get().phase }),

  acknowledgeIntro: () => set({ introAcknowledged: true, phase: "active" }),

  goStation: (index) =>
    set((s) => {
      if (!s.exam) return {};
      return {
        stationIndex: Math.max(0, Math.min(s.exam.stations.length - 1, index)),
        introAcknowledged: false,
        dirty: true,
      };
    }),

  nextStation: () => get().goStation(get().stationIndex + 1),

  touchQuestion: (stationId, questionId) => {
    const key = answerKey(stationId, questionId);
    const answers = get().answers;
    if (answers[key]) return;
    const station = get().exam?.stations.find((st) => st.id === stationId);
    if (!station) return;
    const placeholder = placeholderPayload(station.kind);
    set({
      answers: { ...answers, [key]: makeRecord(placeholder) },
      dirty: true,
    });
  },

  setOption: (stationId, questionId, optionIndex, kind) => {
    const key = answerKey(stationId, questionId);
    const existing = get().answers[key];
    set({
      answers: {
        ...get().answers,
        [key]: makeRecord({ kind, optionIndex }, existing),
      },
      dirty: true,
    });
  },

  setTfngVerdict: (stationId, questionId, verdict) => {
    const key = answerKey(stationId, questionId);
    const existing = get().answers[key];
    const prev = existing?.payload;
    const prevProof = prev?.kind === "tfng" ? prev.proofSentenceIndex : null;
    set({
      answers: {
        ...get().answers,
        [key]: makeRecord(
          {
            kind: "tfng",
            verdict,
            proofSentenceIndex: verdict === "not_given" ? null : prevProof ?? null,
          },
          existing
        ),
      },
      dirty: true,
    });
  },

  lockTfngProof: (stationId, questionId, proofSentenceIndex) => {
    const key = answerKey(stationId, questionId);
    const existing = get().answers[key];
    if (!existing || existing.payload.kind !== "tfng") return;
    if (!existing.payload.verdict || existing.payload.verdict === "not_given") return;
    if (existing.locked) return;
    set({
      answers: {
        ...get().answers,
        [key]: {
          ...existing,
          payload: { ...existing.payload, proofSentenceIndex },
          locked: true,
          lockedAt: now(),
        },
      },
      dirty: true,
    });
  },

  timeoutTfng: (stationId, questionId) => {
    const key = answerKey(stationId, questionId);
    const existing = get().answers[key];
    const payload: AnswerPayload =
      existing?.payload?.kind === "tfng"
        ? existing.payload
        : { kind: "tfng", verdict: null, proofSentenceIndex: null };
    set({
      answers: {
        ...get().answers,
        [key]: {
          ...(existing ?? makeRecord(payload)),
          payload,
          locked: true,
          lockedAt: now(),
        },
      },
      dirty: true,
    });
  },

  setText: (stationId, questionId, text, kind) => {
    const key = answerKey(stationId, questionId);
    const existing = get().answers[key];
    // Replay/audioFill/sentenceComplete: editable (no lock unless scan).
    // Scan: also editable until locked. So just update text.
    set({
      answers: {
        ...get().answers,
        [key]: makeRecord({ kind, text }, existing),
      },
      dirty: true,
    });
  },

  lockText: (stationId, questionId, kind) => {
    const key = answerKey(stationId, questionId);
    const existing = get().answers[key];
    if (!existing || existing.locked) return;
    set({
      answers: {
        ...get().answers,
        [key]: { ...existing, locked: true, lockedAt: now() },
      },
      dirty: true,
    });
    void kind;
  },

  markPlayed: (stationId, questionId) => {
    // Played-state is derived from answer presence for distractor (option
    // selection implies the audio was played). For other audio stations we
    // track play-state via a side map kept in component state — server-grade
    // doesn't need it. This action exists for symmetry + future audit logging.
    void stationId;
    void questionId;
  },

  registerTabSwitch: () =>
    set((s) => ({ tabSwitchCount: s.tabSwitchCount + 1, dirty: true })),

  markSaved: (savedAt) =>
    set({ dirty: false, saveStatus: "saved", lastSavedAt: savedAt }),

  setSaveStatus: (status) => set({ saveStatus: status }),

  beginSubmit: () => set({ phase: "submitting" }),

  finishSubmit: (status, grade) =>
    set({ phase: "completed", result: { status, grade } }),

  reset: () =>
    set({
      phase: "loading",
      error: null,
      attemptId: null,
      exam: null,
      stationIndex: 0,
      answers: {},
      tabSwitchCount: 0,
      expiresAtMs: 0,
      resumed: false,
      introAcknowledged: false,
      dirty: false,
      saveStatus: "idle",
      lastSavedAt: null,
      result: null,
    }),
}));

/** Build the placeholder payload matching a station kind for firstSeenAt. */
function placeholderPayload(kind: string): AnswerPayload {
  switch (kind) {
    case "skim":
    case "synonym":
    case "distractor":
    case "inference":
      return { kind, optionIndex: -1 };
    case "tfng":
      return { kind: "tfng", verdict: null, proofSentenceIndex: null };
    case "scan":
    case "audioFill":
    case "sentenceComplete":
      return { kind, text: "" };
    default:
      return { kind: "scan", text: "" };
  }
}
