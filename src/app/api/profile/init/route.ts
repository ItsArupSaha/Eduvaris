/**
 * POST /api/profile/init
 *
 * Server-side, idempotent profile creation. Called by the client right after
 * login. This is the REAL fix for the "profile doc missing at signup" disease
 * — it doesn't depend on Firestore rules (admin SDK bypasses them) so a
 * profile doc is guaranteed to exist for every authenticated user.
 *
 * Idempotent: if the doc exists, returns it as-is (no overwrite). If missing,
 * creates it with default credits (all zero) + serverTimestamp.
 *
 * This is the only place profiles are created from now on — the client-side
 * getOrCreateUserDoc() becomes a thin caller of this endpoint.
 */
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/auth/admin-guard";
import { MODULE_KEYS } from "@/lib/firebase/user-types";
import type { UserProfile } from "@/lib/firebase/user-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const uid = auth.decoded!.uid;

  const db = adminDb();
  const ref = db.doc(`users/${uid}`);
  const snap = await ref.get();

  // Exists → return as-is. Idempotent.
  if (snap.exists) {
    const data = snap.data() as UserProfile;
    return NextResponse.json({ profile: { ...data, uid }, created: false });
  }

  // Missing → create. Admin SDK bypasses rules, so this always succeeds.
  // Pull display info from the Auth record (more reliable than client-passed
  // values, which the client could lie about).
  let email = "";
  let displayName = "";
  let photoURL = "";
  try {
    const userRecord = await adminAuth().getUser(uid);
    email = userRecord.email ?? "";
    displayName = userRecord.displayName ?? "";
    photoURL = userRecord.photoURL ?? "";
  } catch {
    // Auth user somehow gone (deleted mid-flight) — create with blanks.
    // The doc existing is what matters; admin can patch display fields later.
  }

  const credits = MODULE_KEYS.reduce(
    (acc, k) => {
      acc[k] = 0;
      return acc;
    },
    {} as Record<(typeof MODULE_KEYS)[number], number>
  );

  await ref.set({
    uid,
    email,
    displayName,
    photoURL,
    createdAt: FieldValue.serverTimestamp(),
    lastActiveAt: FieldValue.serverTimestamp(),
    freeDemoUsed: false,
    demoModule: null,
    credits,
    inProgressAttemptIds: [],
    completedAttemptCount: 0,
  });

  // Re-read so the client gets resolved Timestamps (serverTimestamp() is
  // sentinel on write, resolves to a real Timestamp only after commit).
  const fresh = await ref.get();
  const data = fresh.data() as UserProfile;
  return NextResponse.json({ profile: { ...data, uid }, created: true });
}
