"use client";

import { useCallback, useEffect, useState } from "react";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { useAuthStore } from "@/store/auth-store";
import {
  adminApprove,
  adminListQueue,
  adminReject,
  type MyPaymentRequest,
} from "@/lib/firebase/auth-token";
import { MODULE_LABELS } from "@/lib/firebase/payment-types";

/**
 * /admin — manual bKash payment verification queue.
 *
 * Client route guard is cosmetic (keeps non-admins from seeing the layout).
 * Real enforcement is server-side: adminListQueue returns 403 for non-admin
 * uids, and the UI surfaces that as "Access denied". No admin uid list is
 * shipped to the client.
 *
 * Refresh poll every 15s (no live listener on the admin queue — admin needs to
 * see the queue state at a point in time, not chase every write).
 */
export default function AdminPage() {
  const { ready } = useRequireAuth();
  const user = useAuthStore((s) => s.user);

  const [items, setItems] = useState<MyPaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectText, setRejectText] = useState("");

  const refresh = useCallback(async () => {
    try {
      const { items } = await adminListQueue("pending");
      setItems(items);
      setForbidden(false);
      setError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load queue.";
      if (/403|forbidden/i.test(msg)) {
        setForbidden(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void refresh();
    const t = setInterval(refresh, 15000);
    return () => clearInterval(t);
  }, [ready, refresh]);

  async function handleApprove(id: string) {
    setBusyId(id);
    setError(null);
    try {
      await adminApprove(id);
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Approve failed.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleConfirmReject() {
    if (!rejectId) return;
    setBusyId(rejectId);
    setError(null);
    try {
      await adminReject(rejectId, rejectText);
      setRejectId(null);
      setRejectText("");
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reject failed.");
    } finally {
      setBusyId(null);
    }
  }

  if (!ready) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-sm text-slate-500">Loading…</div>
      </main>
    );
  }

  if (forbidden) {
    return (
      <main className="flex-1 px-4 py-16">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">Access denied</h1>
          <p className="mt-2 text-sm text-slate-500">
            Your account (<span className="font-mono">{user?.email}</span>) is
            not an administrator.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <header className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Payment verification
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {items.length} pending request{items.length === 1 ? "" : "s"}.
              Auto-refreshes every 15s.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            Refresh
          </button>
        </header>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-slate-500">Loading queue…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
            Queue is empty. No pending payments.
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((item) => (
              <li
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                        {MODULE_LABELS[item.module as keyof typeof MODULE_LABELS] ?? item.module}
                      </span>
                      <span className="text-xs text-slate-500">
                        {item.amount} BDT
                      </span>
                      <span className="text-xs text-slate-400">
                        {formatTime(item.createdAt)}
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
                      <Field label="TrxID" value={item.trxId} mono />
                      <Field label="User" value={item.uid} mono truncate />
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleApprove(item.id)}
                      disabled={busyId === item.id}
                      className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busyId === item.id ? "…" : "Approve"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectId(item.id);
                        setRejectText("");
                      }}
                      disabled={busyId === item.id}
                      className="rounded-lg border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>

                {/* Inline reject form */}
                {rejectId === item.id && (
                  <div className="mt-3 rounded-lg border border-red-100 bg-red-50/50 p-3">
                    <label className="block">
                      <span className="text-xs font-medium text-slate-600">
                        Reason (shown to user)
                      </span>
                      <input
                        value={rejectText}
                        onChange={(e) => setRejectText(e.target.value)}
                        placeholder="e.g. TrxID not found in bKash"
                        maxLength={280}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100"
                      />
                    </label>
                    <div className="mt-2 flex gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmReject}
                        className="rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        Confirm reject
                      </button>
                      <button
                        type="button"
                        onClick={() => setRejectId(null)}
                        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}

/* -------------------------------- helpers -------------------------------- */

function Field({
  label,
  value,
  mono,
  truncate,
}: {
  label: string;
  value: string;
  mono?: boolean;
  truncate?: boolean;
}) {
  return (
    <div className="min-w-0">
      <span className="text-xs text-slate-400">{label}</span>
      <p
        className={`text-slate-900 ${mono ? "font-mono text-xs" : ""} ${
          truncate ? "truncate" : ""
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function formatTime(ts: unknown): string {
  if (!ts || typeof ts !== "object") return "";
  const toMillis = (ts as { toMillis?: () => number }).toMillis;
  if (typeof toMillis !== "function") return "";
  return new Date(toMillis.call(ts)).toLocaleString();
}
