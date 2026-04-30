"use server";

import { requireSessionUser } from "@/lib/auth/session";
import { buildSampleSeedPlan } from "@/lib/defaults";
import { deletePlan, getPlan, upsertPlan } from "@/lib/firebase/plan-repository";
import { type FinancialPlan, FinancialPlanSchema } from "@/lib/schemas";

export async function fetchOrSeedPlan(): Promise<FinancialPlan> {
  const user = await requireSessionUser();
  const existing = await getPlan(user.uid);
  if (existing) return existing;
  const seed = buildSampleSeedPlan();
  await upsertPlan(user.uid, seed);
  return seed;
}

// Note: deliberately does NOT call revalidatePath — client store is the source
// of truth during a session and this action runs on every debounced keystroke.
// Revalidating would thrash the RSC cache and cause unnecessary re-fetches.
export async function savePlan(
  rawPlan: unknown,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireSessionUser();
  if (!user.emailVerified) {
    return { ok: false, error: "Email not verified" };
  }
  const parsed = FinancialPlanSchema.safeParse(rawPlan);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }
  await upsertPlan(user.uid, parsed.data);
  return { ok: true };
}

export async function resetPlan(): Promise<void> {
  const user = await requireSessionUser();
  await deletePlan(user.uid);
}
