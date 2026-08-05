/**
 * Whisper transcription — server-only.
 *
 * Fetches each speaking audio object from Storage, sends it to OpenAI's
 * whisper-1 API, returns a map of answerKey → transcript text. Called from
 * the submit Route Handler for speaking-module attempts, after deterministic
 * grading but before the finalize transaction.
 *
 * Design notes:
 *   - All network I/O happens here, not in the grader. The grader stays pure.
 *   - Transcription runs in parallel across questions (Promise.all) — a
 *     speaking attempt has up to 11 audios; serial would blow the route's
 *     time budget.
 *   - On per-question failure we record "" (empty transcript) for that key,
 *     not throw — one bad audio must not block finalizing the whole attempt.
 *     The AI Examiner downstream treats empty transcript as "no speech
 *     captured", which is the honest signal.
 *   - We never invent text. If Whisper returns nothing, the transcript is "".
 */
import OpenAI from "openai";
import { adminStorage, storageBucketName } from "@/lib/firebase/admin";
import { answerKey } from "./attempt-types";
import type { AnswersMap } from "./attempt-types";
import type { ExamForm } from "./content-types";

/** Speaking answer kinds whose payload carries an `audioPath`. */
const SPEAKING_KINDS = new Set([
  "imageFluency",
  "rapidFire",
  "cueCard",
  "abstractAnswer",
]);

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    throw new Error(
      "OPENAI_API_KEY missing. Add it to .env.local to enable speaking transcription."
    );
  }
  return key;
}

/** Convert a Storage object path to a Blob we can hand to Whisper. */
async function fetchAudioBuffer(objectPath: string): Promise<{
  buffer: Buffer;
  mimeType: string;
}> {
  const bucket = adminStorage().bucket(storageBucketName());
  const fileRef = bucket.file(objectPath);
  const [exists] = await fileRef.exists();
  if (!exists) {
    throw new Error(`Audio object not found: ${objectPath}`);
  }
  const [buffer] = await fileRef.download();
  const [meta] = await fileRef.getMetadata();
  const mimeType = meta?.contentType ?? "audio/webm";
  return { buffer, mimeType };
}

/** File extension Whisper expects for a given MIME type. */
function extFor(mimeType: string): string {
  if (mimeType.includes("mp4") || mimeType.includes("m4a")) return "m4a";
  if (mimeType.includes("ogg")) return "ogg";
  if (mimeType.includes("wav")) return "wav";
  return "webm";
}

/** Transcribe a single audio. Empty string on any failure. */
async function transcribeOne(
  client: OpenAI,
  objectPath: string
): Promise<string> {
  try {
    const { buffer, mimeType } = await fetchAudioBuffer(objectPath);
    const ext = extFor(mimeType);
    // Copy Buffer into a fresh Uint8Array so it satisfies BlobPart under
    // Node's strict ArrayBufferLike vs ArrayBuffer typing.
    const bytes = new Uint8Array(buffer.byteLength);
    bytes.set(buffer);
    const file = new File([bytes], `audio.${ext}`, { type: mimeType });
    const result = await client.audio.transcriptions.create({
      file,
      model: "whisper-1",
      // English audio — improves accuracy + cuts latency vs auto-detect.
      language: "en",
      // Plain text is enough for the AI Examiner; no timestamps needed.
      response_format: "text",
    });
    // The SDK returns string directly for response_format: "text".
    return typeof result === "string" ? result.trim() : "";
  } catch (err) {
    const why = err instanceof Error ? err.message : String(err);
    console.error(
      `[whisper] transcription failed for ${objectPath}:`,
      why,
      err
    );
    return "";
  }
}

/**
 * Transcribe all speaking answers in an attempt. Returns a map keyed by
 * answerKey → transcript text. Non-speaking + empty-path answers are skipped.
 */
export async function transcribeSpeakingAudios(
  exam: ExamForm,
  answers: AnswersMap
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};

  // Collect (key, audioPath) pairs for every speaking answer with a real path.
  const jobs: Array<{ key: string; audioPath: string }> = [];
  for (const station of exam.stations) {
    for (const q of station.questions) {
      if (!SPEAKING_KINDS.has(q.kind)) continue;
      const key = answerKey(station.id, q.id);
      const rec = answers[key];
      if (!rec) continue;
      const p = rec.payload;
      if (
        (p.kind === "imageFluency" ||
          p.kind === "rapidFire" ||
          p.kind === "cueCard" ||
          p.kind === "abstractAnswer") &&
        p.audioPath
      ) {
        jobs.push({ key, audioPath: p.audioPath });
      }
    }
  }

  if (jobs.length === 0) return out;

  const client = new OpenAI({ apiKey: getApiKey() });

  // Parallel transcription. Each job resolves to "" on failure rather than
  // rejecting, so Promise.all never throws here.
  const results = await Promise.all(
    jobs.map(async (job) => ({
      key: job.key,
      text: await transcribeOne(client, job.audioPath),
    }))
  );

  for (const r of results) {
    out[r.key] = r.text;
  }

  return out;
}
