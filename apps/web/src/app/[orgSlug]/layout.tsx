import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrganizationBySlug } from "@/services/organization";
import { isOrgMember } from "@obos/rbac";
import { prisma } from "@obos/database";
import { OrgSidebar } from "@/components/org-sidebar";
import { SignOutButton } from "@/components/sign-out-button";
import { DevAuthBanner } from "@/components/dev-auth-banner";
import { ThemeToggle } from "@/components/theme-toggle";
import { isAuthDisabled, getDevAuthUser } from "@/lib/dev-auth";

export default async function OrgLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;

  let org;
  try {
    org = await getOrganizationBySlug(orgSlug);
  } catch {
    notFound();
  }

  if (isAuthDisabled()) {
    await getDevAuthUser();
  } else {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");
    const member = await isOrgMember(prisma, org.id, session.user.id);
    if (!member) notFound();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <DevAuthBanner />
      <div className="flex flex-1 min-h-0">
        <OrgSidebar orgSlug={orgSlug} />
        <div className="flex min-h-0 flex-1 flex-col">
          <header className="border-b px-6 py-3 flex items-center justify-between">
            <h2 className="font-medium">{org.name}</h2>
            <div className="flex items-center gap-1">
              <ThemeToggle />
              {!isAuthDisabled() && <SignOutButton />}
            </div>
          </header>
          <main className="flex min-h-0 flex-1 flex-col p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
