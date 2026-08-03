/**
 * Firebase Google Auth helpers — popup flow (desktop-first, per Task 2 decision).
 */
import { GoogleAuthProvider, signInWithPopup, signOut as fbSignOut, type User } from "firebase/auth";
import { firebaseAuth } from "./client";

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle(): Promise<User> {
  const auth = firebaseAuth();
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export async function signOut(): Promise<void> {
  const auth = firebaseAuth();
  await fbSignOut(auth);
}
