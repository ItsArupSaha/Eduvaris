"use client";

import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import { useAuthStore } from "@/store/auth-store";
import { MODULE_KEYS, type ModuleKey } from "@/lib/firebase/user-types";

export type ModuleRequestState = "none" | "pending" | "rejected";

export interface PendingMap {
  /** per-module current state, derived from the user's paymentRequests. */
  [module: string]: ModuleRequestState;
}

/**
 * Live-subscribes to the signed-in user's payment requests and derives, per
 * module, whether there is a PENDING request ("Waiting for approval") or a
 * recent REJECTED one (so the UI can invite a retry). `none` = nothing notable.
 *
 * Used by the dashboard to disable the "Unlock" button while a request is in
 * flight — purely a UX guard. The real anti-duplicate wall is server-side in
 * POST /api/payment-requests (409 if a pending request for the same module
 * already exists). This hook just stops the user from clicking into a dead end.
 *
 * Safe to call when logged out (returns empty map, no subscription).
 */
export function usePendingRequests(): {
  map: PendingMap;
  bundle: ModuleRequestState;
  loading: boolean;
} {
  const user = useAuthStore((s) => s.user);
  const [map, setMap] = useState<PendingMap>({});
  const [bundle, setBundle] = useState<ModuleRequestState>("none");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setMap({});
      setBundle("none");
      setLoading(false);
      return;
    }

    // Query the user's own requests. Rules allow owner read. We watch only
    // non-approved states since approved requests immediately flip credits.
    const q = query(
      collection(firebaseDb(), "paymentRequests"),
      where("uid", "==", user.uid),
      where("status", "in", ["pending", "rejected"])
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const next: PendingMap = {};
        // Seed all modules as "none".
        for (const m of MODULE_KEYS) next[m] = "none";
        let bundleState: ModuleRequestState = "none";

        // Derive per-module state. pending wins over rejected (if both exist),
        // because a pending request is the live blocker. Bundle requests are
        // tracked separately (not attributed to any single module).
        snap.forEach((d) => {
          const data = d.data() as {
            module: ModuleKey;
            isBundle?: boolean;
            status: string;
          };
          if (!data.module) return;

          // Bundle requests go to the separate bundle state.
          if (data.isBundle === true) {
            if (data.status === "pending") {
              bundleState = "pending";
            } else if (
              data.status === "rejected" &&
              bundleState !== "pending"
            ) {
              bundleState = "rejected";
            }
            return;
          }

          // Single-module requests go to their module key.
          if (data.status === "pending") {
            next[data.module] = "pending";
          } else if (
            data.status === "rejected" &&
            next[data.module] !== "pending"
          ) {
            next[data.module] = "rejected";
          }
        });
        setMap(next);
        setBundle(bundleState);
        setLoading(false);
      },
      // Swallow transient permission errors during sign-out.
      () => setLoading(false)
    );

    return () => unsub();
  }, [user]);

  return { map, bundle, loading };
}
