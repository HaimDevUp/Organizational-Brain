import { prisma } from "@obos/database";
import { resolveProvider } from "@obos/ai-providers";
import { AppError, buildMarkdownWithFrontmatter, slugifyTitle } from "@obos/shared";
import { createPullRequestForDocument, openPullRequest } from "../pull-request";

export interface StructuredProposal {
  title: string;
  slug: string;
  departmentId: string | null;
  departmentSlug: string | null;
  docType: string;
  tags: string[];
  ownerUserId: string;
  gitPath: string;
  markdown: string;
  summary: string;
  targetDocumentId: string | null;
}

function structureLocallyFromRawText(rawText: string, userId: string) {
  const trimmed = rawText.trim();
  const lines = trimmed.split(/\n/);
  const heading = lines.find((line) => /^#{1,2}\s+/.test(line));
  const title = heading?.replace(/^#+\s*/, "").trim() || lines.find((l) => l.trim())?.trim().slice(0, 80) || "Untitled knowledge";
  const summary =
    lines.find((line) => line.trim() && !line.startsWith("#") && !line.startsWith("---"))?.trim().slice(0, 240) ?? "";

  return {
    title,
    docType: "general" as const,
    departmentSlug: null,
    tags: [] as string[],
    ownerUserId: userId,
    targetDocumentId: null as string | null,
    summary,
    body: trimmed,
  };
}

function buildProposalFromParsed(
  parsed: {
    title?: string;
    docType?: string;
    departmentSlug?: string | null;
    tags?: string[];
    ownerUserId?: string;
    targetDocumentId?: string | null;
    summary?: string;
    body?: string;
  },
  rawText: string,
  userId: string,
  departments: { id: string; slug: string; name: string }[],
  members: { user: { id: string; email: string; name: string | null } }[],
  existingDocs: { id: string; title: string; slug: string; gitPath: string }[]
): StructuredProposal {
  const title = parsed.title ?? "Untitled knowledge";
  const slug = slugifyTitle(title);
  const dept = departments.find((d) => d.slug === parsed.departmentSlug);
  const deptPath = dept ? `departments/${dept.slug}` : "company";
  const gitPath = parsed.targetDocumentId
    ? existingDocs.find((d) => d.id === parsed.targetDocumentId)?.gitPath ?? `${deptPath}/${slug}.md`
    : `${deptPath}/${slug}.md`;
  const existingDoc =
    existingDocs.find((d) => d.id === parsed.targetDocumentId) ??
    existingDocs.find((d) => d.gitPath === gitPath || d.slug === slug);
  const resolvedSlug = existingDoc?.slug ?? slug;
  const resolvedGitPath = existingDoc?.gitPath ?? gitPath;

  const markdown = buildMarkdownWithFrontmatter(parsed.body ?? rawText, {
    title,
    tags: parsed.tags ?? [],
    owner: members.find((m) => m.user.id === (parsed.ownerUserId ?? userId))?.user.email,
  });

  return {
    title,
    slug: resolvedSlug,
    departmentId: dept?.id ?? null,
    departmentSlug: dept?.slug ?? null,
    docType: parsed.docType ?? "general",
    tags: parsed.tags ?? [],
    ownerUserId: parsed.ownerUserId ?? userId,
    gitPath: resolvedGitPath,
    markdown,
    summary: parsed.summary ?? "",
    targetDocumentId: parsed.targetDocumentId ?? existingDoc?.id ?? null,
  };
}

export async function structureKnowledgeProposal(
  orgId: string,
  userId: string,
  rawText: string
): Promise<StructuredProposal> {
  const [departments, members, existingDocs] = await Promise.all([
    prisma.department.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: { id: true, slug: true, name: true },
    }),
    prisma.organizationMember.findMany({
      where: { organizationId: orgId, status: "active" },
      include: { user: { select: { id: true, email: true, name: true } } },
    }),
    prisma.knowledgeDocument.findMany({
      where: { organizationId: orgId, deletedAt: null },
      select: { id: true, title: true, slug: true, gitPath: true },
      take: 50,
    }),
  ]);

  const llm = resolveProvider();
  let parsed: {
    title?: string;
    docType?: string;
    departmentSlug?: string | null;
    tags?: string[];
    ownerUserId?: string;
    targetDocumentId?: string | null;
    summary?: string;
    body?: string;
  } = {};
  let usedLocalFallback = false;

  try {
    const result = await llm.complete(
      [
        {
          role: "system",
          content: `You structure organizational knowledge submissions into metadata + markdown body.
Departments: ${JSON.stringify(departments)}
Members: ${JSON.stringify(members.map((m) => ({ id: m.user.id, email: m.user.email, name: m.user.name })))}
Existing docs: ${JSON.stringify(existingDocs)}
Respond JSON only:
{
  "title": string,
  "docType": "policy"|"runbook"|"faq"|"general",
  "departmentSlug": string|null,
  "tags": string[],
  "ownerUserId": string,
  "targetDocumentId": string|null,
  "summary": string,
  "body": string (markdown body without frontmatter)
}`,
        },
        { role: "user", content: rawText },
      ],
      { jsonMode: true, temperature: 0.2 }
    );

    try {
      parsed = JSON.parse(result.content);
    } catch {
      parsed = structureLocallyFromRawText(rawText, userId);
      usedLocalFallback = true;
    }
  } catch (err) {
    if (err instanceof AppError && err.status === 503) {
      parsed = structureLocallyFromRawText(rawText, userId);
      usedLocalFallback = true;
    } else {
      throw err;
    }
  }

  const proposal = buildProposalFromParsed(parsed, rawText, userId, departments, members, existingDocs);
  if (usedLocalFallback) {
    proposal.summary =
      proposal.summary ||
      "Structured locally because the AI provider was temporarily unavailable. Review title and tags before submitting.";
  }
  return proposal;
}

