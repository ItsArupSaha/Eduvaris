"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { startAttempt } from "@/lib/exam/exam-api";

/**
 * Start (or resume) an attempt for a module and route to the exam page.
 *
 * The route handler is resume-first and atomic — clicking this repeatedly,
 * refreshing, or re-entering the dashboard never consumes a second credit.
 * It always returns the single in-progress attempt id, fresh or resumed.
 *
 * Exposes `loading` + `error` so the caller can render a button state.
 */
export function useStartExam(moduleKey: "reading" | "listening") {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const start = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { attemptId } = await startAttempt(moduleKey);
      router.push(`/dashboard/exam/${attemptId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start.";
      setError(message);
      setLoading(false);
    }
  }, [router, moduleKey]);

  return { start, loading, error, clearError: () => setError(null) };
}
