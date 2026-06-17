import { getOrganizationBySlug } from "@/services/organization";
import { getHealthDashboard } from "@/services/brain/health";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { RecomputeHealthButton } from "@/components/brain/recompute-health-button";

export default async function HealthPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  const health = await getHealthDashboard(org.id);

  return (
    <div>
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Health</h1>
          <p className="text-muted-foreground text-sm">
            Freshness, coverage, gaps, and contradictions
          </p>
        </div>
        <RecomputeHealthButton orgId={org.id} />
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="text-sm text-muted-foreground">Organization average</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-4xl font-bold">{health.averageScore}</p>
          <p className="text-sm text-muted-foreground mt-1">out of 100</p>
        </CardContent>
      </Card>

      <h2 className="font-semibold mb-3">At-risk documents</h2>
      <div className="space-y-2">
        {health.atRisk.length === 0 ? (
          <p className="text-muted-foreground">No at-risk documents.</p>
        ) : (
          health.atRisk.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="flex justify-between py-3">
                <Link href={`/${orgSlug}/knowledge/${doc.id}`} className="font-medium hover:underline">
                  {doc.title}
                </Link>
                <span className="text-sm font-mono">{Number(doc.healthScore ?? 0).toFixed(0)}</span>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
