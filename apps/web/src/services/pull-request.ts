import { prisma } from "@obos/database";
import { createGitHubClient } from "@obos/github-git";
import {
  NotFoundError,
  BadRequestError,
  parseOrgSettings,
  getGitHubConfig,
  getRequiredApprovals,
  buildMarkdownWithFrontmatter,
} from "@obos/shared";
import { getKnowledgeDocument } from "./knowledge";

function prBranchName(number: number, docSlug: string) {
  return `pr/${number}-${docSlug}`;
}

async function getGitClient(orgId: string) {
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const settings = parseOrgSettings(org.settings);
  const gitConfig = getGitHubConfig(settings);
  if (!gitConfig?.githubOwner || !gitConfig.githubRepo || !process.env.GITHUB_TOKEN) {
    return null;
  }
  return createGitHubClient({
    owner: gitConfig.githubOwner,
    repo: gitConfig.githubRepo,
    token: process.env.GITHUB_TOKEN,
  });
}

function warnGitFailure(action: string, err: unknown) {
  const detail = err instanceof Error ? err.message : String(err);
  console.warn(`[git] ${action} failed; continuing with in-app workflow only: ${detail}`);
}

export async function listPullRequests(orgId: string, status?: string) {
  return prisma.pullRequest.findMany({
    where: {
      organizationId: orgId,
      ...(status ? { status: status as "open" | "draft" | "merged" | "closed" } : {}),
    },
    include: { author: true, reviews: true, files: true },
    orderBy: { number: "desc" },
  });
}

export async function getPullRequest(orgId: string, prId: string) {
  const pr = await prisma.pullRequest.findFirst({
    where: { id: prId, organizationId: orgId },
    include: { author: true, reviews: { include: { reviewer: true } }, files: { include: { document: true } } },
  });
  if (!pr) throw new NotFoundError("Pull request not found");
  return pr;
}

export async function createPullRequestForDocument(
  orgId: string,
  userId: string,
  data: { documentId: string; title: string; description?: string; content: string }
) {
  const doc = await getKnowledgeDocument(orgId, data.documentId);
  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const settings = parseOrgSettings(org.settings);

  const lastPr = await prisma.pullRequest.findFirst({
    where: { organizationId: orgId },
    orderBy: { number: "desc" },
  });
  const number = (lastPr?.number ?? 0) + 1;
  const sourceBranch = prBranchName(number, doc.slug);
  const requiredApprovals = getRequiredApprovals(settings);

  const markdown = buildMarkdownWithFrontmatter(data.content, {
    title: doc.title,
    tags: doc.tags,
  });
  const client = await getGitClient(orgId);

  const pr = await prisma.pullRequest.create({
    data: {
      organizationId: orgId,
      number,
      title: data.title,
      description: data.description,
      status: "draft",
      sourceBranch,
      authorId: userId,
      requiredApprovals,
      files: {
        create: {
          gitPath: doc.gitPath,
          changeType: "modified",
          proposedContent: markdown,
          document: { connect: { id: doc.id } },
        },
      },
    },
    include: { files: true },
  });

  if (client) {
    try {
      await client.createBranch(sourceBranch);
      await client.upsertFile(sourceBranch, doc.gitPath, markdown, `PR #${number}: ${data.title}`);
    } catch (err) {
      warnGitFailure("branch/file sync", err);
    }
  }

  return pr;
}

export async function openPullRequest(orgId: string, prId: string) {
  const pr = await getPullRequest(orgId, prId);
  if (pr.status !== "draft") throw new BadRequestError("PR is not in draft state");

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const settings = parseOrgSettings(org.settings);
  let githubPrNumber: number | null = null;

  const client = await getGitClient(orgId);
  if (client) {
    try {
      const gh = await client.createPullRequest({
        title: pr.title,
        body: pr.description ?? undefined,
        head: pr.sourceBranch,
        base: settings.git?.defaultBranch ?? "main",
      });
      githubPrNumber = gh.number;
    } catch (err) {
      warnGitFailure("GitHub pull request create", err);
    }
  }

  return prisma.pullRequest.update({
    where: { id: prId },
    data: { status: "open", githubPrNumber },
  });
}

