import "server-only";
import { SESSION_COOKIE_NAME } from "@/lib/auth/cookie-name";
import { getServerEnv } from "@/lib/env";
import { getAdminAuth } from "@/lib/firebase/admin";
import { cookies } from "next/headers";
import { cache } from "react";

export interface SessionUser {
  uid: string;
  email: string | null;
  emailVerified: boolean;
  name: string | null;
  picture: string | null;
}

export async function createSessionCookie(idToken: string): Promise<{
  cookie: string;
  maxAge: number;
}> {
  const env = getServerEnv();
  const expiresIn = env.SESSION_MAX_AGE_SECONDS * 1000;
  const sessionCookie = await getAdminAuth().createSessionCookie(idToken, { expiresIn });
  return { cookie: sessionCookie, maxAge: env.SESSION_MAX_AGE_SECONDS };
}

export async function setSessionCookie(idToken: string): Promise<void> {
  const env = getServerEnv();
  const { cookie, maxAge } = await createSessionCookie(idToken);
  const store = await cookies();
  store.set(SESSION_COOKIE_NAME, cookie, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE_NAME);
}

// `cache()` dedupes verification per-request — multiple Server Actions / RSC reads
// in the same request hit Firebase only once.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const cookie = store.get(SESSION_COOKIE_NAME)?.value;
  if (!cookie) return null;
  try {
    const decoded = await getAdminAuth().verifySessionCookie(cookie, true);
    return {
      uid: decoded.uid,
      email: decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
      name: (decoded.name as string | undefined) ?? null,
      picture: (decoded.picture as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
});

export async function requireSessionUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user;
}
