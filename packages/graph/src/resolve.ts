import { prisma } from "@obos/database";
import { slugifyTitle } from "@obos/shared";
import { normalizeLinkTarget } from "./parse-links";

export type ResolvedLink = {
  targetLabel: string;
  documentId: string | null;
  broken: boolean;
};

export async function resolveLinkTargets(
  organizationId: string,
  targets: string[]
): Promise<Map<string, ResolvedLink>> {
  const docs = await prisma.knowledgeDocument.findMany({
    where: { organizationId, deletedAt: null, status: { in: ["published", "draft"] } },
    select: { id: true, title: true, slug: true },
  });

  const byTitle = new Map<string, string>();
  const bySlug = new Map<string, string>();
  for (const doc of docs) {
    byTitle.set(normalizeLinkTarget(doc.title), doc.id);
    bySlug.set(normalizeLinkTarget(doc.slug), doc.id);
    bySlug.set(normalizeLinkTarget(slugifyTitle(doc.title)), doc.id);
  }

  const result = new Map<string, ResolvedLink>();
  for (const target of targets) {
    const key = normalizeLinkTarget(target);
    const documentId = byTitle.get(key) ?? bySlug.get(key) ?? null;
    result.set(target, {
      targetLabel: target,
      documentId,
      broken: documentId === null,
    });
  }
  return result;
}
