"use client";

import { useEffect, useRef } from "react";

/**
 * WaveformVisualizer — real-time mic-input level bars (WhatsApp-style).
 *
 * Feeds the live MediaStream from useMediaRecorder into a Web Audio
 * AnalyserNode. Renders N vertical bars whose heights track actual input
 * level: tall when speaking, flat when silent. This gives the student visual
 * confirmation that the mic is picking them up, without exposing any
 * transcript.
 *
 * The AudioContext + analyser are created when `stream` becomes non-null and
 * torn down when it goes back to null (recording stops) or the component
 * unmounts. rAF loop drives the bar heights.
 *
 * `stream` is intentionally not a useEffect dependency in the rAF loop — the
 * effect reads it from a ref to avoid restarting the loop on every render.
 */
const BAR_COUNT = 28;

export function WaveformVisualizer({ stream }: { stream: MediaStream | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  // Keep the latest stream in a ref for the rAF loop, without writing to the
  // ref during render (React 19 forbids ref writes in render).
  useEffect(() => {
    streamRef.current = stream;
  }, [stream]);

  // Setup/teardown the analyser when the stream appears/disappears.
  useEffect(() => {
    if (!stream) return;

    const AudioCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtor) return;

    const ctx = new AudioCtor();
    const source = ctx.createMediaStreamSource(stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 64;
    analyser.smoothingTimeConstant = 0.7;
    source.connect(analyser);

    audioCtxRef.current = ctx;
    sourceRef.current = source;
    analyserRef.current = analyser;

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      try {
        source.disconnect();
      } catch {
        /* ignore */
      }
      try {
        analyser.disconnect();
      } catch {
        /* ignore */
      }
      try {
        void ctx.close();
      } catch {
        /* ignore */
      }
      audioCtxRef.current = null;
      sourceRef.current = null;
      analyserRef.current = null;
    };
  }, [stream]);

  // rAF loop: read frequency data, scale bars. Runs continuously; reads
  // analyser from a ref so we never restart the loop.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const bars = Array.from(container.children) as HTMLElement[];

    const tick = () => {
      const analyser = analyserRef.current;
      const s = streamRef.current;
      if (analyser && s) {
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        // Map BAR_COUNT bars across the frequency bins.
        const stride = Math.max(1, Math.floor(data.length / bars.length));
        for (let i = 0; i < bars.length; i++) {
          // Average a few bins per bar for smoother shape.
          let sum = 0;
          const start = i * stride;
          const end = Math.min(data.length, start + stride);
          for (let j = start; j < end; j++) sum += data[j];
          const avg = end > start ? sum / (end - start) : 0;
          // Normalize 0..255 → 0..1, then bias so quiet input still shows.
          const level = Math.min(1, (avg / 255) * 1.4);
          const heightPct = 8 + level * 92; // min 8% so bars are visible
          bars[i].style.transform = `scaleY(${heightPct / 100})`;
        }
      } else {
        // No stream — flat line.
        for (const b of bars) b.style.transform = "scaleY(0.08)";
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="flex h-12 items-center justify-center gap-[3px]"
      aria-hidden="true"
    >
      {Array.from({ length: BAR_COUNT }).map((_, i) => (
        <span
          key={i}
          className="w-[3px] origin-center rounded-full bg-amber-400"
          style={{ height: "100%", transform: "scaleY(0.08)" }}
        />
      ))}
    </div>
  );
}
