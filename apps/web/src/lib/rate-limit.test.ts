import { describe, it, expect } from "vitest";
import { checkRateLimit } from "./rate-limit";
import { TooManyRequestsError } from "@obos/shared";

describe("checkRateLimit", () => {
  it("allows requests under limit", () => {
    const key = `test-${Date.now()}`;
    expect(() =>
      checkRateLimit({ key, limit: 3, windowMs: 60_000 })
    ).not.toThrow();
  });

  it("blocks when limit exceeded", () => {
    const key = `test-block-${Date.now()}`;
    for (let i = 0; i < 2; i++) {
      checkRateLimit({ key, limit: 2, windowMs: 60_000 });
    }
    expect(() => checkRateLimit({ key, limit: 2, windowMs: 60_000 })).toThrow(
      TooManyRequestsError
    );
  });
});