export async function submitReview(
  orgId: string,
  prId: string,
  reviewerId: string,
  state: "approved" | "changes_requested" | "commented",
  body?: string
) {
  const pr = await getPullRequest(orgId, prId);
  if (pr.status !== "open" && pr.status !== "changes_requested") {
    throw new BadRequestError("PR is not open for review");
  }

  const review = await prisma.pullRequestReview.upsert({
    where: { pullRequestId_reviewerId: { pullRequestId: prId, reviewerId } },
    create: { pullRequestId: prId, reviewerId, state, body },
    update: { state, body },
  });

  let newStatus: "open" | "changes_requested" | "approved" = pr.status;
  if (state === "changes_requested") {
    newStatus = "changes_requested";
  } else if (state === "approved") {
    const approvals = await prisma.pullRequestReview.count({
      where: { pullRequestId: prId, state: "approved" },
    });
    const blocking = await prisma.pullRequestReview.findFirst({
      where: { pullRequestId: prId, state: "changes_requested" },
    });
    if (!blocking && approvals >= pr.requiredApprovals) {
      newStatus = "approved";
    } else if (!blocking) {
      newStatus = "open";
    }
  }

  await prisma.pullRequest.update({
    where: { id: prId },
    data: { status: newStatus as "open" | "approved" | "changes_requested" },
  });

  return review;
}

export async function mergePullRequest(orgId: string, prId: string, mergerId: string) {
  const pr = await getPullRequest(orgId, prId);
  if (pr.status !== "approved") {
    throw new BadRequestError("PR must be approved before merge");
  }

  const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
  const settings = parseOrgSettings(org.settings);
  const client = await getGitClient(orgId);
  let mergeSha: string | null = null;

  if (client && pr.githubPrNumber) {
    try {
      const result = await client.mergePullRequest(pr.githubPrNumber);
      mergeSha = result.sha;
    } catch (err) {
      warnGitFailure("GitHub pull request merge", err);
    }
  }

  const file = pr.files[0];
  let content: string | null = file?.proposedContent ?? null;

  if (client && file?.gitPath && pr.githubPrNumber && mergeSha) {
    const branch = settings.git?.defaultBranch ?? "main";
    const fromGit = (await client.getFileContent(file.gitPath, branch)) ?? "";
    if (fromGit.trim()) content = fromGit;
    else if (!content && pr.sourceBranch) {
      const fromBranch = (await client.getFileContent(file.gitPath, pr.sourceBranch)) ?? "";
      if (fromBranch.trim()) content = fromBranch;
    }
  }

  if (file?.documentId && content) {
    const { enqueueAndIndexDocument } = await import("./brain/indexing");
    await enqueueAndIndexDocument({
      organizationId: orgId,
      documentId: file.documentId,
      commitSha: mergeSha ?? "0".repeat(40),
      content,
      userId: mergerId,
      pullRequestId: prId,
    });

    const { detectContradictionsForDocument } = await import("./brain/contradictions");
    const { computeDocumentHealth } = await import("./brain/health");
    void detectContradictionsForDocument(orgId, file.documentId).catch(console.error);
    void computeDocumentHealth(orgId, file.documentId).catch(console.error);
  } else if (file?.documentId) {
    await prisma.knowledgeDocument.update({
      where: { id: file.documentId },
      data: { status: "published" },
    });
  }

  return prisma.pullRequest.update({
    where: { id: prId },
    data: {
      status: "merged",
      mergedById: mergerId,
      mergedAt: new Date(),
      gitMergeCommitSha: mergeSha,
    },
  });
}

export async function closePullRequest(orgId: string, prId: string) {
  const pr = await getPullRequest(orgId, prId);
  const client = await getGitClient(orgId);
  if (client && pr.githubPrNumber) {
    try {
      await client.closePullRequest(pr.githubPrNumber);
    } catch (err) {
      warnGitFailure("GitHub pull request close", err);
    }
  }
  return prisma.pullRequest.update({
    where: { id: prId },
    data: { status: "closed", closedAt: new Date() },
  });
}
