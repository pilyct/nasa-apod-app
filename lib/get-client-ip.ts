import "server-only";

// Prefer x-vercel-forwarded-for: Vercel's edge sets this itself and
// discards whatever the client sent, specifically to prevent spoofing
// (https://vercel.com/docs/security/reverse-proxy) — but only trust it when
// actually running on Vercel (which sets VERCEL=1 on every deployment).
// Without that check, a client on any other deployment (self-hosted,
// another PaaS, a proxy that doesn't strip this specific header) could set
// x-vercel-forwarded-for to an arbitrary value themselves and get a fresh
// rate-limit identity on every request — worse than trusting plain
// x-forwarded-for there, which at least gets overwritten by most standard
// reverse proxies. Off Vercel, x-forwarded-for is the best available
// signal, and it's fully client-controlled/spoofable in local dev, which is
// an accepted tradeoff there since rate limiting doesn't matter locally.
// Falls back to a fixed key so unknown clients still get a (shared) limit
// rather than bypassing rate limiting entirely.
//
// Takes a plain Headers-like object (not NextRequest specifically) so it
// works both from a route handler's `request.headers` and from a server
// component's `await headers()` (next/headers), which don't share a type.
export function getClientIp(headers: { get(name: string): string | null }): string {
  if (process.env.VERCEL === "1") {
    const vercelForwardedFor = headers.get("x-vercel-forwarded-for");
    if (vercelForwardedFor) return vercelForwardedFor.split(",")[0].trim();
  }

  const forwardedFor = headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}
