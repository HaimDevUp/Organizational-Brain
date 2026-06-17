import Anthropic from "@anthropic-ai/sdk";
import type { ChatMessage, CompletionOptions, CompletionResult, EmbedResult } from "./types";

export function createAnthropicProvider(apiKey: string) {
  const client = new Anthropic({ apiKey });
  const chatModel = process.env.ANTHROPIC_CHAT_MODEL ?? "claude-sonnet-4-20250514";

  return {
    async complete(messages: ChatMessage[], opts?: CompletionOptions): Promise<CompletionResult> {
      const system = messages.find((m) => m.role === "system")?.content;
      const chatMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

      const res = await client.messages.create({
        model: opts?.model ?? chatModel,
        max_tokens: opts?.maxTokens ?? 2048,
        system,
        messages: chatMessages,
        temperature: opts?.temperature ?? 0.2,
      });
      const text = res.content.find((c) => c.type === "text");
      return {
        content: text && "text" in text ? text.text : "",
        model: res.model,
        usage: {
          prompt: res.usage.input_tokens,
          completion: res.usage.output_tokens,
        },
      };
    },
    async embed(_texts: string[]): Promise<EmbedResult> {
      throw new Error("Anthropic embeddings not supported; use OpenAI for embeddings");
    },
  };
}
