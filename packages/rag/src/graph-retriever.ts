import { prisma } from "@obos/database";
import {
  expandNeighborhood,
  DEFAULT_GRAPH_DEPTH,
  DEFAULT_GRAPH_MAX_DOCS,
  DEFAULT_SEMANTIC_TOP_K,
} from "@obos/graph";
import type { SearchFilters } from "@obos/qdrant";
import { hybridSearch, type RetrievedChunk } from "./retriever";

export type GraphContextDocument = {
  documentId: string;
  title: string;
  gitPath: string;
  content: string;
  source: "semantic" | "graph";
  semanticScore?: number;
  graphDistance?: number;
  rankScore: number;
};

export async function graphAwareHybridSearch(
  orgId: string,
  query: string,
  options?: {
    semanticTopK?: number;
    graphDepth?: number;
    maxDocuments?: number;
    filters?: SearchFilters;
  }
): Promise<{
  chunks: RetrievedChunk[];
  graphDocuments: GraphContextDocument[];
  seedDocumentIds: string[];
  expandedDocumentIds: string[];
}> {
  const semanticTopK = options?.semanticTopK ?? DEFAULT_SEMANTIC_TOP_K;
  const graphDepth = options?.graphDepth ?? DEFAULT_GRAPH_DEPTH;
  const maxDocuments = options?.maxDocuments ?? DEFAULT_GRAPH_MAX_DOCS;

  const chunks = await hybridSearch(orgId, query, semanticTopK, options?.filters);
  const seedDocumentIds = [...new Set(chunks.map((c) => c.payload.document_id))];

  const { documentIds: expandedIds, distances } = await expandNeighborhood(
    orgId,
    seedDocumentIds,
    { depth: graphDepth, maxNodes: maxDocuments }
  );

  const graphOnlyIds = expandedIds.filter((id) => !seedDocumentIds.includes(id));
  const graphDocuments: GraphContextDocument[] = [];

  if (graphOnlyIds.length) {
    const docs = await prisma.knowledgeDocument.findMany({
      where: {
        id: { in: graphOnlyIds },
        organizationId: orgId,
        status: "published",
        deletedAt: null,
      },
      include: {
        currentVersion: { select: { contentPreview: true, mergedAt: true } },
        department: { select: { id: true } },
      },
    });

    for (const doc of docs) {
      const preview = doc.currentVersion?.contentPreview ?? "";
      const content = preview.slice(0, 2000);
      const graphDistance = distances.get(doc.id) ?? 2;
      const freshnessDays = doc.currentVersion?.mergedAt
        ? (Date.now() - doc.currentVersion.mergedAt.getTime()) / 86400000
        : 365;
      const freshnessBoost = Math.max(0, 1 - freshnessDays / 365) * 0.1;
      const rankScore = Math.max(0, 0.5 - graphDistance * 0.12 + freshnessBoost);

      graphDocuments.push({
        documentId: doc.id,
        title: doc.title,
        gitPath: doc.gitPath,
        content,
        source: "graph",
        graphDistance,
        rankScore,
      });
    }

    graphDocuments.sort((a, b) => b.rankScore - a.rankScore);
  }

  const semanticDocs: GraphContextDocument[] = chunks.map((c, i) => ({
    documentId: c.payload.document_id,
    title: c.payload.title,
    gitPath: c.payload.git_path,
    content: c.payload.content,
    source: "semantic" as const,
    semanticScore: c.score,
    graphDistance: distances.get(c.payload.document_id) ?? 0,
    rankScore: (c.score ?? 0) * 0.7 + (1 - (distances.get(c.payload.document_id) ?? 0) * 0.1) * 0.3 - i * 0.01,
  }));

  const merged = [...semanticDocs];
  const seen = new Set(semanticDocs.map((d) => d.documentId));
  for (const g of graphDocuments) {
    if (!seen.has(g.documentId)) merged.push(g);
  }
  merged.sort((a, b) => b.rankScore - a.rankScore);

  return {
    chunks,
    graphDocuments: merged.slice(0, maxDocuments),
    seedDocumentIds,
    expandedDocumentIds: expandedIds,
  };
}

export function buildGraphAwareContext(docs: GraphContextDocument[]): string {
  return docs
    .map((d, i) => {
      const tag = d.source === "graph" ? `[graph+${d.graphDistance ?? "?"}]` : "[semantic]";
      return `[${i + 1}] ${d.title} (${d.gitPath}) ${tag}\n${d.content}`;
    })
    .join("\n\n---\n\n");
}

export async function buildKnowledgePaths(
  orgId: string,
  seedDocumentIds: string[],
  expandedDocumentIds: string[]
) {
  const ids = [...new Set([...seedDocumentIds, ...expandedDocumentIds])];
  const docs = await prisma.knowledgeDocument.findMany({
    where: { id: { in: ids } },
    select: { id: true, title: true },
  });
  const titleById = new Map(docs.map((d) => [d.id, d.title]));

  const relations = await prisma.knowledgeRelation.findMany({
    where: {
      organizationId: orgId,
      sourceDocumentId: { in: ids },
      targetDocumentId: { in: ids },
    },
    select: { sourceDocumentId: true, targetDocumentId: true, relationType: true },
  });

  const paths: Array<{ from: string; to: string; relationType: string }> = [];
  for (const rel of relations) {
    if (seedDocumentIds.includes(rel.sourceDocumentId) || seedDocumentIds.includes(rel.targetDocumentId)) {
      paths.push({
        from: titleById.get(rel.sourceDocumentId) ?? rel.sourceDocumentId,
        to: titleById.get(rel.targetDocumentId) ?? rel.targetDocumentId,
        relationType: rel.relationType,
      });
    }
  }
  return paths.slice(0, 20);
}
