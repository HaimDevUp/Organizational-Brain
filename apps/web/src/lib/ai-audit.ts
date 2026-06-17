import { prisma } from "@obos/database";
import type { Prisma } from "@obos/database";

export async function logAiRequest(input: {
  organizationId: string;
  userId: string;
  action: string;
  model?: string;
  tokenUsage?: Prisma.InputJsonValue;
  metadata?: Prisma.InputJsonValue;
  durationMs?: number;
  status?: "ok" | "error";
}) {
  try {
    await prisma.aiRequestLog.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        action: input.action,
        model: input.model,
        tokenUsage: input.tokenUsage ?? {},
        metadata: input.metadata ?? {},
        durationMs: input.durationMs,
        status: input.status ?? "ok",
      },
    });
  } catch {
    // non-blocking audit
  }
}
