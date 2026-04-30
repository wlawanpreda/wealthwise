"use server";

import { requireSessionUser } from "@/lib/auth/session";
import { getServerEnv } from "@/lib/env";
import { getAdminDb } from "@/lib/firebase/admin";
import type { FinancialAccount } from "@/lib/schemas";

interface ExternalHolding {
  name?: string;
  value?: number;
  amount?: number;
  accountName?: string;
}

export async function syncExternalInvestments(): Promise<{
  ok: true;
  accounts: FinancialAccount[];
}> {
  const user = await requireSessionUser();
  const env = getServerEnv();
  const accounts: FinancialAccount[] = [];

  // Source 1 — retire-tax
  try {
    const dbTax = getAdminDb(env.RETIRE_TAX_DB_ID);
    const userDoc = await dbTax.collection("users").doc(user.uid).get();
    if (userDoc.exists) {
      const data = userDoc.data() ?? {};
      const holdings = (data.current_portfolio?.holdings ?? []) as ExternalHolding[];
      for (const [idx, h] of holdings.entries()) {
        accounts.push({
          id: `ext-tax-${user.uid}-${idx}`,
          name: h.name ?? `Asset ${idx + 1} (Retire-Tax)`,
          amount: h.value ?? h.amount ?? 0,
          purpose: `Synced from Retire-Tax: ${h.name ?? "Holding"}`,
          isEmergencyFund: false,
          type: "Investment",
          transactions: [],
        });
      }
    }
  } catch (err) {
    console.warn("retire-tax sync failed", err);
  }

  // Source 2 — retire-5%
  try {
    const db5 = getAdminDb(env.RETIRE_5_PERCENT_DB_ID);
    const investmentsSnap = await db5
      .collection("users")
      .doc(user.uid)
      .collection("investments")
      .get();
    for (const doc of investmentsSnap.docs) {
      const data = doc.data() as ExternalHolding;
      const name = data.name ?? data.accountName ?? `Asset ${doc.id.slice(0, 4)} (Retire-5%)`;
      accounts.push({
        id: `ext-5p-${user.uid}-${doc.id}`,
        name,
        amount: data.amount ?? data.value ?? 0,
        purpose: `Synced from Retire-5%: ${name}`,
        isEmergencyFund: false,
        type: "Investment",
        transactions: [],
      });
    }
  } catch (err) {
    console.warn("retire-5% sync failed", err);
  }

  return { ok: true, accounts };
}
