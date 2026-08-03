/**
 * Firebase client SDK singleton.
 *
 * Initializes Auth + Firestore on the browser. Guards against double-init
 * (React strict mode in dev mounts the provider twice). Public config only —
 * no service account. Security is enforced by firestore.rules, not by hiding keys.
 */
import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function assertConfig(): void {
  const missing = Object.entries(firebaseConfig)
    .filter(([, v]) => !v)
    .map(([k]) => k);
  if (missing.length) {
    throw new Error(
      `Firebase config missing: ${missing.join(", ")}. ` +
        `Copy .env.local.example to .env.local and fill in real values.`
    );
  }
}

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;

/** Lazy initializer — only runs in the browser, only once. */
function init(): { app: FirebaseApp; auth: Auth; db: Firestore } {
  if (_app && _auth && _db) return { app: _app, auth: _auth, db: _db };
  assertConfig();
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  _app = app;
  _auth = getAuth(app);
  _db = getFirestore(app);
  return { app, auth: _auth, db: _db };
}

export function getFirebase() {
  return init();
}

export function firebaseAuth(): Auth {
  return init().auth;
}

export function firebaseDb(): Firestore {
  return init().db;
}
