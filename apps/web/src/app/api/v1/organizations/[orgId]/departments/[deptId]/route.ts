import { getSessionUser, jsonOk, jsonError } from "@/lib/api-helpers";
import { requireUser, requireOrgAccess } from "@/lib/org-context";
import { getDepartment, updateDepartment, deleteDepartment } from "@/services/department";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; deptId: string }> }
) {
  try {
    const { orgId, deptId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "department:read");
    const dept = await getDepartment(orgId, deptId);
    return jsonOk(dept);
  } catch (e) {
    return jsonError(e);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ orgId: string; deptId: string }> }
) {
  try {
    const { orgId, deptId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "department:update");
    const body = await req.json();
    const dept = await updateDepartment(orgId, deptId, body);
    return jsonOk(dept);
  } catch (e) {
    return jsonError(e);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ orgId: string; deptId: string }> }
) {
  try {
    const { orgId, deptId } = await params;
    const session = await getSessionUser();
    const userId = await requireUser(session?.id);
    await requireOrgAccess(orgId, userId, "department:delete");
    await deleteDepartment(orgId, deptId);
    return jsonOk({ success: true });
  } catch (e) {
    return jsonError(e);
  }
}
