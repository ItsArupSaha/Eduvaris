/**
 * Evidence Bundle assembler — turns a finalized attempt into the structured
 * input the Examiner + Validator agents consume.
 *
 * The deterministic grader has already run by the time this executes, so the
 * right/wrong verdict is a *read* off `attempt.grade`. We enrich each item
 * with behavioral signals computed here:
 *   - proofMechanicFailure (tfng only)
 *   - luckyGuess / slowAndWrong / fastAndWrong (from per-station dwell-time
 *     percentiles, 25th / 75th)
 *
 * DESIGN NOTE on dwell time: `AnswerRecord.timeSpentMs` is declared but never
 * populated by the client (always 0). We instead derive dwell time from the
 * two timestamps that ARE reliably set — `lockedAt - firstSeenAt`. This is
 * "wall-clock time the question was open," not focused-attention time, but it's
 * the best available signal and is computed uniformly. When both timestamps
 * are missing or zero (e.g. an untouched question), dwell is treated as
 * unknown and time-based signals degrade to false rather than being invented.
 *
 * Micro-skills are NOT labeled on questions/stations in the content model;
 * we derive a human-readable label from `station.kind` via MICRO_SKILL_BY_KIND.
 */
import type { ExamForm, AnyQuestion } from "@/lib/exam/content-types";
import type { AnswersMap, AnswerRecord, TestAttempt, Grade } from "@/lib/exam/attempt-types";
import { answerKey } from "@/lib/exam/attempt-types";

/* --------------------------------- types -------------------------------- */

/** The Evidence Bundle the agents receive. */
export interface EvidenceBundle {
  module: string;
  globalMetrics: {
    tabSwitchCount: number;
    totalActiveTimeMs: number;
    budgetedTimeMs: number;
  };
  items: BundleItem[];
  writingResponses: WritingResponse[];
  speakingTranscripts: SpeakingTranscript[];
}

interface BundleItem {
  stationId: string;
  questionId: string;
  kind: string;
  microSkill: string;
  prompt: string;
  studentAnswer: unknown;
  correctAnswer: unknown;
  behavioral: { timeSpentMs: number };
  signals: {
    isCorrect: boolean;
    proofMechanicFailure: boolean;
    luckyGuess: boolean;
    slowAndWrong: boolean;
    fastAndWrong: boolean;
  };
}

interface WritingResponse {
  stationId: string;
  questionId: string;
  microSkill: string;
  prompt: string;
  wordCount: number;
  text: string;
}

interface SpeakingTranscript {
  stationId: string;
  questionId: string;
  microSkill: string;
  task: string;
  transcript: string;
}

/* --------------------------- micro-skill labels -------------------------- */

/**
 * Human-readable micro-skill label per station kind. The AI reasons over these
 * strings, so they name the actual sub-skill, not just the station id.
 */
const MICRO_SKILL_BY_KIND: Record<string, string> = {
  skim: "skimming for the main idea / gist",
  synonym: "recognising synonyms and paraphrase in context",
  proof: "True / False / Not Given with evidence location",
  scan: "scanning for specific detail",
  distractor: "identifying distractors in spoken English",
  audioFill: "listening to fill in specific words",
  sentenceComplete: "listening to complete sentence stems",
  inference: "inferencing implicit meaning and speaker attitude",
  paraphrase: "paraphrasing without banned words",
  cohesion: "cohesion — sentence ordering and transition placement",
  bodyParagraph: "argument development under writing pressure",
  imageFluency: "spontaneous fluency describing an image",
  rapidFire: "short-answer fluency (Part 1 examiner questions)",
  cueCard: "extended narrative fluency (Part 2 cue card)",
  abstractAnswer: "extended abstract articulation (Part 3)",
};

/** Deterministic (right/wrong) question kinds — they go into `items[]`. */
const DETERMINISTIC_KINDS = new Set([
  "skim",
  "synonym",
  "tfng",
  "scan",
  "distractor",
  "audioFill",
  "sentenceComplete",
  "inference",
  "cohesion",
]);

/* ----------------------------- prompt text ------------------------------ */

/** Extract the human-readable prompt for a question, per kind. */
function promptText(q: AnyQuestion): string {
  switch (q.kind) {
    case "skim":
    case "synonym":
    case "distractor":
    case "inference":
      return `${q.prompt} Options: ${q.options.join(" | ")}`;
    case "tfng":
      return q.statement;
    case "scan":
      return q.contextSentence;
    case "audioFill":
      return q.prompt;
    case "sentenceComplete":
      return q.stem;
    case "cohesion":
      return `Order these sentences: ${q.scrambledSentences.join(" / ")}. Place a transition: ${q.transitionOptions.join(" | ")}`;
    case "paraphrase":
      return `${q.prompt} (Avoid: ${q.bannedWords.join(", ")})`;
    case "bodyParagraph":
      return q.prompt;
    case "cueCard":
      return `${q.topic}. You should say: ${q.prompts.join("; ")}`;
    case "rapidFire":
    case "abstractAnswer":
      return q.question;
    case "imageFluency":
      return `Describe the image at ${q.imageSrc}`;
    default:
      return "(unrecognised question)";
  }
}

