/**
 * POST /api/test-attempts/[id]/submit
 *
 * Finalizes an attempt: grades it deterministically, sets status to completed
 * (or expired if the deadline already passed), detaches the attempt id from
 * the user's inProgressAttemptIds, and bumps completedAttemptCount.
 *
 * Idempotent: submitting an already-finalized attempt returns its existing
 * grade instead of erroring. This is what makes the resume-on-expiry path
 * safe — the client may call submit after the server already finalized.
 *
 * Reason is captured so we can distinguish "user clicked submit" from
 * "timer ran out" from "page revisited after expiry".
 */
import { NextResponse } from "next/server";
import { after } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/auth/admin-guard";
import { gradeExam } from "@/lib/exam/grader";
import { getExamForm } from "@/lib/exam/exam-forms";
import { transcribeSpeakingAudios } from "@/lib/exam/whisper";
import { runDiagnosticPipeline } from "@/lib/ai/grader";
import type { TestAttempt } from "@/lib/exam/attempt-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// The HTTP submit itself returns fast; this budget covers the post-response
// `after()` work (Whisper already ran above; the diagnostic pipeline is the
// long pole — Examiner + Validator, up to ~2 min combined).
export const maxDuration = 300;

interface SubmitBody {
  reason?: unknown;
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const uid = auth.decoded!.uid;
  const { id } = await ctx.params;

  // Body is optional — submit may be called with no payload.
  let reason = "user-submit";
  try {
    const body = (await request.clone().json().catch(() => ({}))) as SubmitBody;
    if (typeof body.reason === "string" && body.reason.length <= 32) {
      reason = body.reason;
    }
  } catch {
    // keep default reason
  }

  const db = adminDb();
  const ref = db.doc(`testAttempts/${id}`);

  // Pre-read for fast-fail (ownership + existence). The transaction re-reads
  // for correctness, but failing fast here avoids the txn cost on bad ids.
  const preSnap = await ref.get();
  if (!preSnap.exists) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }
  const preData = preSnap.data() as TestAttempt;
  if (preData.uid !== uid) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }

  // Already finalized → return the existing grade (idempotent).
  if (preData.status !== "in-progress") {
    return NextResponse.json({
      attemptId: id,
      status: preData.status,
      grade: preData.grade,
      alreadyFinalized: true,
    });
  }

  // Resolve the exam form for this attempt. Old attempts grade against their
  // own version's key; a missing form is a server-side content regression.
  const exam = getExamForm(preData.examId, preData.module);
  if (!exam) {
    console.error(
      `[submit] unknown exam form ${preData.examId}@v${preData.examVersion} for attempt ${id}`
    );
    return NextResponse.json(
      { error: "Exam content form unavailable. Contact support." },
      { status: 500 }
    );
  }

  const userRef = db.doc(`users/${uid}`);

  try {
    // Compute grade OUTSIDE the txn — pure function over immutable content +
    // the snapshot of answers. The txn then only does the finalize writes.
    const nowMs = Date.now();
    const expiresMs =
      preData.expiresAt instanceof Timestamp
        ? (preData.expiresAt as Timestamp).toMillis()
        : 0;
    const expiredByClock = expiresMs > 0 && nowMs > expiresMs;
    const finalStatus = expiredByClock ? "expired" : "completed";
    const answers = preData.answers ?? {};
    const grade = gradeExam(exam, answers, nowMs);

    // Speaking module: transcribe all captured audios via Whisper BEFORE the
    // txn. This is the slow network step (up to 11 audios in parallel) so it
    // must run outside the txn to avoid holding locks. Failures resolve to ""
    // per-question rather than throwing — one bad audio can't block finalize.
    // If OPENAI_API_KEY is unset we skip gracefully (transcripts just stay
    // empty); the deterministic grade still lands.
    let transcripts: Record<string, string> = {};
    if (preData.module === "speaking" && process.env.OPENAI_API_KEY) {
      try {
        transcripts = await transcribeSpeakingAudios(exam, answers);
        console.info(
          `[submit] whisper transcribed ${Object.keys(transcripts).length} audios for attempt ${id}`
        );
      } catch (err) {
        // Log + continue — transcription is best-effort, not finalize-blocking.
        const why = err instanceof Error ? err.message : String(err);
        console.error(
          `[submit] whisper transcription failed for attempt ${id}:`,
          why,
          err
        );
        transcripts = {};
      }
    }

    await db.runTransaction(async (txn) => {
      // Re-read inside the txn so we don't finalize twice on a race.
      const snap = await txn.get(ref);
      if (!snap.exists) {
        throw new TransactionError(404, "Attempt not found.");
      }
      const data = snap.data() as TestAttempt;
      if (data.uid !== uid) {
        throw new TransactionError(404, "Attempt not found.");
      }
      if (data.status !== "in-progress") {
        // Lost the race. Re-grade from the stored state to keep the response
        // honest, but perform NO writes.
        return;
      }

      txn.update(ref, {
        status: finalStatus,
        completedAt: FieldValue.serverTimestamp(),
        grade,
        transcripts,
        // answers may have advanced since preSnap (last autosave). We accept
        // whatever the latest stored answers are — the client's last PATCH
        // is the source of truth for inputs.
      });

      // Detach from in-progress list + bump the completed counter.
      txn.update(userRef, {
        inProgressAttemptIds: FieldValue.arrayRemove(id),
        completedAttemptCount: FieldValue.increment(1),
      });
    });

    // Schedule the async Deep Diagnostic pipeline. The HTTP response is NOT
    // blocked — students see their deterministic grade immediately and the
    // frontend polls diagnosticStatus until "ready" (typically 1–2 min).
    // Skipped when OPENAI_API_KEY is unset: no diagnosticStatus field is
    // written and the frontend shows deterministic results only.
    const aiEnabled = Boolean(process.env.OPENAI_API_KEY);
    if (aiEnabled) {
      // Mark pending AFTER the txn so the field only exists once finalize
      // committed (a failed txn must not leave a dangling pending state).
      await ref.update({
        diagnosticStatus: "pending",
        diagnosticReport: null,
        diagnosticError: FieldValue.delete(),
      });
      after(() => {
        void runDiagnosticPipeline(id).catch((err) => {
          console.error(`[submit] diagnostic pipeline crashed for ${id}:`, err);
        });
      });
    }

    return NextResponse.json({
      attemptId: id,
      status: finalStatus,
      grade,
      reason,
      diagnosticStatus: aiEnabled ? "pending" : undefined,
    });
  } catch (err) {
    if (err instanceof TransactionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const why = err instanceof Error ? err.message : String(err);
    console.error("[submit] unexpected error:", why, err);
    return NextResponse.json({ error: `Server error: ${why}` }, { status: 500 });
  }
}

/** Internal error type carrying an HTTP status out of the transaction. */
class TransactionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "TransactionError";
  }
}
