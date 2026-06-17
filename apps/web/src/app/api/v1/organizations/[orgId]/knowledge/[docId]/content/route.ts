import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { getDocumentContent } from "@/services/knowledge";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; docId: string }> }
) {
  try {
    const { orgId, docId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "knowledge:read");
    const content = await getDocumentContent(orgId, docId);
    return jsonOk({ content });
  } catch (e) {
    return jsonError(e);
  }
}
