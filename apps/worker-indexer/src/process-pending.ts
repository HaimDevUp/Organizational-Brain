import { prisma } from "@obos/database";
import { processIndexingJob, processPendingIndexingJobs } from "@obos/rag";

async function main() {
  const orgSlug = process.env.ORG_SLUG;

  const failed = await prisma.indexingJob.findMany({
    where: {
      status: "failed",
      ...(orgSlug ? { organization: { slug: orgSlug } } : {}),
    },
  });

  for (const job of failed) {
    await prisma.indexingJob.update({
      where: { id: job.id },
      data: { status: "pending", error: null, startedAt: null, completedAt: null },
    });
  }

  if (failed.length) {
    console.log(`Reset ${failed.length} failed job(s) to pending.`);
  }

  let rounds = 0;
  while (rounds < 30) {
    const before = await prisma.indexingJob.count({ where: { status: "pending" } });
    if (before === 0) break;
    await processPendingIndexingJobs(10);
    const after = await prisma.indexingJob.count({ where: { status: "pending" } });
    console.log(`Round ${rounds + 1}: ${before - after} jobs processed, ${after} pending`);
    if (after === before) break;
    rounds++;
  }

  const summary = await prisma.indexingJob.groupBy({
    by: ["status"],
    _count: true,
  });
  console.log("Job status:", summary);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
