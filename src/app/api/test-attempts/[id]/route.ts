/**
 * GET  /api/test-attempts/[id]   — hydrate (resume).
 * PATCH /api/test-attempts/[id]  — auto-save forward-progress fields.
 *
 * Both verify ownership (attempt.uid === caller uid) and refuse if the attempt
 * is not in-progress. PATCH only ever merges the three forward-progress fields
 * (stationIndex, answers, tabSwitchCount) — never status, creditsConsumed,
 * startedAt, expiresAt, or grade. Those are server-owned lifecycle fields.
 */
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/auth/admin-guard";
import { PATCHABLE_FIELDS, type AnswersMap, type TestAttempt } from "@/lib/exam/attempt-types";
import { Timestamp } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    console.warn("[GET test-attempts] auth failed", auth.status, auth.error);
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const uid = auth.decoded!.uid;
  const { id } = await ctx.params;
  console.info("[GET test-attempts]", { id, caller: uid });

  const db = adminDb();
  const snap = await db.doc(`testAttempts/${id}`).get();
  if (!snap.exists) {
    console.warn("[GET test-attempts] not found", id);
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }
  const data = snap.data() as TestAttempt;
  if (data.uid !== uid) {
    // Don't leak existence — return 404 for someone else's attempt too.
    console.warn("[GET test-attempts] ownership mismatch", {
      id,
      owner: data.uid,
      caller: uid,
    });
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }

  console.info("[GET test-attempts] ok", {
    id,
    status: data.status,
    stationIndex: data.stationIndex,
    answerCount: Object.keys(data.answers ?? {}).length,
    expiresAt: data.expiresAt ? "set" : "null",
  });

  // Expose expiresAt as epoch ms for the client timer.
  const expiresAtMs =
    data.expiresAt instanceof Timestamp
      ? (data.expiresAt as Timestamp).toMillis()
      : null;
  return NextResponse.json({
    attempt: {
      ...data,
      id,
      expiresAtMs,
    },
  });
}

export async function PATCH(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const uid = auth.decoded!.uid;
  const { id } = await ctx.params;

  // Parse + validate the incoming patch shape.
  let body: {
    stationIndex?: unknown;
    answers?: unknown;
    tabSwitchCount?: unknown;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const patch: Record<string, unknown> = {};

  if (body.stationIndex !== undefined) {
    if (
      typeof body.stationIndex !== "number" ||
      !Number.isInteger(body.stationIndex) ||
      body.stationIndex < 0 ||
      body.stationIndex > 3
    ) {
      return NextResponse.json(
        { error: "stationIndex must be an integer 0–3." },
        { status: 400 }
      );
    }
    patch.stationIndex = body.stationIndex;
  }

  if (body.answers !== undefined) {
    // The client posts its full answers map. We accept it as-is — it only
    // contains user inputs, never a grade. Field shape is validated lightly
    // (must be a plain object of answer records).
    if (!isPlainObject(body.answers)) {
      return NextResponse.json({ error: "answers must be an object." }, { status: 400 });
    }
    patch.answers = body.answers as AnswersMap;
  }

  if (body.tabSwitchCount !== undefined) {
    if (
      typeof body.tabSwitchCount !== "number" ||
      !Number.isInteger(body.tabSwitchCount) ||
      body.tabSwitchCount < 0
    ) {
      return NextResponse.json(
        { error: "tabSwitchCount must be a non-negative integer." },
        { status: 400 }
      );
    }
    patch.tabSwitchCount = body.tabSwitchCount;
  }

  // No recognized forward-progress field? Reject — this guards against a
  // client trying to smuggle unrecognized fields through (they'd be ignored
  // by Firestore anyway, but we want the contract explicit).
  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: `PATCH must include at least one of: ${PATCHABLE_FIELDS.join(", ")}.` },
      { status: 400 }
    );
  }

  const db = adminDb();
  const ref = db.doc(`testAttempts/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }
  const data = snap.data() as TestAttempt;
  if (data.uid !== uid) {
    return NextResponse.json({ error: "Attempt not found." }, { status: 404 });
  }
  if (data.status !== "in-progress") {
    return NextResponse.json(
      { error: `Attempt is ${data.status}; cannot save.` },
      { status: 409 }
    );
  }

  await ref.update(patch);
  return NextResponse.json({ savedAt: Date.now() });
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
