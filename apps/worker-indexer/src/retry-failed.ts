import { prisma } from "@obos/database";
import { processIndexingJob } from "@obos/rag";

async function main() {
  const failed = await prisma.indexingJob.findMany({
    where: { status: "failed" },
    orderBy: { createdAt: "asc" },
  });

  if (!failed.length) {
    console.log("No failed indexing jobs.");
    return;
  }

  console.log(`Retrying ${failed.length} failed job(s)...`);

  for (const job of failed) {
    await prisma.indexingJob.update({
      where: { id: job.id },
      data: { status: "pending", error: null, startedAt: null, completedAt: null },
    });
    try {
      await processIndexingJob(job.id);
      console.log(`✓ indexed document ${job.documentId}`);
    } catch (err) {
      console.error(`✗ job ${job.id} failed:`, err instanceof Error ? err.message : err);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
