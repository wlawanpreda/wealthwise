import { SESSION_COOKIE_NAME } from "@/lib/auth/cookie-name";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = req.cookies.has(SESSION_COOKIE_NAME);

  // API routes handle their own auth — never redirect them.
  // Redirecting POST → GET breaks the client and produces confusing errors.
  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const isPublic =
    pathname === "/login" || pathname.startsWith("/_next") || pathname.startsWith("/favicon");

  if (isPublic) {
    if (pathname === "/login" && hasSession) {
      return NextResponse.redirect(new URL("/", req.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
