"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/auth-store";

/**
 * Solid white navbar. Highly distinguishable from the cream hero section.
 * Left: "Eduvaris" (Ubuntu 700). Right: Dashboard button when logged in,
 * Login button when logged out.
 */
export function Navbar() {
  const user = useAuthStore((s) => s.user);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5">
        <Link href="/" className="flex items-center gap-2 group">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 text-white text-sm shadow-lg shadow-orange-500/20">
            E
          </span>
          <span className="text-xl font-bold text-slate-800 tracking-tight group-hover:text-orange-600 transition-colors">
            Eduvaris
          </span>
        </Link>

        {user ? (
          <Link
            href="/dashboard"
            className="rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:brightness-105 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            Dashboard
          </Link>
        ) : (
          <Link
            href="/login"
            className="rounded-lg bg-gradient-to-r from-rose-500 to-orange-500 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:shadow-md hover:brightness-105 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
          >
            Login
          </Link>
        )}
      </nav>
    </header>
  );
}
