import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrganizationBySlug } from "@/services/organization";
import { getKnowledgeDocument, getDocumentContent } from "@/services/knowledge";
import { userHasOrgPermission } from "@/lib/page-auth";
import { DeleteKnowledgeButton } from "@/components/knowledge/delete-knowledge-button";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function KnowledgeDetailPage({
  params,
}: {
  params: Promise<{ orgSlug: string; docId: string }>;
}) {
  const { orgSlug, docId } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  const canDelete = await userHasOrgPermission(orgSlug, "knowledge:delete");
  let doc;
  try {
    doc = await getKnowledgeDocument(org.id, docId);
  } catch {
    notFound();
  }
  const content = await getDocumentContent(org.id, docId);

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold">{doc.title}</h1>
          <p className="text-sm text-muted-foreground">{doc.gitPath}</p>
        </div>
        <div className="flex gap-2">
          <Badge>{doc.status}</Badge>
          <Button variant="outline" asChild>
            <Link href={`/${orgSlug}/knowledge/${docId}/edit`}>Edit</Link>
          </Button>
          {canDelete && (
            <DeleteKnowledgeButton
              orgId={org.id}
              orgSlug={orgSlug}
              docId={docId}
              title={doc.title}
            />
          )}
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Content</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap text-sm font-mono">{content}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
