import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { prisma } from "@obos/database";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    const org = await requireOrgAccess(orgId, userId, "admin:stats");

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [
      aiRequests24h,
      usage24h,
      indexingPending,
      indexingFailed,
      analytics24h,
      recentAiLogs,
    ] = await Promise.all([
      prisma.aiRequestLog.count({
        where: { organizationId: org.id, createdAt: { gte: since } },
      }),
      prisma.usageEvent.groupBy({
        by: ["metric"],
        where: { organizationId: org.id, createdAt: { gte: since } },
        _sum: { quantity: true },
      }),
      prisma.indexingJob.count({
        where: { organizationId: org.id, status: "pending" },
      }),
      prisma.indexingJob.count({
        where: { organizationId: org.id, status: "failed" },
      }),
      prisma.brainAnalyticsEvent.count({
        where: { organizationId: org.id, createdAt: { gte: since } },
      }),
      prisma.aiRequestLog.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          action: true,
          model: true,
          status: true,
          durationMs: true,
          createdAt: true,
          user: { select: { email: true, name: true } },
        },
      }),
    ]);

    return jsonOk({
      windowHours: 24,
      aiRequests24h,
      analytics24h,
      indexing: { pending: indexingPending, failed: indexingFailed },
      usage24h: usage24h.map((u) => ({
        metric: u.metric,
        quantity: u._sum.quantity ?? 0,
      })),
      recentAiLogs,
    });
  } catch (e) {
    return jsonError(e);
  }
}
