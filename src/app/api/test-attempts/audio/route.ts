/**
 * POST /api/test-attempts/audio
 *
 * Uploads one Speaking audio blob to Firebase Storage, server-side.
 *
 * Security posture: Storage rules stay default-deny for clients. This Route
 * Handler verifies the Firebase ID token, validates the attempt is owned by
 * the caller, and writes the object under a uid-scoped path. The client only
 * ever receives the resulting Storage object path — never a signed URL that
 * could leak to a third party.
 *
 * Path scheme: `speaking/{uid}/{attemptId}/{stationId}_{questionId}.{ext}`
 *   - uid-scoped → one user can't pollute another's namespace
 *   - attemptId-scoped → easy bulk cleanup of an abandoned attempt
 *   - ext derived from the captured MIME type (webm/mp4/ogg)
 *
 * Returns: { audioPath, mimeType, sizeBytes } — the client stores `audioPath`
 * in the answer payload. The backend Whisper step fetches by this path on
 * submit.
 */
import { NextResponse } from "next/server";
import {
  adminAuth,
  adminDb,
  adminStorage,
  storageBucketName,
} from "@/lib/firebase/admin";
import type { TestAttempt } from "@/lib/exam/attempt-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Audio uploads can be a few MB; give the route headroom past the default.
export const maxDuration = 60;

const EXT_BY_MIME: Record<string, string> = {
  "audio/webm": "webm",
  "audio/webm;codecs=opus": "webm",
  "audio/ogg": "ogg",
  "audio/ogg;codecs=opus": "ogg",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/wav": "wav",
};

function extFor(mime: string): string {
  return EXT_BY_MIME[mime] ?? EXT_BY_MIME[mime.split(";")[0] ?? ""] ?? "webm";
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data." },
      { status: 400 }
    );
  }

  const idToken = String(form.get("idToken") ?? "");
  const attemptId = String(form.get("attemptId") ?? "");
  const stationId = String(form.get("stationId") ?? "");
  const questionId = String(form.get("questionId") ?? "");
  const mimeType = String(form.get("mimeType") ?? "audio/webm");
  const file = form.get("audio");

  if (!idToken || !attemptId || !stationId || !questionId) {
    return NextResponse.json(
      { error: "Missing required fields." },
      { status: 400 }
    );
  }
  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { error: "Missing audio file." },
      { status: 400 }
    );
  }

  // Verify identity. Bearer is in-body here (FormData can't carry headers
  // cleanly from the browser without a separate fetch).
  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Invalid auth token." }, { status: 401 });
  }

  // Validate attempt ownership BEFORE writing to Storage — don't let a user
  // upload under another user's path.
  const db = adminDb();
  const attemptSnap = await db.doc(`testAttempts/${attemptId}`).get();
  if (!attemptSnap.exists) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }
  const attempt = attemptSnap.data() as TestAttempt;
  if (attempt.uid !== uid) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }
  // Only allow uploads while the attempt is live.
  if (attempt.status !== "in-progress") {
    return NextResponse.json(
      { error: "Attempt is not in progress." },
      { status: 409 }
    );
  }

  const ext = extFor(mimeType);
  const objectPath = `speaking/${uid}/${attemptId}/${stationId}_${questionId}.${ext}`;

  try {
    // Pass the bucket name explicitly — don't rely on the init-time
    // storageBucket option surviving dev-server hot-reloads.
    const bucket = adminStorage().bucket(storageBucketName());
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileRef = bucket.file(objectPath);

    await fileRef.save(buffer, {
      metadata: {
        contentType: mimeType || "audio/webm",
        metadata: {
          uid,
          attemptId,
          stationId,
          questionId,
          uploadedAt: new Date().toISOString(),
        },
      },
      // resumable upload false keeps small-file uploads fast + avoids the
      // temp-file dance the resumable path does in serverless envs.
      resumable: false,
      validation: false,
    });

    return NextResponse.json({
      audioPath: objectPath,
      mimeType: mimeType || "audio/webm",
      sizeBytes: buffer.byteLength,
    });
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    console.error("[audio upload] storage write failed:", why, err);
    return NextResponse.json(
      { error: `Audio storage failed: ${why}` },
      { status: 500 }
    );
  }
}
