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
        // Retry the server-side profile init a few times — a transient network
        // blip shouldn't leave a logged-in user without a profile doc (which
        // would later break credit grants).
        let lastErr: unknown = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            const profile = await getOrCreateUserDoc({
              uid: fbUser.uid,
              email: fbUser.email ?? "",
              displayName: fbUser.displayName ?? "",
              photoURL: fbUser.photoURL ?? "",
            });
            setProfile(profile);
            lastErr = null;
            break;
          } catch (err) {
            lastErr = err;
            // Exponential-ish backoff: 500ms, 1s, then give up.
            if (attempt < 2) await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
          }
        }
        if (lastErr) {
          setError(
            lastErr instanceof Error
              ? lastErr.message
              : "Failed to load user profile."
          );
        }
      }
      setLoading(false);
    });

    return () => unsub();
  }, [setUser, setProfile, setLoading, setError]);

  return <>{children}</>;
}
