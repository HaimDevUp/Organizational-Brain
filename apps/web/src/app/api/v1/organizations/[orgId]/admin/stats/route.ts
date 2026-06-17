import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { getAdminStats } from "@/services/organization";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "admin:stats");
    const stats = await getAdminStats(orgId);
    return jsonOk(stats);
  } catch (e) {
    return jsonError(e);
  }
}
