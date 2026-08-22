import { notFound } from "next/navigation";
import { Hero } from "@/components/Hero";
import { fetchApodGuarded } from "@/lib/fetch-apod-guarded";
import { validateApodDate, todayIsoDate } from "@/lib/date-range";
import { getRevalidateSeconds } from "@/lib/revalidate";

export default async function DatePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date: rawDate } = await params;
  const date = validateApodDate(rawDate);
  if (!date) notFound();

  const revalidateSeconds = getRevalidateSeconds(date, todayIsoDate());
  const { data, fetchedAt, rateLimited } = await fetchApodGuarded(date, revalidateSeconds);

  return (
    <Hero
      date={date}
      initialData={data}
      initialDataUpdatedAt={fetchedAt}
      rateLimited={rateLimited}
    />
  );
}
