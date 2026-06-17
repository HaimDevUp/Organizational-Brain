import Link from "next/link";
import { getOrganizationBySlug } from "@/services/organization";
import { listKnowledge } from "@/services/knowledge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { KnowledgeSearch } from "./search-client";

export default async function KnowledgeListPage({
  params,
  searchParams,
}: {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { orgSlug } = await params;
  const { q } = await searchParams;
  const org = await getOrganizationBySlug(orgSlug);
  const docs = await listKnowledge(org.id, { q });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Knowledge</h1>
        <Button asChild>
          <Link href={`/${orgSlug}/knowledge/new`}>New document</Link>
        </Button>
      </div>
      <KnowledgeSearch orgSlug={orgSlug} defaultQ={q} />
      <div className="grid gap-3 mt-4">
        {docs.map((doc) => (
          <Link key={doc.id} href={`/${orgSlug}/knowledge/${doc.id}`}>
            <Card className="hover:border-primary transition-colors">
              <CardHeader className="py-4">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{doc.title}</CardTitle>
                  <Badge variant="outline">{doc.status}</Badge>
                </div>
                <CardContent className="p-0 pt-1 text-sm text-muted-foreground">
                  {doc.gitPath}
                </CardContent>
              </CardHeader>
            </Card>
          </Link>
        ))}
        {docs.length === 0 && (
          <p className="text-muted-foreground text-center py-8">No documents found.</p>
        )}
      </div>
    </div>
  );
}
