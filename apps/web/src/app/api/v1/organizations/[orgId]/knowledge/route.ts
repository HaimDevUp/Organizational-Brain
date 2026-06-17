import { getSessionUser, jsonOk, jsonError, parsePagination } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { listKnowledge, createKnowledgeDocument } from "@/services/knowledge";
import { paginate } from "@obos/shared";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "knowledge:read");
    const { searchParams } = new URL(req.url);
    const { page, limit } = parsePagination(searchParams);
    const docs = await listKnowledge(orgId, {
      q: searchParams.get("q") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      departmentId: searchParams.get("departmentId") ?? undefined,
    });
    return jsonOk(paginate(docs, page, limit));
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "knowledge:create");
    const body = await req.json();
    const doc = await createKnowledgeDocument(orgId, userId, body);
    return jsonOk(doc, 201);
  } catch (e) {
    return jsonError(e);
  }
}
