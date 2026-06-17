/**
 * Rebuild knowledge graph wiki-links for all published docs in an org.
 * Usage: ORG_SLUG=up pnpm db:reindex:graph
 */
import { PrismaClient } from "@obos/database";
import { reindexOrganizationGraph } from "../src/reindex";

const prisma = new PrismaClient();
const ORG_SLUG = process.env.ORG_SLUG ?? "up";

async function main() {
  const org = await prisma.organization.findFirst({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error(`Org not found: ${ORG_SLUG}`);

  const result = await reindexOrganizationGraph(org.id);
  console.log(`Graph reindex for ${ORG_SLUG}: ${result.processed}/${result.total} documents`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
