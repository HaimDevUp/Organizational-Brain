import { prisma } from "@obos/database";
import { expandNeighborhood } from "@obos/graph";

export async function ensureDefaultOnboardingPath(orgId: string) {
  const existing = await prisma.onboardingPath.findFirst({
    where: { organizationId: orgId, slug: "new-hire" },
  });
  if (existing) return existing;

  const entry = await prisma.knowledgeDocument.findFirst({
    where: {
      organizationId: orgId,
      status: "published",
      deletedAt: null,
      OR: [
        { title: { contains: "onboarding", mode: "insensitive" } },
        { tags: { has: "onboarding" } },
      ],
    },
    orderBy: { createdAt: "asc" },
  });

  let orderedDocs: Array<{ id: string; title: string }> = [];
  if (entry) {
    const { documentIds } = await expandNeighborhood(orgId, [entry.id], {
      depth: 3,
      maxNodes: 8,
    });
    const docs = await prisma.knowledgeDocument.findMany({
      where: { id: { in: documentIds } },
      select: { id: true, title: true },
    });
    orderedDocs = documentIds
      .map((id) => docs.find((d) => d.id === id))
      .filter((d): d is { id: string; title: string } => Boolean(d));
  }

  if (!orderedDocs.length) {
    orderedDocs = await prisma.knowledgeDocument.findMany({
      where: { organizationId: orgId, status: "published", deletedAt: null },
      take: 5,
      orderBy: { createdAt: "asc" },
      select: { id: true, title: true },
    });
  }

  const path = await prisma.onboardingPath.create({
    data: {
      organizationId: orgId,
      slug: "new-hire",
      title: "New Hire Onboarding",
      description: "Essential knowledge for your first weeks",
      steps: {
        create: orderedDocs.map((doc, i) => ({
          orderIndex: i,
          title: doc.title,
          description: `Read: ${doc.title}`,
          documentId: doc.id,
        })),
      },
    },
    include: { steps: { orderBy: { orderIndex: "asc" } } },
  });

  return path;
}

export async function getOnboardingForUser(orgId: string, userId: string) {
  await ensureDefaultOnboardingPath(orgId);

  const paths = await prisma.onboardingPath.findMany({
    where: { organizationId: orgId, isActive: true },
    include: {
      steps: { orderBy: { orderIndex: "asc" }, include: { document: true } },
      progress: { where: { userId } },
    },
  });

  return paths.map((path) => {
    const prog = path.progress[0];
    const total = path.steps.length;
    const completed = prog?.completedSteps ?? 0;
    return {
      ...path,
      progress: prog ?? null,
      percentComplete: total ? Math.round((completed / total) * 100) : 0,
    };
  });
}

export async function advanceOnboardingStep(
  organizationId: string,
  pathId: string,
  userId: string
) {
  const path = await prisma.onboardingPath.findFirst({
    where: { id: pathId, organizationId, isActive: true },
    include: { steps: true },
  });
  if (!path) {
    const { NotFoundError } = await import("@obos/shared");
    throw new NotFoundError("Onboarding path not found");
  }

  const prog = await prisma.onboardingProgress.upsert({
    where: { pathId_userId: { pathId, userId } },
    create: {
      pathId,
      userId,
      status: "in_progress",
      completedSteps: 1,
    },
    update: {
      completedSteps: { increment: 1 },
      status: "in_progress",
    },
  });

  const total = path.steps.length;
  if (prog.completedSteps >= total) {
    return prisma.onboardingProgress.update({
      where: { id: prog.id },
      data: { status: "completed", completedAt: new Date() },
    });
  }

  return prog;
}
