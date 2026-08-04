"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Audio player that enforces "play once" semantics.
 *
 * After the first play completes (or the user explicitly plays), the button
 * disables and never re-enables. This is the Distractor Trap mechanic: the
 * student gets one listen, period.
 *
 * The component keeps play-state in its OWN local store (not the engine),
 * because play-count is presentation/UX state, not graded data. The engine
 * records the student's option selection; whether they replayed is irrelevant
 * to grading (and already constrained to one play here).
 *
 * Optional `segmentStart`/`segmentEnd` (seconds) for the Replay station: the
 * play head seeks to `segmentStart` on play and auto-pauses at `segmentEnd`.
 * The window is bounded to ~15s by content.
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

  // Clean up on unmount.
  useEffect(() => {
    const a = audioRef.current;
    return () => {
      if (a) {
        a.pause();
        a.currentTime = 0;
      }
    };
  }, []);

  const handlePlay = async () => {
    const a = audioRef.current;
    if (!a || played || disabled) return;
    if (segmentStart != null) a.currentTime = segmentStart;
    try {
      await a.play();
      setPlaying(true);
    } catch {
      // Autoplay rejection or missing file — surface a soft error.
      setPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    const a = audioRef.current;
    if (!a || segmentEnd == null) return;
    if (a.currentTime >= segmentEnd) {
      a.pause();
      setPlaying(false);
      setPlayed(true);
    }
  };

  const handleEnded = () => {
    setPlaying(false);
    setPlayed(true);
  };

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
        disabled={played || disabled}
        className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors ${
          played
            ? "cursor-not-allowed bg-slate-100 text-slate-400"
            : playing
            ? "bg-amber-400 text-white"
            : "bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50"
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
          <>▶ Replay segment</>
        ) : (
          <>▶ Play once</>
        )}
      </button>
      {played && (
        <span className="text-xs text-slate-400">
          Audio cannot be replayed.
        </span>
      )}
    </div>
  );
}
