import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchApod, ApodUpstreamError } from "@/lib/nasa-client";

describe("fetchApod (MOCK_APOD=true)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns a fixture without making a network call", async () => {
    vi.stubEnv("MOCK_APOD", "true");
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const apod = await fetchApod("2024-01-01", 60);

    expect(apod.date).toBe("2024-01-01");
    expect(apod.title).toBeTruthy();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("is deterministic for the same date", async () => {
    vi.stubEnv("MOCK_APOD", "true");

    const first = await fetchApod("2024-05-05", 60);
    const second = await fetchApod("2024-05-05", 60);

    expect(first).toEqual(second);
  });
});

// Exercises the sanitization this codebase relies on to stop an unexpected
// (or malicious) upstream NASA response from reaching the UI as-is — this is
// the one place raw NASA JSON is first parsed, so a regression here would
// silently remove the app's only XSS/host-allowlist boundary.
describe("fetchApod URL/host sanitization (real network path)", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function stubFetchOnce(body: unknown) {
    vi.stubEnv("NASA_API_KEY", "test-key");
    vi.stubEnv("MOCK_APOD", "false");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );
  }

  const baseImage = {
    title: "T",
    date: "2024-01-01",
    explanation: "E",
    media_type: "image" as const,
  };

  it("drops a javascript: image url instead of passing it through", async () => {
    stubFetchOnce({ ...baseImage, url: "javascript:alert(1)" });

    const apod = await fetchApod("2024-01-01", 60);

    expect(apod.imageUrl).toBeUndefined();
  });

  it("keeps a plain https image url", async () => {
    stubFetchOnce({ ...baseImage, url: "https://example.com/a.jpg" });

    const apod = await fetchApod("2024-01-01", 60);

    expect(apod.imageUrl).toBe("https://example.com/a.jpg");
  });

  it("falls back hdImageUrl to url when hdurl is unsafe", async () => {
    stubFetchOnce({
      ...baseImage,
      url: "https://example.com/a.jpg",
      hdurl: "javascript:alert(1)",
    });

    const apod = await fetchApod("2024-01-01", 60);

    expect(apod.hdImageUrl).toBeUndefined();
  });

  it("allows a youtube embed host", async () => {
    stubFetchOnce({
      ...baseImage,
      media_type: "video",
      url: "https://www.youtube.com/embed/abc123",
    });

    const apod = await fetchApod("2024-01-01", 60);

    expect(apod.videoEmbedUrl).toBe("https://www.youtube.com/embed/abc123");
    expect(apod.videoFileUrl).toBeUndefined();
  });

  it("rejects a non-allowlisted video embed host", async () => {
    stubFetchOnce({
      ...baseImage,
      media_type: "video",
      url: "https://evil.example.com/embed/abc123",
    });

    const apod = await fetchApod("2024-01-01", 60);

    expect(apod.videoEmbedUrl).toBeUndefined();
    expect(apod.videoFileUrl).toBeUndefined();
  });

  it("allows an apod.nasa.gov self-hosted video file", async () => {
    stubFetchOnce({
      ...baseImage,
      media_type: "video",
      url: "https://apod.nasa.gov/apod/video/2401/sample.mp4",
    });

    const apod = await fetchApod("2024-01-01", 60);

    expect(apod.videoFileUrl).toBe("https://apod.nasa.gov/apod/video/2401/sample.mp4");
  });

  it("rejects a video file url on a disallowed host even with an allowed extension", async () => {
    stubFetchOnce({
      ...baseImage,
      media_type: "video",
      url: "https://evil.example.com/sample.mp4",
    });

    const apod = await fetchApod("2024-01-01", 60);

    expect(apod.videoFileUrl).toBeUndefined();
    expect(apod.videoEmbedUrl).toBeUndefined();
  });
});

// Since APOD moved to science.nasa.gov, api.nasa.gov has returned
// schema-valid placeholder data (title "NASA Science", the site logo as the
// image) instead of the real entry. These must surface as upstream errors so
// they are never shown or cached as a genuine picture.
describe("fetchApod placeholder detection", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function stubFetchOnce(body: unknown) {
    vi.stubEnv("NASA_API_KEY", "test-key");
    vi.stubEnv("MOCK_APOD", "false");
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify(body), { status: 200 }),
    );
  }

  const logoUrl =
    "https://science.nasa.gov/wp-content/themes/nasa-child/assets/images/nasa-logo@2x.png";

  it("rejects the placeholder payload NASA actually returned for 2010-01-01", async () => {
    stubFetchOnce({
      copyright: "Stefano De Rosa",
      date: "2010-01-01",
      explanation: "Discover the cosmos! Each day a different image or photograph of our fascinating universe is featured.",
      hdurl: logoUrl,
      media_type: "image",
      service_version: "v1",
      title: "NASA Science",
      url: logoUrl,
    });

    await expect(fetchApod("2010-01-01", 60)).rejects.toBeInstanceOf(ApodUpstreamError);
  });

  it("rejects the NASA logo as the image even with a real-looking title", async () => {
    stubFetchOnce({
      title: "Zarmina's World",
      date: "2010-10-01",
      explanation: "E",
      media_type: "image",
      url: logoUrl,
    });

    await expect(fetchApod("2010-10-01", 60)).rejects.toBeInstanceOf(ApodUpstreamError);
  });

  it("rejects the placeholder title even when the image looks real", async () => {
    stubFetchOnce({
      title: " NASA Science ",
      date: "2026-11-02",
      explanation: "E",
      media_type: "image",
      url: "https://apod.nasa.gov/apod/image/2611/CometMeteor.jpg",
    });

    await expect(fetchApod("2026-11-02", 60)).rejects.toBeInstanceOf(ApodUpstreamError);
  });

  it("still accepts a genuine entry whose title mentions NASA", async () => {
    stubFetchOnce({
      title: "NASA Science Balloon over Antarctica",
      date: "2024-01-01",
      explanation: "E",
      media_type: "image",
      url: "https://apod.nasa.gov/apod/image/2401/balloon.jpg",
    });

    const apod = await fetchApod("2024-01-01", 60);

    expect(apod.title).toBe("NASA Science Balloon over Antarctica");
    expect(apod.imageUrl).toBe("https://apod.nasa.gov/apod/image/2401/balloon.jpg");
  });
});
