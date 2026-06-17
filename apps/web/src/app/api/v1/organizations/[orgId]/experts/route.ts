import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { computeExpertProfiles } from "@/services/brain/experts";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "knowledge:read");
    const experts = await computeExpertProfiles(orgId);
    return jsonOk({ data: experts });
  } catch (e) {
    return jsonError(e);
  }
}
