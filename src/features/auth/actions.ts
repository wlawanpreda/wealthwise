"use server";

import { clearSessionCookie } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
