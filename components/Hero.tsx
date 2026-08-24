"use client";

import { useSyncExternalStore } from "react";
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
}: {
  date: string;
  initialData?: Apod;
  initialDataUpdatedAt?: number;
}) {
  const { data, error, isLoading, refetch } = useApod(date, initialData, {
    initialDataUpdatedAt,
  });
  // useSyncExternalStore (not useState+useEffect) subscribes to
  // navigator.onLine without ever calling setState from an effect body, and
  // its getServerSnapshot avoids a hydration mismatch for a client that
  // happens to be offline on first load (an effect-based setState would
  // correct that a tick after SSR renders online).
  const isOffline = useSyncExternalStore(
    (onChange) => {
      window.addEventListener("online", onChange);
      window.addEventListener("offline", onChange);
      return () => {
        window.removeEventListener("online", onChange);
        window.removeEventListener("offline", onChange);
      };
    },
    () => !navigator.onLine,
    () => false,
  );

  return (
    <div>
      {isOffline && <OfflineBanner />}

      <div className="relative z-50 flex flex-col gap-2 md:flex-row items-center justify-between px-4 py-3">
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

      {isLoading && <Skeleton />}

      {!isLoading &&
        !data &&
        error instanceof ApodFetchError &&
        error.status === 404 && <EmptyCard />}

      {!isLoading &&
        !data &&
        error &&
        !(error instanceof ApodFetchError && error.status === 404) && (
          <ErrorCard message={error.message} onRetry={() => refetch()} />
        )}

      {!isLoading && data && (
        <div className="flex flex-col md:flex-row items-center justify-between px-4">
          <MediaFrame key={date} apod={data} />
          <MetadataPanel apod={data} />
        </div>
      )}
    </div>
  );
}
