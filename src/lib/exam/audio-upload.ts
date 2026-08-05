/**
 * Client helper: upload a Speaking audio Blob to the server Route Handler.
 *
 * The client never touches Firebase Storage directly — security rules keep
 * Storage default-deny for client writes, matching the anti-cheat posture of
 * Firestore (testAttempts are server-write-only). The Route Handler verifies
 * the Firebase ID token, validates the attempt is owned by the caller, and
 * writes the object under a uid-scoped path.
 *
 * Returns the Storage object path that should be stored in the answer payload
 * (`audioPath`). The backend Whisper step fetches by this path on submit.
 */
import { firebaseAuth } from "@/lib/firebase/client";

export interface UploadAudioResponse {
  audioPath: string;
  mimeType: string;
  sizeBytes: number;
}

export async function uploadSpeakingAudio(args: {
  attemptId: string;
  stationId: string;
  questionId: string;
  blob: Blob;
  mimeType: string;
}): Promise<UploadAudioResponse> {
  const user = firebaseAuth().currentUser;
  if (!user) throw new Error("Not authenticated.");
  const idToken = await user.getIdToken(false);

  const form = new FormData();
  form.append("idToken", idToken);
  form.append("attemptId", args.attemptId);
  form.append("stationId", args.stationId);
  form.append("questionId", args.questionId);
  form.append("mimeType", args.mimeType);
  form.append("audio", args.blob, `${args.questionId}.webm`);

  const res = await fetch("/api/test-attempts/audio", {
    method: "POST",
    body: form,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      (data as { error?: string }).error ??
      `Audio upload failed (${res.status}).`;
    throw new Error(msg);
  }
  return data as UploadAudioResponse;
}
