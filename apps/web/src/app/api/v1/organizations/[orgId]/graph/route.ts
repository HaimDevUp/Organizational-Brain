import { z } from "zod";
import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import {
  getKnowledgeGraph,
  getGraphNodeDetail,
  createGraphLink,
  discoverKnowledgePath,
  getImpactedDocuments,
  getGraphHealthDashboard,
  listPendingSuggestions,
  approveRelationshipSuggestion,
  rejectRelationshipSuggestion,
  searchGraphDocuments,
} from "@/services/brain/graph";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "graph:read");

    const url = new URL(req.url);
    const view = url.searchParams.get("view");
    const documentId = url.searchParams.get("documentId");
    const departmentId = url.searchParams.get("departmentId") ?? undefined;
    const sourceId = url.searchParams.get("sourceId");
    const targetId = url.searchParams.get("targetId");
    const q = url.searchParams.get("q") ?? undefined;

    if (view === "health") {
      return jsonOk(await getGraphHealthDashboard(orgId));
    }

    if (view === "suggestions") {
      return jsonOk({ data: await listPendingSuggestions(orgId) });
    }

    if (view === "search") {
      return jsonOk({
        data: await searchGraphDocuments(orgId, {
          q,
          departmentId,
          ownerId: url.searchParams.get("ownerId") ?? undefined,
          tag: url.searchParams.get("tag") ?? undefined,
          docType: url.searchParams.get("docType") ?? undefined,
          relationType: (url.searchParams.get("relationType") as never) ?? undefined,
        }),
      });
    }

    if (documentId && view === "detail") {
      const detail = await getGraphNodeDetail(orgId, documentId);
      if (!detail) return jsonError(new Error("Document not found"));
      return jsonOk(detail);
    }

    if (documentId && view === "impact") {
      return jsonOk(await getImpactedDocuments(orgId, documentId));
    }

    if (sourceId && targetId && view === "path") {
      return jsonOk(await discoverKnowledgePath(orgId, sourceId, targetId));
    }

    const graph = await getKnowledgeGraph(orgId, {
      departmentId,
      documentIds: q
        ? (await searchGraphDocuments(orgId, { q })).map((d) => d.id)
        : undefined,
    });
    return jsonOk(graph);
  } catch (e) {
    return jsonError(e);
  }
}

const linkSchema = z.object({
  sourceDocumentId: z.string().uuid(),
  targetDocumentId: z.string().uuid(),
  relationType: z.enum([
    "related_to",
    "depends_on",
    "parent_of",
    "child_of",
    "references",
    "contradicts",
    "replaces",
    "supersedes",
    "owned_by",
    "generated_by_ai",
  ]),
  confidenceScore: z.number().min(0).max(1).optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "graph:manage");

    const body = await req.json();
    if (body.action === "approve_suggestion") {
      const id = z.string().uuid().parse(body.suggestionId);
      const row = await approveRelationshipSuggestion(id, userId);
      return jsonOk(row);
    }
    if (body.action === "reject_suggestion") {
      const id = z.string().uuid().parse(body.suggestionId);
      const row = await rejectRelationshipSuggestion(id, userId);
      return jsonOk(row);
    }

    const link = linkSchema.parse(body);
    const created = await createGraphLink({
      organizationId: orgId,
      ...link,
      userId,
    });
    return jsonOk(created);
  } catch (e) {
    return jsonError(e);
  }
}
