import { prisma } from "@obos/database";
import { computeGraphHealth } from "@obos/graph";

export async function computeDocumentHealth(orgId: string, documentId: string) {
  const doc = await prisma.knowledgeDocument.findFirst({
    where: { id: documentId, organizationId: orgId },
    include: {
      versions: { orderBy: { versionNumber: "desc" }, take: 1 },
      gaps: { where: { status: "open" } },
    },
  });
  if (!doc) return null;

  const now = Date.now();
  const mergedAt = doc.versions[0]?.mergedAt ?? doc.updatedAt;
  const daysSinceUpdate = (now - mergedAt.getTime()) / (1000 * 60 * 60 * 24);

  let freshness = 100;
  if (daysSinceUpdate > 90) freshness = 30;
  else if (daysSinceUpdate > 60) freshness = 50;
  else if (daysSinceUpdate > 30) freshness = 70;
  else if (daysSinceUpdate > 14) freshness = 85;

  const wordCount = doc.versions[0]?.wordCount ?? 0;
  let coverage = 50;
  if (wordCount > 800) coverage = 95;
  else if (wordCount > 400) coverage = 80;
  else if (wordCount > 150) coverage = 65;

  const openGaps = doc.gaps.length;
  const gapPenalty = Math.min(40, openGaps * 10);

  const contradictions = await prisma.knowledgeContradiction.count({
    where: {
      organizationId: orgId,
      status: "open",
      OR: [{ documentAId: documentId }, { documentBId: documentId }],
    },
  });
  const contradictionPenalty = Math.min(30, contradictions * 15);

  const linkCount = await prisma.knowledgeRelation.count({
    where: {
      organizationId: orgId,
      OR: [{ sourceDocumentId: documentId }, { targetDocumentId: documentId }],
    },
  });
  const connectivityBoost = Math.min(15, linkCount * 3);

  const score = Math.max(
    0,
    Math.min(
      100,
      freshness * 0.35 +
        coverage * 0.3 +
        (100 - gapPenalty) * 0.15 +
        (100 - contradictionPenalty) * 0.15 +
        connectivityBoost * 0.05
    )
  );

  const dimensions = {
    freshness,
    coverage,
    openGaps,
    contradictions,
    unresolvedGaps: openGaps,
    linkCount,
  };

  await prisma.knowledgeHealthScore.create({
    data: {
      organizationId: orgId,
      documentId,
      score,
      dimensions: dimensions as object,
      computedAt: new Date(),
    },
  });

  await prisma.knowledgeDocument.update({
    where: { id: documentId },
    data: { healthScore: score, healthUpdatedAt: new Date() },
  });

  return { documentId, score, dimensions };
}

export async function recomputeOrgHealth(orgId: string) {
  const docs = await prisma.knowledgeDocument.findMany({
    where: { organizationId: orgId, status: "published", deletedAt: null },
    select: { id: true },
  });
  const results = [];
  for (const doc of docs) {
    const r = await computeDocumentHealth(orgId, doc.id);
    if (r) results.push(r);
  }
  return results;
}

export async function getHealthDashboard(orgId: string) {
  const [docs, graphHealth] = await Promise.all([
    prisma.knowledgeDocument.findMany({
      where: { organizationId: orgId, status: "published", deletedAt: null },
      select: {
        id: true,
        title: true,
        healthScore: true,
        department: { select: { name: true } },
      },
      orderBy: { healthScore: "asc" },
    }),
    computeGraphHealth(orgId).catch(() => null),
  ]);

  const avg =
    docs.reduce((s, d) => s + Number(d.healthScore ?? 0), 0) / Math.max(docs.length, 1);

  return {
    averageScore: Math.round(avg),
    documents: docs,
    atRisk: docs.filter((d) => Number(d.healthScore ?? 100) < 60),
    graphHealth,
  };
}
