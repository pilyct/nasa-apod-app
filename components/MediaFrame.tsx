"use client";

import { useState } from "react";
import type { Apod } from "@/types/apod";

function withCacheBust(url: string, retryCount: number): string {
  if (retryCount === 0) return url;
  return `${url}${url.includes("?") ? "&" : "?"}retry=${retryCount}`;
}

export function MediaFrame({ apod }: { apod: Apod }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  if (apod.mediaType === "video") {
    if (apod.videoFileUrl) {
      if (failed) {
        return (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-hero-bg text-hero-fg">
            <p className="text-sm text-muted">Couldn&apos;t load the video</p>
            <button
              type="button"
              onClick={() => {
                setFailed(false);
                setRetryCount((n) => n + 1);
              }}
              className="cursor-pointer rounded-md bg-accent px-4 py-2 text-sm font-medium text-hero-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-accent"
            >
              Retry
            </button>
          </div>
        );
      }
      return (
        <div className="aspect-video w-full bg-hero-bg">
          <video
            key={retryCount}
            src={withCacheBust(apod.videoFileUrl, retryCount)}
            controls
            onError={() => setFailed(true)}
            className="h-full w-full object-contain"
          />
        </div>
      );
    }
    if (apod.videoEmbedUrl) {
      return (
        <div className="aspect-video w-full bg-hero-bg">
          <iframe
            src={apod.videoEmbedUrl}
            title={apod.title}
            className="h-full w-full"
            // NOTE: allow-scripts + allow-same-origin together let embedded
            // script escape this sandbox in principle — they can't safely be
            // narrowed further here without breaking the YouTube/Vimeo
            // player, which needs both. The actual security boundary is
            // ALLOWED_EMBED_HOSTS in lib/nasa-client.ts, which restricts
            // videoEmbedUrl to youtube.com/player.vimeo.com — do not widen
            // that allowlist without re-evaluating this sandbox.
            sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox"
            allow="encrypted-media; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    return (
      <div className="flex aspect-video w-full items-center justify-center bg-hero-bg text-hero-fg">
        <p className="text-sm text-muted">Video unavailable</p>
      </div>
    );
  }

  // §10: fall back to url silently; if both absent, show a text-only card, never a broken-image icon.
  // (Scheme safety for these URLs is enforced upstream in lib/nasa-client.ts,
  // the trust boundary where NASA's raw response is first parsed.)
  const src = apod.imageUrl ?? apod.hdImageUrl;
  if (!src) {
    return (
      <div className="flex aspect-16/10 w-full items-center justify-center bg-hero-bg text-hero-fg">
        <p className="text-sm text-muted">No image available for this date</p>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="flex aspect-16/10 w-full flex-col items-center justify-center gap-3 bg-hero-bg text-hero-fg">
        <p className="text-sm text-muted">Couldn&apos;t load the image</p>
        <button
          type="button"
          onClick={() => {
            setLoaded(false);
            setFailed(false);
            setRetryCount((n) => n + 1);
          }}
          className="cursor-pointer rounded-md bg-accent px-4 py-2 text-sm font-medium text-hero-bg transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-accent"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="relative aspect-16/10 w-full overflow-hidden bg-hero-bg">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-white/10" />
      )}
      <img
        key={retryCount}
        ref={(img) => {
          // A cached image can finish loading before/at hydration, firing
          // its `load` event before React attaches onLoad below — without
          // this, `loaded` would never flip true and the image would stay
          // invisible after a refresh.
          if (img?.complete) setLoaded(true);
        }}
        src={withCacheBust(src, retryCount)}
        alt={apod.title}
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
      {apod.hdImageUrl && apod.hdImageUrl !== apod.imageUrl && (
        <a
          href={apod.hdImageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-4 right-4 rounded-md bg-hero-bg/80 px-3 py-1.5 text-xs font-medium text-accent underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-accent"
        >
          View full resolution
        </a>
      )}
    </div>
  );
}
