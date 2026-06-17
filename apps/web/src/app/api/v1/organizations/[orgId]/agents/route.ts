import { prisma } from "@obos/database";
import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "agent:read");

    const agents = await prisma.agent.findMany({
      where: { organizationId: orgId, status: "active" },
      orderBy: { name: "asc" },
    });

    return jsonOk({ data: agents });
  } catch (e) {
    return jsonError(e);
  }
}
