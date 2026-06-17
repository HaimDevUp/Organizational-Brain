import { prisma } from "@obos/database";
import { parseWikiLinks } from "./parse-links";
import { resolveLinkTargets } from "./resolve";
import type { GraphHealthMetrics, GraphSnapshot } from "./types";
import { listOrgRelations } from "./store";

export async function buildGraphSnapshot(
  organizationId: string,
  filters?: { departmentId?: string; documentIds?: string[] }
): Promise<GraphSnapshot> {
  const relations = await listOrgRelations(organizationId, filters);

  const allDocs = await prisma.knowledgeDocument.findMany({
    where: {
      organizationId,
      deletedAt: null,
      ...(filters?.departmentId ? { departmentId: filters.departmentId } : {}),
      ...(filters?.documentIds?.length ? { id: { in: filters.documentIds } } : {}),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      gitPath: true,
      departmentId: true,
      status: true,
      docType: true,
      tags: true,
      healthScore: true,
      updatedAt: true,
      ownerUserId: true,
    },
  });

  const nodeMap = new Map<string, GraphSnapshot["nodes"][0]>();

  const ensureNode = (doc: {
    id: string;
    title: string;
    slug: string;
    gitPath: string;
    departmentId: string | null;
    status: string;
    docType: string;
    tags: string[];
    healthScore: { toNumber?: () => number } | null;
    updatedAt: Date;
    ownerUserId: string;
  }) => {
    if (nodeMap.has(doc.id)) return;
    nodeMap.set(doc.id, {
      id: doc.id,
      title: doc.title,
      slug: doc.slug,
      gitPath: doc.gitPath,
      departmentId: doc.departmentId,
      ownerUserId: doc.ownerUserId,
      status: doc.status,
      docType: doc.docType,
      tags: doc.tags,
      healthScore: doc.healthScore ? Number(doc.healthScore) : null,
      updatedAt: doc.updatedAt.toISOString(),
      incomingCount: 0,
      outgoingCount: 0,
      importance: 0,
    });
  };

  for (const doc of allDocs) {
    ensureNode(doc);
  }

  const edges: GraphSnapshot["edges"] = [];
  for (const rel of relations) {
    if (!nodeMap.has(rel.sourceDocumentId) || !nodeMap.has(rel.targetDocumentId)) {
      continue;
    }
    ensureNode(rel.sourceDocument);
    ensureNode(rel.targetDocument);
    edges.push({
      id: rel.id,
      source: rel.sourceDocumentId,
      target: rel.targetDocumentId,
      relationType: rel.relationType,
      confidenceScore: rel.confidenceScore ? Number(rel.confidenceScore) : null,
    });
    const src = nodeMap.get(rel.sourceDocumentId);
    const tgt = nodeMap.get(rel.targetDocumentId);
    if (src) src.outgoingCount++;
    if (tgt) tgt.incomingCount++;
  }

  for (const node of nodeMap.values()) {
    node.importance = node.incomingCount + node.outgoingCount;
  }

  return { nodes: [...nodeMap.values()], edges };
}

export async function computeGraphHealth(organizationId: string): Promise<GraphHealthMetrics> {
  const docs = await prisma.knowledgeDocument.findMany({
    where: { organizationId, deletedAt: null, status: "published" },
    select: {
      id: true,
      title: true,
      departmentId: true,
      currentVersion: { select: { contentPreview: true } },
      department: { select: { name: true } },
    },
  });

  const relations = await prisma.knowledgeRelation.findMany({
    where: { organizationId },
    select: { sourceDocumentId: true, targetDocumentId: true },
  });

  const connected = new Set<string>();
  for (const r of relations) {
    connected.add(r.sourceDocumentId);
    connected.add(r.targetDocumentId);
  }

  const orphans = docs.filter((d) => !connected.has(d.id)).length;

  let brokenReferences = 0;
  for (const doc of docs) {
    const content = doc.currentVersion?.contentPreview ?? "";
    const links = parseWikiLinks(content);
    if (!links.length) continue;
    const resolved = await resolveLinkTargets(
      organizationId,
      links.map((l) => l.target)
    );
    for (const link of links) {
      if (!resolved.get(link.target)?.documentId) brokenReferences++;
    }
  }

  const linkCounts = new Map<string, number>();
  for (const r of relations) {
    linkCounts.set(r.sourceDocumentId, (linkCounts.get(r.sourceDocumentId) ?? 0) + 1);
    linkCounts.set(r.targetDocumentId, (linkCounts.get(r.targetDocumentId) ?? 0) + 1);
  }

  const mostConnected = docs
    .map((d) => ({
      documentId: d.id,
      title: d.title,
      linkCount: linkCounts.get(d.id) ?? 0,
    }))
    .sort((a, b) => b.linkCount - a.linkCount)
    .slice(0, 10);

  const pendingSuggestions = await prisma.relationshipSuggestion.count({
    where: { organizationId, status: "pending" },
  });

  const deptStats = new Map<string | null, { count: number; external: number; name: string | null }>();
  for (const doc of docs) {
    const key = doc.departmentId;
    const entry = deptStats.get(key) ?? { count: 0, external: 0, name: doc.department?.name ?? null };
    entry.count++;
    deptStats.set(key, entry);
  }
  for (const r of relations) {
    const src = docs.find((d) => d.id === r.sourceDocumentId);
    const tgt = docs.find((d) => d.id === r.targetDocumentId);
    if (src && tgt && src.departmentId !== tgt.departmentId) {
      const s = deptStats.get(src.departmentId);
      if (s) s.external++;
    }
  }

  const knowledgeSilos = [...deptStats.entries()]
    .map(([departmentId, v]) => ({
      departmentId,
      departmentName: v.name,
      documentCount: v.count,
      externalLinks: v.external,
    }))
    .filter((s) => s.documentCount >= 2 && s.externalLinks <= 1)
    .slice(0, 10);

  // Union-find for cluster count
  const parent = new Map<string, string>();
  const find = (x: string): string => {
    const p = parent.get(x) ?? x;
    if (p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };
  const unite = (a: string, b: string) => {
    parent.set(find(a), find(b));
  };
  for (const d of docs) parent.set(d.id, d.id);
  for (const r of relations) unite(r.sourceDocumentId, r.targetDocumentId);
  const clusters = new Set(docs.map((d) => find(d.id))).size;
  const disconnectedClusters = Math.max(0, clusters - (connected.size > 0 ? 1 : 0));

  return {
    orphanDocuments: orphans,
    disconnectedClusters,
    brokenReferences,
    missingLinks: pendingSuggestions,
    mostConnected,
    knowledgeSilos,
  };
}
