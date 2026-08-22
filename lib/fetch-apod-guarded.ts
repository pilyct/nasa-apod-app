import "server-only";
import { fetchApod } from "@/lib/nasa-client";
import { isApodRateLimited } from "@/lib/rate-limit-guard";
import type { Apod } from "@/types/apod";

// Shared by app/page.tsx and app/[date]/page.tsx, which previously
// duplicated this rate-limit-gate + fetch + swallow-catch block almost
// verbatim — any future change to the gating logic had to be made
// correctly in two places.
export interface FetchApodGuardedResult {
  data?: Apod;
  // Actual time this data was fetched, so useApod's initialDataUpdatedAt
  // can anchor freshness correctly instead of to whenever the client hook
  // happens to mount.
  fetchedAt?: number;
  // Lets the caller distinguish "SSR was rate limited" from "SSR fetch
  // failed" — without this, both collapsed into the same undefined data,
  // so a rate-limited visitor's page would immediately fire a client-side
  // refetch through /api/apod that's very likely to hit the same 429 again.
  rateLimited: boolean;
}

export async function fetchApodGuarded(
  date: string,
  revalidateSeconds: number,
): Promise<FetchApodGuardedResult> {
  if (await isApodRateLimited()) {
    return { rateLimited: true };
  }

  try {
    const data = await fetchApod(date, revalidateSeconds);
    return { data, fetchedAt: Date.now(), rateLimited: false };
  } catch (error) {
    // Unlike app/api/apod/route.ts's equivalent catch block, this path used
    // to swallow the error with no trace at all — a genuine NASA outage or
    // upstream schema change during SSR/ISR revalidation would've been
    // invisible in server logs.
    console.error("SSR APOD fetch failed:", error);
    return { rateLimited: false };
  }
}
