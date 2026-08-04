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

/** Lazy initializer — runs once per server process. */
function init(): AdminApp {
  if (_app) return _app;
  assertServiceAccount();
  // Reuse existing app across hot-reloads in dev.
  _app = getApps().length ? getApps()[0]! : initializeApp({ credential: cert(serviceAccount) });
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
