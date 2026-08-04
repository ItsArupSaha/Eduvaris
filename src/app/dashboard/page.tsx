"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut } from "@/lib/firebase/auth";
import { useAuthStore } from "@/store/auth-store";
import { MODULE_KEYS, type ModuleKey } from "@/lib/firebase/user-types";
import {
  usePendingRequests,
  type ModuleRequestState,
} from "@/hooks/usePendingRequests";
import { useStartExam } from "@/hooks/useStartExam";

/** Build the purchase URL with a pre-selected module. */
function purchaseHref(m: ModuleKey): string {
  return `/dashboard/purchase?module=${m}`;
}

/**
 * Dashboard — real Task 4 UI.
 *
 * Shows the welcome header, a trademark disclaimer banner, and 4 module cards
 * whose Locked/Unlocked state is driven reactively by `profile.credits` (kept
 * live by the useUserCredits subscription wired into the dashboard layout).
 */
export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const reset = useAuthStore((s) => s.reset);
  const { map: pendingMap } = usePendingRequests();

  async function handleSignOut() {
    await signOut();
    reset();
    router.replace("/");
  }

  return (
    <main className="flex-1 px-4 py-10">
      <div className="mx-auto w-full max-w-4xl">
        {/* Welcome header */}
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt="Profile"
                className="h-12 w-12 rounded-full border border-slate-200"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 font-semibold text-amber-700">
                {(user?.displayName ?? "?").charAt(0)}
              </div>
            )}
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">
                Welcome back
              </p>
              <h1 className="text-xl font-bold text-slate-900">
                {user?.displayName ?? "Student"}
              </h1>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-200"
          >
            Sign out
          </button>
        </header>

        {/* Disclaimer banner */}
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <strong className="font-semibold">Disclaimer:</strong> Eduvaris is an
          independent micro-diagnostic tool and is not affiliated with, endorsed
          by, or connected to any official English proficiency exam body. Our
          diagnostics are for learning purposes.
        </div>

        {/* Section title */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Your modules</h2>
          <Link
            href="/dashboard/purchase"
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-amber-600"
          >
            Buy a module
          </Link>
        </div>
        <p className="mb-4 text-xs text-slate-400">
          Each module is a separate 50 BDT attempt. One payment unlocks one
          attempt at that module only.
        </p>

        {/* Module grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {MODULE_KEYS.map((m) => (
            <ModuleCard
              key={m}
              moduleKey={m}
              credits={profile?.credits?.[m] ?? 0}
              requestState={pendingMap[m] ?? "none"}
            />
          ))}
        </div>

        {/* Footer debug line (small, keeps Task 2 proof reachable) */}
        <p className="mt-8 text-center text-xs text-slate-400">
          uid: <span className="font-mono">{profile?.uid ?? "—"}</span>
        </p>
      </div>
    </main>
  );
}

/* ----------------------------- Module card ------------------------------ */

const MODULE_META: Record<
  ModuleKey,
  { title: string; duration: string; blurb: string }
> = {
  reading: {
    title: "Reading",
    duration: "25–30 min",
    blurb: "Detail scanning, T/F/NG logic, paraphrase inference.",
  },
  listening: {
    title: "Listening",
    duration: "25–30 min",
    blurb: "Map labelling, accent tolerance, detail capture.",
  },
  writing: {
    title: "Writing",
    duration: "25 min",
    blurb: "Structural grammar, task response, coherence.",
  },
  speaking: {
    title: "Speaking",
    duration: "15–20 min",
    blurb: "Fluency, lexical range, pronunciation drift.",
  },
};

function ModuleCard({
  moduleKey,
  credits,
  requestState,
}: {
  moduleKey: ModuleKey;
  credits: number;
  requestState: ModuleRequestState;
}) {
  const meta = MODULE_META[moduleKey];
  const locked = credits <= 0;

  // Card visual + status badge depend on which of four states we're in:
  //   unlocked   → credits > 0
  //   pending    → locked AND a payment request is awaiting admin approval
  //   rejected   → locked AND the last request was rejected (allow retry)
  //   locked     → locked, no notable request yet
  const isPending = locked && requestState === "pending";
  const isRejected = locked && requestState === "rejected";

  const cardClass = !locked
    ? "border-emerald-200 bg-white"
    : isPending
    ? "border-amber-300 bg-amber-50/40"
    : isRejected
    ? "border-rose-200 bg-rose-50/40"
    : "border-slate-200 bg-slate-50";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border p-5 shadow-sm transition-colors ${cardClass}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900">{meta.title}</h3>
          <p className="text-xs text-slate-500">{meta.duration}</p>
        </div>
        {!locked ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">
            ✓ {credits} attempt{credits > 1 ? "s" : ""}
          </span>
        ) : isPending ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
            Verifying
          </span>
        ) : isRejected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-700">
            Rejected
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600">
            🔒 Locked
          </span>
        )}
      </div>

      <p className="mt-3 text-sm text-slate-600">{meta.blurb}</p>

      <div className="mt-4">
        {!locked ? (
          moduleKey === "reading" || moduleKey === "listening" ? (
            <StartButton moduleKey={moduleKey} />
          ) : (
            <button
              type="button"
              disabled
              title="This module's diagnostic isn't built yet."
              className="block w-full cursor-not-allowed rounded-lg bg-emerald-100 px-4 py-2 text-center text-sm font-semibold text-emerald-700 opacity-70"
            >
              Coming soon
            </button>
          )
        ) : isPending ? (
          <div className="block w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm font-medium text-amber-700">
            Waiting for approval…
          </div>
        ) : isRejected ? (
          <Link
            href={purchaseHref(moduleKey)}
            className="block w-full rounded-lg border border-rose-300 bg-white px-4 py-2 text-center text-sm font-semibold text-rose-700 hover:bg-rose-50"
          >
            Try again
          </Link>
        ) : (
          <Link
            href={purchaseHref(moduleKey)}
            className="block w-full rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-center text-sm font-semibold text-amber-700 hover:bg-amber-100"
          >
            Unlock for 50 BDT
          </Link>
        )}
      </div>
    </div>
  );
}

/**
 * Start button for a built module. Calls useStartExam, which hits the
 * resume-first server route — clicking this repeatedly never burns a second
 * credit. The route always returns the single in-progress attempt id, so the
 * user lands on the same exam whether they click once or five times.
 */
function StartButton({ moduleKey }: { moduleKey: "reading" | "listening" }) {
  const { start, loading, error } = useStartExam(moduleKey);
  return (
    <div className="block w-full">
      <button
        type="button"
        onClick={start}
        disabled={loading}
        className="block w-full rounded-lg bg-emerald-600 px-4 py-2 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Starting…" : "Start diagnostic"}
      </button>
      {error && (
        <p className="mt-1.5 text-center text-xs text-rose-600">{error}</p>
      )}
    </div>
  );
}
