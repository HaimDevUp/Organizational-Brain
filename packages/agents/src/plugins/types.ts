import type { SearchFilters } from "@obos/qdrant";

export interface AgentPluginContext {
  organizationId: string;
  userId: string;
  agentSlug: string;
  /** User-scoped RAG filters (department access). */
  searchFilters?: SearchFilters;
}

export interface AgentPlugin {
  key: string;
  name: string;
  description: string;
  systemPrompt: string;
  toolsEnabled: string[];
  departmentScopeSlug?: string;
}

export interface AgentRunInput {
  message: string;
  conversationHistory?: { role: "user" | "assistant"; content: string }[];
}

export interface AgentRunResult {
  answer: string;
  confidence: number;
  citations: unknown[];
  metadata?: Record<string, unknown>;
}

export interface AgentPluginRunner {
  run(ctx: AgentPluginContext, input: AgentRunInput): Promise<AgentRunResult>;
}
