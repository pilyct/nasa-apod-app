import "server-only";
import { fetchApod } from "@/lib/nasa-client";
import type { Apod } from "@/types/apod";

// Shared by app/page.tsx and app/[date]/page.tsx, which previously
// duplicated this fetch + swallow-catch block almost verbatim — any future
// change to the error-handling had to be made correctly in two places.
export interface FetchApodGuardedResult {
  data?: Apod;
  // Actual time this data was fetched, so useApod's initialDataUpdatedAt
  // can anchor freshness correctly instead of to whenever the client hook
  // happens to mount.
  fetchedAt?: number;
}

export async function fetchApodGuarded(
  date: string,
  revalidateSeconds: number,
): Promise<FetchApodGuardedResult> {
  try {
    const data = await fetchApod(date, revalidateSeconds);
    return { data, fetchedAt: Date.now() };
  } catch (error) {
    // Unlike app/api/apod/route.ts's equivalent catch block, this path used
    // to swallow the error with no trace at all — a genuine NASA outage or
    // upstream schema change during SSR/ISR revalidation would've been
    // invisible in server logs.
    console.error("SSR APOD fetch failed:", error);
    return {};
  }
}
