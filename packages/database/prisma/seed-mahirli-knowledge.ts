/**
 * Import company/mahir-li*.md into org `mahirli` and queue Qdrant indexing.
 * Run: pnpm db:seed:mahirli
 * Then: pnpm indexer:retry-failed && ORG_SLUG=mahirli pnpm db:reindex:graph
 */
import { createHash } from "crypto";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { seedOrganizationRoles } from "@obos/rbac";
import {
  buildMarkdownWithFrontmatter,
  parseFrontmatter,
  parseOrgSettings,
} from "@obos/shared";

const prisma = new PrismaClient();

const ORG_SLUG = process.env.ORG_SLUG ?? "mahirli";
const ORG_NAME = process.env.ORG_NAME ?? "מהיר לי";
const REPO_ROOT = join(__dirname, "../../..");
const COMPANY_DIR = join(REPO_ROOT, "company");
const FILE_PREFIX = "mahir-li";

function contentHash(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function inferDocType(slug: string): "policy" | "runbook" | "faq" | "general" {
  if (slug.includes("--sop--") || slug.includes("--operations--")) return "runbook";
  if (
    slug.includes("--legal") ||
    slug.includes("--finance") ||
    slug.includes("--hr--") ||
    slug.includes("--policy")
  ) {
    return "policy";
  }
  return "general";
}

function inferTags(slug: string): string[] {
  const parts = slug.replace(/^mahir-li--?/, "").split("--").filter(Boolean);
  const tags = new Set<string>(["mahir-li", ...parts.slice(0, 3)]);
  if (slug.includes("client--")) tags.add("client");
  if (slug.includes("supplier--")) tags.add("supplier");
  if (slug.includes("people--")) tags.add("people");
  return [...tags];
}

function extractTitle(raw: string, slug: string): string {
  const { frontmatter, body } = parseFrontmatter(raw);
  if (frontmatter.title?.trim()) return frontmatter.title.trim();
  const h1 = body.match(/^#\s+(.+)$/m);
  if (h1?.[1]) return h1[1].trim();
  if (slug === "mahir-li") return "מהיר לי — מוח ארגוני";
  return slug
    .replace(/^mahir-li--/, "")
    .split("--")
    .join(" / ")
    .replace(/-/g, " ");
}

function toMarkdown(raw: string, title: string, tags: string[]): string {
  if (/^---\r?\n/.test(raw)) return raw;
  const { body } = parseFrontmatter(raw);
  return buildMarkdownWithFrontmatter(body.trim(), { title, tags });
}

async function loadMahirLiFiles(): Promise<
  Array<{ slug: string; gitPath: string; raw: string; title: string; tags: string[]; docType: string }>
> {
  const entries = await readdir(COMPANY_DIR);
  const files = entries
    .filter((name) => name.startsWith(FILE_PREFIX) && name.endsWith(".md"))
    .sort();

  if (!files.length) {
    throw new Error(`No ${FILE_PREFIX}*.md files found in ${COMPANY_DIR}`);
  }

  return Promise.all(
    files.map(async (filename) => {
      const raw = await readFile(join(COMPANY_DIR, filename), "utf-8");
      const slug = filename.replace(/\.md$/, "");
      const title = extractTitle(raw, slug);
      const tags = inferTags(slug);
      return {
        slug,
        gitPath: `company/${filename}`,
        raw,
        title,
        tags,
        docType: inferDocType(slug),
      };
    })
  );
}

async function ensureOrganization(ownerId: string) {
  let org = await prisma.organization.findFirst({
    where: { slug: ORG_SLUG, deletedAt: null },
  });

  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: ORG_NAME,
        slug: ORG_SLUG,
        gitRepoPath: `orgs/${ORG_SLUG}`,
        settings: parseOrgSettings({
          git: {
            githubOwner: process.env.GITHUB_OWNER,
            githubRepo: process.env.GITHUB_REPO,
            defaultBranch: process.env.GITHUB_DEFAULT_BRANCH ?? "main",
          },
        }),
      },
    });
    await seedOrganizationRoles(prisma, org.id);

    const adminRole = await prisma.role.findUnique({
      where: { organizationId_slug: { organizationId: org.id, slug: "admin" } },
    });
    if (adminRole) {
      await prisma.userRole.upsert({
        where: {
          organizationId_userId_roleId: {
            organizationId: org.id,
            userId: ownerId,
            roleId: adminRole.id,
          },
        },
        create: {
          organizationId: org.id,
          userId: ownerId,
          roleId: adminRole.id,
        },
        update: {},
      });
    }

    console.log(`Created organization: ${ORG_NAME} (/${ORG_SLUG})`);
  } else {
    console.log(`Using organization: ${org.name} (/${ORG_SLUG})`);
  }

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: { organizationId: org.id, userId: ownerId },
    },
    create: {
      organizationId: org.id,
      userId: ownerId,
      status: "active",
      joinedAt: new Date(),
    },
    update: { status: "active" },
  });

  return org;
}

