"use client";

import { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import { useAuthStore } from "@/store/auth-store";
import type { UserProfile } from "@/lib/firebase/user-types";

/**
 * Live-subscribes to the signed-in user's profile doc.
 *
 * Used in the dashboard so that when an admin approves a payment and the
 * `credits[module]` field is incremented server-side, the UI updates
 * reactively — no refresh, no polling. Also keeps the Zustand profile fresh.
 *
 * Call once near the top of the authenticated area (e.g. dashboard layout).
 * Safe to call when logged out (no-op).
 */
export function useUserCredits(): void {
  const user = useAuthStore((s) => s.user);
  const setProfile = useAuthStore((s) => s.setProfile);
  const profile = useAuthStore((s) => s.profile);

  useEffect(() => {
    if (!user) return;
    const ref = doc(firebaseDb(), "users", user.uid);

    // onSnapshot keeps the client profile in sync with server writes that
    // bypass client rules (admin credit grants via firebase-admin).
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setProfile({ ...(snap.data() as UserProfile), uid: user.uid });
        }
      },
      // Swallow permission errors during sign-out transitions.
      () => {}
    );

    return () => unsub();
  }, [user, setProfile]);

  // expose nothing — callers read profile.credits from the store directly.
  // `profile` is referenced here only to silence unused-var lint in callers
  // that might import this hook purely for its side-effect.
  void profile;
}
