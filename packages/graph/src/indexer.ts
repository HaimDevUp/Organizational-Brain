import { prisma } from "@obos/database";
import { parseWikiLinks } from "./parse-links";
import { resolveLinkTargets } from "./resolve";
import { createRelation } from "./store";
import { discoverRelationshipSuggestions } from "./suggestions";

export async function indexDocumentGraph(input: {
  organizationId: string;
  documentId: string;
  content: string;
  createdById?: string;
}) {
  const links = parseWikiLinks(input.content);
  const targets = links.map((l) => l.target);
  const resolved = await resolveLinkTargets(input.organizationId, targets);

  const markdownLinkIds = new Set<string>();
  let brokenCount = 0;

  for (const link of links) {
    const hit = resolved.get(link.target);
    if (!hit?.documentId) {
      brokenCount++;
      continue;
    }
    markdownLinkIds.add(hit.documentId);
    await createRelation({
      organizationId: input.organizationId,
      sourceDocumentId: input.documentId,
      targetDocumentId: hit.documentId,
      relationType: "related_to",
      confidenceScore: 1,
      createdById: input.createdById,
      metadata: { source: "markdown_wikilink", raw: link.raw },
    });
  }

  // Remove stale markdown-derived related_to edges for this source
  const existing = await prisma.knowledgeRelation.findMany({
    where: {
      organizationId: input.organizationId,
      sourceDocumentId: input.documentId,
      relationType: "related_to",
    },
    select: { id: true, targetDocumentId: true, metadata: true },
  });

  for (const rel of existing) {
    const meta = rel.metadata as { source?: string };
    if (meta?.source === "markdown_wikilink" && !markdownLinkIds.has(rel.targetDocumentId)) {
      await prisma.knowledgeRelation.delete({ where: { id: rel.id } });
    }
  }

  const suggestions = await discoverRelationshipSuggestions({
    organizationId: input.organizationId,
    documentId: input.documentId,
  });

  return { linkCount: markdownLinkIds.size, brokenCount, suggestionsCreated: suggestions };
}
