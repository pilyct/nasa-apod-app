import "server-only";
import { headers } from "next/headers";
import { apodRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-client-ip";

// Server components (app/page.tsx, app/[date]/page.tsx) call fetchApod
// directly, outside of app/api/apod/route.ts — without this, SSR page loads
// would consume NASA's quota completely unthrottled, since only client-side
// refetches through the route handler were ever rate limited. Calling this
// makes the page dynamic (per-request) rather than statically cached, which
// is an inherent tradeoff of enforcing a per-visitor limit at all — but the
// underlying fetchApod() call is still deduped by Next's own fetch cache
// per revalidate window, so this doesn't cause extra NASA requests on its
// own; it only guards against many distinct dates being requested in a burst.
export async function isApodRateLimited(): Promise<boolean> {
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const { success } = await apodRateLimit.limit(ip);
  return !success;
}
