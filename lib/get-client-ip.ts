import "server-only";

// Vercel sets x-forwarded-for on every request; NextRequest no longer
// exposes a `.ip` property directly (removed in Next 13.4+). Falls back to
// a fixed key so local dev / unknown clients still get a (shared) limit
// rather than bypassing rate limiting entirely.
//
// Takes a plain Headers-like object (not NextRequest specifically) so it
// works both from a route handler's `request.headers` and from a server
// component's `await headers()` (next/headers), which don't share a type.
export function getClientIp(headers: { get(name: string): string | null }): string {
  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}
