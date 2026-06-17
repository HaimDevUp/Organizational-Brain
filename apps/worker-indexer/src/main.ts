import { processPendingIndexingJobs } from "@obos/rag";

const INTERVAL_MS = parseInt(process.env.INDEXER_POLL_MS ?? "5000", 10);

async function tick() {
  try {
    await processPendingIndexingJobs(5);
  } catch (err) {
    console.error("[indexer]", err);
  }
}

console.log(`OBOS indexer worker started (poll every ${INTERVAL_MS}ms)`);
void tick();
setInterval(tick, INTERVAL_MS);
