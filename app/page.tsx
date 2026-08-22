import { Hero } from "@/components/Hero";
import { fetchApodGuarded } from "@/lib/fetch-apod-guarded";
import { todayIsoDate } from "@/lib/date-range";
import { TODAY_REVALIDATE_SECONDS } from "@/lib/revalidate";

export default async function TodayPage() {
  const date = todayIsoDate();
  const { data, fetchedAt, rateLimited } = await fetchApodGuarded(
    date,
    TODAY_REVALIDATE_SECONDS,
  );

  return (
    <Hero
      date={date}
      initialData={data}
      initialDataUpdatedAt={fetchedAt}
      rateLimited={rateLimited}
    />
  );
}
