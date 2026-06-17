import { prisma } from "@obos/database";
import { indexDocumentGraph } from "./indexer";

/** Rebuild wiki-link graph edges for all published documents in an org. */
export async function reindexOrganizationGraph(organizationId: string) {
  const docs = await prisma.knowledgeDocument.findMany({
    where: { organizationId, status: "published", deletedAt: null },
    include: {
      currentVersion: { select: { contentPreview: true } },
    },
  });

  let processed = 0;
  for (const doc of docs) {
    const content = doc.currentVersion?.contentPreview;
    if (!content) continue;
    await indexDocumentGraph({
      organizationId,
      documentId: doc.id,
      content,
    });
    processed++;
  }
  return { processed, total: docs.length };
}
