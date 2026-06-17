import type { PrismaClient } from "@obos/database";

export const SYSTEM_ROLES: Array<{
  slug: string;
  name: string;
  description: string;
  permissions: string[];
}> = [
  {
    slug: "admin",
    name: "Organization Admin",
    description: "Full org control",
    permissions: [
      "org:read",
      "org:update",
      "org:delete",
      "member:read",
      "member:invite",
      "member:update",
      "member:remove",
      "department:read",
      "department:create",
      "department:update",
      "department:delete",
      "department:manage_members",
      "knowledge:read",
      "knowledge:create",
      "knowledge:update",
      "knowledge:delete",
      "pr:read",
      "pr:create",
      "pr:update",
      "pr:review",
      "pr:merge",
      "pr:close",
      "role:read",
      "role:create",
      "role:update",
      "role:delete",
      "role:assign",
      "audit:read",
      "admin:stats",
      "chat:read",
      "chat:create",
      "search:read",
      "agent:read",
      "agent:execute",
      "health:read",
      "health:manage",
      "gap:read",
      "gap:update",
      "brain:structure",
      "analytics:read",
      "graph:read",
      "graph:manage",
    ],
  },
  {
    slug: "knowledge_manager",
    name: "Knowledge Manager",
    description: "CRUD knowledge and merge PRs",
    permissions: [
      "org:read",
      "member:read",
      "department:read",
      "knowledge:read",
      "knowledge:create",
      "knowledge:update",
      "knowledge:delete",
      "pr:read",
      "pr:create",
      "pr:update",
      "pr:review",
      "pr:merge",
      "pr:close",
      "chat:read",
      "chat:create",
      "search:read",
      "agent:read",
      "agent:execute",
      "health:read",
      "health:manage",
      "gap:read",
      "gap:update",
      "brain:structure",
      "analytics:read",
      "graph:read",
      "graph:manage",
    ],
  },
  {
    slug: "editor",
    name: "Editor",
    description: "Create and edit knowledge, open PRs",
    permissions: [
      "org:read",
      "department:read",
      "knowledge:read",
      "knowledge:create",
      "knowledge:update",
      "pr:read",
      "pr:create",
      "pr:update",
      "chat:read",
      "chat:create",
      "search:read",
      "brain:structure",
      "graph:read",
    ],
  },
  {
    slug: "reviewer",
    name: "Reviewer",
    description: "Review and approve PRs",
    permissions: ["org:read", "knowledge:read", "pr:read", "pr:review"],
  },
  {
    slug: "viewer",
    name: "Viewer",
    description: "Read-only access",
    permissions: [
      "org:read",
      "knowledge:read",
      "pr:read",
      "chat:read",
      "chat:create",
      "search:read",
      "agent:read",
      "health:read",
      "gap:read",
      "graph:read",
    ],
  },
];

export async function seedOrganizationRoles(
  prisma: PrismaClient,
  organizationId: string
): Promise<void> {
  const allPerms = await prisma.permission.findMany();
  const permBySlug = new Map(allPerms.map((p) => [p.slug, p.id]));

  for (const roleDef of SYSTEM_ROLES) {
    const role = await prisma.role.upsert({
      where: {
        organizationId_slug: { organizationId, slug: roleDef.slug },
      },
      create: {
        organizationId,
        slug: roleDef.slug,
        name: roleDef.name,
        description: roleDef.description,
        isSystem: true,
      },
      update: {
        name: roleDef.name,
        description: roleDef.description,
      },
    });

    const permissionIds = roleDef.permissions
      .map((slug) => permBySlug.get(slug))
      .filter((id): id is string => Boolean(id));

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    if (permissionIds.length) {
      await prisma.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }
  }
}
