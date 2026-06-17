import { requirePagePermission } from "@/lib/page-auth";
import { prisma } from "@obos/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminRolesPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { org } = await requirePagePermission(orgSlug, "role:read");
  const roles = await prisma.role.findMany({
    where: { organizationId: org.id },
    include: {
      rolePermissions: { include: { permission: true } },
      _count: { select: { userRoles: true } },
    },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Roles</h1>
      <div className="space-y-4">
        {roles.map((role) => (
          <Card key={role.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{role.name}</CardTitle>
                <div className="flex gap-2">
                  {role.isSystem && <Badge variant="secondary">System</Badge>}
                  <Badge variant="outline">{role._count.userRoles} users</Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">{role.description}</p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1">
                {role.rolePermissions.map((rp) => (
                  <Badge key={rp.permissionId} variant="outline" className="text-xs">
                    {rp.permission.slug}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
