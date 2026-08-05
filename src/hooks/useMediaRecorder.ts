"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { claimMic, releaseMic } from "./mic-lock";

/**
 * useMediaRecorder — universal-browser mic capture for the Speaking module.
 *
 * Replaces the Web Speech API (Chrome-only). MediaRecorder + getUserMedia are
 * supported by Chrome, Edge, Firefox, and Safari, so the Speaking module no
 * longer needs a browser gate.
 *
 * The recorded audio is exposed two ways:
 *   - `stream` — the live MediaStream, fed to WaveformVisualizer's
 *     AnalyserNode for real-time input-level visualization.
 *   - onAudioStop(blob, mimeType) — fires once when recording stops with the
 *     full captured audio as a single Blob. The caller uploads this to
 *     Firebase Storage via the server Route Handler.
 *
 * Mic lock: same global coordinator as before (claimMic/releaseMic). Only one
 * mic stream is ever active across the page.
 *
 * MIME selection: prefer 'audio/webm;codecs=opus' (Chrome/Firefox/Edge),
 * fall back to 'audio/mp4' (Safari), then '' (let the browser pick). We
 * capture the chosen type so the server can tag the Storage object correctly.
 */
export interface MediaRecorderState {
  /** True while actively recording. */
  recording: boolean;
  /** True between start() and the first ondataavailable / mic grant. */
  starting: boolean;
  /** Live stream for waveform visualization, null when not recording. */
  stream: MediaStream | null;
  /** Last error string (e.g. "not-allowed", "not-found"). */
  error: string | null;
  /** Whether the browser can record at all. */
  supported: boolean;
}

const CANDIDATE_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
  "audio/mp4",
];

function pickMimeType(): { mimeType: string; supported: boolean } {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return { mimeType: "", supported: false };
  }
  for (const type of CANDIDATE_MIME_TYPES) {
    try {
      if (MediaRecorder.isTypeSupported(type)) {
        return { mimeType: type, supported: true };
      }
    } catch {
      // isTypeSupported can throw on some browsers for weird strings.
      continue;
    }
  }
  // No explicit match — let the browser choose (mimeType "").
  return { mimeType: "", supported: true };
}

export function isMediaRecordingSupported(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof MediaRecorder !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === "function"
  );
}

export function useMediaRecorder(opts: {
  /** Stable id for the global mic lock. Must be unique per question. */
  micId: string;
  /** Fires once when recording stops, with the captured audio. */
  onAudioStop?: (blob: Blob, mimeType: string) => void;
} = { micId: "default" }): {
  state: MediaRecorderState;
  start: () => Promise<boolean>;
  stop: () => void;
} {
  const micId = opts.micId;

  const [recording, setRecording] = useState(false);
  const [starting, setStarting] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supported = isMediaRecordingSupported();

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Keep the freshest onAudioStop in a ref so the recorder callbacks (built
  // per-start) always call the latest version.
  const onAudioStopRef = useRef(opts.onAudioStop);
  useEffect(() => {
    onAudioStopRef.current = opts.onAudioStop;
  });

  const teardownStream = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      for (const track of s.getTracks()) {
        try {
          track.stop();
        } catch {
          /* ignore */
        }
      }
      streamRef.current = null;
    }
    setStream(null);
  }, []);

  const start = useCallback(async (): Promise<boolean> => {
    setError(null);
    if (!supported) {
      setError("unsupported");
      return false;
    }
    // Claim the global mic lock — refuses if another question is recording.
    if (!claimMic(micId)) {
      setError("Another recording is in progress.");
      return false;
    }
    setStarting(true);
    let newStream: MediaStream;
    try {
      newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (e) {
      const err = e as { name?: string; message?: string };
      // Map DOMException names to friendly strings.
      const friendly =
        err?.name === "NotAllowedError" || err?.name === "SecurityError"
          ? "not-allowed"
          : err?.name === "NotFoundError" || err?.name === "OverconstrainedError"
          ? "not-found"
          : err?.name ?? "mic-error";
      setError(friendly);
      releaseMic(micId);
      setStarting(false);
      return false;
    }

    streamRef.current = newStream;
    setStream(newStream);

    const { mimeType } = pickMimeType();
    let rec: MediaRecorder;
    try {
      rec = mimeType ? new MediaRecorder(newStream, { mimeType }) : new MediaRecorder(newStream);
    } catch (e) {
      const err = e as Error;
      setError(err?.message ?? "recorder-error");
      releaseMic(micId);
      teardownStream();
      setStarting(false);
      return false;
    }

    chunksRef.current = [];
    rec.ondataavailable = (e: BlobEvent) => {
      if (e.data && e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };
    rec.onstop = () => {
      const type = rec.mimeType || mimeType || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      onAudioStopRef.current?.(blob, type);
    };

    recorderRef.current = rec;
    try {
      rec.start();
    } catch {
      // ignore — already started
    }
    setRecording(true);
    setStarting(false);
    return true;
  }, [micId, supported, teardownStream]);

  const stop = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* ignore */
      }
    }
    recorderRef.current = null;
    teardownStream();
    setRecording(false);
    releaseMic(micId);
  }, [micId, teardownStream]);

  // Stop + tear down on unmount. Release the lock if we held it.
  useEffect(() => {
    return () => {
      const rec = recorderRef.current;
      if (rec && rec.state !== "inactive") {
        try {
          rec.stop();
        } catch {
          /* ignore */
        }
      }
      recorderRef.current = null;
      releaseMic(micId);
      const s = streamRef.current;
      if (s) {
        for (const track of s.getTracks()) {
          try {
            track.stop();
          } catch {
            /* ignore */
          }
        }
        streamRef.current = null;
      }
    };
  }, [micId]);

  return {
    state: { recording, starting, stream, error, supported },
    start,
    stop,
  };
}
