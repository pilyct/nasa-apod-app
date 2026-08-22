"use client";

import { useEffect, useState } from "react";
import { useApod } from "@/hooks/useApod";
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
}: {
  date: string;
  initialData?: Apod;
}) {
  const { data, error, isLoading, refetch } = useApod(date, initialData);
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

      {isLoading && <Skeleton />}

      {!isLoading &&
        error &&
        "status" in error &&
        (error as { status: number }).status === 404 && <EmptyCard />}

      {!isLoading &&
        error &&
        !(
          "status" in error && (error as { status: number }).status === 404
        ) && <ErrorCard message={error.message} onRetry={() => refetch()} />}

      {!isLoading && !error && data && (
        <div className="flex flex-col md:flex-row items-center justify-between px-4">
          <MediaFrame apod={data} />
          <MetadataPanel apod={data} />
        </div>
      )}
    </div>
  );
}
