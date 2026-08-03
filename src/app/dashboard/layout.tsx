"use client";

import { useRequireAuth } from "@/hooks/useRequireAuth";

/**
 * Dashboard layout — applies the soft client route guard.
 * Real dashboard UI (credits, modules, disclaimer) is Task 4.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { ready } = useRequireAuth();

  if (!ready) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading…</div>
      </div>
    );
  }

  return <>{children}</>;
}
