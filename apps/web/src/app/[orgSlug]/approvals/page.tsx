import Link from "next/link";
import { getOrganizationBySlug } from "@/services/organization";
import { listPullRequests } from "@/services/pull-request";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

const statusVariant: Record<string, "default" | "secondary" | "success" | "warning" | "destructive"> = {
  draft: "secondary",
  open: "default",
  approved: "success",
  changes_requested: "warning",
  merged: "success",
  closed: "destructive",
};

export default async function ApprovalsListPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  const prs = await listPullRequests(org.id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Approvals</h1>
      <div className="space-y-3">
        {prs.map((pr) => (
          <Link key={pr.id} href={`/${orgSlug}/approvals/${pr.id}`}>
            <Card className="hover:border-primary transition-colors">
              <CardHeader className="py-4 flex-row items-center justify-between">
                <CardTitle className="text-base">
                  #{pr.number} {pr.title}
                </CardTitle>
                <Badge variant={statusVariant[pr.status] ?? "outline"}>{pr.status}</Badge>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {prs.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No pull requests yet.</p>
        )}
      </div>
    </div>
  );
}
