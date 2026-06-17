import { prisma } from "@obos/database";
import { hybridSearch } from "@obos/rag";
import { resolveProvider } from "@obos/ai-providers";

export async function detectContradictionsForDocument(orgId: string, documentId: string) {
  const doc = await prisma.knowledgeDocument.findFirst({
    where: { id: documentId, organizationId: orgId, status: "published" },
  });
  if (!doc) return [];

  const chunks = await hybridSearch(orgId, doc.title, 5, { documentIds: [documentId] });
  if (!chunks.length) return [];

  const related = await hybridSearch(orgId, chunks[0].payload.content.slice(0, 500), 5);
  const otherDocs = related.filter((c) => c.payload.document_id !== documentId);

  const created = [];
  const llm = resolveProvider();

  for (const other of otherDocs.slice(0, 2)) {
    const existing = await prisma.knowledgeContradiction.findFirst({
      where: {
        organizationId: orgId,
        status: "open",
        OR: [
          { documentAId: documentId, documentBId: other.payload.document_id },
          { documentAId: other.payload.document_id, documentBId: documentId },
        ],
      },
    });
    if (existing) continue;

    const analysis = await llm.complete(
      [
        {
          role: "system",
          content:
            'Analyze if these two knowledge excerpts contradict each other. Reply JSON: {"contradicts":boolean,"summary":"..."}',
        },
        {
          role: "user",
          content: `Doc A (${doc.title}):\n${chunks[0].payload.content}\n\nDoc B (${other.payload.title}):\n${other.payload.content}`,
        },
      ],
      { jsonMode: true, maxTokens: 300 }
    );

    let parsed: { contradicts?: boolean; summary?: string } = {};
    try {
      parsed = JSON.parse(analysis.content);
    } catch {
      continue;
    }

    if (!parsed.contradicts) continue;

    const row = await prisma.knowledgeContradiction.create({
      data: {
        organizationId: orgId,
        documentAId: documentId,
        documentBId: other.payload.document_id,
        summary: parsed.summary ?? "Potential contradiction detected",
        evidence: {
          excerptA: chunks[0].payload.content.slice(0, 400),
          excerptB: other.payload.content.slice(0, 400),
        } as object,
      },
      include: {
        documentA: { select: { id: true, title: true, gitPath: true } },
        documentB: { select: { id: true, title: true, gitPath: true } },
      },
    });

    const { createRelation } = await import("@obos/graph");
    await createRelation({
      organizationId: orgId,
      sourceDocumentId: documentId,
      targetDocumentId: other.payload.document_id,
      relationType: "contradicts",
      confidenceScore: 0.85,
      metadata: { source: "contradiction_engine", contradictionId: row.id },
    }).catch(() => undefined);

    created.push(row);

    await prisma.knowledgeGap.create({
      data: {
        organizationId: orgId,
        documentId,
        gapType: "contradiction",
        title: `Contradiction: ${doc.title} vs ${other.payload.title}`,
        description: parsed.summary,
        severity: "high",
        detectedBy: "system",
        evidence: { contradictionId: row.id } as object,
      },
    });
  }

  return created;
}

export async function listContradictions(orgId: string) {
  return prisma.knowledgeContradiction.findMany({
    where: { organizationId: orgId, status: { in: ["open", "reviewing"] } },
    include: {
      documentA: { select: { id: true, title: true, gitPath: true } },
      documentB: { select: { id: true, title: true, gitPath: true } },
    },
    orderBy: { detectedAt: "desc" },
  });
}
