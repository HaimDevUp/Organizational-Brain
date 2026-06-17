import { prisma, type KnowledgeRelationType, type Prisma } from "@obos/database";

export async function createRelation(input: {
  organizationId: string;
  sourceDocumentId: string;
  targetDocumentId: string;
  relationType: KnowledgeRelationType;
  confidenceScore?: number;
  createdById?: string;
  metadata?: Prisma.InputJsonValue;
}) {
  if (input.sourceDocumentId === input.targetDocumentId) return null;
  return prisma.knowledgeRelation.upsert({
    where: {
      sourceDocumentId_targetDocumentId_relationType: {
        sourceDocumentId: input.sourceDocumentId,
        targetDocumentId: input.targetDocumentId,
        relationType: input.relationType,
      },
    },
    create: {
      organizationId: input.organizationId,
      sourceDocumentId: input.sourceDocumentId,
      targetDocumentId: input.targetDocumentId,
      relationType: input.relationType,
      confidenceScore: input.confidenceScore,
      createdById: input.createdById,
      metadata: input.metadata ?? {},
    },
    update: {
      confidenceScore: input.confidenceScore,
      metadata: input.metadata ?? {},
      updatedAt: new Date(),
    },
  });
}

export async function removeRelation(
  organizationId: string,
  sourceDocumentId: string,
  targetDocumentId: string,
  relationType?: KnowledgeRelationType
) {
  return prisma.knowledgeRelation.deleteMany({
    where: {
      organizationId,
      sourceDocumentId,
      targetDocumentId,
      ...(relationType ? { relationType } : {}),
    },
  });
}

export async function getDocumentRelations(organizationId: string, documentId: string) {
  const [outgoing, incoming] = await Promise.all([
    prisma.knowledgeRelation.findMany({
      where: { organizationId, sourceDocumentId: documentId },
      include: {
        targetDocument: {
          select: { id: true, title: true, slug: true, status: true, gitPath: true },
        },
      },
    }),
    prisma.knowledgeRelation.findMany({
      where: { organizationId, targetDocumentId: documentId },
      include: {
        sourceDocument: {
          select: { id: true, title: true, slug: true, status: true, gitPath: true },
        },
      },
    }),
  ]);
  return { outgoing, incoming };
}

export async function listOrgRelations(
  organizationId: string,
  filters?: {
    departmentId?: string;
    relationType?: KnowledgeRelationType;
    documentIds?: string[];
  }
) {
  const docs = filters?.departmentId
    ? await prisma.knowledgeDocument.findMany({
        where: { organizationId, departmentId: filters.departmentId, deletedAt: null },
        select: { id: true },
      })
    : null;
  const allowedIds = docs?.map((d) => d.id);

  return prisma.knowledgeRelation.findMany({
    where: {
      organizationId,
      ...(filters?.relationType ? { relationType: filters.relationType } : {}),
      ...(filters?.documentIds?.length
        ? {
            OR: [
              { sourceDocumentId: { in: filters.documentIds } },
              { targetDocumentId: { in: filters.documentIds } },
            ],
          }
        : {}),
      ...(allowedIds
        ? {
            sourceDocumentId: { in: allowedIds },
            targetDocumentId: { in: allowedIds },
          }
        : {}),
    },
    include: {
      sourceDocument: {
        select: {
          id: true,
          title: true,
          slug: true,
          departmentId: true,
          status: true,
          gitPath: true,
          tags: true,
          healthScore: true,
          updatedAt: true,
          ownerUserId: true,
          docType: true,
        },
      },
      targetDocument: {
        select: {
          id: true,
          title: true,
          slug: true,
          departmentId: true,
          status: true,
          gitPath: true,
          tags: true,
          healthScore: true,
          updatedAt: true,
          ownerUserId: true,
          docType: true,
        },
      },
    },
  });
}
