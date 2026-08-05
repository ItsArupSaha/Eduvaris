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
  | "inference" // listening — advanced implicit-meaning / speaker-attitude
  | "paraphrase" // writing
  | "cohesion" // writing
  | "bodyParagraph" // writing
  | "imageFluency" // speaking
  | "rapidFire" // speaking — Part 1 audio-examiner questions
  | "cueCard" // speaking
  | "abstractAnswer"; // speaking

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
 * Station 4 — Advanced Inference (the ceiling station).
 *
 * A single dense, fast Band 8-9 audio clip played ONCE for the whole station.
 * The questions test implicit meaning and speaker attitude — not facts you can
 * scan for. This is the ceiling diagnostic: weak students are diagnosed by
 * Station 3, strong students are pushed to their breaking point here. No
 * transcript is ever shown — that would turn a listening test into a reading
 * test. Standard exact-match MCQ grading.
 */
export interface InferenceQuestion extends BaseQuestion {
  kind: "inference";
  prompt: string;
  options: string[];
  correctOption: number;
}
export interface InferenceStation {
  kind: "inference";
  id: "inference";
  title: string;
  instructions: string;
  /** Single dense clip for the whole station. Played once. */
  audioSrc: string;
  /** Transcript — revealed on RESULTS ONLY, never during the attempt. */
  transcript: string;
  questions: InferenceQuestion[];
}

/* -------------------------------- WRITING -------------------------------- */

/**
 * Writing Station 1 — Paraphrasing.
 *
 * 3 distinct IELTS-style prompts shown one by one. Per-question budget (2 min
 * each). The student rewrites the prompt in 1-2 sentences WITHOUT using the
 * listed banned words. Free-text answer; AI-graded later (Task 10).
 */
export interface ParaphraseQuestion extends BaseQuestion {
  kind: "paraphrase";
  prompt: string;
  bannedWords: string[];
  /** Per-question time budget in seconds (e.g. 120 for 2 min). */
  perQuestionSeconds: number;
}
export interface ParaphraseStation {
  kind: "paraphrase";
  id: "paraphrase";
  title: string;
  instructions: string;
  questions: ParaphraseQuestion[];
}

/**
 * Writing Station 2 — Cohesion Builder.
 *
 * A scrambled body paragraph. The student:
 *   1. Drag-and-drops the sentences into a logical order.
 *   2. Drags a transition-word "chip" into the gap between two sentences (or
 *      leaves it in the unused tray) — testing where, not just which.
 *
 * Deterministic grading:
 *   - orderedIndices must equal correctOrder
 *   - the placed transition's option index must equal correctTransition
 *   - the gap it's placed in must equal correctTransitionGap
 *
 * Gap indices: 0 = before sentence 1, 1 = between sentences 1-2, ...,
 * n = after the last sentence. -1 = unused tray (not placed).
 */
export interface CohesionQuestion extends BaseQuestion {
  kind: "cohesion";
  /** Sentences in SCRAMBLED display order (ids are stable; order is the input). */
  scrambledSentences: string[];
  /** The correct sentence order, as indices into scrambledSentences. */
  correctOrder: number[];
  /** Candidate transition words shown as draggable chips. */
  transitionOptions: string[];
  /** The index into transitionOptions of the correct transition. */
  correctTransition: number;
  /** The gap index (0..correctOrder.length) where the transition belongs. */
  correctTransitionGap: number;
}
export interface CohesionStation {
  kind: "cohesion";
  id: "cohesion";
  title: string;
  instructions: string;
  questions: CohesionQuestion[];
}

/**
 * Writing Station 3 — Pressure Production.
 *
 * One IELTS prompt; the student writes a single body paragraph (min 100
 * words) under time pressure. Live word counter. Free-text answer; AI-graded
 * later (Task 10).
 */
export interface BodyParagraphQuestion extends BaseQuestion {
  kind: "bodyParagraph";
  prompt: string;
  minWords: number;
}
export interface BodyParagraphStation {
  kind: "bodyParagraph";
  id: "bodyParagraph";
  title: string;
  instructions: string;
  questions: BodyParagraphQuestion[];
}

/* -------------------------------- SPEAKING ------------------------------- */

/**
 * Speaking Station 1 — Spontaneous Fluency.
 *
 * 3 images shown one by one. 15-second analysis countdown, then up to 60
 * seconds of speaking. Audio is captured by the MediaRecorder API (universal
 * browser support), uploaded to Firebase Storage on Lock & Next, and
 * transcribed server-side by Whisper on submit. Smart cut-off (Lock & Next
 * button) if the student finishes early.
 */
