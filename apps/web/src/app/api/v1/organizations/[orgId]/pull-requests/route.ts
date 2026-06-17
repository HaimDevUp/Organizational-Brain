import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { listPullRequests, createPullRequestForDocument } from "@/services/pull-request";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "pr:read");
    const status = new URL(req.url).searchParams.get("status") ?? undefined;
    const prs = await listPullRequests(orgId, status);
    return jsonOk({ data: prs });
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
    await requireOrgAccess(orgId, userId, "pr:create");
    const body = await req.json();
    const pr = await createPullRequestForDocument(orgId, userId, body);
    return jsonOk(pr, 201);
  } catch (e) {
    return jsonError(e);
  }
}
