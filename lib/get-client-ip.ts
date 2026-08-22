import "server-only";
import type { NextRequest } from "next/server";

// Vercel sets x-forwarded-for on every request; NextRequest no longer
// exposes a `.ip` property directly (removed in Next 13.4+). Falls back to
// a fixed key so local dev / unknown clients still get a (shared) limit
// rather than bypassing rate limiting entirely.
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}
