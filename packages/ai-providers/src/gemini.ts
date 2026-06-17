import { GoogleGenerativeAI, TaskType } from "@google/generative-ai";
import { rethrowProviderError } from "./provider-errors";
import type { ChatMessage, CompletionOptions, CompletionResult, EmbedResult } from "./types";

type ProviderError = Error & { status?: number };

function isRetryableProviderError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const status = (err as ProviderError).status;
  const msg = err.message;
  return (
    status === 503 ||
    status === 429 ||
    msg.includes("high demand") ||
    msg.includes("Quota exceeded") ||
    msg.includes("quota")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function embeddingDimensions(): number {
  return parseInt(process.env.QDRANT_VECTOR_SIZE ?? "1536", 10);
}

/** gemini-embedding-001 truncated vectors need L2 normalization (Google MRL). */
function l2Normalize(values: number[]): number[] {
  const norm = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  if (norm === 0) return values;
  return values.map((v) => v / norm);
}

function fitEmbedding(values: number[], targetSize: number): number[] {
  if (values.length === targetSize) return values;
  if (values.length < targetSize) {
    throw new Error(
      `Gemini embedding length ${values.length} is smaller than QDRANT_VECTOR_SIZE ${targetSize}`
    );
  }
  // MRL: leading dimensions retain semantic quality when truncated from 3072.
  const truncated = values.slice(0, targetSize);
  return targetSize === 3072 ? truncated : l2Normalize(truncated);
}

function chatModelCandidates(primary: string): string[] {
  const fallbacks = (process.env.GEMINI_CHAT_FALLBACK_MODELS ?? "gemini-2.0-flash,gemini-flash-latest")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  return [...new Set([primary, ...fallbacks])];
}

export function createGeminiProvider(apiKey: string) {
  const genAI = new GoogleGenerativeAI(apiKey);
  const chatModel = process.env.GEMINI_CHAT_MODEL ?? "gemini-2.5-flash";
  const embeddingModel = process.env.GEMINI_EMBEDDING_MODEL ?? "gemini-embedding-001";

  async function completeWithModel(
    modelId: string,
    messages: ChatMessage[],
    opts?: CompletionOptions
  ): Promise<CompletionResult> {
    const system = messages.find((m) => m.role === "system")?.content;
    const model = genAI.getGenerativeModel({
      model: modelId,
      ...(system ? { systemInstruction: system } : {}),
      generationConfig: {
        temperature: opts?.temperature ?? 0.2,
        maxOutputTokens: opts?.maxTokens ?? 2048,
        responseMimeType: opts?.jsonMode ? "application/json" : undefined,
      },
    });
    const history = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
    const last = history.pop();
    const chat = model.startChat({
      history: history as { role: string; parts: { text: string }[] }[],
    });
    const res = await chat.sendMessage(last?.parts[0]?.text ?? "");
    return {
      content: res.response.text(),
      model: modelId,
    };
  }

  return {
    async complete(messages: ChatMessage[], opts?: CompletionOptions): Promise<CompletionResult> {
      const candidates = chatModelCandidates(opts?.model ?? chatModel);
      const maxAttempts = Number(process.env.GEMINI_CHAT_RETRY_ATTEMPTS ?? "2");
      let lastErr: unknown;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        for (const modelId of candidates) {
          try {
            return await completeWithModel(modelId, messages, opts);
          } catch (err) {
            lastErr = err;
            const hasMoreModels = modelId !== candidates[candidates.length - 1];
            const canRetryAttempt = attempt < maxAttempts - 1;
            if (isRetryableProviderError(err) && (hasMoreModels || canRetryAttempt)) {
              continue;
            }
            rethrowProviderError(err, "Gemini");
          }
        }
        if (attempt < maxAttempts - 1 && isRetryableProviderError(lastErr)) {
          await sleep(1500 * (attempt + 1));
        }
      }

      rethrowProviderError(lastErr, "Gemini");
    },
    async embed(texts: string[], model?: string): Promise<EmbedResult> {
      const emb = genAI.getGenerativeModel({ model: model ?? embeddingModel });
      const vectors: number[][] = [];
      const targetSize = embeddingDimensions();
      const taskType =
        texts.length === 1 ? TaskType.RETRIEVAL_QUERY : TaskType.RETRIEVAL_DOCUMENT;
      try {
        for (const text of texts) {
          const r = await emb.embedContent({
            content: { role: "user", parts: [{ text }] },
            taskType,
          });
          vectors.push(fitEmbedding(r.embedding.values, targetSize));
        }
      } catch (err) {
        rethrowProviderError(err, "Gemini");
      }
      return { vectors, model: model ?? embeddingModel };
    },
  };
}
