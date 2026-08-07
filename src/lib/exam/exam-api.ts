/**
 * Client-side helpers for the test-attempt Route Handlers.
 *
 * Mirrors the auth-token.ts pattern: every call attaches a fresh Firebase ID
 * token as a Bearer header. The beacon path is the exception — sendBeacon
 * cannot set headers, so it carries the token in-body and hits /beacon.
 */
import { firebaseAuth } from "@/lib/firebase/client";
import type {
  AnswersMap,
  AttemptStatus,
  Grade,
} from "./attempt-types";
import type { DiagnosticReport } from "@/lib/ai/diagnostic-schema";

/** Diagnostic pipeline status (see TestAttempt.diagnosticStatus). */
export type DiagnosticStatus = "pending" | "ready" | "error";

async function getIdToken(): Promise<string> {
  const user = firebaseAuth().currentUser;
  if (!user) throw new Error("Not authenticated.");
  return user.getIdToken(false);
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = await getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (data as { error?: string }).error ?? `Request failed (${res.status}).`;
    throw new Error(message);
  }
  return data as T;
}

/* --------------------------------- start --------------------------------- */

export interface StartAttemptResponse {
  attemptId: string;
  resumed: boolean;
  expiresAt: number; // epoch ms
}

export function startAttempt(
  module: "reading" | "listening" | "writing" | "speaking"
): Promise<StartAttemptResponse> {
  return apiFetch<StartAttemptResponse>("/api/test-attempts/start", {
    method: "POST",
    body: JSON.stringify({ module }),
  });
}

/** Back-compat alias. */
export function startReadingAttempt(): Promise<StartAttemptResponse> {
  return startAttempt("reading");
}

/* -------------------------------- hydrate -------------------------------- */

export interface HydratedAttempt {
  id: string;
  uid: string;
  module: string;
  status: AttemptStatus;
  examId: string;
  examVersion: number;
  stationIndex: number;
  answers: AnswersMap;
  tabSwitchCount: number;
  expiresAtMs: number | null;
  grade: Grade | null;
  // Deep Diagnostic pipeline fields (absent when OPENAI_API_KEY is unset).
  diagnosticStatus?: DiagnosticStatus;
  diagnosticReport?: DiagnosticReport | null;
  diagnosticError?: string;
}

export function hydrateAttempt(id: string): Promise<{ attempt: HydratedAttempt }> {
  return apiFetch<{ attempt: HydratedAttempt }>(`/api/test-attempts/${id}`);
}

/* --------------------------------- save ---------------------------------- */

export interface SavePatch {
  stationIndex?: number;
  answers?: AnswersMap;
  tabSwitchCount?: number;
}

export function saveAttempt(id: string, patch: SavePatch): Promise<{ savedAt: number }> {
  return apiFetch<{ savedAt: number }>(`/api/test-attempts/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  });
}

/* -------------------------------- submit --------------------------------- */

export interface SubmitResponse {
  attemptId: string;
  status: AttemptStatus;
  grade: Grade | null;
  reason: string;
  alreadyFinalized?: boolean;
  /** Present ("pending") when the diagnostic pipeline was scheduled. */
  diagnosticStatus?: DiagnosticStatus;
}

export function submitAttempt(
  id: string,
  reason: "user-submit" | "timer-expired" | "revisit-expired" = "user-submit"
): Promise<SubmitResponse> {
  return apiFetch<SubmitResponse>(`/api/test-attempts/${id}/submit`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}

/* --------------------------------- beacon -------------------------------- */

/**
 * Fire-and-forget save on page unload. sendBeacon cannot set headers, so the
 * token travels in-body. Returns true if the browser queued the beacon — not
 * whether it landed (that's unknowable).
 */
export async function beaconSave(
  id: string,
  patch: SavePatch
): Promise<boolean> {
  const token = await getIdToken();
  const payload = JSON.stringify({ idToken: token, ...patch });
  // sendBeacon is not available in some older browsers / SSR — guard it.
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") {
    // Fall back to fetch-with-keepalive; if that's also unavailable, give up.
    try {
      await fetch(`/api/test-attempts/${id}/beacon`, {
        method: "POST",
        body: payload,
        headers: { "Content-Type": "application/json" },
        keepalive: true,
      });
      return true;
    } catch {
      return false;
    }
  }
  return navigator.sendBeacon(
    `/api/test-attempts/${id}/beacon`,
    payload
  );
}
