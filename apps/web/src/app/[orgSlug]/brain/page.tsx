import { getOrganizationBySlug } from "@/services/organization";
import { BrainChat } from "@/components/brain/brain-chat";

export default async function BrainPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const org = await getOrganizationBySlug(orgSlug);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Organizational Brain</h1>
        <p className="text-muted-foreground text-sm">
          AI-powered answers from your approved knowledge base
        </p>
      </div>
      <BrainChat orgId={org.id} orgSlug={orgSlug} />
    </div>
  );
}
