import { prisma } from "@obos/database";
import { indexDocumentContent } from "@obos/rag";
import { createHash } from "crypto";
import { wordCount } from "@obos/shared";

export async function enqueueAndIndexDocument(input: {
  organizationId: string;
  documentId: string;
  commitSha: string;
  content: string;
  userId: string;
  pullRequestId?: string;
}) {
  const doc = await prisma.knowledgeDocument.findUniqueOrThrow({
    where: { id: input.documentId },
  });

  const lastVersion = await prisma.knowledgeVersion.findFirst({
    where: { documentId: input.documentId },
    orderBy: { versionNumber: "desc" },
  });
  const versionNumber = (lastVersion?.versionNumber ?? 0) + 1;
  const hash = createHash("sha256").update(input.content).digest("hex");

  const version = await prisma.knowledgeVersion.create({
    data: {
      organizationId: input.organizationId,
      documentId: input.documentId,
      versionNumber,
      gitCommitSha: input.commitSha.padEnd(40, "0").slice(0, 40),
      contentHash: hash,
      contentPreview: input.content,
      wordCount: wordCount(input.content),
      createdById: input.userId,
      pullRequestId: input.pullRequestId,
      mergedAt: new Date(),
    },
  });

  await prisma.knowledgeDocument.update({
    where: { id: input.documentId },
    data: {
      status: "published",
      currentVersionId: version.id,
    },
  });

  const job = await prisma.indexingJob.create({
    data: {
      organizationId: input.organizationId,
      documentId: input.documentId,
      commitSha: input.commitSha.padEnd(40, "0").slice(0, 40),
      status: "pending",
    },
  });

  try {
    await indexDocumentContent({
      organizationId: input.organizationId,
      documentId: input.documentId,
      versionId: version.id,
      content: input.content,
      gitPath: doc.gitPath,
      title: doc.title,
      departmentId: doc.departmentId,
      tags: doc.tags,
      docType: doc.docType,
      commitSha: input.commitSha,
    });
    await prisma.indexingJob.update({
      where: { id: job.id },
      data: { status: "completed", completedAt: new Date(), startedAt: new Date() },
    });
  } catch (err) {
    await prisma.indexingJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        error: err instanceof Error ? err.message : "Indexing failed",
        completedAt: new Date(),
      },
    });
  }

  return { version, job };
}
