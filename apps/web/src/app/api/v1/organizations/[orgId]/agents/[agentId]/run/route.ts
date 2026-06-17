import { z } from "zod";
import { prisma } from "@obos/database";
import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { buildScopedSearchFilters } from "@/lib/knowledge-access";
import { checkRateLimit, aiRateLimitKey } from "@/lib/rate-limit";
import { logAiRequest } from "@/lib/ai-audit";
import { trackUsageEvent } from "@/lib/usage";
import { runAgent } from "@obos/agents";
import { trackAnalyticsEvent } from "@/services/brain/analytics";

const schema = z.object({
  message: z.string().min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string; agentId: string }> }
) {
  try {
    const { orgId, agentId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    const org = await requireOrgAccess(orgId, userId, "agent:execute");
    checkRateLimit({ key: aiRateLimitKey(org.id, userId, "agent"), limit: 20, windowMs: 60_000 });
    const body = schema.parse(await req.json());
    const started = Date.now();
    const searchFilters = await buildScopedSearchFilters(org.id, userId, "chat:create");

    const agent = await prisma.agent.findFirst({
      where: { id: agentId, organizationId: org.id, status: "active" },
    });
    if (!agent) {
      return jsonError(new Error("Agent not found"), undefined);
    }

    const result = await runAgent(
      {
        organizationId: org.id,
        userId,
        agentSlug: agent.pluginKey ?? agent.slug,
        searchFilters,
      },
      { message: body.message }
    );

    await logAiRequest({
      organizationId: org.id,
      userId,
      action: "agent_run",
      durationMs: Date.now() - started,
      metadata: { agentId: agent.id, confidence: result.confidence },
    });
    await trackUsageEvent(org.id, "agent_run", 1, userId);

    await trackAnalyticsEvent({
      organizationId: org.id,
      userId,
      eventType: "agent_run",
      resourceType: "agent",
      resourceId: agent.id,
      metadata: { message: body.message, confidence: result.confidence },
    });

    return jsonOk(result);
  } catch (e) {
    return jsonError(e);
  }
}
