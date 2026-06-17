import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { listContradictions } from "@/services/brain/contradictions";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "health:read");
    const data = await listContradictions(orgId);
    return jsonOk({ data });
  } catch (e) {
    return jsonError(e);
  }
}
