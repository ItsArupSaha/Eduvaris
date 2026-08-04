"use client";

import { useEffect, useRef, useState } from "react";
import { useExamStore } from "@/store/exam-store";

/**
 * Overall exam timer. Derives `remainingMs` from `expiresAtMs - Date.now()`
 * every second — never stores "remaining" so it's immune to drift and to the
 * tab being backgrounded (where setInterval throttles).
 *
 * Implementation note: the interval only bumps a `tick` counter to force a
 * re-render; `remainingMs` is computed DURING render from the deadline. This
 * avoids the React 19 "setState-in-effect" anti-pattern entirely — the effect
 * only syncs with an external system (the clock), it doesn't store derived
 * data.
 *
 * Returns:
 *   remainingMs — ms until expiry, floored at 0
 *   expired     — true only AFTER the deadline genuinely passed (one-shot)
 *   mmss        — "MM:SS" for display
 *
 * CRITICAL: `expiresAtMs` is 0 until hydrate resolves. We must NOT treat that
 * as "expired" — a 0 deadline means the timer isn't armed yet.
 */
export function useExamTimer() {
  const expiresAtMs = useExamStore((s) => s.expiresAtMs);
  const phase = useExamStore((s) => s.phase);
  const [, setTick] = useState(0);

  // Bump a counter every second while armed + active/submitting, to force a
  // re-render so the derived remainingMs recomputes.
  useEffect(() => {
    if (expiresAtMs <= 0) return;
    if (phase !== "active" && phase !== "submitting") return;
    const handle = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(handle);
  }, [expiresAtMs, phase]);

  // Catch up instantly on tab refocus — setInterval throttles while hidden.
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") setTick((t) => t + 1);
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // Derived during render — the source of truth.
  const remainingMs = expiresAtMs > 0 ? Math.max(0, expiresAtMs - Date.now()) : 0;

  // `expired` is true ONLY when a real deadline has passed. expiresAtMs <= 0
  // means "not armed" (pre-hydrate) → never expired. Fired once.
  const nowExpired = expiresAtMs > 0 && remainingMs <= 0;
  const firedExpiredRef = useRef(false);
  const expired = nowExpired && !firedExpiredRef.current;
  if (nowExpired) firedExpiredRef.current = true;

  const totalSec = Math.ceil(remainingMs / 1000);
  const mm = String(Math.floor(totalSec / 60)).padStart(2, "0");
  const ss = String(totalSec % 60).padStart(2, "0");

  return { remainingMs, expired, mmss: `${mm}:${ss}` };
}

/** The shape returned by useExamTimer, for passing into components. */
export interface TimerView {
  remainingMs: number;
  expired: boolean;
  mmss: string;
}
