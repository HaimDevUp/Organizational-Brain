import { z } from "zod";
import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { buildScopedSearchFilters } from "@/lib/knowledge-access";
import { checkRateLimit, aiRateLimitKey } from "@/lib/rate-limit";
import { logAiRequest } from "@/lib/ai-audit";
import { trackUsageEvent } from "@/lib/usage";
import { getRequestId, logger } from "@/lib/logger";
import { semanticSearch, hybridSearch, chunksToCitations } from "@obos/rag";
import { trackAnalyticsEvent } from "@/services/brain/analytics";

const schema = z.object({
  query: z.string().min(1),
  mode: z.enum(["semantic", "hybrid"]).default("hybrid"),
  departmentId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  limit: z.number().int().min(1).max(30).default(10),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    const org = await requireOrgAccess(orgId, userId, "search:read");
    checkRateLimit({ key: aiRateLimitKey(org.id, userId, "search"), limit: 60, windowMs: 60_000 });
    const body = schema.parse(await req.json());
    const started = Date.now();

    const scopeFilters = await buildScopedSearchFilters(
      org.id,
      userId,
      "search:read",
      body.departmentId
    );
    const filters = { ...scopeFilters, tags: body.tags };

    const chunks =
      body.mode === "semantic"
        ? await semanticSearch(org.id, body.query, body.limit, filters)
        : await hybridSearch(org.id, body.query, body.limit, filters);

    await logAiRequest({
      organizationId: org.id,
      userId,
      action: "search",
      durationMs: Date.now() - started,
      metadata: { mode: body.mode, results: chunks.length, requestId: getRequestId(req) },
    });
    await trackUsageEvent(org.id, "search_query", 1, userId);
    logger.info("search.completed", {
      requestId: getRequestId(req),
      organizationId: org.id,
      userId,
      durationMs: Date.now() - started,
    });

    await trackAnalyticsEvent({
      organizationId: org.id,
      userId,
      eventType: "search",
      metadata: { query: body.query, mode: body.mode, results: chunks.length },
    });

    return jsonOk({
      mode: body.mode,
      results: chunksToCitations(chunks),
      chunks,
    });
  } catch (e) {
    return jsonError(e);
  }
}