export interface ImageFluencyQuestion extends BaseQuestion {
  kind: "imageFluency";
  imageSrc: string;
  /** Silent analysis countdown before the mic opens. */
  analysisSeconds: number;
  /** Max speak time before auto cut-off. */
  speakSeconds: number;
}
export interface ImageFluencyStation {
  kind: "imageFluency";
  id: "imageFluency";
  title: string;
  instructions: string;
  questions: ImageFluencyQuestion[];
}

/**
 * Speaking Station 1B — Rapid-Fire Audio Questions (Part 1).
 *
 * 3 standard IELTS Part 1 questions, one by one. The app acts as examiner:
 * for each question it auto-plays an audio clip of the examiner asking it,
 * then reveals a "Start Speaking" button. The student has `answerSeconds`
 * (default 30) to answer. Smart cut-off via Lock & Next.
 *
 * Audio is captured by the MediaRecorder API but NOT shown to the student as
 * text; it's transcribed by Whisper on submit.
 */
export interface RapidFireQuestion extends BaseQuestion {
  kind: "rapidFire";
  question: string;
  /** Examiner audio clip (auto-played). Path under /public. */
  examinerAudioSrc: string;
  answerSeconds: number;
}
export interface RapidFireStation {
  kind: "rapidFire";
  id: "rapidFire";
  title: string;
  instructions: string;
  questions: RapidFireQuestion[];
}

/**
 * Speaking Station 2 — Narrative Tense Control (Part 2 cue card).
 *
 * A standard IELTS Part 2 cue card. 1 min prep (silent countdown), then 2
 * min speaking. When prep ends, a short audio cue ("Now begin speaking") is
 * auto-played and the mic opens automatically — the student must speak for
 * the full `speakSeconds` (no smart cut-off) to test endurance. Audio is
 * captured by the MediaRecorder API, transcribed by Whisper on submit; no
 * live text is shown.
 */
export interface CueCardQuestion extends BaseQuestion {
  kind: "cueCard";
  /** Cue card prompt parts (topic + bullet prompts). */
  topic: string;
  prompts: string[];
  prepSeconds: number;
  speakSeconds: number;
  /** Auto-played "Now begin speaking" cue after prep. Path under /public. */
  startCueSrc: string;
}
export interface CueCardStation {
  kind: "cueCard";
  id: "cueCard";
  title: string;
  instructions: string;
  questions: CueCardQuestion[];
}

/**
 * Speaking Station 3 — Abstract Articulation.
 *
 * 4 abstract Part 3 questions, one by one. The app auto-plays an examiner
 * audio clip of each question, then reveals a "Start Speaking" button. The
 * student has `answerSeconds` (default 90) to answer. Smart cut-off via
 * Lock & Next. Audio captured by MediaRecorder, transcribed by Whisper on
 * submit; no live text shown.
 */
export interface AbstractAnswerQuestion extends BaseQuestion {
  kind: "abstractAnswer";
  question: string;
  /** Examiner audio clip (auto-played). Path under /public. */
  examinerAudioSrc: string;
  answerSeconds: number;
}
export interface AbstractAnswerStation {
  kind: "abstractAnswer";
  id: "abstractAnswer";
  title: string;
  instructions: string;
  questions: AbstractAnswerQuestion[];
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
  | InferenceStation
  | ParaphraseStation
  | CohesionStation
  | BodyParagraphStation
  | ImageFluencyStation
  | RapidFireStation
  | CueCardStation
  | AbstractAnswerStation;

/** Any question, any module. Used by the grader's flatten helper. */
export type AnyQuestion =
  | SkimQuestion
  | SynonymQuestion
  | TfngQuestion
  | ScanQuestion
  | DistractorQuestion
  | AudioFillQuestion
  | SentenceCompleteQuestion
  | InferenceQuestion
  | ParaphraseQuestion
  | CohesionQuestion
  | BodyParagraphQuestion
  | ImageFluencyQuestion
  | RapidFireQuestion
  | CueCardQuestion
  | AbstractAnswerQuestion;

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
    InferenceStation
  ];
}

/** Writing-shaped form. */
export interface WritingExam extends ExamForm {
  module: "writing";
  stations: [ParaphraseStation, CohesionStation, BodyParagraphStation];
}

/** Speaking-shaped form. */
export interface SpeakingExam extends ExamForm {
  module: "speaking";
  stations: [
    ImageFluencyStation,
    RapidFireStation,
    CueCardStation,
    AbstractAnswerStation
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
