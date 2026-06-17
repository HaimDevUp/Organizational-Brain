import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { listGapsDashboard } from "@/services/brain/gaps";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "gap:read");
    const data = await listGapsDashboard(orgId);
    return jsonOk(data);
  } catch (e) {
    return jsonError(e);
  }
}
