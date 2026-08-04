/**
 * POST /api/admin/payment-requests/[id]/reject
 *
 * Admin-only. Rejects a pending payment request with a reason.
 *
 * Rejection does NOT touch credits or usedTrxIds — the user keeps whatever
 * balance they had and may resubmit with a corrected TrxID. Only the request
 * doc is updated.
 */
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/auth/admin-guard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const adminUid = auth.decoded!.uid;
  const { id } = await ctx.params;

  let body: { reason?: unknown };
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const reason =
    typeof body.reason === "string" && body.reason.trim()
      ? body.reason.trim().slice(0, 280)
      : "Payment could not be verified.";

  const db = adminDb();
  const reqRef = db.doc(`paymentRequests/${id}`);

  const snap = await reqRef.get();
  if (!snap.exists) {
    return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
  }
  if (snap.data()?.status !== "pending") {
    return NextResponse.json(
      { error: `Request already ${snap.data()?.status}. Cannot reject.` },
      { status: 409 }
    );
  }

  try {
    await reqRef.update({
      status: "rejected",
      rejectReason: reason,
      reviewedAt: FieldValue.serverTimestamp(),
      reviewedBy: adminUid,
    });
  } catch (err) {
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[reject] unexpected error:", reason, err);
    return NextResponse.json(
      { error: `Server error: ${reason}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ id, status: "rejected" });
}
