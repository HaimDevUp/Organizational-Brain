import { AppError, TooManyRequestsError } from "@obos/shared";

type ProviderError = Error & { status?: number };

export function rethrowProviderError(err: unknown, provider = "AI"): never {
  if (!(err instanceof Error)) throw err;

  const status = (err as ProviderError).status;
  const msg = err.message;

  if (status === 429 || msg.includes("quota") || msg.includes("Quota exceeded")) {
    throw new TooManyRequestsError(
      `${provider} rate limit or quota exceeded. Wait a minute, try another GEMINI_CHAT_MODEL, or enable billing in Google AI Studio.`
    );
  }

  if (
    status === 503 ||
    msg.includes("high demand") ||
    msg.includes("overloaded") ||
    msg.includes("try again later")
  ) {
    throw new AppError(
      503,
      "AI Provider Unavailable",
      `${provider} is temporarily overloaded. Wait a moment and retry, or set GEMINI_CHAT_MODEL to another model (e.g. gemini-2.0-flash).`,
      "ai-provider"
    );
  }

  if (isConnectionRefused(err)) {
    throw new AppError(
      503,
      "Service Unavailable",
      `${provider} connection refused. For local search, run: docker compose up -d qdrant`,
      "service-unavailable"
    );
  }

  if (status === 404 || msg.includes("is not found") || msg.includes("not supported for generateContent")) {
    throw new AppError(
      502,
      "AI Provider Error",
      `${provider} model not found or unsupported. Set GEMINI_CHAT_MODEL to a valid id (e.g. gemini-2.5-flash, gemini-flash-latest).`,
      "ai-provider"
    );
  }

  if (status === 401 || status === 403 || msg.includes("API key not valid")) {
    throw new AppError(
      502,
      "AI Provider Error",
      `${provider} rejected the API key. Check GEMINI_API_KEY / OPENAI_API_KEY in .env.`,
      "ai-provider"
    );
  }

  throw err;
}

function isConnectionRefused(err: Error): boolean {
  if (err.message.includes("ECONNREFUSED")) return true;
  const cause = (err as Error & { cause?: { code?: string } }).cause;
  return err.message.includes("fetch failed") && cause?.code === "ECONNREFUSED";
}
