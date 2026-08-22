"use client";

import { useQuery } from "@tanstack/react-query";
import { todayIsoDate } from "@/lib/date-range";
import { TODAY_REVALIDATE_SECONDS } from "@/lib/revalidate";
import type { Apod } from "@/types/apod";

class ApodFetchError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function fetchApodByDate(date: string): Promise<Apod> {
  const res = await fetch(`/api/apod?date=${date}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new ApodFetchError(body.error ?? "Failed to load", res.status);
  }
  return res.json();
}

export function useApod(date: string, initialData?: Apod) {
  const isToday = date === todayIsoDate();

  return useQuery({
    queryKey: ["apod", date],
    queryFn: () => fetchApodByDate(date),
    initialData,
    // Override QueryProvider's global 1hr staleTime for today's date — the
    // server only guarantees that entry is fresh for TODAY_REVALIDATE_SECONDS
    // (15 min; it can still be corrected or posted late), so a tab left open
    // longer than that would otherwise never refetch and could show stale
    // data well past the point NASA might have updated it. Past dates omit
    // this key entirely (not staleTime: undefined — TanStack Query merges
    // options via {...defaults, ...options}, so an explicit undefined would
    // still win the spread and override the provider's 1hr default with 0,
    // making every past-date query stale immediately) so the provider's 1hr
    // default applies, since past dates are immutable once published.
    ...(isToday ? { staleTime: TODAY_REVALIDATE_SECONDS * 1000 } : {}),
    // Override QueryProvider's global retry: 1 — a 4xx (no APOD for this
    // date, or a malformed date) can never succeed by retrying, so retrying
    // it anyway just adds latency and burns another request against the
    // rate limit for free.
    retry: (failureCount, error) => {
      if (error instanceof ApodFetchError && error.status >= 400 && error.status < 500) {
        return false;
      }
      return failureCount < 1;
    },
  });
}

export { ApodFetchError };
