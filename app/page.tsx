import { Hero } from "@/components/Hero";
import { fetchApod } from "@/lib/nasa-client";
import { todayIsoDate } from "@/lib/date-range";
import type { Apod } from "@/types/apod";

const TODAY_REVALIDATE_SECONDS = 60 * 15;

export default async function TodayPage() {
  const date = todayIsoDate();

  let initialData: Apod | undefined;
  try {
    initialData = await fetchApod(date, TODAY_REVALIDATE_SECONDS);
  } catch {
    // Swallow here — Hero's client-side fetch (via useApod) will retry and
    // surface the proper error state instead of crashing the page render.
  }

  return <Hero date={date} initialData={initialData} />;
}
