"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useUserCredits } from "@/hooks/useUserCredits";

/**
 * Dashboard layout — applies the soft client route guard and starts the live
 * profile/credits subscription so admin-approved payments reflect here without
 * a page refresh.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useRequireAuth();
  // Live profile subscription — keeps credits reactive after admin approval.
  useUserCredits();

  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}
