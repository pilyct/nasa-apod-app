"use client";

import { useEffect, useState } from "react";
import { useApod, ApodFetchError } from "@/hooks/useApod";
import { MediaFrame } from "@/components/MediaFrame";
import { MetadataPanel } from "@/components/MetadataPanel";
import { DateNav } from "@/components/DateNav";
import { Skeleton } from "@/components/states/Skeleton";
import { ErrorCard } from "@/components/states/ErrorCard";
import { EmptyCard } from "@/components/states/EmptyCard";
import { OfflineBanner } from "@/components/states/OfflineBanner";
import type { Apod } from "@/types/apod";

export function Hero({
  date,
  initialData,
  initialDataUpdatedAt,
  rateLimited,
}: {
  date: string;
  initialData?: Apod;
  initialDataUpdatedAt?: number;
  rateLimited?: boolean;
}) {
  // If SSR was rate limited with no cached data to fall back on, don't let
  // the client's first render immediately fire a doomed refetch against the
  // same rate-limit window — show the rate-limited state directly instead,
  // and only start the real query once the user explicitly retries.
  //
  // Reset via the render-phase "adjusting state when a prop changes"
  // pattern (comparing against a ref of the last-seen date), not a
  // useEffect — an effect only runs after commit, so on the render where
  // date/rateLimited/initialData change via client-side navigation,
  // useQuery would still see the previous date's stale `enabled` value for
  // one render before the effect corrects it.
  const [enabled, setEnabled] = useState(!(rateLimited && !initialData));
  const [lastDate, setLastDate] = useState(date);
  if (date !== lastDate) {
    setLastDate(date);
    setEnabled(!(rateLimited && !initialData));
  }

  const { data, error, isLoading, refetch } = useApod(date, initialData, {
    initialDataUpdatedAt,
    enabled,
  });
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    setIsOffline(!navigator.onLine);
    const goOnline = () => setIsOffline(false);
    const goOffline = () => setIsOffline(true);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return (
    <div>
      {isOffline && <OfflineBanner />}

      <div className="flex flex-col gap-2 md:flex-row items-center justify-between px-4 py-3">
        <div className="flex flex-col items-center md:items-start justify-between">
          <div className="flex items-center">
            <span className="font-sans text-2xl md:text-3xl font-semibold tracking-wide text-hero-fg">
              C
            </span>
            <img src="/icon.png" alt="" className="h-6 md:w-6" />

            <span className="font-sans text-2xl md:text-3xl font-semibold tracking-wide text-hero-fg">
              smica
            </span>
          </div>
          <span className="font-mono text-xs md:text-sm font-medium tracking-wide text-hero-fg">
            Astronomy Picture of the Day
          </span>
        </div>
        <DateNav date={date} />
      </div>

      {!enabled && !data && (
        <ErrorCard
          message="Too many requests — try again shortly"
          onRetry={() => setEnabled(true)}
        />
      )}

      {enabled && isLoading && <Skeleton />}

      {enabled &&
        !isLoading &&
        !data &&
        error instanceof ApodFetchError &&
        error.status === 404 && <EmptyCard />}

      {enabled &&
        !isLoading &&
        !data &&
        error &&
        !(error instanceof ApodFetchError && error.status === 404) && (
          <ErrorCard message={error.message} onRetry={() => refetch()} />
        )}

      {enabled && !isLoading && data && (
        <div className="flex flex-col md:flex-row items-center justify-between px-4">
          <MediaFrame key={date} apod={data} />
          <MetadataPanel apod={data} />
        </div>
      )}
    </div>
  );
}
