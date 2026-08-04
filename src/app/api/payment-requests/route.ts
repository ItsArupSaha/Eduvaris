/**
 * POST /api/payment-requests
 * GET  /api/payment-requests  (list the caller's own requests)
 *
 * User-facing. Verifies the Firebase ID token, then:
 *  - POST: validates module + TrxID, enforces the idempotency pre-check and the
 *    pending-cap, then writes a `paymentRequests/{id}` doc at status "pending".
 *  - GET: returns the caller's own requests (newest first).
 *
 * Credits are NEVER touched here — only an admin can approve.
 *
 * Note: uses the firebase-admin OOP API (db.doc(), db.collection().add(), etc.)
 * NOT the client modular functions (doc/addDoc) — those don't exist in admin SDK.
 */
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { requireUser } from "@/lib/auth/admin-guard";
import { isModuleKey, MODULE_PRICE } from "@/lib/config";
import { MODULE_LABELS, normalizeTrxId, TRXID_REGEX } from "@/lib/firebase/payment-types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  // 1. Auth.
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const uid = auth.decoded!.uid;

  // 2. Parse + validate body.
  let body: { module?: unknown; trxId?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isModuleKey(body.module)) {
    return NextResponse.json(
      { error: "Invalid module. Expected reading|listening|writing|speaking." },
      { status: 400 }
    );
  }

  const trxId =
    typeof body.trxId === "string" ? normalizeTrxId(body.trxId) : "";
  if (!TRXID_REGEX.test(trxId)) {
    return NextResponse.json(
      { error: "Invalid TrxID. Must be 10 uppercase alphanumeric characters." },
      { status: 400 }
    );
  }

  const db = adminDb();

  // 3. Idempotency pre-check: reject if TrxID already consumed.
  const usedSnap = await db.doc(`usedTrxIds/${trxId}`).get();
  if (usedSnap.exists) {
    return NextResponse.json(
      { error: "This TrxID has already been used for a payment." },
      { status: 409 }
    );
  }

  // 4. One pending request per module per user.
  // Stops same-module spam (legit user can still buy all 4 different modules
  // concurrently). usedTrxIds lock separately guards against double-credit on
  // the TrxID side.
  const dupSnap = await db
    .collection("paymentRequests")
    .where("uid", "==", uid)
    .where("module", "==", body.module)
    .where("status", "==", "pending")
    .get();
  if (!dupSnap.empty) {
    return NextResponse.json(
      {
        error: `You already have a pending request for ${MODULE_LABELS[body.module]}. Wait for it to be verified before submitting another.`,
      },
      { status: 409 }
    );
  }

  // 5. Create the pending request.
  const ref = await db.collection("paymentRequests").add({
    uid,
    module: body.module,
    amount: MODULE_PRICE,
    trxId,
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
    reviewedAt: null,
    reviewedBy: null,
    rejectReason: null,
  });

  return NextResponse.json(
    { requestId: ref.id, status: "pending" },
    { status: 201 }
  );
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const uid = auth.decoded!.uid;

  // uid equality + orderBy(createdAt desc) is covered by the composite index
  // declared in firestore.indexes.json.
  const snap = await adminDb()
    .collection("paymentRequests")
    .where("uid", "==", uid)
    .orderBy("createdAt", "desc")
    .limit(50)
    .get();
  const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return NextResponse.json({ items });
}
