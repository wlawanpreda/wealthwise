import "server-only";
import { publicEnv } from "@/lib/env.client";
import { getAdminDb } from "@/lib/firebase/admin";
import { type FinancialPlan, FinancialPlanSchema } from "@/lib/schemas";

function planRef(uid: string) {
  // Use the same database the client writes to (Multi-database Firestore)
  const db = getAdminDb(publicEnv.NEXT_PUBLIC_FIREBASE_DATABASE_ID);
  return db.collection("users").doc(uid).collection("plan").doc("current");
}

export async function getPlan(uid: string): Promise<FinancialPlan | null> {
  const snap = await planRef(uid).get();
  if (!snap.exists) return null;
  const parsed = FinancialPlanSchema.safeParse(snap.data());
  if (!parsed.success) {
    console.warn(`Plan for ${uid} failed validation`, parsed.error.flatten());
    return null;
  }
  return parsed.data;
}

export async function upsertPlan(uid: string, plan: FinancialPlan): Promise<void> {
  const validated = FinancialPlanSchema.parse(plan);
  await planRef(uid).set(validated, { merge: false });
}

export async function deletePlan(uid: string): Promise<void> {
  await planRef(uid).delete();
}
