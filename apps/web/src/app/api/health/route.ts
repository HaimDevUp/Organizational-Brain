import { NextResponse } from "next/server";
import { prisma } from "@obos/database";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", database: "up", ts: new Date().toISOString() });
  } catch {
    return NextResponse.json(
      { status: "degraded", database: "down", ts: new Date().toISOString() },
      { status: 503 }
    );
  }
}
