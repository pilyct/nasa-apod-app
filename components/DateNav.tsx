"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Tooltip } from "@base-ui/react/tooltip";
import { ARCHIVE_START_DATE } from "@/config/constants";
import { todayIsoDate } from "@/lib/date-range";

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function DateNav({ date }: { date: string }) {
  const router = useRouter();
  const today = todayIsoDate();

  const prevDate = addDays(date, -1);
  const nextDate = addDays(date, 1);
  const canGoPrev = prevDate >= ARCHIVE_START_DATE;
  const canGoNext = nextDate <= today;

  function goTo(target: string) {
    router.push(target === today ? "/" : `/${target}`);
  }

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" && canGoPrev) goTo(prevDate);
      if (e.key === "ArrowRight" && canGoNext) goTo(nextDate);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prevDate, nextDate, canGoPrev, canGoNext]);

  return (
    <div className="flex items-center gap-2 md:gap-3">
      <Tooltip.Root disabled={!canGoPrev}>
        <Tooltip.Trigger
          render={
            <button
              aria-label="Previous day"
              disabled={!canGoPrev}
              onClick={() => goTo(prevDate)}
              className="cursor-pointer rounded-md md:p-2 text-hero-fg opacity-80 transition-opacity hover:opacity-100 disabled:opacity-30 focus-visible:outline focus-visible:outline-accent"
            >
              ←
            </button>
          }
        />
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={8}>
            <Tooltip.Popup className="rounded-md border border-hero-fg/10 bg-hero-bg px-2 py-1 text-xs text-hero-fg shadow-md">
              Previous day
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
      <input
        type="date"
        aria-label="Choose a date"
        value={date}
        min={ARCHIVE_START_DATE}
        max={today}
        onChange={(e) => e.target.value && goTo(e.target.value)}
        className="cursor-pointer rounded-md bg-transparent md:px-2 py-1 text-sm text-hero-fg scheme-dark focus-visible:outline focus-visible:outline-accent"
      />
      <Tooltip.Root disabled={!canGoNext}>
        <Tooltip.Trigger
          render={
            <button
              aria-label="Next day"
              disabled={!canGoNext}
              onClick={() => goTo(nextDate)}
              className="cursor-pointer rounded-md md:p-2 text-hero-fg opacity-80 transition-opacity hover:opacity-100 disabled:opacity-30 focus-visible:outline focus-visible:outline-accent"
            >
              →
            </button>
          }
        />
        <Tooltip.Portal>
          <Tooltip.Positioner sideOffset={8}>
            <Tooltip.Popup className="rounded-md border border-hero-fg/10 bg-hero-bg px-2 py-1 text-xs text-hero-fg shadow-md">
              Next day
            </Tooltip.Popup>
          </Tooltip.Positioner>
        </Tooltip.Portal>
      </Tooltip.Root>
    </div>
  );
}