/** A short, human-readable rendering of the student's answer for the bundle. */
function describeStudentAnswer(rec: AnswerRecord | undefined): unknown {
  if (!rec) return null;
  const p = rec.payload;
  switch (p.kind) {
    case "skim":
    case "synonym":
    case "distractor":
    case "inference":
      return { optionIndex: p.optionIndex };
    case "tfng":
      return { verdict: p.verdict, proofSentenceIndex: p.proofSentenceIndex };
    case "scan":
    case "audioFill":
    case "sentenceComplete":
    case "paraphrase":
    case "bodyParagraph":
      return { text: p.text };
    case "cohesion":
      return {
        orderedIndices: p.orderedIndices,
        transitionOption: p.transitionOption,
        transitionPlacement: p.transitionPlacement,
      };
    case "imageFluency":
    case "rapidFire":
    case "cueCard":
    case "abstractAnswer":
      return { audioPath: p.audioPath };
    default:
      return null;
  }
}

/** A short, human-readable rendering of the correct answer for the bundle. */
function describeCorrectAnswer(q: AnyQuestion): unknown {
  switch (q.kind) {
    case "skim":
    case "synonym":
    case "distractor":
    case "inference":
      return { correctOption: q.correctOption };
    case "tfng":
      return { verdict: q.verdict, proofSentenceIndex: q.proofSentenceIndex };
    case "scan":
    case "audioFill":
    case "sentenceComplete":
      // All three carry answer + optional acceptAlternatives.
      return { answer: q.answer, acceptAlternatives: q.acceptAlternatives ?? [] };
    case "cohesion":
      return {
        correctOrder: q.correctOrder,
        correctTransition: q.correctTransition,
        correctTransitionGap: q.correctTransitionGap,
      };
    // Free-text / spoken kinds have no deterministic answer key.
    default:
      return null;
  }
}

/* ----------------------------- dwell time ------------------------------- */

/** Wall-clock ms the question was open, derived from firstSeenAt → lockedAt. */
function dwellMs(rec: AnswerRecord | undefined): number {
  if (!rec || rec.lockedAt == null) return 0;
  const d = rec.lockedAt - rec.firstSeenAt;
  return Number.isFinite(d) && d > 0 ? d : 0;
}

/**
 * Percentile (0–1) of a value within a sample. Linear interpolation between
 * closest ranks. Empty/zero samples return 0.5 (neutral — no time signal).
 */
function percentile(value: number, sample: number[]): number {
  const s = sample.filter((v) => v > 0);
  if (s.length === 0) return 0.5;
  if (s.length === 1) return value <= s[0] ? 0.5 : 1;
  const sorted = [...s].sort((a, b) => a - b);
  const rank = sorted.findIndex((v) => v >= value);
  if (rank === -1) return 1;
  if (rank === 0) return 0;
  // linear interpolation between sorted[rank-1] and sorted[rank]
  const lo = sorted[rank - 1];
  const hi = sorted[rank];
  const frac = hi === lo ? 0 : (value - lo) / (hi - lo);
  return (rank - 1 + frac) / (sorted.length - 1);
}

/**
 * Build the per-station dwell samples and a lookup for percentile queries.
 * Returns a function: (stationId, ms) => percentile(0..1).
 */
function dwellPercentiler(exam: ExamForm, answers: AnswersMap) {
  const byStation = new Map<string, number[]>();
  for (const station of exam.stations) {
    const dwells: number[] = [];
    for (const q of station.questions) {
      dwells.push(dwellMs(answers[answerKey(station.id, q.id)]));
    }
    byStation.set(station.id, dwells);
  }
  return (stationId: string, ms: number) => {
    const sample = byStation.get(stationId) ?? [];
    return percentile(ms, sample);
  };
}

/* --------------------------- proof-mechanic ----------------------------- */

/** tfng: verdict right but proof sentence wrong/absent → fragile knowledge. */
function isProofMechanicFailure(q: AnyQuestion, rec: AnswerRecord | undefined): boolean {
  if (q.kind !== "tfng" || !rec) return false;
  const p = rec.payload;
  if (p.kind !== "tfng") return false;
  if (p.verdict !== q.verdict) return false; // verdict itself must be right
  // Then the proof must be wrong: indices differ, or student left it null.
  return p.proofSentenceIndex !== q.proofSentenceIndex;
}

