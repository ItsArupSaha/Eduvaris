"use client";

import { useExamStore } from "@/store/exam-store";
import { answerKey } from "@/lib/exam/attempt-types";
import type { Grade } from "@/lib/exam/attempt-types";
import type {
  AnyStation,
  AudioFillStation,
  DistractorStation,
  ProofStation,
  ScanStation,
  SentenceCompleteStation,
  SkimStation,
  SynonymStation,
  InferenceStation,
  ParaphraseStation,
  CohesionStation,
  BodyParagraphStation,
  RapidFireStation,
  CueCardStation,
  AbstractAnswerStation,
} from "@/lib/exam/content-types";

/**
 * Minimal results screen — module-agnostic.
 *
 * Shows:
 *   - overall score (correct / total + percentage)
 *   - final status (completed vs expired)
 *   - per-station breakdown
 *   - per-question reveal (correct answer vs student's answer, green/red)
 *
 * The exam form comes from the store (resolved by hydrate from the attempt's
 * module), so it matches what the attempt was graded against.
 */
export function ResultsView({
  result,
  onDone,
}: {
  result: { status: string; grade: Grade | null } | null;
  onDone: () => void;
}) {
  const exam = useExamStore((s) => s.exam);
  const answers = useExamStore((s) => s.answers);
  const tabSwitchCount = useExamStore((s) => s.tabSwitchCount);

  if (!result || !result.grade || !exam) {
    return (
      <main className="flex-1 px-4 py-10">
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="text-lg font-bold text-slate-900">No result available</h1>
          <button
            type="button"
            onClick={onDone}
            className="mt-6 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Back to dashboard
          </button>
        </div>
      </main>
    );
  }

  const { grade, status } = result;
  const pct = Math.round(grade.fraction * 100);
  const expired = status === "expired";

  return (
    <main className="flex-1 px-4 py-10">
      <div className="mx-auto w-full max-w-3xl">
        {/* Header */}
        <div
          className={`rounded-2xl border p-6 shadow-sm ${
            expired
              ? "border-amber-200 bg-amber-50/50"
              : "border-emerald-200 bg-emerald-50/40"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            {expired ? "Time expired" : "Diagnostic complete"}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            {grade.totalCorrect} / {grade.totalQuestions} correct
          </h1>
          <p className="mt-1 text-sm text-slate-600">{pct}%</p>
          {tabSwitchCount > 0 && (
            <p className="mt-3 text-xs text-amber-700">
              We noticed {tabSwitchCount} tab switch
              {tabSwitchCount > 1 ? "es" : ""} during this attempt. Staying
              focused on one tab gives a more accurate diagnostic.
            </p>
          )}
        </div>

        {/* Per-station breakdown */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {grade.stations.map((s) => {
            const meta = exam.stations.find((st) => st.id === s.stationId);
            return (
              <div
                key={s.stationId}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <p className="text-xs font-medium text-slate-500">
                  {meta?.title.split("—")[0].trim() ?? s.stationId}
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {s.correct}
                  <span className="text-base text-slate-400">/{s.total}</span>
                </p>
              </div>
            );
          })}
        </div>

        {/* Per-question reveal */}
        <div className="mt-8 space-y-6">
          {exam.stations.map((station) => {
            const sg = grade.stations.find((g) => g.stationId === station.id);
            return (
              <div key={station.id}>
                <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
                  {station.title}
                </h2>
                <div className="space-y-2">
                  {station.questions.map((q) => {
                    const key = answerKey(station.id, q.id);
                    const correct = sg?.perQuestion[key] ?? false;
                    return (
                      <RevealRow
                        key={q.id}
                        correct={correct}
                        station={station}
                        questionId={q.id}
                        userAnswer={answers[key]?.payload}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onDone}
            className="rounded-xl bg-amber-500 px-5 py-3 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Back to dashboard
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          This is a learning diagnostic, not an official exam score.
        </p>
      </div>
    </main>
  );
}

/* --------------------------- Reveal row ----------------------------- */

function RevealRow({
  correct,
  station,
  questionId,
  userAnswer,
}: {
  correct: boolean;
  station: AnyStation;
  questionId: string;
  userAnswer: unknown;
}) {
  // Find the question + its transcript/answer.
  const q = station.questions.find((qq) => qq.id === questionId)!;

  // Build correct/user text per kind.
  let label: string;
  let correctText: string;
  let userText: string;
  let transcript: string | null = null;

  switch (q.kind) {
    case "skim": {
      const s = station as SkimStation;
      const sq = s.questions.find((x) => x.id === q.id)!;
      label = sq.prompt;
      correctText = sq.options[sq.correctOption];
      userText = optionText(sq.options, userAnswer);
      break;
    }
    case "synonym": {
      const s = station as SynonymStation;
      const sq = s.questions.find((x) => x.id === q.id)!;
      label = sq.prompt;
      correctText = sq.options[sq.correctOption];
      userText = optionText(sq.options, userAnswer);
      break;
    }
    case "distractor": {
      const s = station as DistractorStation;
      const sq = s.questions.find((x) => x.id === q.id)!;
      label = sq.prompt;
      correctText = sq.options[sq.correctOption];
      userText = optionText(sq.options, userAnswer);
      transcript = sq.transcript;
      break;
    }
    case "tfng": {
      const s = station as ProofStation;
      const sq = s.questions.find((x) => x.id === q.id)!;
      label = sq.statement;
      const v = verdictLabel(sq.verdict);
      const proof =
        sq.proofSentenceIndex != null
          ? s.passage.sentences[sq.proofSentenceIndex]
          : null;
      correctText = proof ? `${v} — "${proof}"` : v;
      userText = userTfngText(userAnswer, s);
      break;
    }
    case "scan": {
      const s = station as ScanStation;
      const sq = s.questions.find((x) => x.id === q.id)!;
      label = sq.contextSentence.replace(/____/g, "_____");
      correctText = sq.answer;
      userText = userFillText(userAnswer);
      break;
    }
    case "audioFill": {
      const s = station as AudioFillStation;
      const sq = s.questions.find((x) => x.id === q.id)!;
      label = sq.prompt;
      correctText = sq.answer;
      userText = userFillText(userAnswer);
      transcript = s.transcript;
      break;
    }
    case "sentenceComplete": {
      const s = station as SentenceCompleteStation;
      const sq = s.questions.find((x) => x.id === q.id)!;
      label = sq.stem.replace(/____/g, "_____");
      correctText = sq.answer;
      userText = userFillText(userAnswer);
      transcript = s.transcript;
      break;
    }
    case "inference": {
      const s = station as InferenceStation;
      const sq = s.questions.find((x) => x.id === q.id)!;
      label = sq.prompt;
      correctText = sq.options[sq.correctOption];
      userText = optionText(sq.options, userAnswer);
      transcript = s.transcript;
      break;
    }
    case "paraphrase": {
      const s = station as ParaphraseStation;
      const sq = s.questions.find((x) => x.id === q.id)!;
      label = `Paraphrase: "${sq.prompt}"`;
      correctText = "(AI-graded in full report)";
      userText = userFillText(userAnswer);
      break;
    }
    case "cohesion": {
      const s = station as CohesionStation;
      const sq = s.questions.find((x) => x.id === q.id)!;
      label = "Sentence order + transition placement";
      correctText = `Order: ${sq.correctOrder
        .map((i) => i + 1)
        .join(" → ")} · Transition: "${sq.transitionOptions[sq.correctTransition]}" in gap ${sq.correctTransitionGap}`;
      userText = userCohesionText(
        userAnswer,
        sq.transitionOptions,
        sq.scrambledSentences
      );
      break;
    }
    case "bodyParagraph": {
      const s = station as BodyParagraphStation;
      const sq = s.questions.find((x) => x.id === q.id)!;
      label = `Body paragraph (min ${sq.minWords} words)`;
      correctText = "(AI-graded in full report)";
      userText = userFillText(userAnswer);
      break;
    }
    case "imageFluency": {
      label = "Spoken description (audio saved for AI grading)";
      correctText = "(AI-graded in full report)";
      userText = userAudioText(userAnswer);
      break;
    }
    case "rapidFire": {
      const s = station as RapidFireStation;
      const sq = s.questions.find((x) => x.id === q.id)!;
      label = `Examiner: "${sq.question}"`;
      correctText = "(AI-graded in full report)";
      userText = userAudioText(userAnswer);
      break;
    }
    case "cueCard": {
      const s = station as CueCardStation;
      const sq = s.questions.find((x) => x.id === q.id)!;
      label = `Cue card: "${sq.topic}"`;
      correctText = "(AI-graded in full report)";
      userText = userAudioText(userAnswer);
      break;
    }
    case "abstractAnswer": {
      const s = station as AbstractAnswerStation;
      const sq = s.questions.find((x) => x.id === q.id)!;
      label = `Examiner: "${sq.question}"`;
      correctText = "(AI-graded in full report)";
      userText = userAudioText(userAnswer);
      break;
    }
  }

  const border = correct
    ? "border-emerald-200 bg-emerald-50/40"
    : "border-rose-200 bg-rose-50/40";
  const badge = correct ? "bg-emerald-500" : "bg-rose-500";

  return (
    <div className={`rounded-xl border p-4 ${border}`}>
      <div className="flex items-start gap-3">
        <span
          className={`mt-0.5 flex-none rounded-full px-2 py-0.5 text-xs font-bold text-white ${badge}`}
        >
          {correct ? "✓" : "✗"}
        </span>
        <div className="flex-1 text-sm">
          <p className="font-medium text-slate-800">{label}</p>
          <div className="mt-2 grid gap-1 text-xs sm:grid-cols-2">
            <p>
              <span className="text-slate-400">Your answer: </span>
              <span
                className={
                  correct ? "font-medium text-emerald-700" : "font-medium text-rose-700"
                }
              >
                {userText}
              </span>
            </p>
            {!correct && (
              <p>
                <span className="text-slate-400">Correct: </span>
                <span className="font-medium text-emerald-700">{correctText}</span>
              </p>
            )}
          </div>
          {transcript && (
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-slate-400 underline underline-offset-2">
                Show transcript
              </summary>
              <p className="mt-1 text-xs italic leading-relaxed text-slate-500">
                {transcript}
              </p>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

function optionText(options: string[], userAnswer: unknown): string {
  if (
    userAnswer &&
    typeof userAnswer === "object" &&
    "optionIndex" in (userAnswer as Record<string, unknown>)
  ) {
    const idx = (userAnswer as { optionIndex: number }).optionIndex;
    if (typeof idx === "number" && idx >= 0) return options[idx];
  }
  return "(no answer)";
}

function verdictLabel(v: string): string {
  return v === "not_given" ? "Not Given" : v === "true" ? "True" : v === "false" ? "False" : v;
}

function userTfngText(userAnswer: unknown, s: ProofStation): string {
  if (
    userAnswer &&
    typeof userAnswer === "object" &&
    "verdict" in (userAnswer as Record<string, unknown>)
  ) {
    const ua = userAnswer as { verdict: string | null; proofSentenceIndex: number | null };
    const uv =
      ua.verdict === null
        ? "(no answer)"
        : verdictLabel(ua.verdict);
    const uproof =
      ua.proofSentenceIndex != null && ua.proofSentenceIndex >= 0
        ? s.passage.sentences[ua.proofSentenceIndex]
        : null;
    return uproof ? `${uv} — "${uproof}"` : uv;
  }
  return "(no answer)";
}

function userFillText(userAnswer: unknown): string {
  if (
    userAnswer &&
    typeof userAnswer === "object" &&
    "text" in (userAnswer as Record<string, unknown>)
  ) {
    const t = (userAnswer as { text: string }).text;
    if (typeof t === "string" && t.trim()) return t;
  }
  return "(no answer)";
}

/** Speaking answers carry an uploaded audioPath, not text. */
function userAudioText(userAnswer: unknown): string {
  if (
    userAnswer &&
    typeof userAnswer === "object" &&
    "audioPath" in (userAnswer as Record<string, unknown>)
  ) {
    const p = (userAnswer as { audioPath: string }).audioPath;
    if (typeof p === "string" && p.trim()) return "Recorded ✓";
  }
  return "(no answer)";
}

function userCohesionText(
  userAnswer: unknown,
  transitionOptions: string[],
  sentences: string[]
): string {
  if (
    userAnswer &&
    typeof userAnswer === "object" &&
    "orderedIndices" in (userAnswer as Record<string, unknown>)
  ) {
    const ua = userAnswer as {
      orderedIndices: number[];
      transitionOption: number;
      transitionPlacement: number;
    };
    if (!Array.isArray(ua.orderedIndices) || ua.orderedIndices.length === 0) {
      return "(no order)";
    }
    // Render the assembled paragraph with the transition chip inserted.
    const parts: string[] = [];
    for (let pos = 0; pos < ua.orderedIndices.length; pos++) {
      const gapBefore = pos;
      if (ua.transitionPlacement === gapBefore && ua.transitionOption >= 0) {
        parts.push(`[${transitionOptions[ua.transitionOption]}]`);
      }
      parts.push(sentences[ua.orderedIndices[pos]] ?? "?");
    }
    // Trailing gap (after last sentence).
    if (
      ua.transitionPlacement === ua.orderedIndices.length &&
      ua.transitionOption >= 0
    ) {
      parts.push(`[${transitionOptions[ua.transitionOption]}]`);
    }
    return parts.join(" / ");
  }
  return "(no answer)";
}
