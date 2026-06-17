import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { closePullRequest } from "@/services/pull-request";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; prId: string }> }
) {
  try {
    const { orgId, prId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "pr:close");
    const pr = await closePullRequest(orgId, prId);
    return jsonOk(pr);
  } catch (e) {
    return jsonError(e);
  }
}
