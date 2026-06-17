import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { getOnboardingForUser, advanceOnboardingStep } from "@/services/brain/onboarding";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    const org = await requireOrgAccess(orgId, userId, "knowledge:read");
    const paths = await getOnboardingForUser(org.id, userId);
    return jsonOk({ data: paths });
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
    const org = await requireOrgAccess(orgId, userId, "knowledge:read");
    const { pathId } = (await req.json()) as { pathId: string };
    const progress = await advanceOnboardingStep(org.id, pathId, userId);
    return jsonOk(progress);
  } catch (e) {
    return jsonError(e);
  }
}
