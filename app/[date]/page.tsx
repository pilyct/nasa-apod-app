import { notFound } from "next/navigation";
import { Hero } from "@/components/Hero";
import { fetchApod } from "@/lib/nasa-client";
import { validateApodDate, todayIsoDate } from "@/lib/date-range";
import { isApodRateLimited } from "@/lib/rate-limit-guard";
import type { Apod } from "@/types/apod";

const PAST_DATE_REVALIDATE_SECONDS = 60 * 60 * 24 * 365;
const TODAY_REVALIDATE_SECONDS = 60 * 15;

export default async function DatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date: rawDate } = await params;
  const date = validateApodDate(rawDate);
  if (!date) notFound();

  const isToday = date === todayIsoDate();
  const revalidateSeconds = isToday ? TODAY_REVALIDATE_SECONDS : PAST_DATE_REVALIDATE_SECONDS;

  let initialData: Apod | undefined;
  if (!(await isApodRateLimited())) {
    try {
      initialData = await fetchApod(date, revalidateSeconds);
    } catch {
      // Same as today's page — let the client hook retry and render the error state.
    }
  }
  // If rate limited, initialData stays undefined and Hero's client-side
  // useApod hook takes over via /api/apod, which applies the same limit.

  return <Hero date={date} initialData={initialData} />;
}
