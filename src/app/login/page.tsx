"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { useAuthStore } from "@/store/auth-store";

export default function LoginPage() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const setError = useAuthStore((s) => s.setError);
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  // Already signed in → bounce to dashboard.
  if (!loading && user) {
    router.replace("/dashboard");
  }

  async function handleGoogle() {
    setBusy(true);
    setLocalError(null);
    try {
      await signInWithGoogle();
      // onAuthStateChanged in AuthProvider will set the store + redirect.
      router.replace("/dashboard");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Google sign-in failed.";
      setLocalError(msg);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900 text-center">Sign in</h1>
        <p className="text-sm text-slate-500 text-center mt-2">
          One free demo. 50 BDT per module after that. No subscriptions.
        </p>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={busy || loading}
          className="mt-6 w-full inline-flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-4 focus-visible:ring-indigo-200"
        >
          <GoogleIcon />
          {busy ? "Opening Google sign-in…" : "Continue with Google"}
        </button>

        {localError && (
          <p className="mt-4 text-sm text-red-600 text-center" role="alert">
            {localError}
          </p>
        )}

        <p className="mt-6 text-xs text-slate-400 text-center">
          By signing in you agree to receive an honest diagnostic report.
          We will not sell your data.
        </p>
      </div>

      <Link
        href="/"
        className="mt-6 text-xs text-slate-500 hover:text-slate-700 underline underline-offset-2"
      >
        ← Back to landing
      </Link>
    </main>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
