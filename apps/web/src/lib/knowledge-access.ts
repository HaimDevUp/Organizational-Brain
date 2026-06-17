import { prisma } from "@obos/database";
import {
  getKnowledgeAccessScope,
  resolveKnowledgeSearchFilters,
  type KnowledgePermission,
} from "@obos/rbac";
import type { SearchFilters } from "@obos/qdrant";
import { BadRequestError } from "@obos/shared";
import { isAuthDisabled } from "@/lib/dev-auth";

export async function buildScopedSearchFilters(
  organizationId: string,
  userId: string,
  permission: KnowledgePermission,
  requestedDepartmentId?: string
): Promise<SearchFilters> {
  if (isAuthDisabled()) {
    if (requestedDepartmentId) {
      const dept = await prisma.department.findFirst({
        where: { id: requestedDepartmentId, organizationId, deletedAt: null },
      });
      if (!dept) throw new BadRequestError("Invalid department");
      return { departmentIds: [requestedDepartmentId] };
    }
    return {};
  }

  const scope = await getKnowledgeAccessScope(prisma, organizationId, userId, permission);
  const resolved = resolveKnowledgeSearchFilters(scope, requestedDepartmentId);

  if (requestedDepartmentId && scope.orgWide) {
    const dept = await prisma.department.findFirst({
      where: { id: requestedDepartmentId, organizationId, deletedAt: null },
    });
    if (!dept) throw new BadRequestError("Invalid department");
  }

  return {
    departmentIds: resolved.departmentIds,
    includeDepartmentNull: resolved.includeDepartmentNull,
  };
}
