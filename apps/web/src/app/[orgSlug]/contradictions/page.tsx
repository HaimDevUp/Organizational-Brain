import { getOrganizationBySlug } from "@/services/organization";
import { listContradictions } from "@/services/brain/contradictions";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default async function ContradictionsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  const contradictions = await listContradictions(org.id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1">Contradictions</h1>
      <p className="text-muted-foreground mb-6">
        Conflicting knowledge detected across documents — review and propose corrections
      </p>

      <div className="space-y-4">
        {contradictions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No open contradictions detected.
            </CardContent>
          </Card>
        ) : (
          contradictions.map((c) => (
            <Card key={c.id}>
              <CardContent className="py-4 space-y-3">
                <div className="flex justify-between">
                  <p className="font-medium">{c.summary}</p>
                  <Badge>{c.status}</Badge>
                </div>
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <Link
                    href={`/${orgSlug}/knowledge/${c.documentA.id}`}
                    className="rounded-md border p-3 hover:bg-muted"
                  >
                    <p className="font-medium">{c.documentA.title}</p>
                    <p className="text-xs text-muted-foreground">{c.documentA.gitPath}</p>
                  </Link>
                  <Link
                    href={`/${orgSlug}/knowledge/${c.documentB.id}`}
                    className="rounded-md border p-3 hover:bg-muted"
                  >
                    <p className="font-medium">{c.documentB.title}</p>
                    <p className="text-xs text-muted-foreground">{c.documentB.gitPath}</p>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
