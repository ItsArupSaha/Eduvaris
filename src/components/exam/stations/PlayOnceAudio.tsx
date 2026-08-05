"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";

/**
 * Audio coordinator — enforces ONE active clip at a time across ALL
 * PlayOnceAudio instances on the page.
 *
 * The contract the product wants:
 *   - When a student starts a clip, it MUST play to the end. They cannot
 *     pause it, switch away, or start another clip mid-playback.
 *   - While any clip is playing, every OTHER play button is disabled — no
 *     accidental second tap can overlap audio.
 *   - Only when the playing clip finishes naturally does the global lock
 *     release and the other buttons re-enable.
 *
 * Play-state is UX/anti-accident, not graded data, so this lives in a
 * module-level singleton (no Zustand). Each instance subscribes via
 * `useSyncExternalStore` so its button disabled-state reacts instantly when
 * another instance starts or finishes.
 */

interface CoordinatorState {
  /** The src of the clip currently playing, or null when idle. */
  playingSrc: string | null;
}

let state: CoordinatorState = { playingSrc: null };
const listeners = new Set<() => void>();

function emit(): void {
  for (const l of listeners) l();
}

/** Claim the global play lock. Returns false if another clip is active. */
function claimPlay(src: string): boolean {
  if (state.playingSrc !== null) return false;
  state = { playingSrc: src };
  emit();
  return true;
}

/** Release the global play lock — called on natural completion only. */
function releasePlay(src: string): void {
  if (state.playingSrc === src) {
    state = { playingSrc: null };
    emit();
  }
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): CoordinatorState {
  return state;
}

/**
 * Audio player that enforces "play once" + exclusive-finish semantics.
 *
 * After the first play completes the button disables forever — the student
 * gets one listen, period. While THIS clip is playing, no other clip on the
 * page can be started; while ANOTHER clip is playing, this button is
 * disabled until that clip finishes.
 *
 * The component keeps play-state in its OWN local store (not the engine),
 * because play-count is presentation/UX state, not graded data. The engine
 * records the student's option selection; whether they replayed is irrelevant
 * to grading (and already constrained to one play here).
 *
 * Optional `segmentStart`/`segmentEnd` (seconds) for bounded segments: the
 * play head seeks to `segmentStart` on play and auto-finishes at `segmentEnd`.
 */
export function PlayOnceAudio({
  src,
  segmentStart,
  segmentEnd,
  disabled,
}: {
  src: string;
  segmentStart?: number;
  segmentEnd?: number;
  disabled?: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [played, setPlayed] = useState(false);
  const [playing, setPlaying] = useState(false);

  // Subscribe to the global coordinator so we disable our button while any
  // other clip is playing.
  const { playingSrc } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const anotherIsPlaying = playingSrc !== null && playingSrc !== src;

  // Reset play-state when `src` changes. Makes the component safe under React
  // reuse and prevents a stuck played/playing flag from disabling a fresh
  // clip.
  useEffect(() => {
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setPlayed(false);
    setPlaying(false);
  }, [src]);

  // Release the global lock if we unmount mid-play (route away, station
  // advance). The lock must not stay held forever on an orphaned instance.
  useEffect(() => {
    return () => {
      releasePlay(src);
    };
  }, [src]);

  const handlePlay = async () => {
    const a = audioRef.current;
    if (!a || played || disabled) return;
    // Refuse if another clip is already playing — protects against overlap.
    if (!claimPlay(src)) return;
    if (segmentStart != null) a.currentTime = segmentStart;
    try {
      await a.play();
      setPlaying(true);
    } catch {
      // Autoplay rejection or missing file — release the lock + soft error.
      releasePlay(src);
      setPlaying(false);
    }
  };

  const finish = () => {
    setPlaying(false);
    setPlayed(true);
    releasePlay(src);
  };

  const handleTimeUpdate = () => {
    const a = audioRef.current;
    if (!a || segmentEnd == null) return;
    if (a.currentTime >= segmentEnd) {
      a.pause();
      finish();
    }
  };

  const handleEnded = () => {
    finish();
  };

  // Button is disabled if: already played, externally disabled, OR another
  // clip is currently playing. The last condition is the anti-accident lock.
  const buttonDisabled = played || !!disabled || anotherIsPlaying;

  return (
    <div className="flex items-center gap-3">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onEnded={handleEnded}
        onTimeUpdate={handleTimeUpdate}
      />
      <button
        type="button"
        onClick={handlePlay}
        disabled={buttonDisabled}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
          played
            ? "cursor-not-allowed bg-slate-100 text-slate-400"
            : playing
            ? "bg-amber-400 text-white"
            : "bg-amber-500 text-white hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50"
        }`}
      >
        {played ? (
          <>
            <span aria-hidden>✓</span> Played
          </>
        ) : playing ? (
          <>
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
            Playing…
          </>
        ) : segmentStart != null ? (
          <>▶ Play segment</>
        ) : (
          <>▶ Play once</>
        )}
      </button>
      {played && (
        <span className="text-xs text-slate-400">
          Audio cannot be replayed.
        </span>
      )}
      {!played && anotherIsPlaying && (
        <span className="text-xs text-slate-400">
          Finish the current clip first.
        </span>
      )}
    </div>
  );
}
