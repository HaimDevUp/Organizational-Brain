import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { getKnowledgeDocument, updateKnowledgeDocument, deleteKnowledgeDocument } from "@/services/knowledge";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; docId: string }> }
) {
  try {
    const { orgId, docId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "knowledge:read");
    const doc = await getKnowledgeDocument(orgId, docId);
    return jsonOk(doc);
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string; docId: string }> }
) {
  try {
    const { orgId, docId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "knowledge:update");
    const body = await req.json();
    const doc = await updateKnowledgeDocument(orgId, docId, body);
    return jsonOk(doc);
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; docId: string }> }
) {
  try {
    const { orgId, docId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    const org = await requireOrgAccess(orgId, userId, "knowledge:delete");
    await deleteKnowledgeDocument(org.id, docId);
    return jsonOk({ success: true });
  } catch (e) {
    return jsonError(e);
  }
}
