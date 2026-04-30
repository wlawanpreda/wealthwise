import { clearSessionCookie, setSessionCookie } from "@/lib/auth/session";
import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({ idToken: z.string().min(20) });

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
  try {
    await setSessionCookie(parsed.data.idToken);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("session create failed", err);
    return NextResponse.json({ error: "Authentication failed" }, { status: 401 });
  }
}

export async function DELETE() {
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
