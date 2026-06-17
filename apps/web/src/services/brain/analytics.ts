import { prisma, type AnalyticsEventType } from "@obos/database";

export async function trackAnalyticsEvent(input: {
  organizationId: string;
  userId?: string;
  eventType: AnalyticsEventType;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}) {
  return prisma.brainAnalyticsEvent.create({
    data: {
      organizationId: input.organizationId,
      userId: input.userId,
      eventType: input.eventType,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      metadata: (input.metadata ?? {}) as object,
    },
  });
}

export async function getAnalyticsSummary(orgId: string, days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  const events = await prisma.brainAnalyticsEvent.findMany({
    where: { organizationId: orgId, createdAt: { gte: since } },
  });

  const byType: Record<string, number> = {};
  const topQueries: Record<string, number> = {};

  for (const e of events) {
    byType[e.eventType] = (byType[e.eventType] ?? 0) + 1;
    if (e.eventType === "search" || e.eventType === "chat_question") {
      const q = (e.metadata as { query?: string })?.query;
      if (q) topQueries[q] = (topQueries[q] ?? 0) + 1;
    }
  }

  const sortedQueries = Object.entries(topQueries)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([query, count]) => ({ query, count }));

  return {
    totalEvents: events.length,
    byType,
    topQueries: sortedQueries,
    periodDays: days,
  };
}
