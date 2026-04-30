import "server-only";
import { getServerEnv } from "@/lib/env";
import { type App, cert, getApps, initializeApp } from "firebase-admin/app";
import { type Auth, getAuth } from "firebase-admin/auth";
import { type Firestore, getFirestore } from "firebase-admin/firestore";

let adminApp: App | undefined;

function buildCredential() {
  const env = getServerEnv();
  const raw = env.FIREBASE_ADMIN_SERVICE_ACCOUNT.trim();
  let parsed: { project_id: string; client_email: string; private_key: string };
  try {
    parsed = JSON.parse(raw);
  } catch {
    // Some hosts strip newlines from PEM; allow base64-encoded JSON as fallback
    try {
      parsed = JSON.parse(Buffer.from(raw, "base64").toString("utf8"));
    } catch {
      throw new Error(
        "FIREBASE_ADMIN_SERVICE_ACCOUNT must be a JSON string or base64-encoded JSON",
      );
    }
  }
  return cert({
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    privateKey: parsed.private_key.replace(/\\n/g, "\n"),
  });
}

export function getAdminApp(): App {
  if (adminApp) return adminApp;
  const existing = getApps();
  const first = existing[0];
  adminApp = first ?? initializeApp({ credential: buildCredential() });
  return adminApp;
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(databaseId?: string): Firestore {
  const app = getAdminApp();
  if (databaseId) {
    return getFirestore(app, databaseId);
  }
  return getFirestore(app);
}
