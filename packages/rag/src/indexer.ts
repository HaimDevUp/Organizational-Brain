import { createHash } from "crypto";
import { prisma } from "@obos/database";
import { parseFrontmatter } from "@obos/shared";
import { resolveEmbeddingProvider } from "@obos/ai-providers";
import {
  upsertChunks,
  deleteDocumentChunks,
  type ChunkPayload,
} from "@obos/qdrant";
import { indexDocumentGraph } from "@obos/graph";
import { chunkMarkdown } from "./chunker";

function chunkPointId(orgId: string, documentId: string, versionId: string, index: number) {
  const raw = `${orgId}:${documentId}:${versionId}:${index}`;
  return createHash("sha256").update(raw).digest("hex").slice(0, 32);
}

export async function indexDocumentContent(input: {
  organizationId: string;
  documentId: string;
  versionId: string;
  content: string;
  gitPath: string;
  title: string;
  departmentId: string | null;
  tags: string[];
  docType: string;
  commitSha: string;
}) {
  const { body } = parseFrontmatter(input.content);
  const chunks = chunkMarkdown(body);
  if (!chunks.length) return { chunkCount: 0 };

  const embedder = resolveEmbeddingProvider();
  const { vectors } = await embedder.embed(chunks.map((c) => c.content));

  await deleteDocumentChunks(input.organizationId, input.documentId);

  const points = chunks.map((chunk, i) => ({
    id: chunkPointId(input.organizationId, input.documentId, input.versionId, chunk.index),
    vector: vectors[i] ?? vectors[0],
    payload: {
      organization_id: input.organizationId,
      document_id: input.documentId,
      version_id: input.versionId,
      department_id: input.departmentId,
      git_path: input.gitPath,
      title: input.title,
      chunk_index: chunk.index,
      heading_path: chunk.headingPath,
      content: chunk.content,
      tags: input.tags,
      doc_type: input.docType,
      status: "published",
    } satisfies ChunkPayload,
  }));

  await upsertChunks(input.organizationId, points);

  await prisma.organization.update({
    where: { id: input.organizationId },
    data: { qdrantCollection: `org_${input.organizationId.replace(/-/g, "")}_knowledge` },
  });

  await indexDocumentGraph({
    organizationId: input.organizationId,
    documentId: input.documentId,
    content: input.content,
  }).catch(() => {
    // graph indexing is best-effort during vector indexing
  });

  return { chunkCount: points.length };
}

export async function processIndexingJob(jobId: string) {
  const job = await prisma.indexingJob.findUnique({
    where: { id: jobId },
    include: { document: true },
  });
  if (!job || job.status === "completed") return;

  await prisma.indexingJob.update({
    where: { id: jobId },
    data: { status: "processing", startedAt: new Date() },
  });

  try {
    const version = await prisma.knowledgeVersion.findFirst({
      where: { documentId: job.documentId, gitCommitSha: job.commitSha },
      orderBy: { versionNumber: "desc" },
    });

    if (!version?.contentPreview) {
      throw new Error("No version content available for indexing");
    }

    const fullContent = version.contentPreview;
    await indexDocumentContent({
      organizationId: job.organizationId,
      documentId: job.documentId,
      versionId: version.id,
      content: fullContent,
      gitPath: job.document.gitPath,
      title: job.document.title,
      departmentId: job.document.departmentId,
      tags: job.document.tags,
      docType: job.document.docType,
      commitSha: job.commitSha,
    });

    await prisma.indexingJob.update({
      where: { id: jobId },
      data: { status: "completed", completedAt: new Date() },
    });
  } catch (err) {
    await prisma.indexingJob.update({
      where: { id: jobId },
      data: {
        status: "failed",
        error: err instanceof Error ? err.message : "Unknown error",
        completedAt: new Date(),
      },
    });
    throw err;
  }
}

export async function processPendingIndexingJobs(limit = 10) {
  const jobs = await prisma.indexingJob.findMany({
    where: { status: "pending" },
    take: limit,
    orderBy: { createdAt: "asc" },
  });
  for (const job of jobs) {
    await processIndexingJob(job.id);
  }
}
