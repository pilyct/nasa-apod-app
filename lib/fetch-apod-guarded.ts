import "server-only";
import { fetchApod } from "@/lib/nasa-client";
import { isApodRateLimited } from "@/lib/rate-limit-guard";
import type { Apod } from "@/types/apod";

// Shared by app/page.tsx and app/[date]/page.tsx, which previously
// duplicated this rate-limit-gate + fetch + swallow-catch block almost
// verbatim — any future change to the gating logic had to be made
// correctly in two places.
//
// Returns undefined (rather than throwing) whenever SSR shouldn't render
// data directly: either the visitor is rate limited, or the NASA fetch
// failed. In both cases Hero's client-side useApod hook takes over via
// /api/apod, which applies the same rate limit and surfaces a proper error
// state, instead of crashing the page render.
export async function fetchApodGuarded(
  date: string,
  revalidateSeconds: number,
): Promise<Apod | undefined> {
  if (await isApodRateLimited()) return undefined;

  try {
    return await fetchApod(date, revalidateSeconds);
  } catch {
    return undefined;
  }
}
