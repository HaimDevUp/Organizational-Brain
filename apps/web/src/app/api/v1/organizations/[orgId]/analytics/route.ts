import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { getAnalyticsSummary } from "@/services/brain/analytics";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "analytics:read");
    const days = parseInt(new URL(req.url).searchParams.get("days") ?? "30", 10);
    const data = await getAnalyticsSummary(orgId, days);
    return jsonOk(data);
  } catch (e) {
    return jsonError(e);
  }
}
