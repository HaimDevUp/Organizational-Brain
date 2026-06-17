import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PERMISSIONS = [
  { resource: "org", action: "read", slug: "org:read", description: "View org profile" },
  { resource: "org", action: "update", slug: "org:update", description: "Update org settings" },
  { resource: "org", action: "delete", slug: "org:delete", description: "Soft-delete org" },
  { resource: "member", action: "read", slug: "member:read", description: "List members" },
  { resource: "member", action: "invite", slug: "member:invite", description: "Invite users" },
  { resource: "member", action: "update", slug: "member:update", description: "Update members" },
  { resource: "member", action: "remove", slug: "member:remove", description: "Remove members" },
  { resource: "department", action: "read", slug: "department:read", description: "View departments" },
  { resource: "department", action: "create", slug: "department:create", description: "Create departments" },
  { resource: "department", action: "update", slug: "department:update", description: "Update departments" },
  { resource: "department", action: "delete", slug: "department:delete", description: "Delete departments" },
  { resource: "department", action: "manage_members", slug: "department:manage_members", description: "Manage dept members" },
  { resource: "knowledge", action: "read", slug: "knowledge:read", description: "View knowledge" },
  { resource: "knowledge", action: "create", slug: "knowledge:create", description: "Create knowledge" },
  { resource: "knowledge", action: "update", slug: "knowledge:update", description: "Update knowledge" },
  { resource: "knowledge", action: "delete", slug: "knowledge:delete", description: "Delete knowledge" },
  { resource: "pr", action: "read", slug: "pr:read", description: "View pull requests" },
  { resource: "pr", action: "create", slug: "pr:create", description: "Create pull requests" },
  { resource: "pr", action: "update", slug: "pr:update", description: "Update pull requests" },
  { resource: "pr", action: "review", slug: "pr:review", description: "Review pull requests" },
  { resource: "pr", action: "merge", slug: "pr:merge", description: "Merge pull requests" },
  { resource: "pr", action: "close", slug: "pr:close", description: "Close pull requests" },
  { resource: "role", action: "read", slug: "role:read", description: "View roles" },
  { resource: "role", action: "create", slug: "role:create", description: "Create roles" },
  { resource: "role", action: "update", slug: "role:update", description: "Update roles" },
  { resource: "role", action: "delete", slug: "role:delete", description: "Delete roles" },
  { resource: "role", action: "assign", slug: "role:assign", description: "Assign roles" },
  { resource: "audit", action: "read", slug: "audit:read", description: "View audit logs" },
  { resource: "admin", action: "stats", slug: "admin:stats", description: "View admin stats" },
  { resource: "chat", action: "read", slug: "chat:read", description: "View conversations" },
  { resource: "chat", action: "create", slug: "chat:create", description: "Use brain chat" },
  { resource: "search", action: "read", slug: "search:read", description: "Search knowledge" },
  { resource: "agent", action: "read", slug: "agent:read", description: "View agents" },
  { resource: "agent", action: "execute", slug: "agent:execute", description: "Run agents" },
  { resource: "health", action: "read", slug: "health:read", description: "View health scores" },
  { resource: "health", action: "manage", slug: "health:manage", description: "Recompute health" },
  { resource: "gap", action: "read", slug: "gap:read", description: "View knowledge gaps" },
  { resource: "gap", action: "update", slug: "gap:update", description: "Update knowledge gaps" },
  { resource: "brain", action: "structure", slug: "brain:structure", description: "AI knowledge structuring" },
  { resource: "analytics", action: "read", slug: "analytics:read", description: "View brain analytics" },
  { resource: "graph", action: "read", slug: "graph:read", description: "View knowledge graph" },
  { resource: "graph", action: "manage", slug: "graph:manage", description: "Manage graph links and suggestions" },
];

async function main() {
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { slug: perm.slug },
      create: perm,
      update: { description: perm.description },
    });
  }
  console.log(`Seeded ${PERMISSIONS.length} permissions`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
