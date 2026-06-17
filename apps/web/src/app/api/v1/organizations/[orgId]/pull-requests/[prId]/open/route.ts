import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { openPullRequest } from "@/services/pull-request";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; prId: string }> }
) {
  try {
    const { orgId, prId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "pr:create");
    const pr = await openPullRequest(orgId, prId);
    return jsonOk(pr);
  } catch (e) {
    return jsonError(e);
  }
}
