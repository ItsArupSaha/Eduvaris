"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Standalone one-shot countdown. Counts down `seconds` → 0, fires `onElapsed`
 * once. The parent MUST remount it (via `key`) when it should restart — e.g.
 * `key={questionId}`. This is React's recommended pattern for "reset state
 * when something changes", cleaner than effect-driven resets.
 *
 * Used by the Writing Paraphrase station (per-question 2-min budget) and the
 * Speaking stations (analysis / prep / speak phases). Pure local state — the
 * engine store doesn't need to know about these sub-timers; only the global
 * 25-/15-min exam timer is shared.
 *
 * Urgent styling kicks in at <= 5s to raise pressure honestly.
 */
export function Countdown({
  seconds,
  onElapsed,
  paused = false,
}: {
  seconds: number;
  onElapsed: () => void;
  /** Pause the ticker without resetting the remaining time. */
  paused?: boolean;
}) {
  const [remaining, setRemaining] = useState(seconds);
  // firedRef is only touched inside the interval callback (not during render),
  // so it doesn't trip the react-hooks/refs rule.
  const firedRef = useRef(false);

  useEffect(() => {
    if (paused) return;
    const handle = setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          if (!firedRef.current) {
            firedRef.current = true;
            setTimeout(onElapsed, 0);
          }
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(handle);
  }, [onElapsed, paused]);

  const urgent = remaining <= 5 && remaining > 0;
  const mm = Math.floor(remaining / 60);
  const ss = remaining % 60;
  const display =
    mm > 0 ? `${mm}:${String(ss).padStart(2, "0")}` : `${remaining}s`;

  return (
    <span
      className={`flex-none rounded-full px-2.5 py-0.5 font-mono text-xs font-bold tabular-nums ${
        urgent
          ? "bg-rose-100 text-rose-700 animate-pulse"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      {display}
    </span>
  );
}
