import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { prisma } from "@obos/database";
import { validateRoleAssignment } from "@obos/rbac";
import { NotFoundError } from "@obos/shared";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  try {
    const { orgId, userId: targetUserId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    const org = await requireOrgAccess(orgId, userId, "role:read");
    const roles = await prisma.userRole.findMany({
      where: { organizationId: org.id, userId: targetUserId },
      include: { role: true, scopeDepartment: true },
    });
    return jsonOk({ data: roles });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string; userId: string }> }
) {
  try {
    const { orgId, userId: targetUserId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    const org = await requireOrgAccess(orgId, userId, "role:assign");

    const targetMember = await prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: { organizationId: org.id, userId: targetUserId },
      },
    });
    if (!targetMember || targetMember.status !== "active") {
      throw new NotFoundError("Member not found");
    }

    const body = await req.json();
    await validateRoleAssignment(prisma, org.id, body.roleId, body.scopeDepartmentId);

    const userRole = await prisma.userRole.create({
      data: {
        organizationId: org.id,
        userId: targetUserId,
        roleId: body.roleId,
        scopeDepartmentId: body.scopeDepartmentId ?? null,
        grantedById: userId,
      },
      include: { role: true },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: org.id,
        actorUserId: userId,
        actorType: "user",
        action: "role.assign",
        resourceType: "user_role",
        resourceId: userRole.id,
        metadata: { targetUserId, roleId: body.roleId },
      },
    });

    return jsonOk(userRole, 201);
  } catch (e) {
    return jsonError(e);
  }
}
