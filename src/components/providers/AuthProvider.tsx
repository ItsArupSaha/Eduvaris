"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { onAuthStateChanged, type User as FbUser } from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase/client";
import { getOrCreateUserDoc } from "@/lib/firebase/user";
import { useAuthStore, type AuthUser } from "@/store/auth-store";

/**
 * AuthProvider — wires Firebase onAuthStateChanged into the Zustand auth store.
 *
 * On login: sets `user`, then fetches-or-creates the Firestore profile and
 * sets `profile`. On logout: clears both. `loading` stays true until the first
 * callback fires (avoids redirect flicker on reload).
 *
 * Idempotent profile creation: uids already in Firestore are read, not recreated.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const setUser = useAuthStore((s) => s.setUser);
  const setProfile = useAuthStore((s) => s.setProfile);
  const setLoading = useAuthStore((s) => s.setLoading);
  const setError = useAuthStore((s) => s.setError);
  const inFlightFor = useRef<string | null>(null); // dedupe profile fetches

  useEffect(() => {
    const unsub = onAuthStateChanged(firebaseAuth(), async (fbUser: FbUser | null) => {
      if (!fbUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        inFlightFor.current = null;
        return;
      }

      const authUser: AuthUser = {
        uid: fbUser.uid,
        email: fbUser.email,
        displayName: fbUser.displayName,
        photoURL: fbUser.photoURL,
      };
      setUser(authUser);

      // Dedupe: strict mode + re-render could fire this twice for the same uid.
      if (inFlightFor.current !== fbUser.uid) {
        inFlightFor.current = fbUser.uid;
        try {
          const profile = await getOrCreateUserDoc({
            uid: fbUser.uid,
            email: fbUser.email ?? "",
            displayName: fbUser.displayName ?? "",
            photoURL: fbUser.photoURL ?? "",
          });
          setProfile(profile);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Failed to load user profile.");
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [setUser, setProfile, setLoading, setError]);

  return <>{children}</>;
}
