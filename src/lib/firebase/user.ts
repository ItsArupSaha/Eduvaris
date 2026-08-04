/**
 * getOrCreateUserDoc — idempotent first-login profile creation.
 *
 * Reads `users/{uid}`. If it doesn't exist, client-creates it with defaults
 * + serverTimestamp(). If it exists, returns it and bumps lastActiveAt.
 *
 * Security rule enforces: create-only-once-per-uid, default credits locked,
 * timestamp required. This function stays idempotent so re-logins never fail.
 */
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore";
import { firebaseDb } from "./client";
import { newUserProfile, type UserProfile } from "./user-types";

export async function getOrCreateUserDoc(args: {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}): Promise<UserProfile> {
  const db = firebaseDb();
  const ref = doc(db, "users", args.uid);

  const existing = await getDoc(ref);
  if (existing.exists()) {
    // Bump lastActiveAt. Allowed by rules because it's not a credit field —
    // but our Task 2 rules lock all updates. So we update lastActiveAt only
    // via a Cloud Function later; here we just return the doc as-is.
    return { ...(existing.data() as UserProfile), uid: args.uid };
  }

  // First login → create with defaults.
  const profile = newUserProfile(args.uid, args.email, args.displayName, args.photoURL);
  await setDoc(ref, {
    ...profile,
    createdAt: serverTimestamp(),
    lastActiveAt: serverTimestamp(),
  });

  // Re-read so we return the resolved Timestamps.
  const fresh = await getDoc(ref);
  return { ...(fresh.data() as UserProfile), uid: args.uid };
}
