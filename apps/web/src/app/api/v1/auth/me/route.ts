import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { prisma } from "@obos/database";
import { UnauthorizedError } from "@obos/shared";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.id) throw new UnauthorizedError();

    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        memberships: {
          where: { status: "active" },
          include: { organization: true },
        },
        userRoles: { include: { role: true } },
      },
    });

    if (!dbUser) throw new UnauthorizedError();

    return jsonOk({
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      image: dbUser.image,
      organizations: dbUser.memberships.map((m) => ({
        id: m.organization.id,
        slug: m.organization.slug,
        name: m.organization.name,
        status: m.status,
      })),
      roles: dbUser.userRoles.map((ur) => ({
        organizationId: ur.organizationId,
        roleSlug: ur.role.slug,
        roleName: ur.role.name,
      })),
    });
  } catch (e) {
    return jsonError(e, "/api/v1/auth/me");
  }
}
