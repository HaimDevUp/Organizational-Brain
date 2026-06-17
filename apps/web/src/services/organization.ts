import { prisma } from "@obos/database";
import { seedOrganizationRoles } from "@obos/rbac";
import { parseOrgSettings } from "@obos/shared";
import { NotFoundError, BadRequestError } from "@obos/shared";

export async function listUserOrganizations(userId: string) {
  const memberships = await prisma.organizationMember.findMany({
    where: { userId, status: "active" },
    include: { organization: true },
  });
  return memberships.map((m) => ({
    id: m.organization.id,
    slug: m.organization.slug,
    name: m.organization.name,
    plan: m.organization.plan,
    status: m.organization.status,
  }));
}

export async function getOrganizationById(orgId: string) {
  const org = await prisma.organization.findFirst({
    where: { id: orgId, deletedAt: null },
  });
  if (!org) throw new NotFoundError("Organization not found");
  return org;
}

export async function getOrganizationBySlug(slug: string) {
  const org = await prisma.organization.findFirst({
    where: { slug, deletedAt: null },
  });
  if (!org) throw new NotFoundError("Organization not found");
  return org;
}

export async function createOrganization(
  userId: string,
  data: { name: string; slug: string; gitRepoPath?: string }
) {
  const existing = await prisma.organization.findUnique({ where: { slug: data.slug } });
  if (existing) throw new BadRequestError("Slug already taken");

  const org = await prisma.organization.create({
    data: {
      name: data.name,
      slug: data.slug,
      gitRepoPath: data.gitRepoPath ?? `orgs/${data.slug}`,
      settings: parseOrgSettings({
        git: {
          githubOwner: process.env.GITHUB_OWNER,
          githubRepo: process.env.GITHUB_REPO,
          defaultBranch: process.env.GITHUB_DEFAULT_BRANCH ?? "main",
        },
      }),
      members: {
        create: {
          userId,
          status: "active",
          joinedAt: new Date(),
        },
      },
    },
  });

  await seedOrganizationRoles(prisma, org.id);

  const adminRole = await prisma.role.findUnique({
    where: { organizationId_slug: { organizationId: org.id, slug: "admin" } },
  });
  if (adminRole) {
    await prisma.userRole.create({
      data: { organizationId: org.id, userId, roleId: adminRole.id },
    });
  }

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      actorUserId: userId,
      action: "organization.created",
      resourceType: "organization",
      resourceId: org.id,
    },
  });

  const { seedOrganizationAgents } = await import("@obos/agents");
  await seedOrganizationAgents(org.id, userId);

  return org;
}

export async function listMembers(orgId: string) {
  return prisma.organizationMember.findMany({
    where: { organizationId: orgId },
    include: { user: true },
  });
}

export async function getAdminStats(orgId: string) {
  const [members, departments, documents, openPrs] = await Promise.all([
    prisma.organizationMember.count({ where: { organizationId: orgId, status: "active" } }),
    prisma.department.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.knowledgeDocument.count({ where: { organizationId: orgId, deletedAt: null } }),
    prisma.pullRequest.count({ where: { organizationId: orgId, status: "open" } }),
  ]);
  return { members, departments, documents, openPullRequests: openPrs };
}
