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
  const requestedDate = request.nextUrl.searchParams.get("date") ?? todayIsoDate();
  const date = validateApodDate(requestedDate);

  if (!date) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

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

  const today = todayIsoDate();
  const isToday = date === today;
  const revalidateSeconds = getRevalidateSeconds(date, today);

  try {
    const apod = await fetchApod(date, revalidateSeconds);
    const cacheControl = isToday
      ? "public, s-maxage=900, stale-while-revalidate=3600"
      : "public, max-age=31536000, immutable";

    return NextResponse.json(apod, { headers: { "Cache-Control": cacheControl } });
  } catch (error) {
    if (error instanceof ApodNotFoundError) {
      return NextResponse.json({ error: "No picture published for this date" }, { status: 404 });
    }
    if (error instanceof ApodRateLimitedError) {
      return NextResponse.json({ error: "High demand right now — try again shortly" }, { status: 429 });
    }
    if (error instanceof ApodUpstreamError) {
      console.error("APOD upstream error:", error.message);
      return NextResponse.json({ error: "Couldn't load today's picture. Try again." }, { status: 502 });
    }
    console.error("Unexpected APOD error:", error);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
