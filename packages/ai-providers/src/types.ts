export type LlmProviderId = "openai" | "anthropic" | "gemini";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}

export interface CompletionResult {
  content: string;
  model: string;
  usage?: { prompt: number; completion: number };
}

export interface EmbedResult {
  vectors: number[][];
  model: string;
}

export interface AiProviderConfig {
  provider: LlmProviderId;
  apiKey?: string;
  chatModel?: string;
  embeddingModel?: string;
}
