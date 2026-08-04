/**
 * Client-side helpers for talking to the payment Route Handlers.
 *
 * Every call attaches the current Firebase user's ID token as a Bearer header.
 * Tokens are short-lived, so we fetch a fresh one per request via getIdToken
 * (Firebase caches + auto-refreshes internally).
 */
import { firebaseAuth } from "./client";

async function getIdToken(): Promise<string> {
  const user = firebaseAuth().currentUser;
  if (!user) throw new Error("Not authenticated.");
  // forceRefresh=false → uses cached token unless it's within the refresh window.
  return user.getIdToken(false);
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
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

export interface CreatePaymentResponse {
  requestId: string;
  status: "pending";
}

export interface MyPaymentRequest {
  id: string;
  uid: string;
  module: string;
  amount: number;
  trxId: string;
  status: "pending" | "approved" | "rejected";
  createdAt: unknown;
  reviewedAt: unknown;
  reviewedBy: string | null;
  rejectReason: string | null;
}

/** POST /api/payment-requests */
export function createPaymentRequest(args: {
  module: string;
  trxId: string;
}): Promise<CreatePaymentResponse> {
  return apiFetch<CreatePaymentResponse>("/api/payment-requests", {
    method: "POST",
    body: JSON.stringify(args),
  });
}

/** GET /api/payment-requests (caller's own) */
export function listMyPaymentRequests(): Promise<{ items: MyPaymentRequest[] }> {
  return apiFetch<{ items: MyPaymentRequest[] }>("/api/payment-requests");
}

/** GET /api/admin/payment-requests?status= */
export function adminListQueue(status: string): Promise<{
  items: MyPaymentRequest[];
}> {
  return apiFetch<{ items: MyPaymentRequest[] }>(
    `/api/admin/payment-requests?status=${encodeURIComponent(status)}`
  );
}

/** POST /api/admin/payment-requests/[id]/approve */
export function adminApprove(id: string): Promise<{ id: string; status: string }> {
  return apiFetch(`/api/admin/payment-requests/${id}/approve`, { method: "POST" });
}

/** POST /api/admin/payment-requests/[id]/reject */
export function adminReject(
  id: string,
  reason: string
): Promise<{ id: string; status: string }> {
  return apiFetch(`/api/admin/payment-requests/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
  });
}
