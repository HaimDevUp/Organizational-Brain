import { prisma } from "@obos/database";
import type { SearchFilters } from "@obos/qdrant";
import { generateBrainAnswer } from "@obos/rag";
import { logAiRequest } from "@/lib/ai-audit";
import { trackUsageEvent } from "@/lib/usage";
import { recordLowConfidenceQuery } from "./gaps";
import { trackAnalyticsEvent } from "./analytics";

export async function brainChat(input: {
  organizationId: string;
  userId: string;
  message: string;
  conversationId?: string;
  agentId?: string;
  searchFilters?: SearchFilters;
}) {
  const started = Date.now();
  let conversation = input.conversationId
    ? await prisma.conversation.findFirst({
        where: { id: input.conversationId, organizationId: input.organizationId, userId: input.userId },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
      })
    : null;

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        agentId: input.agentId,
        title: input.message.slice(0, 80),
        contextType: "general",
      },
      include: { messages: true },
    });
  }

  await prisma.message.create({
    data: {
      conversationId: conversation.id,
      organizationId: input.organizationId,
      role: "user",
      content: input.message,
    },
  });

  const history = conversation.messages.map((m) => ({
    role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: m.content,
  }));

  const result = await generateBrainAnswer({
    organizationId: input.organizationId,
    question: input.message,
    filters: input.searchFilters,
    history,
  });

  const assistantMsg = await prisma.message.create({
    data: {
      conversationId: conversation.id,
      organizationId: input.organizationId,
      role: "assistant",
      content: result.answer,
      citations: result.citations as object[],
      confidenceScore: result.confidence,
      modelUsed: result.model,
      tokenUsage: result.usage as object | undefined,
    },
  });

  if (result.confidence < 0.45) {
    await recordLowConfidenceQuery({
      organizationId: input.organizationId,
      userId: input.userId,
      question: input.message,
      confidence: result.confidence,
    });
  }

  await logAiRequest({
    organizationId: input.organizationId,
    userId: input.userId,
    action: "chat",
    model: result.model,
    tokenUsage: result.usage as import("@obos/database").Prisma.InputJsonValue | undefined,
    durationMs: Date.now() - started,
    metadata: { confidence: result.confidence },
  });
  await trackUsageEvent(input.organizationId, "chat_message", 1, input.userId);

  await trackAnalyticsEvent({
    organizationId: input.organizationId,
    userId: input.userId,
    eventType: "chat_question",
    resourceType: "conversation",
    resourceId: conversation.id,
    metadata: { query: input.message, confidence: result.confidence },
  });

  return {
    conversationId: conversation.id,
    message: assistantMsg,
    answer: result.answer,
    confidence: result.confidence,
    citations: result.citations,
    connectedDocuments: result.connectedDocuments ?? [],
    knowledgePaths: result.knowledgePaths ?? [],
  };
}