async function main() {
  const owner =
    (await prisma.user.findUnique({
      where: { email: process.env.DEV_AUTH_USER_EMAIL ?? "dev@obos.local" },
    })) ??
    (await prisma.user.findFirst({ orderBy: { createdAt: "asc" } }));

  if (!owner) {
    throw new Error("No user found. Sign in once or set DEV_AUTH_USER_EMAIL.");
  }

  const org = await ensureOrganization(owner.id);
  const files = await loadMahirLiFiles();
  const placeholderSha = "seed-mahirli".padEnd(40, "0").slice(0, 40);

  console.log(`Importing ${files.length} files from company/ → org ${ORG_SLUG}…`);

  async function upsertDocument(spec: (typeof files)[number]) {
    const markdown = toMarkdown(spec.raw, spec.title, spec.tags);
    const hash = contentHash(markdown);

    const existing = await prisma.knowledgeDocument.findFirst({
      where: {
        organizationId: org.id,
        deletedAt: null,
        OR: [{ slug: spec.slug }, { gitPath: spec.gitPath }],
      },
      include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
    });

    if (existing) {
      const last = existing.versions[0];
      if (last?.contentHash === hash) {
        console.log(`Unchanged: ${spec.title}`);
        return existing.id;
      }

      const version = await prisma.knowledgeVersion.create({
        data: {
          organizationId: org.id,
          documentId: existing.id,
          versionNumber: (last?.versionNumber ?? 0) + 1,
          gitCommitSha: placeholderSha,
          contentHash: hash,
          contentPreview: markdown,
          wordCount: wordCount(markdown),
          createdById: owner.id,
          mergedAt: new Date(),
        },
      });

      await prisma.knowledgeDocument.update({
        where: { id: existing.id },
        data: {
          currentVersionId: version.id,
          title: spec.title,
          slug: spec.slug,
          gitPath: spec.gitPath,
          tags: spec.tags,
          docType: spec.docType as "general",
          status: "published",
        },
      });

      await prisma.indexingJob.create({
        data: {
          organizationId: org.id,
          documentId: existing.id,
          commitSha: placeholderSha,
          status: "pending",
        },
      });

      console.log(`Updated: ${spec.title}`);
      return existing.id;
    }

    const doc = await prisma.knowledgeDocument.create({
      data: {
        organizationId: org.id,
        departmentId: null,
        title: spec.title,
        slug: spec.slug,
        gitPath: spec.gitPath,
        docType: spec.docType as "general",
        status: "published",
        ownerUserId: owner.id,
        tags: spec.tags,
      },
    });

    const version = await prisma.knowledgeVersion.create({
      data: {
        organizationId: org.id,
        documentId: doc.id,
        versionNumber: 1,
        gitCommitSha: placeholderSha,
        contentHash: hash,
        contentPreview: markdown,
        wordCount: wordCount(markdown),
        createdById: owner.id,
        mergedAt: new Date(),
      },
    });

    await prisma.knowledgeDocument.update({
      where: { id: doc.id },
      data: { currentVersionId: version.id },
    });

    await prisma.indexingJob.create({
      data: {
        organizationId: org.id,
        documentId: doc.id,
        commitSha: placeholderSha,
        status: "pending",
      },
    });

    console.log(`Created: ${spec.title}`);
    return doc.id;
  }

  for (const file of files) {
    await upsertDocument(file);
  }

  console.log(`\nDone. Open http://localhost:3000/${ORG_SLUG}/knowledge`);
  console.log(`Brain: http://localhost:3000/${ORG_SLUG}/brain`);
  console.log(`Graph: http://localhost:3000/${ORG_SLUG}/graph`);
  console.log("\nNext: pnpm indexer:retry-failed");
  console.log("Then: ORG_SLUG=mahirli pnpm db:reindex:graph");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
