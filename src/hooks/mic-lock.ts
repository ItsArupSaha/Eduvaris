"use client";

import { useSyncExternalStore } from "react";

/**
 * Global microphone lock — ensures at most ONE mic is active across the whole
 * Speaking module at any time.
 *
 * When a student clicks "Start Speaking" on any question, `claimMic` reserves
 * the lock. Every other mic button on the page reads `isAnyMicActive` via
 * `useSyncExternalStore` and renders disabled until the active mic releases.
 * This prevents an accidental touch from opening a second recognizer while one
 * is already recording — which would corrupt both transcripts.
 *
 * Mirrors the PlayOnceAudio coordinator pattern: module-level singleton, no
 * Zustand (mic state is UX, not graded data).
 */

let activeMicId: string | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/**
 * Try to claim the global mic lock. Returns true if granted, false if another
 * mic is already active. The `micId` identifies the caller so a component can
 * re-claim its own lock idempotently (e.g. on a recognizer restart).
 */
export function claimMic(micId: string): boolean {
  if (activeMicId !== null && activeMicId !== micId) return false;
  const wasIdle = activeMicId === null;
  activeMicId = micId;
  if (wasIdle) emit();
  return true;
}

/** Release the global mic lock. Only the owner may release. */
export function releaseMic(micId: string): void {
  if (activeMicId === micId) {
    activeMicId = null;
    emit();
  }
}

/** Subscribe hook for useSyncExternalStore. */
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): boolean {
  return activeMicId !== null;
}

/**
 * Reactive hook: true while any mic on the page is active. Components use this
 * to disable their own mic button when another question is recording.
 */
export function useIsAnyMicActive(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** Read the current owner id (or null) without subscribing. */
export function getActiveMicId(): string | null {
  return activeMicId;
}
