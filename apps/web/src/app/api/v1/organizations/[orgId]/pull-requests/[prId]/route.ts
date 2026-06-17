import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { getPullRequest } from "@/services/pull-request";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; prId: string }> }
) {
  try {
    const { orgId, prId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "pr:read");
    const pr = await getPullRequest(orgId, prId);
    return jsonOk(pr);
  } catch (e) {
    return jsonError(e);
  }
}
