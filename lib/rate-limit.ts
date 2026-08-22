import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Shared across all serverless instances via Upstash's REST-backed Redis, so
// the limit is enforced correctly regardless of which instance answers a
// given request — unlike an in-memory counter, which resets on cold start
// and isn't visible across instances.
const MAX_REQUESTS = 30;
const WINDOW = "60 s";

const redis = Redis.fromEnv();

export const apodRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(MAX_REQUESTS, WINDOW),
  prefix: "ratelimit:apod",
  analytics: true,
});
