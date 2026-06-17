import { prisma } from "@obos/database";

function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  let inter = 0;
  for (const x of setA) if (setB.has(x)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

function titleSimilarity(a: string, b: string): number {
  const wa = new Set(a.toLowerCase().split(/\s+/).filter((t) => t.length > 2));
  const wb = new Set(b.toLowerCase().split(/\s+/).filter((t) => t.length > 2));
  let inter = 0;
  for (const w of wa) if (wb.has(w)) inter++;
  const union = wa.size + wb.size - inter;
  return union === 0 ? 0 : inter / union;
}

export async function discoverRelationshipSuggestions(input: {
  organizationId: string;
  documentId: string;
  limit?: number;
}) {
  const source = await prisma.knowledgeDocument.findUnique({
    where: { id: input.documentId },
    select: {
      id: true,
      title: true,
      departmentId: true,
      tags: true,
      ownerUserId: true,
      organizationId: true,
      status: true,
    },
  });
  if (!source || source.status !== "published") return 0;

  const candidates = await prisma.knowledgeDocument.findMany({
    where: {
      organizationId: input.organizationId,
      deletedAt: null,
      status: "published",
      id: { not: source.id },
    },
    select: {
      id: true,
      title: true,
      departmentId: true,
      tags: true,
      ownerUserId: true,
    },
    take: 200,
  });

  const existing = await prisma.knowledgeRelation.findMany({
    where: {
      organizationId: input.organizationId,
      OR: [{ sourceDocumentId: source.id }, { targetDocumentId: source.id }],
    },
    select: { sourceDocumentId: true, targetDocumentId: true },
  });
  const linked = new Set(
    existing.flatMap((r) =>
      r.sourceDocumentId === source.id ? [r.targetDocumentId] : [r.sourceDocumentId]
    )
  );

  const pending = await prisma.relationshipSuggestion.findMany({
    where: {
      organizationId: input.organizationId,
      status: "pending",
      OR: [{ sourceDocumentId: source.id }, { targetDocumentId: source.id }],
    },
    select: { sourceDocumentId: true, targetDocumentId: true },
  });
  const suggested = new Set(
    pending.flatMap((s) =>
      s.sourceDocumentId === source.id ? [s.targetDocumentId] : [s.sourceDocumentId]
    )
  );

  const scored: Array<{ targetId: string; score: number; reason: string }> = [];

  for (const cand of candidates) {
    if (linked.has(cand.id) || suggested.has(cand.id)) continue;

    const tagScore = jaccard(source.tags, cand.tags);
    const titleScore = titleSimilarity(source.title, cand.title);
    const deptBonus = source.departmentId && source.departmentId === cand.departmentId ? 0.15 : 0;
    const ownerBonus = source.ownerUserId === cand.ownerUserId ? 0.1 : 0;
    const score = Math.min(1, tagScore * 0.45 + titleScore * 0.35 + deptBonus + ownerBonus);

    if (score < 0.55) continue;
    const reasons: string[] = [];
    if (tagScore > 0.2) reasons.push("shared tags");
    if (titleScore > 0.25) reasons.push("similar terminology");
    if (deptBonus) reasons.push("same department");
    if (ownerBonus) reasons.push("same owner");

    scored.push({
      targetId: cand.id,
      score,
      reason: reasons.join(", ") || "semantic overlap",
    });
  }

  scored.sort((a, b) => b.score - a.score);
  let created = 0;
  for (const item of scored.slice(0, input.limit ?? 5)) {
    const exists = await prisma.relationshipSuggestion.findFirst({
      where: {
        organizationId: input.organizationId,
        sourceDocumentId: source.id,
        targetDocumentId: item.targetId,
        status: "pending",
      },
    });
    if (exists) continue;

    await prisma.relationshipSuggestion.create({
      data: {
        organizationId: input.organizationId,
        sourceDocumentId: source.id,
        targetDocumentId: item.targetId,
        relationType: "related_to",
        confidenceScore: item.score,
        reason: item.reason,
        evidence: { heuristic: true, score: item.score },
      },
    });
    created++;
  }
  return created;
}

export async function approveRelationshipSuggestion(
  suggestionId: string,
  reviewerId: string
) {
  const suggestion = await prisma.relationshipSuggestion.findUniqueOrThrow({
    where: { id: suggestionId },
  });
  if (suggestion.status !== "pending") return suggestion;

  const { createRelation } = await import("./store");
  await createRelation({
    organizationId: suggestion.organizationId,
    sourceDocumentId: suggestion.sourceDocumentId,
    targetDocumentId: suggestion.targetDocumentId,
    relationType: suggestion.relationType,
    confidenceScore: Number(suggestion.confidenceScore),
    createdById: reviewerId,
    metadata: { source: "approved_suggestion", suggestionId },
  });

  return prisma.relationshipSuggestion.update({
    where: { id: suggestionId },
    data: { status: "approved", reviewedById: reviewerId, reviewedAt: new Date() },
  });
}

export async function rejectRelationshipSuggestion(
  suggestionId: string,
  reviewerId: string
) {
  return prisma.relationshipSuggestion.update({
    where: { id: suggestionId },
    data: { status: "rejected", reviewedById: reviewerId, reviewedAt: new Date() },
  });
}
