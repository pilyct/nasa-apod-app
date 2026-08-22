import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";

describe("apodRateLimit (no Upstash credentials configured)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("bypasses cleanly (success: true) instead of throwing", async () => {
    const { apodRateLimit } = await import("@/lib/rate-limit");

    const result = await apodRateLimit.limit("1.2.3.4");

    expect(result.success).toBe(true);
    expect(result.remaining).toBeGreaterThan(0);
  });
});
