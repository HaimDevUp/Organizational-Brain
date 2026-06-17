import { getOrganizationBySlug } from "@/services/organization";
import { getPullRequest } from "@/services/pull-request";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrActions } from "./pr-actions";

export default async function ApprovalDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; prId: string }>;
}) {
  const { orgSlug, prId } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  let pr;
  try {
    pr = await getPullRequest(org.id, prId);
  } catch {
    notFound();
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">
            PR #{pr.number}: {pr.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Branch: {pr.sourceBranch}
            {pr.githubPrNumber ? ` · GitHub #${pr.githubPrNumber}` : ""}
          </p>
        </div>
        <Badge>{pr.status}</Badge>
      </div>

      {pr.description && (
        <Card className="mb-4">
          <CardContent className="pt-6">{pr.description}</CardContent>
        </Card>
      )}

      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-sm">Reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {pr.reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <ul className="space-y-2">
              {pr.reviews.map((r) => (
                <li key={r.id} className="text-sm">
                  {r.reviewer.name ?? r.reviewer.email}: <strong>{r.state}</strong>
                  {r.body && <span className="text-muted-foreground"> — {r.body}</span>}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <PrActions orgId={org.id} orgSlug={orgSlug} prId={pr.id} status={pr.status} />
    </div>
  );
}
