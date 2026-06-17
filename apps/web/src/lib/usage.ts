import { prisma } from "@obos/database";
import type { Prisma } from "@obos/database";

export type UsageMetric =
  | "chat_message"
  | "search_query"
  | "agent_run"
  | "structure_request"
  | "indexing_job";

/** Record usage for future billing (no Stripe integration). */
export async function trackUsageEvent(
  organizationId: string,
  metric: UsageMetric,
  quantity = 1,
  userId?: string,
  metadata?: Prisma.InputJsonValue
) {
  try {
    await prisma.usageEvent.create({
      data: {
        organizationId,
        userId,
        metric,
        quantity,
        metadata: metadata ?? {},
      },
    });
  } catch {
    // non-blocking
  }
}
