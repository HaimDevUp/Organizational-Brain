import Link from "next/link";
import { requirePagePermission } from "@/lib/page-auth";
import { prisma } from "@obos/database";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function MonitoringPage({
  params,
}: {
  params: Promise<{ orgSlug: string }>;
}) {
  const { orgSlug } = await params;
  const { org } = await requirePagePermission(orgSlug, "admin:stats");
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  const [aiCount, failedJobs, pendingJobs, usage] = await Promise.all([
    prisma.aiRequestLog.count({ where: { organizationId: org.id, createdAt: { gte: since } } }),
    prisma.indexingJob.count({ where: { organizationId: org.id, status: "failed" } }),
    prisma.indexingJob.count({ where: { organizationId: org.id, status: "pending" } }),
    prisma.usageEvent.groupBy({
      by: ["metric"],
      where: { organizationId: org.id, createdAt: { gte: since } },
      _sum: { quantity: true },
    }),
  ]);

  const logs = await prisma.aiRequestLog.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
    take: 15,
    include: { user: { select: { email: true } } },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">System monitoring</h1>
        <Link href={`/${orgSlug}/admin`} className="text-sm text-muted-foreground hover:underline">
          Back to admin
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">AI requests (24h)</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{aiCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Indexing pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{pendingJobs}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Indexing failed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-destructive">{failedJobs}</p>
          </CardContent>
        </Card>
      </div>
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Usage (24h)</CardTitle>
        </CardHeader>
        <CardContent>
          {usage.length === 0 ? (
            <p className="text-muted-foreground text-sm">No usage recorded yet.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {usage.map((u) => (
                <li key={u.metric}>
                  {u.metric}: <strong>{u._sum.quantity ?? 0}</strong>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Recent AI requests</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-muted-foreground text-sm">No AI activity yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-4">Time</th>
                    <th className="py-2 pr-4">Action</th>
                    <th className="py-2 pr-4">User</th>
                    <th className="py-2 pr-4">Status</th>
                    <th className="py-2">ms</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-muted/50">
                      <td className="py-2 pr-4">{log.createdAt.toLocaleString()}</td>
                      <td className="py-2 pr-4">{log.action}</td>
                      <td className="py-2 pr-4">{log.user.email}</td>
                      <td className="py-2 pr-4">{log.status}</td>
                      <td className="py-2">{log.durationMs ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
