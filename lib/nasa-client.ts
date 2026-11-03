import "server-only";
import { NASA_APOD_BASE_URL, NASA_FETCH_TIMEOUT_MS } from "@/config/constants";
import { nasaApodResponseSchema } from "@/schemas/apod";
import type { Apod, NasaApodResponse } from "@/schemas/apod";
import { getMockApod } from "@/lib/apod-fixtures";
import {
  cleanCredit,
  cleanExplanation,
  extractMainMedia,
  htmlToText,
} from "@/lib/apod-html";

// Only these hosts are ever allowed as a video embed src — closes off any
// dangerouslySetInnerHTML-style XSS risk from an unexpected upstream URL.
const ALLOWED_EMBED_HOSTS = ["www.youtube.com", "youtube.com", "player.vimeo.com"];

// NASA sometimes self-hosts the video as a direct file rather than linking a
// YouTube/Vimeo embed page — these get a <video> tag, not an <iframe>. Since
// the move to science.nasa.gov they live on assets.science.nasa.gov; older
// entries may still reference apod.nasa.gov.
const ALLOWED_VIDEO_FILE_HOSTS = ["assets.science.nasa.gov", "apod.nasa.gov"];
const VIDEO_FILE_EXTENSIONS = [".mp4", ".webm", ".ogv"];

// NASA's generic artwork, which the API returns in place of the real picture
// for some entries (the site logo, or the "news thumbnail" used for videos
// and many older entries). Never shown as if it were the day's picture.
const PLACEHOLDER_IMAGE_PATTERN = /\/(nasa-logo[^/]*|news-thumbnail)\.(png|svg|jpe?g)$/i;

export class ApodNotFoundError extends Error {}
export class ApodRateLimitedError extends Error {
  constructor(message: string, public retryAfterSeconds?: number) {
    super(message);
  }
}
export class ApodUpstreamError extends Error {}

function parseUrl(url: string): URL | undefined {
  try {
    return new URL(url);
  } catch {
    return undefined;
  }
}

function isAllowedEmbedUrl(url: string): boolean {
  const parsed = parseUrl(url);
  return !!parsed && parsed.protocol === "https:" && ALLOWED_EMBED_HOSTS.includes(parsed.host);
}

function isAllowedVideoFileUrl(url: string): boolean {
  const parsed = parseUrl(url);
  return (
    !!parsed &&
    parsed.protocol === "https:" &&
    ALLOWED_VIDEO_FILE_HOSTS.includes(parsed.host) &&
    VIDEO_FILE_EXTENSIONS.some((ext) => parsed.pathname.toLowerCase().endsWith(ext))
  );
}

// Image URLs come from NASA's HTML, which could in principle carry any
// scheme (including javascript:). Checked here — the one place NASA's raw
// response is first parsed — so every consumer of imageUrl/hdImageUrl is
// protected without re-checking.
function isSafeHttpUrl(url: string): boolean {
  const parsed = parseUrl(url);
  return !!parsed && (parsed.protocol === "https:" || parsed.protocol === "http:");
}

function isPlaceholderImage(url: string): boolean {
  const parsed = parseUrl(url);
  return !!parsed && PLACEHOLDER_IMAGE_PATTERN.test(parsed.pathname);
}

function isUsableImageUrl(url: string | undefined): url is string {
  return !!url && isSafeHttpUrl(url) && !isPlaceholderImage(url);
}

const IMAGE_EXTENSION_PATTERN = /\.(jpe?g|png|gif|webp|avif|tiff?)$/i;

// "2026-11-03" → "261103", the date format the new API's path expects.
function toApiDate(date: string): string {
  return date.slice(2).replaceAll("-", "");
}

function toApod(raw: NasaApodResponse, date: string): Apod {
  const media = raw.basic_html ? extractMainMedia(raw.basic_html) : undefined;
  const base = {
    title: htmlToText(raw.title),
    date: raw.date,
    explanation: cleanExplanation(raw.explanation),
    copyright: cleanCredit(raw.copyright || raw.credit),
  };

  if (raw.media_type === "video") {
    const src = media && media.kind !== "image" ? media.src : undefined;
    return {
      ...base,
      mediaType: "video",
      videoEmbedUrl: src && isAllowedEmbedUrl(src) ? src : undefined,
      videoFileUrl: src && isAllowedVideoFileUrl(src) ? src : undefined,
    };
  }

  // Prefer the picture from the page itself; fall back to the API's hdurl
  // only when it isn't one of NASA's placeholder thumbnails.
  const pageImage = media?.kind === "image" ? media : undefined;
  const imageUrl = isUsableImageUrl(pageImage?.src)
    ? pageImage.src
    : isUsableImageUrl(raw.hdurl)
      ? raw.hdurl
      : undefined;

  if (!imageUrl) {
    // Showing a generic NASA logo as the day's picture is worse than an
    // error: an error is never cached, and the UI offers Retry.
    throw new ApodUpstreamError(`NASA APOD API returned no usable image for ${date}`);
  }

  const href = pageImage?.href;
  const hdImageUrl =
    isUsableImageUrl(href) && IMAGE_EXTENSION_PATTERN.test(parseUrl(href)!.pathname)
      ? href
      : imageUrl;

  return { ...base, mediaType: "image", imageUrl, hdImageUrl };
}

// The ONLY function in this codebase that calls NASA's APOD API.
// `date` must already be validated (see lib/date-range.ts) before it reaches here —
// this function trusts its caller on that point, it does not re-validate.
export async function fetchApod(date: string, revalidateSeconds: number): Promise<Apod> {
  // Lets local dev run without any network call at all — see
  // lib/apod-fixtures.ts. Never set in production.
  if (process.env.MOCK_APOD === "true") {
    return getMockApod(date);
  }

  const url = `${NASA_APOD_BASE_URL}/${toApiDate(date)}`;

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
  if (res.status === 429) {
    const retryAfterHeader = res.headers.get("Retry-After");
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : undefined;
    throw new ApodRateLimitedError("NASA APOD API rate limit hit", retryAfterSeconds);
  }
  if (!res.ok) throw new ApodUpstreamError(`NASA APOD API responded ${res.status}`);

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new ApodUpstreamError("NASA APOD API returned invalid JSON");
  }
  const parsed = nasaApodResponseSchema.safeParse(json);
  if (!parsed.success) {
    throw new ApodUpstreamError("NASA APOD API response failed validation");
  }

  return toApod(parsed.data, date);
}
