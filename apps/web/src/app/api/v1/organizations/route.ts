import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser } from "@/lib/org-context";
import { listUserOrganizations, createOrganization } from "@/services/organization";
import { UnauthorizedError } from "@obos/shared";

export async function GET() {
  try {
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    const orgs = await listUserOrganizations(userId);
    return jsonOk({ data: orgs });
  } catch (e) {
    return jsonError(e, "/api/v1/organizations");
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    const body = await req.json();
    const org = await createOrganization(userId, {
      name: body.name,
      slug: body.slug,
      gitRepoPath: body.gitRepoPath,
    });
    return jsonOk(org, 201);
  } catch (e) {
    return jsonError(e, "/api/v1/organizations");
  }
}
