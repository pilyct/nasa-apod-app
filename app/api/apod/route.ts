import { NextRequest, NextResponse } from "next/server";
import { validateApodDate, todayIsoDate } from "@/lib/date-range";
import { apodRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-client-ip";
import { getRevalidateSeconds } from "@/lib/revalidate";
import {
  fetchApod,
  ApodNotFoundError,
  ApodRateLimitedError,
  ApodUpstreamError,
} from "@/lib/nasa-client";

export async function GET(request: NextRequest) {
  // Computed once and reused below (for isToday) rather than calling
  // todayIsoDate() again after the awaited rate-limit check — otherwise a
  // request straddling a UTC-midnight rollover could get today's date here
  // but be classified as "not today" later, caching it as immutable for a
  // year instead of the short today-tier window.
  const today = todayIsoDate();
  const requestedDate = request.nextUrl.searchParams.get("date") ?? today;
  const date = validateApodDate(requestedDate);

  if (!date) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  // apodRateLimit.limit() already fails open (success: true) on its own
  // errors — not configured, or a genuine Redis/network failure — so no
  // try/catch is needed here.
  const ip = getClientIp(request.headers);
  const { success, limit, remaining, reset } = await apodRateLimit.limit(ip);

  if (!success) {
    const retryAfterSeconds = Math.max(0, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many requests — try again shortly" },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfterSeconds),
          "X-RateLimit-Limit": String(limit),
          "X-RateLimit-Remaining": String(remaining),
        },
      },
    );
  }

  const isToday = date === today;
  const revalidateSeconds = getRevalidateSeconds(date, today);

  try {
    const apod = await fetchApod(date, revalidateSeconds);
    // Reuse the already-computed revalidateSeconds rather than re-deriving
    // from the constants — if getRevalidateSeconds() ever grows a third
    // tier, this stays correct automatically instead of silently drifting.
    const cacheControl = isToday
      ? `public, s-maxage=${revalidateSeconds}, stale-while-revalidate=${revalidateSeconds * 4}`
      : `public, max-age=${revalidateSeconds}, immutable`;

    return NextResponse.json(apod, { headers: { "Cache-Control": cacheControl } });
  } catch (error) {
    if (error instanceof ApodNotFoundError) {
      return NextResponse.json({ error: "No picture published for this date" }, { status: 404 });
    }
    if (error instanceof ApodRateLimitedError) {
      // Forward NASA's own Retry-After when they send one, so useApod's
      // retryDelay can honor it instead of falling back to a blind
      // exponential guess. NASA doesn't always include it, so default to a
      // conservative 60s — still better than an unbounded client fallback.
      const retryAfterSeconds = error.retryAfterSeconds ?? 60;
      return NextResponse.json(
        { error: "High demand right now — try again shortly" },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds) } },
      );
    }
    if (error instanceof ApodUpstreamError) {
      console.error("APOD upstream error:", error.message);
      return NextResponse.json({ error: "Couldn't load today's picture. Try again." }, { status: 502 });
    }
    console.error("Unexpected APOD error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
