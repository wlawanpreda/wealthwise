import { DashboardShell } from "@/features/dashboard/components/dashboard-shell";
import { FinancialBootstrap } from "@/features/dashboard/components/financial-bootstrap";
import { getSessionUser } from "@/lib/auth/session";
import { fetchOrSeedPlan } from "@/server/actions/plan";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const plan = await fetchOrSeedPlan();

  return (
    <FinancialBootstrap initialPlan={plan}>
      <DashboardShell
        user={{
          uid: user.uid,
          email: user.email,
          name: user.name,
          picture: user.picture,
        }}
      />
    </FinancialBootstrap>
  );
}
