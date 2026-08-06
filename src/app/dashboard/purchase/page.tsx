"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { doc, onSnapshot } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase/client";
import { useAuthStore } from "@/store/auth-store";
import { createPaymentRequest } from "@/lib/firebase/auth-token";
import {
  MODULE_BUNDLE,
  MODULE_LABELS,
  normalizeTrxId,
  TRXID_REGEX,
} from "@/lib/firebase/payment-types";
import { MODULE_KEYS, type ModuleKey } from "@/lib/firebase/user-types";

/**
 * /dashboard/purchase — bKash manual payment flow.
 *
 * Module preselection: pass ?module=reading (etc.) to lock the flow to one
 * module and skip the picker. Dashboard "Unlock" buttons always pass this.
 * If the param is absent or invalid, the picker is shown as a fallback.
 *
 * Flow:
 *   1. Module locked (via ?module=) or picked.
 *   2. See bKash number + instructions, enter the 10-char TrxID.
 *   3. Submit → request created → live onSnapshot on that request doc.
 *   4. Resolved: approved (credit active) or rejected (reason shown, retry).
 *
 * IMPORTANT expectation-setting: manual verification, up to 30 min.
 */
export default function PurchasePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);

  // Resolve the mode ONCE from the query string:
  //   ?bundle=1 → bundle mode (all 4 modules, 185 BDT)
  //   ?module=X → single-module mode (locked to X)
  //   absent/invalid → single-module picker shown
  // useMemo with empty deps freezes it so mid-flow URL changes can't swap modes.
  const { isBundle, presetModule } = useMemo<{
    isBundle: boolean;
    presetModule: ModuleKey | null;
  }>(() => {
    if (searchParams.get("bundle") === "1") {
      return { isBundle: true, presetModule: null };
    }
    const raw = searchParams.get("module");
    if (raw && (MODULE_KEYS as string[]).includes(raw)) {
      return { isBundle: false, presetModule: raw as ModuleKey };
    }
    return { isBundle: false, presetModule: null };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // `mode` is fixed for the page's lifetime: "bundle" or the single module
  // (preset or picked). For bundles there's no picker — all 4 are included.
  const [module, setModule] = useState<ModuleKey | null>(presetModule);
  const [trxId, setTrxId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Live request being watched after submission.
  const [watchingId, setWatchingId] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<
    "pending" | "approved" | "rejected" | null
  >(null);
  const [rejectReason, setRejectReason] = useState<string | null>(null);

  const bKashNumber = process.env.NEXT_PUBLIC_BKASH_NUMBER ?? "";
  // Display price: server is the source of truth on the doc; this is just the
  // number we render to the student.
  const price = isBundle ? 185 : 50;
  const normalized = normalizeTrxId(trxId);
  const trxValid = TRXID_REGEX.test(normalized);

  // Live-subscribe to the created request so the UI flips the moment an admin
  // approves/rejects. This is the reactive notification mechanism.
  useEffect(() => {
    if (!watchingId) return;
    const unsub = onSnapshot(
      doc(firebaseDb(), "paymentRequests", watchingId),
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as {
          status: "pending" | "approved" | "rejected";
          rejectReason?: string | null;
        };
        setLiveStatus(data.status);
        setRejectReason(data.rejectReason ?? null);
      },
      () => {}
    );
    return () => unsub();
  }, [watchingId]);

  async function handleSubmit() {
    // Bundle needs only a valid TrxID. Single needs a module too.
    if (!isBundle && !module) return;
    if (!trxValid) return;
    setSubmitting(true);
    setError(null);
    try {
      const { requestId } = isBundle
        ? await createPaymentRequest({ bundle: true, trxId: normalized })
        : await createPaymentRequest({
            module: module as string,
            trxId: normalized,
          });
      setWatchingId(requestId);
      setLiveStatus("pending");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setWatchingId(null);
    setLiveStatus(null);
    setRejectReason(null);
    setTrxId("");
    setModule(null);
  }

  const creditBalance = useMemo(() => {
    const c = profile?.credits;
    return module && c ? c[module] ?? 0 : 0;
  }, [profile, module]);

  // ---- Resolved (approved) ----
  if (liveStatus === "approved") {
    if (isBundle) {
      return (
        <SuccessShell
          title="Bundle payment verified"
          subtitle="All four modules unlocked. +1 attempt on each."
          onPrimary={() => router.push("/dashboard")}
          primaryLabel="Back to dashboard"
        >
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            {MODULE_BUNDLE.map((m) => (
              <span
                key={m}
                className="rounded-lg bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700"
              >
                {MODULE_LABELS[m]}: {profile?.credits?.[m] ?? 0} attempt(s)
              </span>
            ))}
          </div>
        </SuccessShell>
      );
    }
    if (!module) return null;
    return (
      <SuccessShell
        title="Payment verified"
        subtitle={`${MODULE_LABELS[module]} module unlocked. You now have ${
          profile?.credits?.[module] ?? 0
        } attempt(s) available.`}
        onPrimary={() => router.push("/dashboard")}
        primaryLabel="Back to dashboard"
      >
        <p className="text-xs text-slate-500">
          The diagnostic engine will consume one credit when you start the exam.
          Pay again to retake.
        </p>
      </SuccessShell>
    );
  }

  // ---- Resolved (rejected) ----
  if (liveStatus === "rejected") {
    return (
      <SuccessShell
        title="Payment not verified"
        subtitle={rejectReason ?? "We couldn't verify this transaction."}
        onPrimary={reset}
        primaryLabel="Submit another TrxID"
        tone="error"
      >
        <p className="text-xs text-slate-500">
          Double-check the TrxID in your bKash app and try again. If you believe
          this is an error, contact support with your TrxID.
        </p>
      </SuccessShell>
    );
  }

  // ---- Pending (waiting for admin) ----
  if (liveStatus === "pending") {
    return (
      <Shell>
        <div className="text-center">
          <div className="mx-auto mb-6 h-12 w-12 animate-spin rounded-full border-4 border-amber-200 border-t-amber-600" />
          <h1 className="text-xl font-bold text-slate-900">
            Waiting for verification
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Your TrxID{" "}
            <span className="font-mono font-semibold text-slate-900">
              {normalized}
            </span>{" "}
            {isBundle ? (
              <>
                for the{" "}
                <span className="font-semibold text-slate-900">
                  all-modules bundle
                </span>{" "}
                is in the queue.
              </>
            ) : (
              <>
                for the{" "}
                <span className="font-semibold text-slate-900">
                  {module ? MODULE_LABELS[module] : ""}
                </span>{" "}
                module is in the queue.
              </>
            )}
          </p>
          <p className="mt-4 text-xs text-slate-500 max-w-md mx-auto">
            Payments are verified manually by our team. It may take up to
            30 minutes to receive your credit. This page will update
            automatically — you can leave it open or come back later.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700">
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
            Request ID: <span className="font-mono">{watchingId}</span>
          </div>
          <div className="mt-6">
            <Link
              href="/dashboard"
              className="text-sm text-slate-500 underline underline-offset-2 hover:text-slate-700"
            >
              ← Back to dashboard
            </Link>
          </div>
        </div>
      </Shell>
    );
  }

  // ---- Default: (bundle | module picker | module locked) → instructions → form ----
  return (
    <Shell>
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {isBundle
            ? "Unlock all modules"
            : presetModule
            ? `Unlock ${MODULE_LABELS[presetModule]}`
            : "Purchase a module"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isBundle
            ? `${price} BDT for one attempt at every module (save 15).`
            : `${price} BDT per attempt. One payment = one attempt at this module only.`}
        </p>
      </header>

      {/* Bundle banner: shown when ?bundle=1 locked the flow to all 4 */}
      {isBundle && (
        <div className="mt-6 rounded-xl border border-indigo-300 bg-indigo-50 px-4 py-3 text-sm">
          <span className="font-semibold text-indigo-800">
            Bundle: all four modules
          </span>
          <span className="text-indigo-700">
            {" "}— this payment unlocks Reading, Listening, Writing, and Speaking
            (one attempt each).
          </span>
        </div>
      )}

      {/* Step 1: module picker — ONLY for single-module mode with no preset */}
      {!isBundle && !presetModule && (
        <Section step={1} title="Choose a module" done={!!module}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {MODULE_KEYS.map((m) => {
              const active = module === m;
              const have = profile?.credits?.[m] ?? 0;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setModule(m)}
                  className={`rounded-xl border p-4 text-left transition-colors ${
                    active
                      ? "border-amber-500 bg-amber-50 ring-2 ring-amber-200"
                      : "border-slate-200 bg-white hover:border-amber-300"
                  }`}
                >
                  <div className="text-sm font-semibold text-slate-900">
                    {MODULE_LABELS[m]}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {have > 0
                      ? `${have} attempt${have > 1 ? "s" : ""} owned`
                      : "0 attempts"}
                  </div>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {/* Module-locked banner: shown when ?module= locked the flow (single) */}
      {!isBundle && presetModule && (
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm">
          <span className="font-semibold text-amber-800">
            Module: {MODULE_LABELS[presetModule]}
          </span>
          <span className="text-amber-700">
            {" "}— this payment unlocks {MODULE_LABELS[presetModule]} only.
          </span>
        </div>
      )}

      {/* Step 2: bKash instructions. For bundles there's no module to pick —
          instructions show immediately. For singles, after a module is set. */}
      {(isBundle || module) && (
        <Section step={isBundle ? 1 : presetModule ? 1 : 2} title={`Send ${price} BDT via bKash`}>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Send Money to
            </p>
            <div className="mt-1 flex items-center gap-3">
              <span className="text-2xl font-bold tracking-wider text-pink-600">
                {bKashNumber || "— set NEXT_PUBLIC_BKASH_NUMBER —"}
              </span>
              {bKashNumber && (
                <CopyButton value={bKashNumber} />
              )}
            </div>
            <ol className="mt-4 space-y-1.5 text-sm text-slate-600">
              <li>
                1. Open bKash → <span className="font-medium">Send Money</span>.
              </li>
              <li>
                2. Enter the number above, amount{" "}
                <span className="font-medium">{price} BDT</span>.
              </li>
              <li>3. Confirm and copy the 10-character TrxID.</li>
            </ol>
            {!isBundle && creditBalance > 0 && (
              <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                You already own {creditBalance} attempt
                {creditBalance > 1 ? "s" : ""} for this module. You can start
                without paying again from the dashboard.
              </p>
            )}
          </div>
        </Section>
      )}

      {/* Step 3 (or 2): TrxID entry */}
      {(isBundle || module) && (
        <Section step={isBundle ? 2 : presetModule ? 2 : 3} title="Enter your bKash TrxID">
          <label className="block">
            <span className="text-xs font-medium text-slate-500">
              Transaction ID (10 characters)
            </span>
            <input
              value={trxId}
              onChange={(e) => setTrxId(e.target.value)}
              placeholder="e.g. 8N9K2P4X7Q"
              maxLength={10}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              className="mt-1 w-full rounded-xl border border-slate-300 px-4 py-3 font-mono uppercase tracking-wider text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
            <span className="mt-1 block text-xs text-slate-400">
              {trxId && !trxValid
                ? "TrxID must be 10 uppercase letters/numbers."
                : "Find it in your bKash app under the transaction details."}
            </span>
          </label>

          {error && (
            <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!trxValid || submitting}
            className="mt-4 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Submitting…" : `Submit for verification`}
          </button>

          <p className="mt-3 text-center text-xs text-slate-500">
            Payments are verified manually by our team. It may take up to
            30 minutes to receive your credit.
          </p>
        </Section>
      )}

      <div className="mt-8">
        <Link
          href="/dashboard"
          className="text-xs text-slate-500 underline underline-offset-2 hover:text-slate-700"
        >
          ← Back to dashboard
        </Link>
      </div>
    </Shell>
  );
}

/* -------------------------------- UI bits -------------------------------- */

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex-1 px-4 py-10">
      <div className="mx-auto w-full max-w-xl">{children}</div>
    </main>
  );
}

function Section({
  step,
  title,
  done,
  children,
}: {
  step: number;
  title: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
            done
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-700"
          }`}
        >
          {done ? "✓" : step}
        </span>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* clipboard may be blocked; ignore */
        }
      }}
      className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

function SuccessShell({
  title,
  subtitle,
  onPrimary,
  primaryLabel,
  tone = "ok",
  children,
}: {
  title: string;
  subtitle: string;
  onPrimary: () => void;
  primaryLabel: string;
  tone?: "ok" | "error";
  children?: React.ReactNode;
}) {
  return (
    <Shell>
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div
          className={`mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full ${
            tone === "ok" ? "bg-emerald-100" : "bg-red-100"
          }`}
        >
          <span className="text-xl">
            {tone === "ok" ? "✓" : "!"}
          </span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">{title}</h1>
        <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        {children}
        <button
          type="button"
          onClick={onPrimary}
          className="mt-6 w-full rounded-xl bg-amber-500 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-600"
        >
          {primaryLabel}
        </button>
      </div>
    </Shell>
  );
}
