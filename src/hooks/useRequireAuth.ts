"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

/**
 * Soft client-side route guard.
 *
 * Redirects unauthenticated users to /login once auth state resolves.
 * `loading=true` suppresses the redirect so a logged-in user reloading the
 * page isn't bounced while Firebase rehydrates the session.
 *
 * NOTE (Task 2 scope): this is a CLIENT guard only — Firebase session cookies
 * are exchanged server-side in Task 3+ when the bKash backend needs to verify
 * identity. For now the guard prevents casual URL access, which is sufficient
 * for the auth-flow proof. Hard server enforcement lands with Task 3.
 */
export function useRequireAuth(): { ready: boolean } {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  useEffect(() => {
    if (loading) return; // still resolving Firebase session
    if (!user) router.replace("/login");
  }, [user, loading, router]);

  // "ready" = we know the user is authed (not loading, has a uid).
  return { ready: !loading && !!user };
}
