/**
 * Firebase Admin SDK singleton — SERVER ONLY.
 *
 * Used by Route Handlers to verify Firebase ID tokens and perform privileged
 * Firestore writes (credit grants, payment-request reviews) that the security
 * rules forbid from the client.
 *
 * NEVER import this from a client component. Only Route Handlers / server
 * utilities may use it. Next.js bundler keeps it out of the client bundle as
 * long as imports are confined to `route.ts` files and server-only modules.
 *
 * Service account is read from env. On dev the private key is stored with
 * literal "\n" escapes (single-line in .env.local); we replace them with real
 * newlines so the SDK accepts the PEM.
 */
import {
  cert,
  getApps,
  initializeApp,
  type App as AdminApp,
} from "firebase-admin/app";
import { getAuth, type Auth as AdminAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore as AdminFirestore } from "firebase-admin/firestore";
import { getStorage, type Storage as AdminStorage } from "firebase-admin/storage";

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  // .env.local stores the PEM as one line with literal "\n"; restore real newlines.
  privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
};

function assertServiceAccount(): void {
  const missing = (Object.entries(serviceAccount) as [string, string][])
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(
      `firebase-admin service account missing env: ${missing.join(", ")}. ` +
        `See .env.local.example → "Task 3 (Payment Backend)".`
    );
  }
}

let _app: AdminApp | null = null;

/**
 * Resolve the Storage bucket name.
 *
 * Modern Firebase projects (created after Oct 2024) use the
 * `{projectId}.firebasestorage.app` format. Legacy projects use
 * `{projectId}.appspot.com`. We prefer an explicit override env var, then
 * the modern format. We resolve this lazily on every call rather than once
 * at init() so a dev-server hot-reload that re-creates the default app
 * doesn't lose the bucket binding.
 */
export function storageBucketName(): string {
  return (
    process.env.FIREBASE_STORAGE_BUCKET ??
    `${process.env.FIREBASE_PROJECT_ID}.firebasestorage.app`
  );
}

/** Lazy initializer — runs once per server process. */
function init(): AdminApp {
  if (_app) return _app;
  assertServiceAccount();
  // Reuse existing app across hot-reloads in dev. The Storage bucket is
  // pinned here too, but callers should prefer adminStorage().bucket() which
  // resolves it lazily to survive re-init edge cases.
  _app = getApps().length ? getApps()[0]! : initializeApp({
    credential: cert(serviceAccount),
    storageBucket: storageBucketName(),
  });
  return _app;
}

export function adminApp(): AdminApp {
  return init();
}

export function adminAuth(): AdminAuth {
  return getAuth(init());
}

export function adminDb(): AdminFirestore {
  return getFirestore(init());
}

/**
 * Default Cloud Storage bucket handle. Used by the speaking-audio upload and
 * Whisper transcription paths. The bucket name is resolved lazily on every
 * call (not cached at init) so we survive hot-reloads that re-init the app
 * without the storageBucket option.
 */
export function adminStorage(): AdminStorage {
  return getStorage(init());
}
