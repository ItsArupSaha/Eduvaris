/**
 * Server-side request auth guards for Route Handlers.
 *
 * Every privileged endpoint MUST call one of these — never trust a client-sent
 * uid or role. The Authorization: Bearer <idToken> header is verified with the
 * Admin SDK; the uid is then checked against the admin allowlist.
 */
import { adminAuth } from "@/lib/firebase/admin";
import { isAdminUid } from "@/lib/config";
import type { DecodedIdToken } from "firebase-admin/auth";

export interface AuthResult {
  ok: boolean;
  status: number;
  error: string;
  decoded?: DecodedIdToken;
}

/**
 * Verify the caller is an authenticated user. Returns the decoded token on
 * success, or a failure result suitable for a 401 response.
 */
export async function requireUser(request: Request): Promise<AuthResult> {
  const decoded = await verifyBearer(request);
  if (!decoded.ok) return decoded;
  return { ok: true, status: 200, error: "", decoded: decoded.decoded };
}

/**
 * Verify the caller is an authenticated ADMIN (uid in allowlist). Use this for
 * all `/api/admin/*` endpoints. Fails closed if ADMIN_UIDS is empty.
 */
export async function requireAdmin(request: Request): Promise<AuthResult> {
  const decoded = await verifyBearer(request);
  if (!decoded.ok) return decoded;
  if (!isAdminUid(decoded.decoded!.uid)) {
    return {
      ok: false,
      status: 403,
      error: "Forbidden: admin access required.",
    };
  }
  return { ok: true, status: 200, error: "", decoded: decoded.decoded };
}

/** Extract + verify the Bearer token. Internal helper. */
async function verifyBearer(request: Request): Promise<AuthResult> {
  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Bearer ")) {
    return {
      ok: false,
      status: 401,
      error: "Missing or malformed Authorization header. Expected 'Bearer <idToken>'.",
    };
  }
  const idToken = header.slice("Bearer ".length).trim();
  try {
    const decoded = await adminAuth().verifyIdToken(idToken);
    return { ok: true, status: 200, error: "", decoded };
  } catch (err) {
    // Surface the REAL cause so setup issues (bad service account, mangled
    // private key, project mismatch) are debuggable instead of hidden behind a
    // generic "invalid token" message. Also echoes to the server terminal.
    const reason = err instanceof Error ? err.message : String(err);
    console.error("[verifyBearer] token verification failed:", reason);
    return {
      ok: false,
      status: 401,
      error: `Token verification failed: ${reason}`,
    };
  }
}
