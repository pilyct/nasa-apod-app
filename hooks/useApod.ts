"use client";

import { useQuery } from "@tanstack/react-query";
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
  return useQuery({
    queryKey: ["apod", date],
    queryFn: () => fetchApodByDate(date),
    initialData,
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