export async function submitStructuredKnowledge(
  orgId: string,
  userId: string,
  proposal: StructuredProposal
) {
  const docData = {
    title: proposal.title,
    departmentId: proposal.departmentId,
    docType: proposal.docType as "general",
    ownerUserId: proposal.ownerUserId,
    tags: proposal.tags,
    metadata: { summary: proposal.summary } as object,
  };

  let docId = proposal.targetDocumentId;

  if (docId) {
    await prisma.knowledgeDocument.update({
      where: { id: docId },
      data: docData,
    });
  } else {
    const existing = await prisma.knowledgeDocument.findFirst({
      where: {
        organizationId: orgId,
        gitPath: proposal.gitPath,
        deletedAt: null,
      },
    });

    if (existing) {
      await prisma.knowledgeDocument.update({
        where: { id: existing.id },
        data: { ...docData, status: existing.status === "published" ? "published" : "draft" },
      });
      docId = existing.id;
    } else {
      const doc = await prisma.knowledgeDocument.create({
        data: {
          organizationId: orgId,
          ...docData,
          slug: proposal.slug,
          gitPath: proposal.gitPath,
          status: "draft",
        },
      });
      docId = doc.id;
    }
  }

  const bodyOnly = proposal.markdown.replace(/^---[\s\S]*?---\n?/, "").trim() || proposal.markdown;

  const existingPr = await prisma.pullRequest.findFirst({
    where: {
      organizationId: orgId,
      status: { in: ["draft", "open", "changes_requested", "approved"] },
      files: { some: { documentId: docId } },
    },
    include: { files: true },
    orderBy: { number: "desc" },
  });

  if (existingPr) {
    const markdown = buildMarkdownWithFrontmatter(bodyOnly, {
      title: proposal.title,
      tags: proposal.tags,
    });
    await prisma.pullRequest.update({
      where: { id: existingPr.id },
      data: {
        title: `AI proposal: ${proposal.title}`,
        description: proposal.summary,
      },
    });
    if (existingPr.files[0]) {
      await prisma.pullRequestFile.update({
        where: { id: existingPr.files[0].id },
        data: { proposedContent: markdown },
      });
    }
    if (existingPr.status === "draft") {
      await openPullRequest(orgId, existingPr.id);
    }
    const pr = await prisma.pullRequest.findUniqueOrThrow({
      where: { id: existingPr.id },
      include: { files: true },
    });
    return { documentId: docId, pullRequest: pr, proposal };
  }

  const pr = await createPullRequestForDocument(orgId, userId, {
    documentId: docId,
    title: `AI proposal: ${proposal.title}`,
    description: proposal.summary,
    content: bodyOnly,
  });

  await openPullRequest(orgId, pr.id);

  return { documentId: docId, pullRequest: pr, proposal };
}
