import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_API_PREFIXES = ["/api/auth", "/api/health"];

function isAuthDisabled(): boolean {
  return process.env.DISABLE_AUTH === "true" && process.env.NODE_ENV !== "production";
}

function withRequestId(response: NextResponse) {
  if (!response.headers.get("x-request-id")) {
    response.headers.set("x-request-id", crypto.randomUUID());
  }
  return response;
}

function devMiddleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (path.startsWith("/login")) {
    return withRequestId(
      NextResponse.redirect(new URL("/dashboard", req.url))
    );
  }
  const res = withRequestId(NextResponse.next());
  res.headers.set("x-auth-disabled", "1");
  return res;
}

const authProtected = auth((req) => {
  const isLoggedIn = !!req.auth?.user;
  const path = req.nextUrl.pathname;
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
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return withRequestId(NextResponse.next());
});

export default function middleware(req: NextRequest) {
  if (isAuthDisabled()) return devMiddleware(req);
  return authProtected(req);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
