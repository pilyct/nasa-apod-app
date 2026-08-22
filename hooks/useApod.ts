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
  });
}

export { ApodFetchError };
