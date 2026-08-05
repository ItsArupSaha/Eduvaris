/**
 * POST /api/test-attempts/start
 *
 * Begins (or resumes) a Reading attempt. Atomic, idempotent, server-only:
 *
 *   1. Auth — verify the Firebase ID token.
 *   2. RESUME-FIRST — if the user already has an in-progress reading attempt,
 *      return it. This is the anti-double-charge lock: refresh, double-click,
 *      re-enter all hit the same attempt, never burn a second credit.
 *   3. Stale cleanup — any in-progress attempt older than 24h is marked
 *      expired (lazy, no cron) and removed from the in-progress list before
 *      we consider starting a fresh one.
 *   4. Credit check — if credits.reading <= 0, 402. No credit, no attempt.
 *   5. Atomically: decrement credit by 1, push new attemptId onto
 *      inProgressAttemptIds, create the attempt doc with status in-progress
 *      and a server-set expiresAt (startedAt + durationSeconds).
 *
 * Security: this route is the ONLY client-facing path that mutates credits
 * downward. Firestore rules deny client writes to users/{uid} and
 * testAttempts/{id} entirely, so a tampering client cannot bypass this gate.
 */
import { NextResponse } from "next/server";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/auth/admin-guard";
import { activeFormFor } from "@/lib/exam/exam-forms";
import type { TestAttempt } from "@/lib/exam/attempt-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** A Reading attempt older than this (in-progress) is auto-expired. */
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

interface StartRequestBody {
  module?: unknown;
}

export async function POST(request: Request) {
  // 1. Auth.
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const uid = auth.decoded!.uid;

  // 2. Parse + validate body. Only reading + listening ship in this build.
  let body: StartRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (body.module !== "reading" && body.module !== "listening") {
    return NextResponse.json(
      { error: "Only reading and listening modules are available in this build." },
      { status: 400 }
    );
  }

  const db = adminDb();
  const userRef = db.doc(`users/${uid}`);

  // We compute the new attempt id up front so we can use it inside the txn.
  const newAttemptRef = db.collection("testAttempts").doc();
  const newAttemptId = newAttemptRef.id;

  // These are captured from inside the txn for the response.
  let resumedId: string | null = null;
  let createdId: string | null = null;
  let attemptExpiresAtEpoch: number | null = null;

  try {
    await db.runTransaction(async (txn) => {
      const userSnap = await txn.get(userRef);
      if (!userSnap.exists) {
        throw new TransactionError(
          404,
          "User profile not found. Sign out and back in; if it persists, contact support."
        );
      }
      const data = userSnap.data() as {
        credits: { reading: number };
        inProgressAttemptIds?: string[];
      };

      const nowMs = Date.now();
      const moduleKey = body.module as "reading" | "listening";

      // 3. Walk the in-progress list. Lazy-clean stale ones; resume the first
      // fresh in-progress attempt FOR THIS MODULE if one exists.
      const inProgress = Array.isArray(data.inProgressAttemptIds)
        ? data.inProgressAttemptIds
        : [];
      const cleaned: string[] = [];
      for (const aid of inProgress) {
        const aSnap = await txn.get(db.doc(`testAttempts/${aid}`));
        if (!aSnap.exists) continue; // orphan id — drop it
        const a = aSnap.data() as TestAttempt;
        if (a.module !== moduleKey) {
          cleaned.push(aid); // other module — keep, don't touch
          continue;
        }
        if (a.status !== "in-progress") {
          continue; // already finalized — drop from in-progress list
        }
        const startedMs = a.startedAt instanceof Timestamp ? a.startedAt.toMillis() : 0;
        const stale = nowMs - startedMs > STALE_AFTER_MS;
        if (stale) {
          // Expire it. Remove from list. Do NOT refund — time was consumed.
          txn.update(db.doc(`testAttempts/${aid}`), {
            status: "expired",
            completedAt: FieldValue.serverTimestamp(),
          });
          continue;
        }
        // Fresh in-progress attempt for this module → resume it.
        resumedId = aid;
        const exp = a.expiresAt instanceof Timestamp ? a.expiresAt.toMillis() : 0;
        attemptExpiresAtEpoch = exp;
      }

      if (resumedId) {
        // Make sure the user's in-progress list no longer references stale ids.
        // (Forward write — happens after all reads.)
        txn.update(userRef, { inProgressAttemptIds: [resumedId, ...cleaned] });
        return; // resume path done; no credit charge.
      }

      // 4. Credit check for this module.
      const credits = (data.credits ?? {}) as Record<string, number>;
      if ((credits[moduleKey] ?? 0) <= 0) {
        throw new TransactionError(
          402,
          `You have no ${moduleKey} credit. Unlock the ${moduleKey.charAt(0).toUpperCase() + moduleKey.slice(1)} module to start.`
        );
      }

      // 5. Atomic start: decrement credit, push id, create attempt doc.
      const exam = activeFormFor(moduleKey);
      if (!exam) {
        throw new TransactionError(
          500,
          `No active exam form for module "${moduleKey}".`
        );
      }
      const expiresAt = Timestamp.fromMillis(
        nowMs + exam.durationSeconds * 1000
      );
      attemptExpiresAtEpoch = expiresAt.toMillis();

      const attemptDoc: TestAttempt = {
        uid,
        module: moduleKey,
        status: "in-progress",
        startedAt: FieldValue.serverTimestamp(),
        expiresAt,
        completedAt: null,
        examId: exam.id,
        examVersion: exam.version,
        stationIndex: 0,
        answers: {},
        tabSwitchCount: 0,
        creditsConsumed: 1,
        grade: null,
      };

      txn.set(newAttemptRef, attemptDoc);
      txn.update(userRef, {
        [`credits.${moduleKey}`]: FieldValue.increment(-1),
        inProgressAttemptIds: [newAttemptId, ...cleaned],
      });
      createdId = newAttemptId;
    });
  } catch (err) {
    if (err instanceof TransactionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[start] unexpected error:", reason, err);
    return NextResponse.json({ error: `Server error: ${reason}` }, { status: 500 });
  }

  // 6. Respond with the attempt id + expiry so the client can route + schedule
  // its timer without an extra round-trip.
  const id = resumedId ?? createdId;
  return NextResponse.json(
    {
      attemptId: id,
      resumed: resumedId !== null,
      expiresAt: attemptExpiresAtEpoch,
    },
    { status: resumedId ? 200 : 201 }
  );
}

/** Internal error type carrying an HTTP status out of the transaction. */
class TransactionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "TransactionError";
  }
}
