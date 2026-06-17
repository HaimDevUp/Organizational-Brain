import { requirePagePermission } from "@/lib/page-auth";
import { listMembers } from "@/services/organization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function AdminMembersPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { org } = await requirePagePermission(orgSlug, "member:read");
  const members = await listMembers(org.id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Members</h1>
      <div className="space-y-2">
        {members.map((m) => (
          <Card key={m.id}>
            <CardHeader className="py-4 flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">{m.user.name ?? m.user.email}</CardTitle>
                <CardContent className="p-0 text-sm text-muted-foreground">{m.user.email}</CardContent>
              </div>
              <Badge variant="outline">{m.status}</Badge>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
