import { prisma, type KnowledgeRelationType } from "@obos/database";
import type { GraphPath, GraphTraversalOptions } from "./types";

type Adjacency = Map<string, Array<{ neighborId: string; relationType: KnowledgeRelationType }>>;

async function loadAdjacency(
  organizationId: string,
  relationTypes?: KnowledgeRelationType[]
): Promise<Adjacency> {
  const relations = await prisma.knowledgeRelation.findMany({
    where: {
      organizationId,
      ...(relationTypes?.length ? { relationType: { in: relationTypes } } : {}),
    },
    select: { sourceDocumentId: true, targetDocumentId: true, relationType: true },
  });

  const adj = new Map<string, Array<{ neighborId: string; relationType: KnowledgeRelationType }>>();
  const add = (from: string, to: string, relationType: KnowledgeRelationType) => {
    const list = adj.get(from) ?? [];
    list.push({ neighborId: to, relationType });
    adj.set(from, list);
  };

  for (const rel of relations) {
    add(rel.sourceDocumentId, rel.targetDocumentId, rel.relationType);
    add(rel.targetDocumentId, rel.sourceDocumentId, rel.relationType);
  }
  return adj;
}

export async function expandNeighborhood(
  organizationId: string,
  seedDocumentIds: string[],
  options: GraphTraversalOptions = {}
): Promise<{
  documentIds: string[];
  distances: Map<string, number>;
}> {
  const depth = options.depth ?? 2;
  const maxNodes = options.maxNodes ?? 15;
  const adj = await loadAdjacency(organizationId, options.relationTypes);

  const distances = new Map<string, number>();
  const queue: Array<{ id: string; d: number }> = [];

  for (const id of seedDocumentIds) {
    distances.set(id, 0);
    queue.push({ id, d: 0 });
  }

  while (queue.length && distances.size < maxNodes) {
    const current = queue.shift()!;
    if (current.d >= depth) continue;
    for (const edge of adj.get(current.id) ?? []) {
      if (distances.has(edge.neighborId)) continue;
      if (distances.size >= maxNodes) break;
      distances.set(edge.neighborId, current.d + 1);
      queue.push({ id: edge.neighborId, d: current.d + 1 });
    }
  }

  return { documentIds: [...distances.keys()], distances };
}

export async function findShortestPath(
  organizationId: string,
  sourceDocumentId: string,
  targetDocumentId: string,
  maxDepth = 6
): Promise<GraphPath | null> {
  if (sourceDocumentId === targetDocumentId) return null;
  const adj = await loadAdjacency(organizationId);
  const queue: string[] = [sourceDocumentId];
  const parent = new Map<string, { id: string; relationType: KnowledgeRelationType }>();
  const visited = new Set<string>([sourceDocumentId]);
  let found = false;

  for (let depth = 0; queue.length && depth < maxDepth; depth++) {
    const levelSize = queue.length;
    for (let i = 0; i < levelSize; i++) {
      const node = queue.shift()!;
      for (const edge of adj.get(node) ?? []) {
        if (visited.has(edge.neighborId)) continue;
        visited.add(edge.neighborId);
        parent.set(edge.neighborId, { id: node, relationType: edge.relationType });
        if (edge.neighborId === targetDocumentId) {
          found = true;
          break;
        }
        queue.push(edge.neighborId);
      }
      if (found) break;
    }
    if (found) break;
  }

  if (!found) return null;

  const documentIds: string[] = [targetDocumentId];
  const relationTypes: KnowledgeRelationType[] = [];
  let cursor = targetDocumentId;
  while (cursor !== sourceDocumentId) {
    const p = parent.get(cursor);
    if (!p) break;
    relationTypes.unshift(p.relationType);
    cursor = p.id;
    documentIds.unshift(cursor);
  }

  const docs = await prisma.knowledgeDocument.findMany({
    where: { id: { in: documentIds } },
    select: { id: true, title: true },
  });
  const titleById = new Map(docs.map((d) => [d.id, d.title]));

  return {
    documentIds,
    titles: documentIds.map((id) => titleById.get(id) ?? id),
    relationTypes,
  };
}

export async function getDependents(organizationId: string, documentId: string, depth = 3) {
  const relations = await prisma.knowledgeRelation.findMany({
    where: {
      organizationId,
      relationType: { in: ["depends_on", "references", "child_of"] },
      OR: [{ targetDocumentId: documentId }, { sourceDocumentId: documentId }],
    },
  });
  const seeds = new Set<string>();
  for (const r of relations) {
    if (r.targetDocumentId === documentId) seeds.add(r.sourceDocumentId);
    if (r.sourceDocumentId === documentId) seeds.add(r.targetDocumentId);
  }
  return expandNeighborhood(organizationId, [...seeds, documentId], { depth, maxNodes: 30 });
}
