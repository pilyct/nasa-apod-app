// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MediaFrame } from "@/components/MediaFrame";
import type { Apod } from "@/types/apod";

const baseImageApod: Apod = {
  title: "Test image",
  date: "2024-01-01",
  explanation: "E",
  mediaType: "image",
  imageUrl: "https://example.com/a.jpg",
};

describe("MediaFrame", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("reveals an already-cached image immediately, without waiting for onLoad", () => {
    // jsdom's <img> reports complete: false by default and never fires
    // "load" — this stands in for a browser-cache hit where the load event
    // fires before/at hydration, before React's onLoad handler is attached.
    Object.defineProperty(window.HTMLImageElement.prototype, "complete", {
      configurable: true,
      get: () => true,
    });

    render(<MediaFrame apod={baseImageApod} />);

    const img = screen.getByAltText("Test image");
    expect(img.className).toContain("opacity-100");
  });

  it("stays hidden until onLoad fires for a non-cached image", () => {
    Object.defineProperty(window.HTMLImageElement.prototype, "complete", {
      configurable: true,
      get: () => false,
    });

    render(<MediaFrame apod={baseImageApod} />);
    const img = screen.getByAltText("Test image");
    expect(img.className).toContain("opacity-0");

    fireEvent.load(img);
    expect(img.className).toContain("opacity-100");
  });

  it("shows a retry button after the image errors, and resets on retry", () => {
    Object.defineProperty(window.HTMLImageElement.prototype, "complete", {
      configurable: true,
      get: () => false,
    });

    render(<MediaFrame apod={baseImageApod} />);
    fireEvent.error(screen.getByAltText("Test image"));

    expect(screen.getByText("Couldn't load the image")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(screen.getByAltText("Test image")).toBeInTheDocument();
  });

  it("shows a text-only card when no image url is available", () => {
    render(
      <MediaFrame apod={{ ...baseImageApod, imageUrl: undefined, hdImageUrl: undefined }} />,
    );

    expect(screen.getByText("No image available for this date")).toBeInTheDocument();
  });

  it("renders a video iframe for an allowed embed url", () => {
    render(
      <MediaFrame
        apod={{
          ...baseImageApod,
          mediaType: "video",
          videoEmbedUrl: "https://www.youtube.com/embed/abc",
        }}
      />,
    );

    expect(screen.getByTitle("Test image")).toBeInTheDocument();
  });
});
