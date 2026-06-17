import { getOrganizationBySlug } from "@/services/organization";
import { computeExpertProfiles } from "@/services/brain/experts";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ExpertsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  const experts = await computeExpertProfiles(org.id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Expert Discovery</h1>
      <p className="text-muted-foreground mb-6">
        Internal experts by contributions, ownership, and approvals
      </p>

      <div className="space-y-3">
        {experts.map((expert, i) => (
          <Card key={expert.id}>
            <CardContent className="flex items-center gap-4 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium">{expert.user.name ?? expert.user.email}</p>
                <p className="text-sm text-muted-foreground">
                  {expert.department?.name ?? "Organization-wide"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {expert.topics.map((t) => (
                    <Badge key={t} variant="secondary" className="text-xs">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="text-right text-sm">
                <p className="font-bold text-lg">{Number(expert.expertiseScore)}</p>
                <p className="text-muted-foreground">
                  {expert.documentsOwned} docs · {expert.approvalsGiven} approvals
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
