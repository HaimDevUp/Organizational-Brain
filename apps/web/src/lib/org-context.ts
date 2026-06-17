import { prisma } from "@obos/database";
import { hasPermission, isOrgMember } from "@obos/rbac";
import { NotFoundError, ForbiddenError, UnauthorizedError } from "@obos/shared";
import { getOrganizationById, getOrganizationBySlug } from "@/services/organization";
import { isAuthDisabled, getDevAuthUser } from "@/lib/dev-auth";

async function resolveOrganization(idOrSlug: string) {
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(idOrSlug);
  return isUuid ? getOrganizationById(idOrSlug) : getOrganizationBySlug(idOrSlug);
}

export async function requireOrgAccess(orgIdOrSlug: string, userId: string, permission?: string) {
  const org = await resolveOrganization(orgIdOrSlug);
  if (isAuthDisabled()) return org;

  const member = await isOrgMember(prisma, org.id, userId);
  if (!member) throw new NotFoundError("Organization not found");
  if (permission) {
    const ok = await hasPermission(prisma, org.id, userId, permission);
    if (!ok) throw new ForbiddenError(`Missing permission: ${permission}`);
  }
  return org;
}

export async function requireUser(userId: string | undefined) {
  if (isAuthDisabled()) {
    const dev = await getDevAuthUser();
    return dev.id;
  }
  if (!userId) throw new UnauthorizedError();
  return userId;
}
