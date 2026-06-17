import { prisma } from "@obos/database";
import { NotFoundError, BadRequestError, slugifyTitle, buildMarkdownWithFrontmatter } from "@obos/shared";
import { createGitHubClient } from "@obos/github-git";
import { parseOrgSettings, getGitHubConfig } from "@obos/shared";

export async function listKnowledge(
  orgId: string,
  filters?: { q?: string; status?: string; departmentId?: string }
) {
  return prisma.knowledgeDocument.findMany({
    where: {
      organizationId: orgId,
      deletedAt: null,
      ...(filters?.status ? { status: filters.status as "draft" | "published" | "archived" } : {}),
      ...(filters?.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters?.q
        ? { title: { contains: filters.q, mode: "insensitive" as const } }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getKnowledgeDocument(orgId: string, docId: string) {
  const doc = await prisma.knowledgeDocument.findFirst({
    where: { id: docId, organizationId: orgId, deletedAt: null },
    include: { department: true, owner: true },
  });
  if (!doc) throw new NotFoundError("Document not found");
  return doc;
}

export async function createKnowledgeDocument(
  orgId: string,
  userId: string,
  data: {
    title: string;
    content: string;
    departmentId?: string;
    docType?: string;
  }
) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const settings = parseOrgSettings(org.settings);
  const slug = slugifyTitle(data.title);
  const dept = data.departmentId
    ? await prisma.department.findFirst({ where: { id: data.departmentId, organizationId: orgId } })
    : null;
  const deptPath = dept ? `departments/${dept.slug}` : "company";
  const gitPath = `${deptPath}/${slug}.md`;
  const markdown = buildMarkdownWithFrontmatter(data.content, { title: data.title });

  const doc = await prisma.knowledgeDocument.create({
    data: {
      organizationId: orgId,
      departmentId: data.departmentId,
      title: data.title,
      slug,
      gitPath,
      docType: (data.docType as "general") ?? "general",
      status: "draft",
      ownerUserId: userId,
      tags: [],
    },
  });

  const gitConfig = getGitHubConfig(settings);
  if (gitConfig?.githubOwner && gitConfig.githubRepo && process.env.GITHUB_TOKEN) {
    const client = createGitHubClient({
      owner: gitConfig.githubOwner,
      repo: gitConfig.githubRepo,
      token: process.env.GITHUB_TOKEN,
    });
    const branch = `draft/${userId}/${slug}`;
    try {
      await client.createBranch(branch);
      await client.upsertFile(branch, gitPath, markdown, `draft: ${data.title}`);
    } catch (e) {
      console.warn("GitHub sync skipped:", e);
    }
  }

  return doc;
}

export async function updateKnowledgeDocument(
  orgId: string,
  docId: string,
  data: { title?: string; content?: string; tags?: string[] }
) {
  const doc = await getKnowledgeDocument(orgId, docId);
  const updates: Record<string, unknown> = {};
  if (data.title) updates.title = data.title;
  if (data.tags) updates.tags = data.tags;

  const updated = await prisma.knowledgeDocument.update({
    where: { id: docId },
    data: updates,
  });

  if (data.content) {
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    const settings = parseOrgSettings(org.settings);
    const gitConfig = getGitHubConfig(settings);
    if (gitConfig?.githubOwner && gitConfig.githubRepo && process.env.GITHUB_TOKEN) {
      const client = createGitHubClient({
        owner: gitConfig.githubOwner,
        repo: gitConfig.githubRepo,
        token: process.env.GITHUB_TOKEN,
      });
      const markdown = buildMarkdownWithFrontmatter(data.content, {
        title: data.title ?? doc.title,
      });
      const branch = `draft/${doc.ownerUserId}/${doc.slug}`;
      try {
        await client.createBranch(branch);
        await client.upsertFile(branch, doc.gitPath, markdown, `update: ${doc.title}`);
      } catch (e) {
        console.warn("GitHub sync skipped:", e);
      }
    }
  }

  return updated;
}

export async function getDocumentContent(orgId: string, docId: string): Promise<string> {
  const doc = await getKnowledgeDocument(orgId, docId);

  const version = doc.currentVersionId
    ? await prisma.knowledgeVersion.findUnique({ where: { id: doc.currentVersionId } })
    : null;
  if (version?.contentPreview?.trim()) {
    return version.contentPreview;
  }

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const settings = parseOrgSettings(org.settings);
  const gitConfig = getGitHubConfig(settings);

  if (gitConfig?.githubOwner && gitConfig.githubRepo && process.env.GITHUB_TOKEN) {
    const client = createGitHubClient({
      owner: gitConfig.githubOwner,
      repo: gitConfig.githubRepo,
      token: process.env.GITHUB_TOKEN,
    });
    const branch = settings.git?.defaultBranch ?? "main";
    const content = await client.getFileContent(doc.gitPath, branch);
    if (content?.trim()) return content;
  }

  return `# ${doc.title}\n\n_No content yet._`;
}

export async function deleteKnowledgeDocument(orgId: string, docId: string) {
  await getKnowledgeDocument(orgId, docId);

  await prisma.$transaction([
    prisma.knowledgeRelation.deleteMany({
      where: {
        organizationId: orgId,
        OR: [{ sourceDocumentId: docId }, { targetDocumentId: docId }],
      },
    }),
    prisma.relationshipSuggestion.deleteMany({
      where: {
        organizationId: orgId,
        OR: [{ sourceDocumentId: docId }, { targetDocumentId: docId }],
      },
    }),
    prisma.knowledgeDocument.updateMany({
      where: { id: docId, organizationId: orgId, deletedAt: null },
      data: { deletedAt: new Date(), status: "archived" },
    }),
  ]);

  try {
    const { deleteDocumentChunks } = await import("@obos/qdrant");
    await deleteDocumentChunks(orgId, docId);
  } catch (err) {
    console.warn("[knowledge] Qdrant cleanup skipped:", err);
  }

  return { success: true };
}
