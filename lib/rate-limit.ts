import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Shared across all serverless instances via Upstash's REST-backed Redis, so
// the limit is enforced correctly regardless of which instance answers a
// given request — unlike an in-memory counter, which resets on cold start
// and isn't visible across instances.
const MAX_REQUESTS = 30;
const WINDOW = "60 s";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

let cachedRatelimit: Ratelimit | null | undefined;
let warnedOnce = false;

// Lazily constructed (and memoized) so a missing config doesn't crash the
// module on import — it degrades to "rate limiting disabled" instead, which
// matters for local dev without Upstash credentials configured.
function getRatelimit(): Ratelimit | null {
  if (cachedRatelimit !== undefined) return cachedRatelimit;

  // Matches Redis.fromEnv()'s own fallback (see @upstash/redis) — without
  // checking KV_REST_API_*, a Vercel-KV-style deployment that only sets
  // those would make this evaluate false and silently disable rate
  // limiting even though Redis.fromEnv() would connect just fine.
  const configured = Boolean(
    (process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) &&
      (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN),
  );

  cachedRatelimit = configured
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(MAX_REQUESTS, WINDOW),
        prefix: "ratelimit:apod",
        analytics: true,
      })
    : null;

  return cachedRatelimit;
}

export const apodRateLimit = {
  async limit(identifier: string): Promise<RateLimitResult> {
    const ratelimit = getRatelimit();

    if (!ratelimit) {
      if (!warnedOnce) {
        console.warn(
          "[rate-limit] UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set — rate limiting is disabled for this run.",
        );
        warnedOnce = true;
      }
      return { success: true, limit: MAX_REQUESTS, remaining: MAX_REQUESTS, reset: Date.now() };
    }

    try {
      return await ratelimit.limit(identifier);
    } catch (error) {
      // A genuine Redis/network error (not the library's own internal
      // timeout, which already fails open) shouldn't crash every caller —
      // fail open here once, so app/api/apod/route.ts doesn't need its own
      // try/catch.
      console.error("[rate-limit] check failed, allowing request:", error);
      return { success: true, limit: MAX_REQUESTS, remaining: MAX_REQUESTS, reset: Date.now() };
    }
  },
};
