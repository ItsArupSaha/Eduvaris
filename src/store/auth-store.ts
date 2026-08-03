/**
 * Zustand auth store — holds client-side auth + profile state.
 * Kept in sync with Firebase via AuthProvider's onAuthStateChanged listener.
 */
import { create } from "zustand";
import type { UserProfile } from "@/lib/firebase/user-types";

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
}

export interface AuthState {
  /** null = logged out. AuthUser = logged in (Firebase auth confirmed). */
  user: AuthUser | null;
  /** Full Firestore profile; populated after getOrCreateUserDoc resolves. */
  profile: UserProfile | null;
  /** true until the first onAuthStateChanged callback fires. */
  loading: boolean;
  /** transient error surfaced from sign-in or profile creation. */
  error: string | null;

  setUser: (user: AuthUser | null) => void;
  setProfile: (profile: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  profile: null,
  loading: true,
  error: null,

  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  reset: () => set({ user: null, profile: null, loading: false, error: null }),
}));
