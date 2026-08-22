"use client";

import { useState } from "react";
import type { Apod } from "@/types/apod";

export function MediaFrame({ apod }: { apod: Apod }) {
  const [loaded, setLoaded] = useState(false);

  if (apod.mediaType === "video") {
    if (apod.videoFileUrl) {
      return (
        <div className="aspect-video w-full bg-hero-bg">
          <video
            src={apod.videoFileUrl}
            controls
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
            sandbox="allow-scripts allow-same-origin allow-presentation"
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
  const src = apod.imageUrl ?? apod.hdImageUrl;
  if (!src) {
    return (
      <div className="flex aspect-16/10 w-full items-center justify-center bg-hero-bg text-hero-fg">
        <p className="text-sm text-muted">No image available for this date</p>
      </div>
    );
  }

  return (
    <div className="relative aspect-16/10 w-full overflow-hidden bg-hero-bg">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-white/10" />
      )}
      <img
        src={src}
        alt={apod.title}
        onLoad={() => setLoaded(true)}
        className={`h-full w-full object-cover transition-opacity duration-200 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
      />
      {apod.hdImageUrl && (
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
