/**
 * App-wide server config for the bKash manual-payment flow.
 *
 * These are NOT prefixed NEXT_PUBLIC_ unless explicitly noted — they must stay
 * server-only. The purchase UI receives bKash number + price via a dedicated
 * (public) config endpoint or reads NEXT_PUBLIC_ copies, see notes below.
 */
import { MODULE_KEYS, type ModuleKey } from "./firebase/user-types";

/** Comma-separated admin uids in env. Empty list = no admins (fail-closed). */
const ADMIN_UIDS_RAW = process.env.ADMIN_UIDS ?? "";

/** Parsed set of admin uids for O(1) membership check. */
export const ADMIN_UIDS: ReadonlySet<string> = new Set(
  ADMIN_UIDS_RAW.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

/** Personal bKash number users send 50 BDT to. Public (shown on purchase page). */
export const BKASH_NUMBER = process.env.BKASH_NUMBER ?? "";

/** Public bKash number mirrored as NEXT_PUBLIC_ so the client can render it. */
export const NEXT_PUBLIC_BKASH_NUMBER = process.env.NEXT_PUBLIC_BKASH_NUMBER ?? "";

/** Price per module attempt in BDT. Server is the source of truth. */
export const MODULE_PRICE = Number(process.env.MODULE_PRICE ?? 50);

/** Validate a module key against the known set. */
export function isModuleKey(value: unknown): value is ModuleKey {
  return typeof value === "string" && (MODULE_KEYS as string[]).includes(value);
}

/** True if uid is in the admin allowlist. */
export function isAdminUid(uid: string | undefined | null): uid is string {
  return !!uid && ADMIN_UIDS.has(uid);
}
