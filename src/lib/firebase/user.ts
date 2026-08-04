/**
 * getOrCreateUserDoc — idempotent profile fetch/create via the server.
 *
 * Calls POST /api/profile/init, which uses the admin SDK to read-or-create the
 * `users/{uid}` doc. This is the REAL fix for missing profiles: it doesn't
 * depend on Firestore rules (the admin SDK bypasses them), so every
 * authenticated user is guaranteed a profile doc.
 *
 * The previous client-side setDoc() path was fragile — it depended on rules
 * allowing the write and on the client network both working, with no retry. A
 * transient failure there left an Auth user browsing with no profile doc,
 * which later broke credit grants. Server-side init eliminates that gap.
 *
 * Authentication: the caller must be signed in (firebaseAuth().currentUser),
 * because this endpoint verifies the Bearer ID token server-side.
 */
import { firebaseAuth } from "./client";
import type { UserProfile } from "./user-types";

export async function getOrCreateUserDoc(args: {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}): Promise<UserProfile> {
  // Get a fresh ID token to attach as Bearer. forceRefresh=false uses cache.
  const user = firebaseAuth().currentUser;
  if (!user) {
    throw new Error("Cannot init profile: not signed in.");
  }
  const idToken = await user.getIdToken(false);

  const res = await fetch("/api/profile/init", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const msg =
      (body as { error?: string }).error ??
      `Profile init failed (${res.status}).`;
    throw new Error(msg);
  }

  const data = (await res.json()) as { profile: UserProfile };
  // Server may have used the Auth record's email/name instead of the client's
  // copy — trust the server values.
  void args;
  return data.profile;
}
