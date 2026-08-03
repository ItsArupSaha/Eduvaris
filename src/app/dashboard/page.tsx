"use client";

import { useRouter } from "next/navigation";
import { signOut } from "@/lib/firebase/auth";
import { useAuthStore } from "@/store/auth-store";

/**
 * Task 2 dashboard STUB.
 * Proves the auth + profile flow end-to-end: shows the resolved user + profile,
 * and a sign-out button. Real dashboard (credits, module cards, disclaimer)
 * arrives in Task 4.
 */
export default function DashboardPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const reset = useAuthStore((s) => s.reset);

  async function handleSignOut() {
    await signOut();
    reset();
    router.replace("/");
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-start px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            {user?.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt="Profile"
                className="w-12 h-12 rounded-full border border-slate-200"
              />
            ) : (
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-semibold">
                {(user?.displayName ?? "?").charAt(0)}
              </div>
            )}
            <div>
              <p className="text-xs text-slate-400 uppercase tracking-wide">Signed in as</p>
              <h1 className="text-lg font-semibold text-slate-900">
                {user?.displayName ?? "User"}
              </h1>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>

          {/* Profile debug (Task 2 proof — replaced by real UI in Task 4) */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 mb-6">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
              Firestore profile (proof of Task 2 flow)
            </p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <dt className="text-slate-500">uid</dt>
              <dd className="font-mono text-xs text-slate-700 truncate">{profile?.uid ?? "—"}</dd>
              <dt className="text-slate-500">freeDemoUsed</dt>
              <dd className="text-slate-700">{String(profile?.freeDemoUsed ?? "—")}</dd>
              <dt className="text-slate-500">credits</dt>
              <dd className="text-slate-700">{JSON.stringify(profile?.credits ?? {})}</dd>
              <dt className="text-slate-500">createdAt</dt>
              <dd className="text-slate-700 text-xs">
                {profile?.createdAt
                  ? new Date((profile.createdAt as { toMillis?: () => number }).toMillis?.() ?? 0).toLocaleString()
                  : "—"}
              </dd>
            </dl>
          </div>

          <p className="text-xs text-slate-400 mb-6">
            Full dashboard (module cards, credits, disclaimer) arrives in Task 4.
          </p>

          <button
            type="button"
            onClick={handleSignOut}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
          >
            Sign out
          </button>
        </div>

        <button
          type="button"
          onClick={() => router.push("/")}
          className="mt-6 text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2 block mx-auto"
        >
          ← Back to landing
        </button>
      </div>
    </main>
  );
}
