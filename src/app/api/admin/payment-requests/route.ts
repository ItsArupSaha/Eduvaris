/**
 * GET /api/admin/payment-requests
 *
 * Admin-only. Returns the verification queue.
 *
 * Query params:
 *   ?status=pending|approved|rejected   (default: pending)
 *   ?limit=50                           (max 200)
 *
 * Ordered by createdAt ascending (oldest first = verify oldest payments first).
 */
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { PAYMENT_STATUSES, type PaymentStatus } from "@/lib/firebase/payment-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const url = new URL(request.url);
  const statusParam = (url.searchParams.get("status") ?? "pending") as PaymentStatus;
  if (!PAYMENT_STATUSES.includes(statusParam)) {
    return NextResponse.json(
      { error: `Invalid status. Expected one of: ${PAYMENT_STATUSES.join(", ")}.` },
      { status: 400 }
    );
  }
  const limitParam = Math.min(200, Math.max(1, Number(url.searchParams.get("limit") ?? 50)));

  const snap = await adminDb()
    .collection("paymentRequests")
    .where("status", "==", statusParam)
    .orderBy("createdAt", "asc")
    .limit(limitParam)
    .get();
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ items, status: statusParam });
}
