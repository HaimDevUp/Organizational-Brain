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
    const org = await requireOrgAccess(orgId, userId, "chat:read");

    const conversations = await prisma.conversation.findMany({
      where: { organizationId: org.id, userId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      include: {
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
        agent: { select: { id: true, name: true, slug: true } },
      },
    });

    return jsonOk({ data: conversations });
  } catch (e) {
    return jsonError(e);
  }
}
