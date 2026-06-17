import { getOrganizationBySlug } from "@/services/organization";
import { KnowledgeGraphView } from "@/components/brain/knowledge-graph";

export default async function KnowledgeGraphPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);
  if (!org) return <p>Organization not found</p>;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-semibold">Knowledge Graph</h1>
        <p className="text-sm text-muted-foreground">
          Connected organizational knowledge — Obsidian-style [[links]], relationships, and graph-aware discovery.
        </p>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        <KnowledgeGraphView orgId={org.id} orgSlug={orgSlug} />
      </div>
    </div>
  );
}
