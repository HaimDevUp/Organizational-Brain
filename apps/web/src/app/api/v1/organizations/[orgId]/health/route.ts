import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { getHealthDashboard, recomputeOrgHealth } from "@/services/brain/health";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "health:read");
    const data = await getHealthDashboard(orgId);
    return jsonOk(data);
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "health:manage");
    const results = await recomputeOrgHealth(orgId);
    return jsonOk({ recomputed: results.length, results });
  } catch (e) {
    return jsonError(e);
  }
}
