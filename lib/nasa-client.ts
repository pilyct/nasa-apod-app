import "server-only";
import { NASA_APOD_BASE_URL, NASA_FETCH_TIMEOUT_MS } from "@/config/constants";
import { nasaApodResponseSchema } from "@/schemas/apod";
import type { Apod } from "@/schemas/apod";

// Only these hosts are ever allowed as a video embed src — closes off any
// dangerouslySetInnerHTML-style XSS risk from an unexpected upstream URL.
const ALLOWED_EMBED_HOSTS = ["www.youtube.com", "youtube.com", "player.vimeo.com"];

// NASA sometimes self-hosts the video as a direct file (e.g. apod.nasa.gov/.../foo.mp4)
// rather than linking a YouTube/Vimeo embed page — these get a <video> tag, not an <iframe>.
const ALLOWED_VIDEO_FILE_HOSTS = ["apod.nasa.gov"];
const VIDEO_FILE_EXTENSIONS = [".mp4", ".webm", ".ogv"];

function isAllowedVideoFileUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      ALLOWED_VIDEO_FILE_HOSTS.includes(parsed.host) &&
      VIDEO_FILE_EXTENSIONS.some((ext) => parsed.pathname.endsWith(ext))
    );
  } catch {
    return false;
  }
}

export class ApodNotFoundError extends Error {}
export class ApodRateLimitedError extends Error {}
export class ApodUpstreamError extends Error {}

function isAllowedEmbedUrl(url: string): boolean {
  try {
    return ALLOWED_EMBED_HOSTS.includes(new URL(url).host);
  } catch {
    return false;
  }
}

// The ONLY function in this codebase that reads NASA_API_KEY or calls api.nasa.gov.
// `date` must already be validated (see lib/date-range.ts) before it reaches here —
// this function trusts its caller on that point, it does not re-validate.
export async function fetchApod(date: string, revalidateSeconds: number): Promise<Apod> {
  const apiKey = process.env.NASA_API_KEY;
  if (!apiKey) {
    throw new ApodUpstreamError("NASA_API_KEY is not configured");
  }

  const url = new URL(NASA_APOD_BASE_URL);
  url.searchParams.set("date", date);
  url.searchParams.set("api_key", apiKey);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), NASA_FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      next: { revalidate: revalidateSeconds },
    });
  } catch {
    throw new ApodUpstreamError("Network error contacting NASA APOD API");
  } finally {
    clearTimeout(timeout);
  }

  if (res.status === 404) throw new ApodNotFoundError(`No APOD for date ${date}`);
  if (res.status === 429) throw new ApodRateLimitedError("NASA APOD API rate limit hit");
  if (!res.ok) throw new ApodUpstreamError(`NASA APOD API responded ${res.status}`);

  const json = await res.json();
  const parsed = nasaApodResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApodUpstreamError("NASA APOD API response failed validation");
  }

  const raw = parsed.data;

  if (raw.media_type === "video") {
    const embedUrl = raw.url && isAllowedEmbedUrl(raw.url) ? raw.url : undefined;
    const fileUrl = raw.url && isAllowedVideoFileUrl(raw.url) ? raw.url : undefined;
    return {
      title: raw.title,
      date: raw.date,
      explanation: raw.explanation,
      mediaType: "video",
      videoEmbedUrl: embedUrl,
      videoFileUrl: fileUrl,
      copyright: raw.copyright,
    };
  }

  return {
    title: raw.title,
    date: raw.date,
    explanation: raw.explanation,
    mediaType: "image",
    imageUrl: raw.url,
    hdImageUrl: raw.hdurl ?? raw.url,
    copyright: raw.copyright,
  };
}
