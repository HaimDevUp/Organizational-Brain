import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isAuthDisabled } from "@/lib/auth-disabled";

const PUBLIC_API_PREFIXES = ["/api/auth", "/api/health"];

/** Auth.js v5 session cookie names (incl. chunked variants). */
const SESSION_COOKIE_PREFIXES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
  "__Host-authjs.session-token",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
];

function hasSessionCookie(req: NextRequest): boolean {
  return req.cookies.getAll().some((cookie) =>
    SESSION_COOKIE_PREFIXES.some(
      (prefix) => cookie.name === prefix || cookie.name.startsWith(`${prefix}.`)
    )
  );
}

function withRequestId(response: NextResponse) {
  if (!response.headers.get("x-request-id")) {
    response.headers.set("x-request-id", crypto.randomUUID());
  }
  return response;
}

export default function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  if (isAuthDisabled()) {
    if (path.startsWith("/login")) {
      return withRequestId(NextResponse.redirect(new URL("/dashboard", req.url)));
    }
    const res = withRequestId(NextResponse.next());
    res.headers.set("x-auth-disabled", "1");
    return res;
  }

  const isLoggedIn = hasSessionCookie(req);
  const isAuthPage = path.startsWith("/login");
  const isPublicApi = PUBLIC_API_PREFIXES.some((p) => path.startsWith(p));
  const isProtectedApi = path.startsWith("/api/v1");

  if (isPublicApi) return NextResponse.next();

  if (isProtectedApi && !isLoggedIn) {
    return NextResponse.json(
      {
        type: "https://obos.app/errors/unauthorized",
        title: "Unauthorized",
        status: 401,
        detail: "Sign in required",
      },
      { status: 401 }
    );
  }

  if (!isLoggedIn && !isAuthPage && !path.startsWith("/api")) {
    return withRequestId(NextResponse.redirect(new URL("/login", req.url)));
  }

  if (isLoggedIn && isAuthPage) {
    return withRequestId(NextResponse.redirect(new URL("/dashboard", req.url)));
  }

  return withRequestId(NextResponse.next());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
