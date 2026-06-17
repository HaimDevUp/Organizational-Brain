import { prisma } from "@obos/database";
import { generateBrainAnswer } from "@obos/rag";
import { resolveProvider } from "@obos/ai-providers";
import type { AgentPlugin, AgentPluginContext, AgentPluginRunner, AgentRunInput, AgentRunResult } from "./types";

export function createRagAgentRunner(plugin: AgentPlugin): AgentPluginRunner {
  return {
    async run(ctx: AgentPluginContext, input: AgentRunInput): Promise<AgentRunResult> {
      let filters = ctx.searchFilters;

      if (plugin.departmentScopeSlug) {
        const dept = await prisma.department.findFirst({
          where: {
            organizationId: ctx.organizationId,
            slug: plugin.departmentScopeSlug,
            deletedAt: null,
          },
        });
        if (dept) {
          const allowed = filters?.departmentIds;
          if (allowed?.length && !allowed.includes(dept.id)) {
            const { ForbiddenError } = await import("@obos/shared");
            throw new ForbiddenError("Agent department is outside your access scope");
          }
          filters = { departmentIds: [dept.id], includeDepartmentNull: filters?.includeDepartmentNull };
        }
      }

      const rag = await generateBrainAnswer({
        organizationId: ctx.organizationId,
        question: input.message,
        filters,
        history: input.conversationHistory,
        useGraph: true,
      });

      if (plugin.key === "knowledge-curator" && rag.confidence > 0.5) {
        const llm = resolveProvider();
        const extra = await llm.complete(
          [
            { role: "system", content: plugin.systemPrompt },
            {
              role: "user",
              content: `Based on this Q&A, suggest 1-2 knowledge improvements:\nQ: ${input.message}\nA: ${rag.answer}`,
            },
          ],
          { maxTokens: 400 }
        );
        return {
          answer: `${rag.answer}\n\n---\n**Curator notes:** ${extra.content}`,
          confidence: rag.confidence,
          citations: rag.citations,
          connectedDocuments: rag.connectedDocuments,
          knowledgePaths: rag.knowledgePaths,
        };
      }

      const llm = resolveProvider();
      const refined = await llm.complete(
        [
          { role: "system", content: plugin.systemPrompt },
          {
            role: "user",
            content: `Use this retrieved answer (keep citations):\n${rag.answer}\n\nOriginal question: ${input.message}`,
          },
        ],
        { maxTokens: 1200, temperature: 0.3 }
      );

      return {
        answer: refined.content,
        confidence: rag.confidence,
        citations: rag.citations,
        connectedDocuments: rag.connectedDocuments,
        knowledgePaths: rag.knowledgePaths,
      };
    },
  };
}
