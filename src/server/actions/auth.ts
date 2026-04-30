"use server";

import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { z } from "zod";

const idTokenSchema = z.object({ idToken: z.string().min(20) });

export async function signInWithIdToken(formData: FormData): Promise<void> {
  const parsed = idTokenSchema.safeParse({ idToken: formData.get("idToken") });
  if (!parsed.success) {
    throw new Error("Invalid ID token");
  }
  await setSessionCookie(parsed.data.idToken);
  redirect("/");
}

export async function signOut(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}
