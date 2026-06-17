import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@obos/database";
import { hasPermission, isOrgMember } from "@obos/rbac";
import { getOrganizationBySlug } from "@/services/organization";
import { isAuthDisabled, getDevAuthUser } from "@/lib/dev-auth";

export async function requirePagePermission(orgSlug: string, permission: string) {
  let userId: string;
  if (isAuthDisabled()) {
    const dev = await getDevAuthUser();
    userId = dev.id;
  } else {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");
    userId = session.user.id;
  }

  let org;
  try {
    org = await getOrganizationBySlug(orgSlug);
  } catch {
    notFound();
  }

  if (isAuthDisabled()) return { org, userId };

  const member = await isOrgMember(prisma, org.id, userId);
  if (!member) notFound();

  const ok = await hasPermission(prisma, org.id, userId, permission);
  if (!ok) notFound();

  return { org, userId };
}

export async function userHasOrgPermission(orgSlug: string, permission: string): Promise<boolean> {
  if (isAuthDisabled()) return true;

  const session = await auth();
  if (!session?.user?.id) return false;

  let org;
  try {
    org = await getOrganizationBySlug(orgSlug);
  } catch {
    return false;
  }

  const member = await isOrgMember(prisma, org.id, session.user.id);
  if (!member) return false;

  return hasPermission(prisma, org.id, session.user.id, permission);
}
