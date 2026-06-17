import { z } from "zod";
import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { checkRateLimit, aiRateLimitKey } from "@/lib/rate-limit";
import { trackUsageEvent } from "@/lib/usage";
import {
  structureKnowledgeProposal,
  submitStructuredKnowledge,
} from "@/services/brain/structuring";

const schema = z.object({
  rawText: z.string().min(10),
  submit: z.boolean().default(false),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    const org = await requireOrgAccess(orgId, userId, "brain:structure");
    checkRateLimit({ key: aiRateLimitKey(org.id, userId, "structure"), limit: 15, windowMs: 60_000 });
    const body = schema.parse(await req.json());
    await trackUsageEvent(org.id, "structure_request", 1, userId);

    const proposal = await structureKnowledgeProposal(org.id, userId, body.rawText);

    if (body.submit) {
      const result = await submitStructuredKnowledge(org.id, userId, proposal);
      return jsonOk(result, 201);
    }

    return jsonOk({ proposal });
  } catch (e) {
    return jsonError(e);
  }
}