/* ----------------------------- main export ------------------------------ */

/**
 * Assemble the Evidence Bundle from a finalized attempt.
 *
 * Pure (no I/O) — reads the grade the deterministic grader already computed
 * and enriches each answer with behavioral signals. Safe to call from the
 * background pipeline.
 */
export function assembleEvidenceBundle(
  exam: ExamForm,
  attempt: TestAttempt
): EvidenceBundle {
  const answers = attempt.answers ?? {};
  const grade: Grade | null = attempt.grade;
  // Fast lookup of the per-question correctness the grader already decided.
  const correctByKey = new Map<string, boolean>();
  for (const sg of grade?.stations ?? []) {
    for (const [k, v] of Object.entries(sg.perQuestion ?? {})) {
      correctByKey.set(k, v === true);
    }
  }

  const pctOf = dwellPercentiler(exam, answers);

  const items: BundleItem[] = [];
  const writingResponses: WritingResponse[] = [];
  const speakingTranscripts: SpeakingTranscript[] = [];

  for (const station of exam.stations) {
    for (const q of station.questions) {
      const key = answerKey(station.id, q.id);
      const rec = answers[key];
      const microSkill = MICRO_SKILL_BY_KIND[q.kind] ?? q.kind;
      const dwell = dwellMs(rec);
      const hasDwellData = dwell > 0;
      const p = pctOf(station.id, dwell);
      const fast = hasDwellData && p <= 0.25;
      const slow = hasDwellData && p >= 0.75;

      // Free-text writing → writingResponses[].
      if (q.kind === "paraphrase" || q.kind === "bodyParagraph") {
        const text = rec?.payload.kind === q.kind ? rec.payload.text : "";
        writingResponses.push({
          stationId: station.id,
          questionId: q.id,
          microSkill,
          prompt: promptText(q),
          wordCount: text.trim() ? text.trim().split(/\s+/).length : 0,
          text,
        });
        continue;
      }

      // Speaking transcripts → speakingTranscripts[] (uses Whisper output).
      if (
        q.kind === "imageFluency" ||
        q.kind === "rapidFire" ||
        q.kind === "cueCard" ||
        q.kind === "abstractAnswer"
      ) {
        speakingTranscripts.push({
          stationId: station.id,
          questionId: q.id,
          microSkill,
          task: promptText(q),
          transcript: attempt.transcripts?.[key] ?? "",
        });
        continue;
      }

      // Everything else is a deterministic (right/wrong) item.
      if (!DETERMINISTIC_KINDS.has(q.kind)) continue;
      const isCorrect = correctByKey.get(key) ?? false;
      const proofFail = isProofMechanicFailure(q, rec);

      items.push({
        stationId: station.id,
        questionId: q.id,
        kind: q.kind,
        microSkill,
        prompt: promptText(q),
        studentAnswer: describeStudentAnswer(rec),
        correctAnswer: describeCorrectAnswer(q),
        behavioral: { timeSpentMs: dwell },
        signals: {
          isCorrect,
          proofMechanicFailure: proofFail,
          // Lucky guess: correct AND fast AND not a proof-mechanic failure
          // (a fast correct T/F/NG with proof is just fast mastery).
          luckyGuess: isCorrect && fast && !proofFail,
          slowAndWrong: !isCorrect && slow,
          fastAndWrong: !isCorrect && fast,
        },
      });
    }
  }

  // Global metrics. completedAt/startedAt may be Firestore Timestamps or epoch
  // numbers depending on read path; coerce defensively.
  const totalActiveTimeMs = timeDeltaMs(attempt.completedAt, attempt.startedAt);

  return {
    module: exam.module,
    globalMetrics: {
      tabSwitchCount: attempt.tabSwitchCount ?? 0,
      totalActiveTimeMs,
      budgetedTimeMs: exam.durationSeconds * 1000,
    },
    items,
    writingResponses,
    speakingTranscripts,
  };
}

/** Best-effort epoch-ms delta between two timestamp-ish values. */
function timeDeltaMs(end: unknown, start: unknown): number {
  const e = toEpochMs(end);
  const s = toEpochMs(start);
  if (e == null || s == null) return 0;
  const d = e - s;
  return Number.isFinite(d) && d > 0 ? d : 0;
}

function toEpochMs(v: unknown): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  // Firestore Timestamp shape { _seconds, _nanoseconds } or { seconds, nanoseconds }.
  const t = v as { _seconds?: number; seconds?: number; toMillis?: () => number };
  if (typeof t.toMillis === "function") return t.toMillis();
  const secs = t._seconds ?? t.seconds;
  if (typeof secs === "number") return secs * 1000;
  return null;
}
