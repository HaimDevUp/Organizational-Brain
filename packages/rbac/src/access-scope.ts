import type { PrismaClient } from "@obos/database";
import { ForbiddenError } from "@obos/shared";

export type KnowledgePermission = "knowledge:read" | "search:read" | "chat:create";

export interface KnowledgeAccessScope {
  /** User may access all departments (unscoped role granting the permission). */
  orgWide: boolean;
  /** Union of scoped departments when orgWide is false. */
  departmentIds: string[];
}

export async function getKnowledgeAccessScope(
  prisma: PrismaClient,
  organizationId: string,
  userId: string,
  permission: KnowledgePermission
): Promise<KnowledgeAccessScope> {
  const userRoles = await prisma.userRole.findMany({
    where: { organizationId, userId },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  });

  let orgWide = false;
  const departmentIds = new Set<string>();
  let hasPermission = false;

  for (const ur of userRoles) {
    if (ur.role.organizationId !== organizationId) continue;
    const grants = ur.role.rolePermissions.some((rp) => rp.permission.slug === permission);
    if (!grants) continue;
    hasPermission = true;
    if (!ur.scopeDepartmentId) {
      orgWide = true;
    } else {
      departmentIds.add(ur.scopeDepartmentId);
    }
  }

  if (!hasPermission) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }

  return { orgWide, departmentIds: [...departmentIds] };
}

/** Build Qdrant-compatible filter options from access scope and optional user-selected department. */
export function resolveKnowledgeSearchFilters(
  scope: KnowledgeAccessScope,
  requestedDepartmentId?: string
): {
  departmentIds?: string[];
  includeDepartmentNull?: boolean;
} {
  if (scope.orgWide) {
    if (requestedDepartmentId) {
      return { departmentIds: [requestedDepartmentId] };
    }
    return {};
  }

  if (requestedDepartmentId) {
    if (!scope.departmentIds.includes(requestedDepartmentId)) {
      throw new ForbiddenError("Department access denied");
    }
    return {
      departmentIds: [requestedDepartmentId],
      includeDepartmentNull: true,
    };
  }

  return {
    departmentIds: scope.departmentIds,
    includeDepartmentNull: true,
  };
}

export async function validateRoleAssignment(
  prisma: PrismaClient,
  organizationId: string,
  roleId: string,
  scopeDepartmentId?: string | null
): Promise<void> {
  const role = await prisma.role.findFirst({
    where: { id: roleId, organizationId },
  });
  if (!role) {
    throw new ForbiddenError("Role does not belong to this organization");
  }

  if (scopeDepartmentId) {
    const dept = await prisma.department.findFirst({
      where: { id: scopeDepartmentId, organizationId, deletedAt: null },
    });
    if (!dept) {
      throw new ForbiddenError("Department does not belong to this organization");
    }
  }
}

export async function assertResourceInOrg(
  prisma: PrismaClient,
  organizationId: string,
  resource: { organizationId: string } | null
): Promise<void> {
  if (!resource || resource.organizationId !== organizationId) {
    throw new ForbiddenError("Resource not found in organization");
  }
}
