import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { prisma } from "@obos/database";
import { UnauthorizedError } from "@obos/shared";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user?.id) throw new UnauthorizedError();
    const permissions = await prisma.permission.findMany({ orderBy: { slug: "asc" } });
    return jsonOk({ data: permissions });
  } catch (e) {
    return jsonError(e, "/api/v1/permissions");
  }
}
