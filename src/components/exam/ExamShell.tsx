"use client";

import { type ReactNode } from "react";
import { useExamStore } from "@/store/exam-store";
import { useExamTimer } from "@/hooks/useExamTimer";

/**
 * Persistent exam chrome: global timer, save status, station progress dots.
 * Wraps every phase's body. Does NOT render during loading/submitting
 * (those phases render their own full-screen shells via the page).
 *
 * The timer here is informational only — the page-level useExamTimer is the
 * one wired to auto-submit. Reading from the hook twice is cheap (Zustand).
 */
export function ExamShell({ children }: { children: ReactNode }) {
  const exam = useExamStore((s) => s.exam);
  const stationIndex = useExamStore((s) => s.stationIndex);
  const saveStatus = useExamStore((s) => s.saveStatus);
  const lastSavedAt = useExamStore((s) => s.lastSavedAt);
  const tabSwitchCount = useExamStore((s) => s.tabSwitchCount);
  const phase = useExamStore((s) => s.phase);
  const timer = useExamTimer();

  const showChrome = phase === "active";

  return (
    <main className="flex-1 px-4 py-6">
      <div className="mx-auto w-full max-w-5xl">
        {showChrome && exam && (
          <header className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            {/* Progress dots */}
            <div className="flex items-center gap-2">
              {exam.stations.map((s, i) => (
                <div
                  key={s.id}
                  className={`h-2.5 w-8 rounded-full transition-colors ${
                    i < stationIndex
                      ? "bg-emerald-400"
                      : i === stationIndex
                      ? "bg-amber-500"
                      : "bg-slate-200"
                  }`}
                  title={s.title}
                />
              ))}
              <span className="ml-2 text-xs font-medium text-slate-500">
                Station {stationIndex + 1} of {exam.stations.length}
              </span>
            </div>

            {/* Global timer */}
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 font-mono text-sm font-semibold tabular-nums ${
                timer.remainingMs < 60_000
                  ? "bg-rose-50 text-rose-700"
                  : timer.remainingMs < 5 * 60_000
                  ? "bg-amber-50 text-amber-700"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              <span aria-hidden>⏱</span>
              {timer.mmss}
            </div>
          </header>
        )}

        {children}

        {showChrome && (
          <footer className="mt-6 flex items-center justify-between text-xs text-slate-400">
            <span>
              {saveStatus === "saving"
                ? "Saving…"
                : saveStatus === "saved"
                ? lastSavedAt
                  ? `Saved ${new Date(lastSavedAt).toLocaleTimeString()}`
                  : "Saved"
                : saveStatus === "error"
                ? "Save failed — your last answers may not be stored"
                : "Auto-save on"}
            </span>
            <span className={tabSwitchCount > 0 ? "text-amber-600" : ""}>
              {tabSwitchCount > 0
                ? `Tab switches detected: ${tabSwitchCount}`
                : "Stay on this tab"}
            </span>
          </footer>
        )}
      </div>
    </main>
  );
}
