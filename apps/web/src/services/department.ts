import { prisma } from "@obos/database";
import { NotFoundError, BadRequestError } from "@obos/shared";

export async function listDepartments(orgId: string) {
  return prisma.department.findMany({
    where: { organizationId: orgId, deletedAt: null },
    orderBy: { path: "asc" },
  });
}

export async function getDepartment(orgId: string, deptId: string) {
  const dept = await prisma.department.findFirst({
    where: { id: deptId, organizationId: orgId, deletedAt: null },
  });
  if (!dept) throw new NotFoundError("Department not found");
  return dept;
}

export async function createDepartment(
  orgId: string,
  data: { name: string; slug: string; description?: string; parentId?: string }
) {
  let path = data.slug;
  if (data.parentId) {
    const parent = await getDepartment(orgId, data.parentId);
    path = `${parent.path}/${data.slug}`;
  }

  const existing = await prisma.department.findUnique({
    where: { organizationId_slug: { organizationId: orgId, slug: data.slug } },
  });
  if (existing) throw new BadRequestError("Department slug already exists");

  return prisma.department.create({
    data: {
      organizationId: orgId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      parentId: data.parentId,
      path,
    },
  });
}

export async function updateDepartment(
  orgId: string,
  deptId: string,
  data: { name?: string; description?: string }
) {
  await getDepartment(orgId, deptId);
  return prisma.department.update({
    where: { id: deptId },
    data,
  });
}

export async function deleteDepartment(orgId: string, deptId: string) {
  await getDepartment(orgId, deptId);
  return prisma.department.update({
    where: { id: deptId },
    data: { deletedAt: new Date() },
  });
}
