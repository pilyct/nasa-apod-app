// Shared by app/page.tsx, app/[date]/page.tsx, and app/api/apod/route.ts —
// previously each redeclared these constants and the isToday ternary
// independently, risking the SSR pages' revalidate window drifting out of
// sync with the API route's own Cache-Control header if only one was edited.

// Past dates rarely change, but "never" turned out to be wrong: when APOD
// moved to science.nasa.gov, the API served placeholder data for old dates
// too. A week keeps almost every request cached while capping how long a bad
// upstream response can survive.
// Today's entry can still change (late posting, corrections) — revalidate every 15 min.
export const PAST_DATE_REVALIDATE_SECONDS = 60 * 60 * 24 * 7;
export const TODAY_REVALIDATE_SECONDS = 60 * 15;

export function getRevalidateSeconds(date: string, today: string): number {
  return date === today ? TODAY_REVALIDATE_SECONDS : PAST_DATE_REVALIDATE_SECONDS;
}
