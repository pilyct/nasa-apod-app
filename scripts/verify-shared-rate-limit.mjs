// Ad-hoc verification, not part of the test suite (hits real Upstash Redis).
//
// Simulates two separate serverless instances by creating two independent
// Ratelimit clients (no shared JS memory between them) and firing requests
// at both concurrently, interleaved, under the same identity. If the limit
// is genuinely shared via Redis, the combined total allowed across both
// "instances" stays at 30 — not 30 each (60 total), which is what an
// in-memory-per-instance limiter would have allowed instead.
//
// Usage: node --env-file=.env.local scripts/verify-shared-rate-limit.mjs

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const testId = `verify-${Date.now()}`;

function makeInstance(name) {
  const redis = Redis.fromEnv();
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "60 s"),
    prefix: "ratelimit:apod",
  });
  return { name, ratelimit };
}

const instanceA = makeInstance("instance-A");
const instanceB = makeInstance("instance-B");

const REQUESTS_PER_INSTANCE = 20; // 40 total combined, well over the 30 cap

async function fire(instance, n) {
  const results = [];
  for (let i = 0; i < n; i++) {
    const { success } = await instance.ratelimit.limit(testId);
    results.push({ instance: instance.name, i, success });
  }
  return results;
}

const [resultsA, resultsB] = await Promise.all([
  fire(instanceA, REQUESTS_PER_INSTANCE),
  fire(instanceB, REQUESTS_PER_INSTANCE),
]);

const all = [...resultsA, ...resultsB];
const allowed = all.filter((r) => r.success).length;
const blocked = all.filter((r) => !r.success).length;

console.log(`Instance A: ${resultsA.filter((r) => r.success).length}/${REQUESTS_PER_INSTANCE} allowed`);
console.log(`Instance B: ${resultsB.filter((r) => r.success).length}/${REQUESTS_PER_INSTANCE} allowed`);
console.log(`Combined:   ${allowed} allowed, ${blocked} blocked (out of ${all.length} total requests)`);

if (allowed <= 30) {
  console.log("\n✅ Shared limit held: two independent instances were capped at a combined 30, as expected from a Redis-backed limiter.");
} else {
  console.log("\n❌ Shared limit did NOT hold: combined allowed count exceeded 30 — instances are not actually sharing state.");
  process.exitCode = 1;
}
