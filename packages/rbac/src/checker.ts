import type { PrismaClient } from "@obos/database";

export async function getUserPermissions(
  prisma: PrismaClient,
  organizationId: string,
  userId: string
): Promise<Set<string>> {
  const userRoles = await prisma.userRole.findMany({
    where: { organizationId, userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
    },
  });

  const slugs = new Set<string>();
  for (const ur of userRoles) {
    for (const rp of ur.role.rolePermissions) {
      slugs.add(rp.permission.slug);
    }
  }
  return slugs;
}

export async function hasPermission(
  prisma: PrismaClient,
  organizationId: string,
  userId: string,
  permission: string
): Promise<boolean> {
  const perms = await getUserPermissions(prisma, organizationId, userId);
  return perms.has(permission);
}

export async function requirePermission(
  prisma: PrismaClient,
  organizationId: string,
  userId: string,
  permission: string
): Promise<void> {
  const ok = await hasPermission(prisma, organizationId, userId, permission);
  if (!ok) {
    throw new Error(`Missing permission: ${permission}`);
  }
}

export async function isOrgMember(
  prisma: PrismaClient,
  organizationId: string,
  userId: string
): Promise<boolean> {
  const member = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId, userId },
    },
  });
  return member?.status === "active";
}
