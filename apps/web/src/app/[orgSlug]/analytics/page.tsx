import { getOrganizationBySlug } from "@/services/organization";
import { getAnalyticsSummary } from "@/services/brain/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function AnalyticsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  const analytics = await getAnalyticsSummary(org.id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Audit Intelligence</h1>
      <p className="text-muted-foreground mb-6">
        Searches, questions, approvals, and agent activity
      </p>

      <div className="grid gap-4 md:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Total events (30d)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{analytics.totalEvents}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm text-muted-foreground">Event breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {Object.entries(analytics.byType).map(([type, count]) => (
              <div key={type} className="flex justify-between">
                <span className="capitalize">{type.replace(/_/g, " ")}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Top questions & searches</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analytics.topQueries.length === 0 ? (
            <p className="text-muted-foreground text-sm">No data yet.</p>
          ) : (
            analytics.topQueries.map((q) => (
              <div key={q.query} className="flex justify-between text-sm border-b py-2">
                <span className="truncate pr-4">{q.query}</span>
                <span className="font-medium shrink-0">{q.count}</span>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
