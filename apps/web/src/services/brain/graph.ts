import { prisma } from "@obos/database";
import {
  buildGraphSnapshot,
  computeGraphHealth,
  createRelation,
  expandNeighborhood,
  findShortestPath,
  getDocumentRelations,
  approveRelationshipSuggestion,
  rejectRelationshipSuggestion,
  getDependents,
} from "@obos/graph";
import type { KnowledgeRelationType } from "@obos/database";

export async function getKnowledgeGraph(
  orgId: string,
  filters?: { departmentId?: string; documentIds?: string[] }
) {
  return buildGraphSnapshot(orgId, filters);
}

export async function getGraphNodeDetail(orgId: string, documentId: string) {
  const doc = await prisma.knowledgeDocument.findFirst({
    where: { id: documentId, organizationId: orgId, deletedAt: null },
    include: {
      owner: { select: { id: true, name: true, email: true } },
      department: { select: { id: true, name: true, slug: true } },
      currentVersion: { select: { contentPreview: true, mergedAt: true, versionNumber: true } },
      versions: { orderBy: { versionNumber: "desc" }, take: 5, select: { id: true, versionNumber: true, mergedAt: true } },
    },
  });
  if (!doc) return null;

  const relations = await getDocumentRelations(orgId, documentId);
  const neighborhood = await expandNeighborhood(orgId, [documentId], { depth: 1, maxNodes: 20 });

  return {
    document: doc,
    relations,
    neighborhoodIds: neighborhood.documentIds.filter((id) => id !== documentId),
  };
}

export async function createGraphLink(input: {
  organizationId: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  relationType: KnowledgeRelationType;
  userId: string;
  confidenceScore?: number;
}) {
  return createRelation({
    organizationId: input.organizationId,
    sourceDocumentId: input.sourceDocumentId,
    targetDocumentId: input.targetDocumentId,
    relationType: input.relationType,
    createdById: input.userId,
    confidenceScore: input.confidenceScore ?? 1,
    metadata: { source: "manual" },
  });
}

export async function discoverKnowledgePath(
  orgId: string,
  sourceDocumentId: string,
  targetDocumentId: string
) {
  return findShortestPath(orgId, sourceDocumentId, targetDocumentId);
}

export async function getImpactedDocuments(orgId: string, documentId: string) {
  return getDependents(orgId, documentId, 3);
}

export async function getGraphHealthDashboard(orgId: string) {
  return computeGraphHealth(orgId);
}

export async function listPendingSuggestions(orgId: string, limit = 20) {
  return prisma.relationshipSuggestion.findMany({
    where: { organizationId: orgId, status: "pending" },
    include: {
      sourceDocument: { select: { id: true, title: true } },
      targetDocument: { select: { id: true, title: true } },
    },
    orderBy: { confidenceScore: "desc" },
    take: limit,
  });
}

export { approveRelationshipSuggestion, rejectRelationshipSuggestion };

export async function searchGraphDocuments(
  orgId: string,
  query: {
    q?: string;
    departmentId?: string;
    ownerId?: string;
    tag?: string;
    docType?: string;
    relationType?: KnowledgeRelationType;
  }
) {
  const docs = await prisma.knowledgeDocument.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      ...(query.departmentId ? { departmentId: query.departmentId } : {}),
      ...(query.ownerId ? { ownerUserId: query.ownerId } : {}),
      ...(query.tag ? { tags: { has: query.tag } } : {}),
      ...(query.docType ? { docType: query.docType as "policy" | "runbook" | "faq" | "general" } : {}),
      ...(query.q
        ? {
            OR: [
              { title: { contains: query.q, mode: "insensitive" } },
              { slug: { contains: query.q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: { id: true, title: true, slug: true, departmentId: true, tags: true, docType: true },
    take: 50,
  });

  if (!query.relationType) return docs;

  const rels = await prisma.knowledgeRelation.findMany({
    where: {
      organizationId: orgId,
      relationType: query.relationType,
      OR: [
        { sourceDocumentId: { in: docs.map((d) => d.id) } },
        { targetDocumentId: { in: docs.map((d) => d.id) } },
      ],
    },
    select: { sourceDocumentId: true, targetDocumentId: true },
  });
  const linked = new Set(rels.flatMap((r) => [r.sourceDocumentId, r.targetDocumentId]));
  return docs.filter((d) => linked.has(d.id));
}

export async function buildOnboardingLearningPath(orgId: string, startDocumentId: string) {
  const { documentIds } = await expandNeighborhood(orgId, [startDocumentId], {
    depth: 3,
    maxNodes: 12,
  });
  const docs = await prisma.knowledgeDocument.findMany({
    where: { id: { in: documentIds }, organizationId: orgId },
    select: { id: true, title: true, slug: true },
  });
  const order = documentIds
    .map((id) => docs.find((d) => d.id === id))
    .filter(Boolean);
  return order;
}
