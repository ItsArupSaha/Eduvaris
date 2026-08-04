"use client";

import { useEffect, useRef } from "react";
import { useExamStore } from "@/store/exam-store";
import { beaconSave, saveAttempt } from "@/lib/exam/exam-api";

/**
 * Debounced auto-save of the engine's forward-progress fields, plus a
 * best-effort beacon on page unload.
 *
 * Triggers an immediate save (skipping the debounce) on:
 *   - tab visibility hidden (mobile refresh / tab switch survival)
 *   - tab switch registered (the dirty flag flips; we want it on the wire)
 *   - station advance (so a refresh mid-transition lands you on the new one)
 *
 * The beacon endpoint fires on `beforeunload`/`pagehide`. It carries the token
 * in-body (sendBeacon can't set headers) and is a no-op on finalized attempts.
 *
 * This hook is a no-op unless the engine is `active`. Saves are skipped while
 * a save is already in flight; the next dirty mutation re-arms the timer.
 */
export function useAutosave(): void {
  const phase = useExamStore((s) => s.phase);
  const attemptId = useExamStore((s) => s.attemptId);
  const dirty = useExamStore((s) => s.dirty);
  const tabSwitchCount = useExamStore((s) => s.tabSwitchCount);
  const stationIndex = useExamStore((s) => s.stationIndex);
  const answers = useExamStore((s) => s.answers);
  const markSaved = useExamStore((s) => s.markSaved);
  const setSaveStatus = useExamStore((s) => s.setSaveStatus);

  // Keep the latest values in a ref so the unload handler can read them
  // synchronously without re-binding on every keystroke. The sync happens in
  // an effect (not during render) to satisfy react-hooks rules.
  const latest = useRef({ attemptId, stationIndex, answers, tabSwitchCount });
  useEffect(() => {
    latest.current = { attemptId, stationIndex, answers, tabSwitchCount };
  }, [attemptId, stationIndex, answers, tabSwitchCount]);
  const inFlight = useRef(false);

  // Debounced save on dirty changes.
  useEffect(() => {
    if (phase !== "active" || !attemptId || !dirty) return;
    const handle = setTimeout(async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      setSaveStatus("saving");
      try {
        const snap = latest.current;
        const { savedAt } = await saveAttempt(snap.attemptId!, {
          stationIndex: snap.stationIndex,
          answers: snap.answers,
          tabSwitchCount: snap.tabSwitchCount,
        });
        markSaved(savedAt);
      } catch {
        setSaveStatus("error");
      } finally {
        inFlight.current = false;
      }
    }, 3000);
    return () => clearTimeout(handle);
  }, [phase, attemptId, dirty, tabSwitchCount, stationIndex, markSaved, setSaveStatus]);

  // Immediate save on tab hidden — best chance to survive a refresh.
  useEffect(() => {
    if (phase !== "active" || !attemptId) return;
    const onHidden = async () => {
      if (document.visibilityState !== "hidden") return;
      if (inFlight.current) return;
      inFlight.current = true;
      try {
        const snap = latest.current;
        await saveAttempt(snap.attemptId!, {
          stationIndex: snap.stationIndex,
          answers: snap.answers,
          tabSwitchCount: snap.tabSwitchCount,
        });
        markSaved(Date.now());
      } catch {
        // swallow — beacon on unload may still catch it
      } finally {
        inFlight.current = false;
      }
    };
    document.addEventListener("visibilitychange", onHidden);
    return () => document.removeEventListener("visibilitychange", onHidden);
  }, [phase, attemptId, markSaved]);

  // Best-effort beacon on unload.
  useEffect(() => {
    if (phase !== "active" || !attemptId) return;
    const onUnload = () => {
      const snap = latest.current;
      void beaconSave(snap.attemptId!, {
        stationIndex: snap.stationIndex,
        answers: snap.answers,
        tabSwitchCount: snap.tabSwitchCount,
      });
    };
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
    };
  }, [phase, attemptId]);
}
