/**
 * POST /api/test-attempts/[id]/beacon
 *
 * Best-effort save triggered by `navigator.sendBeacon` on page unload.
 * `sendBeacon` cannot set custom headers (no Authorization), so the Firebase
 * ID token travels in the JSON body instead. The token is still verified
 * server-side via requireUser-equivalent logic — same security, different
 * transport.
 *
 * Semantically identical to PATCH /test-attempts/[id] but:
 *   - accepts the token in-body
 *   - is fire-and-forget (caller never reads the response)
 *   - tolerates being called on an already-finalized attempt (204 no-op)
 *
 * Never used for grading. If the beacon is lost, submit-on-revisit catches
 * the state on next load. This endpoint only protects the in-progress
 * answers map across a tab close.
 */
import { NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";
import { adminDb } from "@/lib/firebase/admin";
import type { AnswersMap, TestAttempt } from "@/lib/exam/attempt-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface BeaconBody {
  idToken?: unknown;
  stationIndex?: unknown;
  answers?: unknown;
  tabSwitchCount?: unknown;
}

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;

  let body: BeaconBody;
  try {
    body = (await request.json()) as BeaconBody;
  } catch {
    return NextResponse.json({}, { status: 400 });
  }

  // Verify the token from the body. sendBeacon can't set headers.
  if (typeof body.idToken !== "string" || !body.idToken) {
    return NextResponse.json({ error: "Missing token." }, { status: 401 });
  }
  let uid: string;
  try {
    const decoded = await adminAuth().verifyIdToken(body.idToken);
    uid = decoded.uid;
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: `Token verification failed: ${reason}` },
      { status: 401 }
    );
  }

  // Validate patch fields (same rules as PATCH /test-attempts/[id]).
  const patch: Record<string, unknown> = {};
  if (
    body.stationIndex !== undefined &&
    typeof body.stationIndex === "number" &&
    Number.isInteger(body.stationIndex) &&
    body.stationIndex >= 0 &&
    body.stationIndex <= 3
  ) {
    patch.stationIndex = body.stationIndex;
  }
  if (body.answers !== undefined && isPlainObject(body.answers)) {
    patch.answers = body.answers as AnswersMap;
  }
  if (
    body.tabSwitchCount !== undefined &&
    typeof body.tabSwitchCount === "number" &&
    Number.isInteger(body.tabSwitchCount) &&
    body.tabSwitchCount >= 0
  ) {
    patch.tabSwitchCount = body.tabSwitchCount;
  }

  if (Object.keys(patch).length === 0) {
    return new NextResponse(null, { status: 204 });
  }

  const db = adminDb();
  const ref = db.doc(`testAttempts/${id}`);
  const snap = await ref.get();
  if (!snap.exists) {
    return NextResponse.json({}, { status: 404 });
  }
  const data = snap.data() as TestAttempt;
  if (data.uid !== uid) {
    return NextResponse.json({}, { status: 404 });
  }
  if (data.status !== "in-progress") {
    // Already finalized — silent no-op so a late beacon doesn't 500.
    return new NextResponse(null, { status: 204 });
  }

  await ref.update(patch);
  return new NextResponse(null, { status: 204 });
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}
