import { getOrganizationBySlug } from "@/services/organization";
import { listGapsDashboard } from "@/services/brain/gaps";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function GapsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  const { gaps, byDepartment, totalOpen } = await listGapsDashboard(org.id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Knowledge Gaps</h1>
      <p className="text-muted-foreground mb-6">
        Questions and topics where knowledge is missing or answers had low confidence
      </p>

      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Open gaps</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{totalOpen}</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">By department</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {byDepartment.map((row) => (
              <Badge key={String(row.departmentId)} variant="secondary">
                {row.departmentId ? "Dept" : "General"}: {row._count}
              </Badge>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-3">
        {gaps.map((gap) => {
          const evidence = gap.evidence as { question?: string; frequency?: number };
          return (
            <Card key={gap.id}>
              <CardContent className="py-4">
                <div className="flex justify-between gap-4">
                  <div>
                    <p className="font-medium">{gap.title}</p>
                    <p className="text-sm text-muted-foreground mt-1">{gap.description}</p>
                    {evidence.frequency && (
                      <p className="text-xs text-muted-foreground mt-2">
                        Asked {evidence.frequency} time(s)
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge>{gap.gapType}</Badge>
                    <Badge variant={gap.severity === "high" ? "destructive" : "secondary"}>
                      {gap.severity}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
