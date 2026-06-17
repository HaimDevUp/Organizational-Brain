import type { AgentPlugin, AgentPluginRunner } from "./types";
import { createRagAgentRunner } from "./rag-runner";

const BUILTIN_PLUGINS: AgentPlugin[] = [
  {
    key: "hr",
    name: "HR Agent",
    description: "Answers HR policies, benefits, and people operations questions",
    systemPrompt:
      "You are the HR Agent for this organization. Focus on policies, benefits, PTO, hiring, and employee handbook topics. Use only organizational knowledge.",
    toolsEnabled: ["search_knowledge"],
    departmentScopeSlug: "hr",
  },
  {
    key: "sales",
    name: "Sales Agent",
    description: "Supports sales playbooks, pricing, and customer-facing knowledge",
    systemPrompt:
      "You are the Sales Agent. Help with playbooks, objection handling, pricing, and product positioning using approved knowledge only.",
    toolsEnabled: ["search_knowledge"],
    departmentScopeSlug: "sales",
  },
  {
    key: "product",
    name: "Product Agent",
    description: "Product specs, roadmaps, and technical documentation assistant",
    systemPrompt:
      "You are the Product Agent. Answer questions about product features, specs, roadmaps, and technical docs from the knowledge base.",
    toolsEnabled: ["search_knowledge"],
    departmentScopeSlug: "engineering",
  },
  {
    key: "onboarding",
    name: "Onboarding Agent",
    description: "Guides new employees through onboarding materials",
    systemPrompt:
      "You are the Onboarding Agent. Help new team members find onboarding checklists, first-week guides, and role-specific resources.",
    toolsEnabled: ["search_knowledge"],
  },
  {
    key: "knowledge-curator",
    name: "Knowledge Curator Agent",
    description: "Identifies gaps, suggests improvements, and curates knowledge quality",
    systemPrompt:
      "You are the Knowledge Curator. Analyze knowledge quality, suggest missing topics, and recommend documentation improvements based on retrieved context.",
    toolsEnabled: ["search_knowledge", "list_gaps"],
  },
];

const runners = new Map<string, AgentPluginRunner>();

export function registerPluginRunner(pluginKey: string, runner: AgentPluginRunner) {
  runners.set(pluginKey, runner);
}

export function getBuiltinPlugins(): AgentPlugin[] {
  return BUILTIN_PLUGINS;
}

export function getPlugin(key: string): AgentPlugin | undefined {
  return BUILTIN_PLUGINS.find((p) => p.key === key);
}

export function getPluginRunner(key: string): AgentPluginRunner {
  if (!runners.has(key)) {
    const plugin = getPlugin(key);
    if (plugin) {
      runners.set(key, createRagAgentRunner(plugin));
    }
  }
  const runner = runners.get(key);
  if (!runner) throw new Error(`Unknown agent plugin: ${key}`);
  return runner;
}

// Register built-ins
for (const p of BUILTIN_PLUGINS) {
  registerPluginRunner(p.key, createRagAgentRunner(p));
}
