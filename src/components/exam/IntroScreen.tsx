"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useExamStore } from "@/store/exam-store";

/**
 * Pre-station instruction screen with a 3-2-1 anti-panic countdown.
 *
 * Two internal phases:
 *   1. "briefing" — shows the station title, instructions, question count,
 *      and a "Start station" button. The user reads at their own pace.
 *   2. "countdown" — once they click Start, a 3-2-1 countdown plays so they
 *      can settle, breathe, and focus before the clock + first question
 *      appear. After 0, acknowledgeIntro() flips the engine to active and
 *      the live station renders.
 *
 * The global 25-min timer does NOT run during the countdown (engine is still
 * in `ready` until acknowledgeIntro). This is deliberate — the countdown is
 * anti-panic, not part of the exam budget. The server deadline, however,
 * includes the briefing time — server is source of truth regardless.
 */
export function IntroScreen({ stationIndex }: { stationIndex: number }) {
  const exam = useExamStore((s) => s.exam);
  const acknowledgeIntro = useExamStore((s) => s.acknowledgeIntro);
  const resumed = useExamStore((s) => s.resumed);
  const station = exam?.stations[stationIndex];
  const [subPhase, setSubPhase] = useState<"briefing" | "countdown">("briefing");
  const [count, setCount] = useState(3);

  // Reset the sub-phase + count when the station changes. Done during render
  // against a previous-value ref — React's blessed "adjusting state when a
  // prop changes" pattern (avoids setState-in-effect cascades).
  // https://react.dev/reference/react/useState#storing-information-from-previous-renders
  // eslint-disable-next-line react-hooks/set-state-in-effect, react-hooks/refs
  const prevStationRef = useRef(stationIndex);
  if (prevStationRef.current !== stationIndex) {
    prevStationRef.current = stationIndex;
    setSubPhase("briefing");
    setCount(3);
  }

  // Countdown effect — runs only while subPhase === "countdown".
  useEffect(() => {
    if (subPhase !== "countdown") return;
    if (count <= 0) {
      // Flip the engine into the live station.
      const t = setTimeout(acknowledgeIntro, 250);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setCount((c) => c - 1), 800);
    return () => clearTimeout(t);
  }, [subPhase, count, acknowledgeIntro]);

  if (!station) {
    return null;
  }

  if (subPhase === "countdown") {
    return (
      <main className="flex-1 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-wide text-slate-400">
            Starting
          </p>
          <div
            key={count}
            className="mx-auto flex h-32 w-32 items-center justify-center rounded-full bg-amber-500 text-6xl font-bold text-white shadow-lg animate-[pop_0.4s_ease-out]"
          >
            {count === 0 ? "Go" : count}
          </div>
          <p className="mt-6 text-sm text-slate-500">Take a breath. Focus.</p>
          <button
            type="button"
            onClick={() => setSubPhase("briefing")}
            className="mt-4 text-xs text-slate-400 underline underline-offset-2 hover:text-slate-600"
          >
            Cancel
          </button>
        </div>
        <style jsx>{`
          @keyframes pop {
            0% {
              transform: scale(0.6);
              opacity: 0;
            }
            60% {
              transform: scale(1.08);
              opacity: 1;
            }
            100% {
              transform: scale(1);
            }
          }
        `}</style>
      </main>
    );
  }

  const isFirst = stationIndex === 0;
  const questionCount =
    "questions" in station ? station.questions.length : 0;
  const perQuestionSeconds =
    "perQuestionSeconds" in station ? station.perQuestionSeconds : null;

  return (
    <main className="flex-1 px-4 py-10">
      <div className="mx-auto w-full max-w-2xl">
        {isFirst && (
          <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {resumed
              ? "Welcome back. Resuming your in-progress attempt — no extra credit was charged."
              : "Credit consumed. Your attempt has started."}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
            {isFirst
              ? `${exam?.module.charAt(0).toUpperCase()}${exam?.module.slice(1)} diagnostic`
              : `Station ${stationIndex + 1} of ${exam?.stations.length ?? 0}`}
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{station.title}</h1>

          <div className="mt-4 space-y-2 text-sm text-slate-600">
            <p className="leading-relaxed">{station.instructions}</p>
          </div>

          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-xs text-slate-400">Questions</dt>
              <dd className="font-semibold text-slate-900">{questionCount}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 px-3 py-2">
              <dt className="text-xs text-slate-400">Time</dt>
              <dd className="font-semibold text-slate-900">
                {perQuestionSeconds
                  ? `${perQuestionSeconds}s per question`
                  : "Part of your 25:00 budget"}
              </dd>
            </div>
          </dl>

          <button
            type="button"
            onClick={() => setSubPhase("countdown")}
            className="mt-6 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
          >
            {isFirst ? "Begin diagnostic" : `Start Station ${stationIndex + 1}`}
          </button>

          {!isFirst && (
            <p className="mt-3 text-center text-xs text-slate-400">
              You can&apos;t go back to previous stations once you advance.
            </p>
          )}
        </div>

        <p className="mt-4 text-center text-xs text-slate-400">
          Need to leave? Your progress auto-saves.{" "}
          <Link href="/dashboard" className="underline underline-offset-2 hover:text-slate-600">
            Back to dashboard
          </Link>
        </p>
      </div>
    </main>
  );
}
