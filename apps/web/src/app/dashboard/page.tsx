import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@obos/database";
import { listUserOrganizations } from "@/services/organization";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SignOutButton } from "@/components/sign-out-button";
import { DevAuthBanner } from "@/components/dev-auth-banner";
import { isAuthDisabled, getDevAuthUser } from "@/lib/dev-auth";

export default async function DashboardPage() {
  let userName = "Guest";
  let orgs: Awaited<ReturnType<typeof listUserOrganizations>> = [];

  if (isAuthDisabled()) {
    const dev = await getDevAuthUser();
    userName = dev.name ?? dev.email ?? "Dev user";
    const all = await prisma.organization.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    });
    orgs = all.map((o) => ({
      id: o.id,
      slug: o.slug,
      name: o.name,
      plan: o.plan,
      status: o.status,
    }));
  } else {
    const session = await auth();
    if (!session?.user?.id) redirect("/login");
    userName = session.user.name ?? session.user.email ?? "User";
    orgs = await listUserOrganizations(session.user.id);
  }

  return (
    <div className="min-h-screen">
      <DevAuthBanner />
      <div className="p-8">
      <div className="mx-auto max-w-4xl">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard</h1>
            <p className="text-muted-foreground">Welcome, {userName}</p>
          </div>
          <div className="flex gap-2">
            <Button asChild>
              <Link href="/organizations/new">New organization</Link>
            </Button>
            <SignOutButton />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {orgs.map((org) => (
            <Link key={org.id} href={`/${org.slug}`}>
              <Card className="hover:border-primary transition-colors cursor-pointer">
                <CardHeader>
                  <CardTitle>{org.name}</CardTitle>
                  <CardDescription>{org.slug} · {org.plan}</CardDescription>
                </CardHeader>
                <CardContent>
                  <span className="text-sm text-muted-foreground capitalize">{org.status}</span>
                </CardContent>
              </Card>
            </Link>
          ))}
          {orgs.length === 0 && (
            <Card className="md:col-span-2">
              <CardContent className="pt-6 text-center text-muted-foreground">
                No organizations yet.{" "}
                <Link href="/organizations/new" className="text-primary underline">
                  Create one
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
