import { requirePagePermission } from "@/lib/page-auth";
import { listDepartments } from "@/services/department";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CreateDepartmentForm } from "./create-form";

export default async function AdminDepartmentsPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { org } = await requirePagePermission(orgSlug, "department:read");
  const depts = await listDepartments(org.id);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Departments</h1>
      <CreateDepartmentForm orgId={org.id} orgSlug={orgSlug} />
      <div className="space-y-2 mt-6">
        {depts.map((d) => (
          <Card key={d.id}>
            <CardHeader className="py-4">
              <CardTitle className="text-base">{d.name}</CardTitle>
              <p className="text-sm text-muted-foreground">{d.path}</p>
            </CardHeader>
          </Card>
        ))}
      </div>
    </div>
  );
}
