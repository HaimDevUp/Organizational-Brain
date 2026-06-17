import { requirePagePermission } from "@/lib/page-auth";
import { getAdminStats } from "@/services/organization";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default async function AdminDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { org } = await requirePagePermission(orgSlug, "admin:stats");
  const stats = await getAdminStats(org.id);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Admin dashboard</h1>
        <Link href={`/${orgSlug}/admin/monitoring`} className="text-sm text-primary hover:underline">
          System monitoring
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Object.entries(stats).map(([key, value]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm capitalize text-muted-foreground">
                {key.replace(/([A-Z])/g, " $1")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
