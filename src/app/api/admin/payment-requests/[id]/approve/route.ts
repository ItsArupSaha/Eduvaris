/**
 * POST /api/admin/payment-requests/[id]/approve
 *
 * Admin-only. Approves a pending payment request and grants the credit.
 *
 * Atomic transaction guarantees all-or-nothing:
 *   1. Re-read the request inside the txn — bail if not "pending".
 *   2. Create `usedTrxIds/{trxId}` (create-only; abort if exists = double-grant).
 *   3. Set request → approved + review metadata.
 *   4. Increment `users/{uid}.credits[module]` by +1.
 *
 * The credit increment uses FieldValue.increment, atomic within the transaction.
 * The ledger entry is written AFTER the txn commits (audit record, not a gate —
 * if it fails we log but don't roll back the grant).
 *
 * Why read-then-write inside the txn: prevents two concurrent admin approvals
 * from both seeing "pending" and double-granting.
 */
import { NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { requireAdmin } from "@/lib/auth/admin-guard";
import { isModuleKey } from "@/lib/config";
import { MODULE_KEYS, type ModuleKey } from "@/lib/firebase/user-types";

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

  const db = adminDb();
  const reqRef = db.doc(`paymentRequests/${id}`);

  // Pre-fetch the payment request OUTSIDE the txn so we can (a) fail fast on
  // 404/already-resolved without consuming a txn, and (b) look up the Auth
  // record for the requester BEFORE the txn (Auth SDK calls aren't Firestore
  // reads and can't go inside runTransaction's read-before-write window).
  const preSnap = await reqRef.get();
  if (!preSnap.exists) {
    return NextResponse.json({ error: "Payment request not found." }, { status: 404 });
  }
  const preData = preSnap.data() as {
    uid: string;
    module: string;
    trxId: string;
    status: string;
  };
  if (preData.status !== "pending") {
    return NextResponse.json(
      { error: `Request already ${preData.status}. Cannot approve.` },
      { status: 409 }
    );
  }
  if (!isModuleKey(preData.module)) {
    return NextResponse.json(
      { error: `Request has invalid module: ${preData.module}` },
      { status: 400 }
    );
  }

  // Pre-fetch the requester's Auth record so the create-if-missing path (rare
  // edge case now that /api/profile/init is the real fix) still writes real
  // email/name instead of blanks. Falls back gracefully if the Auth user is
  // somehow gone.
  let authInfo = { email: "", displayName: "", photoURL: "" };
  try {
    const ur = await adminAuth().getUser(preData.uid);
    authInfo = {
      email: ur.email ?? "",
      displayName: ur.displayName ?? "",
      photoURL: ur.photoURL ?? "",
    };
  } catch {
    /* Auth user missing — create profile with blanks. */
  }

  // Result captured from inside the transaction for the ledger write + response.
  let grantedModule: string | null = null;
  let grantedUid: string | null = null;

  try {
    await db.runTransaction(async (txn) => {
      // Re-read inside the txn to catch concurrent state changes (another admin
      // approved/rejected between our pre-fetch and now).
      const snap = await txn.get(reqRef);
      if (!snap.exists) {
        throw new TransactionError(404, "Payment request not found.");
      }
      const data = snap.data() as {
        uid: string;
        module: string;
        trxId: string;
        status: string;
      };
      if (data.status !== "pending") {
        throw new TransactionError(
          409,
          `Request already ${data.status}. Cannot approve.`
        );
      }

      // Idempotency lock — create-only.
      const usedRef = db.doc(`usedTrxIds/${data.trxId}`);
      const usedSnap = await txn.get(usedRef);
      if (usedSnap.exists) {
        throw new TransactionError(
          409,
          "This TrxID was already credited to another request."
        );
      }

      // Pre-read the user profile BEFORE any write — Firestore requires ALL
      // transaction reads to happen before ALL writes.
      const userRef = db.doc(`users/${data.uid}`);
      const userSnap = await txn.get(userRef);

      // --- All reads done above. Writes below, in any order. ---

      // 1. Acquire the lock.
      txn.set(usedRef, {
        requestId: id,
        uid: data.uid,
        approvedAt: FieldValue.serverTimestamp(),
      });

      // 2. Mark request approved.
      txn.update(reqRef, {
        status: "approved",
        reviewedAt: FieldValue.serverTimestamp(),
        reviewedBy: adminUid,
      });

      // 3. Grant the credit. If the profile doc is missing (only reachable if
      //    /api/profile/init somehow never ran AND its retries exhausted — now
      //    a true edge case), create it server-side with real Auth data and
      //    the granted module already at 1. A verified payment must NEVER be
      //    lost to a missing profile doc. Admin SDK bypasses rules.
      const grantedModuleKey = data.module as ModuleKey;
      if (!userSnap.exists) {
        const freshCredits = MODULE_KEYS.reduce(
          (acc, k) => {
            acc[k] = k === grantedModuleKey ? 1 : 0;
            return acc;
          },
          {} as Record<ModuleKey, number>
        );
        txn.set(userRef, {
          uid: data.uid,
          email: authInfo.email,
          displayName: authInfo.displayName,
          photoURL: authInfo.photoURL,
          createdAt: FieldValue.serverTimestamp(),
          lastActiveAt: FieldValue.serverTimestamp(),
          freeDemoUsed: false,
          demoModule: null,
          credits: freshCredits,
          inProgressAttemptIds: [],
          completedAttemptCount: 0,
        });
      } else {
        txn.update(userRef, {
          [`credits.${data.module}`]: FieldValue.increment(1),
        });
      }

      grantedModule = data.module;
      grantedUid = data.uid;
    });
  } catch (err) {
    if (err instanceof TransactionError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // Don't re-throw — that produces an opaque 500 HTML page. Log the real
    // cause server-side and return it as JSON so the admin UI can show it.
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[approve] unexpected error:", reason, err);
    return NextResponse.json(
      { error: `Server error: ${reason}` },
      { status: 500 }
    );
  }

  // 4. Best-effort ledger entry (after commit). Audit-only; failure logged.
  if (grantedUid && grantedModule) {
    try {
      await db.collection("credits").add({
        uid: grantedUid,
        module: grantedModule,
        amount: 1,
        source: "manual-bkash",
        requestId: id,
        grantedAt: FieldValue.serverTimestamp(),
        grantedBy: adminUid,
      });
    } catch (err) {
      // Don't fail the approval — the credit is already granted. Log server-side.
      console.error(
        `[approve] Ledger write failed for request ${id} (credit already granted):`,
        err
      );
    }
  }

  return NextResponse.json({ id, status: "approved" });
}

/** Internal error type carrying an HTTP status out of the transaction. */
class TransactionError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "TransactionError";
  }
}
