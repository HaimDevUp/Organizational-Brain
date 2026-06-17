import { prisma } from "@obos/database";

export async function computeExpertProfiles(orgId: string) {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: orgId, status: "active" },
    include: { user: true },
  });

  for (const member of members) {
    const userId = member.userId;

    const [docsOwned, reviews, authoredPrs] = await Promise.all([
      prisma.knowledgeDocument.count({
        where: { organizationId: orgId, ownerUserId: userId, deletedAt: null },
      }),
      prisma.pullRequestReview.count({
        where: { reviewerId: userId, state: "approved", pullRequest: { organizationId: orgId } },
      }),
      prisma.pullRequest.count({ where: { organizationId: orgId, authorId: userId } }),
    ]);

    const deptMember = await prisma.departmentMember.findFirst({
      where: { userId, department: { organizationId: orgId } },
      include: { department: true },
    });

    const ownedDocs = await prisma.knowledgeDocument.findMany({
      where: { organizationId: orgId, ownerUserId: userId },
      select: { id: true, tags: true },
    });
    const topics = [...new Set(ownedDocs.flatMap((d) => d.tags))].slice(0, 10);

    const centrality = await prisma.knowledgeRelation.count({
      where: {
        organizationId: orgId,
        OR: [
          { sourceDocumentId: { in: ownedDocs.map((d) => d.id) } },
          { targetDocumentId: { in: ownedDocs.map((d) => d.id) } },
        ],
      },
    });
    const graphCentrality = centrality;

    const score = docsOwned * 15 + reviews * 10 + authoredPrs * 5 + graphCentrality * 8;

    await prisma.expertProfile.upsert({
      where: { organizationId_userId: { organizationId: orgId, userId } },
      create: {
        organizationId: orgId,
        userId,
        departmentId: deptMember?.departmentId,
        expertiseScore: score,
        contributions: authoredPrs + reviews,
        documentsOwned: docsOwned,
        approvalsGiven: reviews,
        topics,
        computedAt: new Date(),
      },
      update: {
        departmentId: deptMember?.departmentId,
        expertiseScore: score,
        contributions: authoredPrs + reviews,
        documentsOwned: docsOwned,
        approvalsGiven: reviews,
        topics,
        computedAt: new Date(),
      },
    });
  }

  return prisma.expertProfile.findMany({
    where: { organizationId: orgId },
    include: {
      user: { select: { id: true, name: true, email: true, image: true } },
      department: { select: { name: true, slug: true } },
    },
    orderBy: { expertiseScore: "desc" },
    take: 20,
  });
}
