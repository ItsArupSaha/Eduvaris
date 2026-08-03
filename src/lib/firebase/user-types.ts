/**
 * User profile schema (Firestore `users/{uid}`).
 *
 * Schema-forward: designed now to support Tasks 3–12 (credits, payments, test
 * progress) without re-schema. Task 2 only creates the doc on first login;
 * credit/payment/attempt fields are seeded with defaults so later tasks can
 * read them immediately without migration.
 */

export type ModuleKey = "reading" | "listening" | "writing" | "speaking";

export const MODULE_KEYS: ModuleKey[] = ["reading", "listening", "writing", "speaking"];

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;

  // Timestamps (Firestore Timestamp objects after read; null if not yet set).
  // Stored as serverTimestamp() on create.
  createdAt: unknown;
  lastActiveAt: unknown;

  // --- Free demo (Task 4, 12) ---
  freeDemoUsed: boolean;
  demoModule: ModuleKey | null;

  // --- Credits (Task 3, 4) — SERVER-ONLY writes enforced by security rules ---
  credits: Record<ModuleKey, number>;

  // --- Test progress (Task 5, 6, 12) ---
  inProgressAttemptIds: string[];
  completedAttemptCount: number;
}

/** Factory for a fresh user doc on first login. Client-create only. */
export function newUserProfile(uid: string, email: string, displayName: string, photoURL: string): UserProfile {
  return {
    uid,
    email,
    displayName,
    photoURL,
    createdAt: null, // will be set via serverTimestamp() in the write call
    lastActiveAt: null,
    freeDemoUsed: false,
    demoModule: null,
    credits: { reading: 0, listening: 0, writing: 0, speaking: 0 },
    inProgressAttemptIds: [],
    completedAttemptCount: 0,
  };
}
