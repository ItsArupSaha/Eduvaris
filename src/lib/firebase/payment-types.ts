/**
 * Payment domain types (Firestore `paymentRequests`, `usedTrxIds`, `credits`).
 *
 * These collections are server-write-only by security rules. The client reads
 * `paymentRequests` (its own) to show pending/resolved state, and reads its own
 * profile `credits` field for the live balance.
 */
import type { ModuleKey } from "./user-types";

export const PAYMENT_STATUSES = ["pending", "approved", "rejected"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

/** Human-readable module names for UI surfaces (purchase + admin). */
export const MODULE_LABELS: Record<ModuleKey, string> = {
  reading: "Reading",
  listening: "Listening",
  writing: "Writing",
  speaking: "Speaking",
};

/**
 * `paymentRequests/{requestId}` — a user-submitted bKash payment awaiting
 * manual admin verification. One doc per submission.
 */
export interface PaymentRequest {
  /** doc id == the Firestore auto-id assigned at creation. */
  uid: string;
  module: ModuleKey;
  /** Price in BDT, captured at request time so historical requests survive price changes. */
  amount: number;
  /** Normalized uppercase alphanumeric bKash TrxID. */
  trxId: string;
  status: PaymentStatus;
  /** Firestore Timestamp — serverTimestamp() on create. */
  createdAt: unknown;
  /** Set on review. null until approved/rejected. */
  reviewedAt: unknown;
  /** Admin uid who reviewed. null until reviewed. */
  reviewedBy: string | null;
  /** Free-text reason, only populated on rejection. */
  rejectReason: string | null;
}

/**
 * `usedTrxIds/{trxId}` — idempotency lock. Doc id is the normalized TrxID.
 * Create-only by rules: Firestore's only native unique constraint. Prevents a
 * single TrxID from granting credits twice (duplicate submission OR admin
 * double-approval race).
 */
export interface UsedTrxId {
  requestId: string;
  uid: string;
  approvedAt: unknown;
}

/**
 * `credits/{creditId}` — append-only audit ledger of every credit ever granted.
 * Owner-readable, server-writable. One doc per grant.
 */
export interface CreditLedgerEntry {
  uid: string;
  module: ModuleKey;
  /** Always +1 per manual-bkash approval. Signed for future extensibility. */
  amount: number;
  source: "manual-bkash" | "free-demo" | "adjustment";
  /** Links back to the originating payment request, if any. */
  requestId: string | null;
  grantedAt: unknown;
  grantedBy: string;
}

/** Validation rule for bKash TrxIDs: 10 chars, uppercase alphanumeric. */
export const TRXID_REGEX = /^[A-Z0-9]{10}$/;

/** Normalize a raw TrxID string to its canonical stored form. */
export function normalizeTrxId(raw: string): string {
  return raw.trim().toUpperCase();
}
