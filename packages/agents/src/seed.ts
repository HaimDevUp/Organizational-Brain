import { prisma } from "@obos/database";
import { getBuiltinPlugins } from "./plugins/registry";

export async function seedOrganizationAgents(organizationId: string, createdById: string) {
  for (const plugin of getBuiltinPlugins()) {
    await prisma.agent.upsert({
      where: {
        organizationId_slug: { organizationId, slug: plugin.key },
      },
      create: {
        organizationId,
        name: plugin.name,
        slug: plugin.key,
        description: plugin.description,
        systemPrompt: plugin.systemPrompt,
        toolsEnabled: plugin.toolsEnabled,
        pluginKey: plugin.key,
        status: "active",
        createdById,
        modelConfig: { provider: process.env.AI_PROVIDER ?? "openai" },
      },
      update: {
        name: plugin.name,
        description: plugin.description,
        systemPrompt: plugin.systemPrompt,
        pluginKey: plugin.key,
      },
    });
  }
}
