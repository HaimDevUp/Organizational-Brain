import { getOrganizationBySlug, getAdminStats } from "@/services/organization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function OrgOverviewPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  const stats = await getAdminStats(org.id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Overview</h1>
      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: "Members", value: stats.members },
          { label: "Departments", value: stats.departments },
          { label: "Documents", value: stats.documents },
          { label: "Open PRs", value: stats.openPullRequests },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
