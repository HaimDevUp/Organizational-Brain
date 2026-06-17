import { prisma } from "@obos/database";
import { createHash } from "crypto";

export async function recordLowConfidenceQuery(input: {
  organizationId: string;
  userId: string;
  question: string;
  confidence: number;
  departmentId?: string;
}) {
  if (input.confidence >= 0.45) return null;

  const queryHash = createHash("sha256").update(input.question.toLowerCase().trim()).digest("hex");
  const evidence = {
    question: input.question,
    confidence: input.confidence,
    queryHash,
    frequency: 1,
    lastAskedAt: new Date().toISOString(),
  };

  const existing = await prisma.knowledgeGap.findFirst({
    where: {
      organizationId: input.organizationId,
      gapType: "unanswered_query",
      status: { in: ["open", "acknowledged", "in_progress"] },
      title: input.question.slice(0, 500),
    },
  });

  if (existing) {
    const prev = existing.evidence as { frequency?: number };
    return prisma.knowledgeGap.update({
      where: { id: existing.id },
      data: {
        evidence: {
          ...prev,
          frequency: (prev.frequency ?? 1) + 1,
          lastAskedAt: new Date().toISOString(),
          confidence: input.confidence,
        },
        severity: (prev.frequency ?? 1) >= 5 ? "high" : existing.severity,
      },
    });
  }

  return prisma.knowledgeGap.create({
    data: {
      organizationId: input.organizationId,
      departmentId: input.departmentId,
      gapType: "unanswered_query",
      title: input.question.slice(0, 500),
      description: `Low-confidence answer (${Math.round(input.confidence * 100)}%). Knowledge may be missing or incomplete.`,
      severity: input.confidence < 0.2 ? "high" : "medium",
      detectedBy: "system",
      evidence: evidence as object,
    },
  });
}

export async function listGapsDashboard(orgId: string) {
  const gaps = await prisma.knowledgeGap.findMany({
    where: { organizationId: orgId, status: { in: ["open", "acknowledged", "in_progress"] } },
    include: { department: true, assignedTo: { select: { id: true, name: true, email: true } } },
    orderBy: [{ severity: "desc" }, { updatedAt: "desc" }],
  });

  const byDepartment = await prisma.knowledgeGap.groupBy({
    by: ["departmentId"],
    where: { organizationId: orgId, status: "open" },
    _count: true,
  });

  return { gaps, byDepartment, totalOpen: gaps.length };
}
