import { z } from "zod";
import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { buildScopedSearchFilters } from "@/lib/knowledge-access";
import { checkRateLimit, aiRateLimitKey } from "@/lib/rate-limit";
import { getRequestId, logger } from "@/lib/logger";
import { brainChat } from "@/services/brain/chat";

const schema = z.object({
  message: z.string().min(1),
  conversationId: z.string().uuid().optional(),
  agentId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    const org = await requireOrgAccess(orgId, userId, "chat:create");
    checkRateLimit({ key: aiRateLimitKey(org.id, userId, "chat"), limit: 30, windowMs: 60_000 });
    const body = schema.parse(await req.json());
    const started = Date.now();

    const searchFilters = await buildScopedSearchFilters(
      org.id,
      userId,
      "chat:create",
      body.departmentId
    );

    const result = await brainChat({
      organizationId: org.id,
      userId,
      message: body.message,
      conversationId: body.conversationId,
      agentId: body.agentId,
      searchFilters,
    });

    logger.info("chat.completed", {
      requestId: getRequestId(req),
      organizationId: org.id,
      userId,
      durationMs: Date.now() - started,
      confidence: result.confidence,
    });

    return jsonOk(result);
  } catch (e) {
    return jsonError(e);
  }
}
