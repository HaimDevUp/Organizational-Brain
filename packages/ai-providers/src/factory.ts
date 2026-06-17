import type { AiProviderConfig, LlmProviderId } from "./types";
import { createOpenAiProvider } from "./openai";
import { createAnthropicProvider } from "./anthropic";
import { createGeminiProvider } from "./gemini";

export type AiProvider = ReturnType<typeof createOpenAiProvider>;

export function resolveProvider(config?: Partial<AiProviderConfig>): AiProvider {
  const provider: LlmProviderId =
    config?.provider ?? (process.env.AI_PROVIDER as LlmProviderId) ?? "openai";

  const key =
    config?.apiKey ??
    (provider === "openai"
      ? process.env.OPENAI_API_KEY
      : provider === "anthropic"
        ? process.env.ANTHROPIC_API_KEY
        : process.env.GEMINI_API_KEY);

  if (!key) throw new Error(`Missing API key for provider: ${provider}`);

  switch (provider) {
    case "anthropic":
      return createAnthropicProvider(key);
    case "gemini":
      return createGeminiProvider(key);
    default:
      return createOpenAiProvider(key);
  }
}

export function resolveEmbeddingProvider(): AiProvider {
  const provider = (process.env.AI_PROVIDER as LlmProviderId) ?? "openai";
  if (provider === "gemini" && process.env.GEMINI_API_KEY) {
    return createGeminiProvider(process.env.GEMINI_API_KEY);
  }
  if (process.env.OPENAI_API_KEY) return createOpenAiProvider(process.env.OPENAI_API_KEY);
  if (process.env.GEMINI_API_KEY) return createGeminiProvider(process.env.GEMINI_API_KEY);
  throw new Error("No embedding provider configured (OPENAI_API_KEY or GEMINI_API_KEY)");
}
