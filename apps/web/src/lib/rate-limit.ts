import { TooManyRequestsError } from "@obos/shared";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  key: string;
  limit: number;
  windowMs: number;
}

/** In-memory sliding window rate limiter (use Redis in multi-instance production). */
export function checkRateLimit(config: RateLimitConfig): void {
  const now = Date.now();
  const existing = buckets.get(config.key);

  if (!existing || now >= existing.resetAt) {
    buckets.set(config.key, { count: 1, resetAt: now + config.windowMs });
    return;
  }

  if (existing.count >= config.limit) {
    throw new TooManyRequestsError("Rate limit exceeded. Try again shortly.");
  }

  existing.count += 1;
}

export function aiRateLimitKey(orgId: string, userId: string, action: string): string {
  return `ai:${orgId}:${userId}:${action}`;
}
