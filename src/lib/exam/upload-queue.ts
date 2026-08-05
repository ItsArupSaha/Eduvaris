"use client";

import { useSyncExternalStore } from "react";
import { uploadSpeakingAudio } from "./audio-upload";

/**
 * Background upload queue for speaking audio.
 *
 * Decouples the student's flow from upload latency. When a recorder stops,
 * the blob is enqueued here; the calling station locks the answer
 * IMMEDIATELY (empty audioPath) so the student advances without waiting.
 * The queue uploads in the background, retries on failure, and calls back
 * with the audioPath when it lands. The store's autosave then syncs the
 * audioPath to the server.
 *
 * The pending counter is global (useSyncExternalStore singleton, same pattern
 * as the mic-lock + play-lock) so the final "Finish & grade" button can gate
 * on it: we don't let a student submit until every upload has resolved,
 * otherwise Whisper would miss audios whose audioPath hadn't synced yet.
 *
 * The blob lives in this function's closure, so retries keep working even
 * after the calling station component unmounts (the student advanced).
 */

let pendingCount = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}
function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function getSnapshot(): number {
  return pendingCount;
}

function incrementPending(): void {
  pendingCount += 1;
  emit();
}
function decrementPending(): void {
  pendingCount = Math.max(0, pendingCount - 1);
  emit();
}

/** React hook: how many speaking uploads are currently in flight. */
export function usePendingUploadCount(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [1000, 3000, 8000];

/**
 * Enqueue a speaking audio upload. Returns a promise that resolves with the
 * Storage audioPath on success, or rejects after all retries are exhausted.
 * The global pending counter is held for the full lifecycle.
 *
 * The blob is captured in the closure so retries work even after the calling
 * station component unmounts.
 */
export async function enqueueSpeakingUpload(args: {
  attemptId: string;
  stationId: string;
  questionId: string;
  blob: Blob;
  mimeType: string;
}): Promise<string> {
  incrementPending();
  try {
    let lastErr: unknown;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const { audioPath } = await uploadSpeakingAudio(args);
        return audioPath;
      } catch (err) {
        lastErr = err;
        if (attempt < MAX_ATTEMPTS - 1) {
          // Exponential backoff before the next attempt.
          await new Promise((r) => setTimeout(r, BACKOFF_MS[attempt]));
        }
      }
    }
    throw lastErr;
  } finally {
    decrementPending();
  }
}
