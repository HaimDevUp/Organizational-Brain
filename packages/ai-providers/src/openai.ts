import OpenAI from "openai";
import type { ChatMessage, CompletionOptions, CompletionResult, EmbedResult } from "./types";

export function createOpenAiProvider(apiKey: string) {
  const client = new OpenAI({ apiKey });
  const chatModel = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini";
  const embeddingModel = process.env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small";

  return {
    async complete(messages: ChatMessage[], opts?: CompletionOptions): Promise<CompletionResult> {
      const res = await client.chat.completions.create({
        model: opts?.model ?? chatModel,
        messages,
        temperature: opts?.temperature ?? 0.2,
        max_tokens: opts?.maxTokens ?? 2048,
        response_format: opts?.jsonMode ? { type: "json_object" } : undefined,
      });
      const choice = res.choices[0];
      return {
        content: choice?.message?.content ?? "",
        model: res.model,
        usage: {
          prompt: res.usage?.prompt_tokens ?? 0,
          completion: res.usage?.completion_tokens ?? 0,
        },
      };
    },
    async embed(texts: string[], model?: string): Promise<EmbedResult> {
      const res = await client.embeddings.create({
        model: model ?? embeddingModel,
        input: texts,
      });
      return {
        vectors: res.data.map((d) => d.embedding),
        model: res.model,
      };
    },
  };
}
