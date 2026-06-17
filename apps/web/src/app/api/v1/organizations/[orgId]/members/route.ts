import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { listMembers } from "@/services/organization";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "member:read");
    const members = await listMembers(orgId);
    return jsonOk({
      data: members.map((m) => ({
        id: m.id,
        userId: m.userId,
        email: m.user.email,
        name: m.user.name,
        status: m.status,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (e) {
    return jsonError(e);
  }
}
