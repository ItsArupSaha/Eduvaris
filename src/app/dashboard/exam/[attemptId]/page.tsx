"use client";

import { useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { useExamStore } from "@/store/exam-store";
import { hydrateAttempt, submitAttempt } from "@/lib/exam/exam-api";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useExamTimer } from "@/hooks/useExamTimer";
import { useTabVisibility } from "@/hooks/useTabVisibility";
import { useAutosave } from "@/hooks/useAutosave";
import { ExamShell } from "@/components/exam/ExamShell";
import { IntroScreen } from "@/components/exam/IntroScreen";
import { StationRouter } from "@/components/exam/StationRouter";
import { ResultsView } from "@/components/exam/ResultsView";

/**
 * /dashboard/exam/[attemptId]
 *
 * Resume-friendly, URL-driven. On mount: hydrate the attempt from the server,
 * then render one of four views by engine phase:
 *
 *   loading    → spinner
 *   ready      → intro screen (per-station instructions + 3-2-1 countdown)
 *   active     → the current station + global timer + autosave
 *   submitting → spinner + "grading"
 *   completed  → results
 *
 * If the hydrate reveals the attempt is already finalized (completed/expired),
 * we drop straight into results — no way back into the exam.
 *
 * If the hydrate reveals the deadline already passed but the doc is still
 * in-progress (user closed the tab mid-exam and came back after time ran
 * out), we submit immediately as "revisit-expired". This is the safety net
 * beneath the timer.
 */
export default function ExamPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = use(params);
  const router = useRouter();
  const { ready: authReady } = useRequireAuth();

  const phase = useExamStore((s) => s.phase);
  const error = useExamStore((s) => s.error);
  const stationIndex = useExamStore((s) => s.stationIndex);
  const introAcknowledged = useExamStore((s) => s.introAcknowledged);
  const hydrate = useExamStore((s) => s.hydrate);
  const setError = useExamStore((s) => s.setError);
  const beginSubmit = useExamStore((s) => s.beginSubmit);
  const finishSubmit = useExamStore((s) => s.finishSubmit);
  const reset = useExamStore((s) => s.reset);
  const result = useExamStore((s) => s.result);

  // ---- Hydrate once on mount. ----
  useEffect(() => {
    if (!authReady) return;
    let cancelled = false;
    (async () => {
      try {
        console.info("[exam] hydrating attempt", attemptId);
        const { attempt } = await hydrateAttempt(attemptId);
        if (cancelled) return;
        console.info("[exam] hydrated", {
          status: attempt.status,
          stationIndex: attempt.stationIndex,
          answerCount: Object.keys(attempt.answers ?? {}).length,
          expiresAtMs: attempt.expiresAtMs,
          now: Date.now(),
          hasGrade: !!attempt.grade,
        });

        // Already finalized → drop into results.
        if (attempt.status !== "in-progress") {
          console.info("[exam] attempt already finalized → results");
          finishSubmit(attempt.status, attempt.grade);
          return;
        }

        // Hydrate the engine (sets phase → "ready", stamps expiresAtMs).
        hydrate(attempt, false);
        console.info("[exam] engine hydrated → ready");

        // Resume-after-expiry safety net: server clock says time's up but the
        // doc is still in-progress. Skip the intro + station entirely, go
        // straight to submit. This runs BEFORE the user can acknowledge the
        // intro, so they never see a "start" button for an already-expired
        // attempt.
        if (attempt.expiresAtMs && Date.now() > attempt.expiresAtMs) {
          console.info("[exam] resumed after expiry → submit");
          beginSubmit();
          try {
            const res = await submitAttempt(attemptId, "revisit-expired");
            if (!cancelled) {
              console.info("[exam] revisit-expired submit done", res.status);
              finishSubmit(res.status, res.grade);
            }
          } catch (err) {
            console.error("[exam] revisit-expired submit FAILED", err);
            if (!cancelled) {
              setError(err instanceof Error ? err.message : "Submit failed.");
            }
          }
        }
      } catch (err) {
        console.error("[exam] hydrate FAILED", err);
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load attempt.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attemptId, authReady]);

  // Reset engine state on unmount (route away) so a later attempt starts clean.
  useEffect(() => {
    return () => reset();
  }, [reset]);

  // ---- Active-phase side effects: timer + anti-cheat + autosave. ----
  useTabVisibility();
  useAutosave();
  const timer = useExamTimer();

  // Ref guard so we never fire the auto-submit twice (timer.expired is a
  // one-shot from the hook, but defending here too is cheap).
  const autoSubmitFiredRef = useRef(false);

  // ---- Timer-expired auto-submit. ----
  // Reads `phase` from the store snapshot (not the dep array) so the effect
  // doesn't tear itself down when beginSubmit() flips phase → submitting.
  useEffect(() => {
    if (!timer.expired) return;
    if (autoSubmitFiredRef.current) return;
    const currentPhase = useExamStore.getState().phase;
    if (currentPhase !== "active") return;

    autoSubmitFiredRef.current = true;
    console.info("[exam] timer expired → auto-submit");
    beginSubmit();
    void submitAttempt(attemptId, "timer-expired")
      .then((res) => {
        console.info("[exam] auto-submit done", res.status);
        finishSubmit(res.status, res.grade);
      })
      .catch((err) => {
        console.error("[exam] auto-submit FAILED", err);
        setError(err instanceof Error ? err.message : "Submit failed.");
      });
  }, [timer.expired, attemptId, beginSubmit, finishSubmit, setError]);

  // ---- Render by phase. ----
  if (!authReady || phase === "loading") {
    return (
      <ExamShell>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          <p className="mt-4 text-sm text-slate-500">Loading your exam…</p>
        </div>
      </ExamShell>
    );
  }

  if (error && phase === "error") {
    return (
      <ExamShell>
        <div className="mx-auto max-w-md py-20 text-center">
          <h1 className="text-lg font-bold text-slate-900">Something went wrong</h1>
          <p className="mt-2 text-sm text-slate-600">{error}</p>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="mt-6 rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-600"
          >
            Back to dashboard
          </button>
        </div>
      </ExamShell>
    );
  }

  if (phase === "submitting") {
    return (
      <ExamShell>
        <div className="flex flex-col items-center justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          <p className="mt-4 text-sm font-medium text-slate-700">Grading your answers…</p>
        </div>
      </ExamShell>
    );
  }

  if (phase === "completed") {
    return (
      <ResultsView
        result={result}
        onDone={() => router.push("/dashboard")}
      />
    );
  }

  // ready OR active. The intro screen handles its own countdown and calls
  // acknowledgeIntro() to transition into the live station.
  if (phase === "ready" || (phase === "active" && !introAcknowledged)) {
    return <IntroScreen stationIndex={stationIndex} />;
  }

  // phase === "active" && introAcknowledged — the live station.
  return (
    <ExamShell>
      <StationRouter stationIndex={stationIndex} timer={timer} />
    </ExamShell>
  );
}
