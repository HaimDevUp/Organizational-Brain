import { NextResponse } from "next/server";
import { AppError } from "@obos/shared";
import { auth } from "@/lib/auth";
import { isAuthDisabled, getDevAuthUser } from "@/lib/dev-auth";

export async function getSessionUser() {
  if (isAuthDisabled()) {
    return getDevAuthUser();
  }
  const session = await auth();
  if (!session?.user?.id) return null;
  return session.user;
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json(data, { status });
}

export function jsonError(error: unknown, instance?: string) {
  if (error instanceof AppError) {
    return NextResponse.json(error.toProblem(instance), { status: error.status });
  }
  if (error instanceof Error && error.message.startsWith("Missing permission")) {
    return NextResponse.json(
      {
        type: "https://obos.app/errors/forbidden",
        title: "Forbidden",
        status: 403,
        detail: error.message,
        instance,
      },
      { status: 403 }
    );
  }
  if (isConnectionRefused(error)) {
    return NextResponse.json(
      {
        type: "https://obos.app/errors/service-unavailable",
        title: "Search Unavailable",
        status: 503,
        detail:
          "Qdrant is not reachable. Set QDRANT_URL and QDRANT_API_KEY to your Qdrant Cloud cluster (not localhost) in apps/web/.env.local locally and in Vercel env vars for production.",
        instance,
      },
      { status: 503 }
    );
  }
  console.error(error);
  return NextResponse.json(
    {
      type: "https://obos.app/errors/internal",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred",
      instance,
    },
    { status: 500 }
  );
}

function isConnectionRefused(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.message.includes("ECONNREFUSED")) return true;
  const cause = (error as Error & { cause?: { code?: string } }).cause;
  return error.message.includes("fetch failed") && cause?.code === "ECONNREFUSED";
}

export function parsePagination(searchParams: URLSearchParams) {
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20));
  return { page, limit };
}
