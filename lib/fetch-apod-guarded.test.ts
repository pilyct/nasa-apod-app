import { describe, expect, it, vi, beforeEach } from "vitest";

const { isApodRateLimitedMock } = vi.hoisted(() => ({
  isApodRateLimitedMock: vi.fn(),
}));
vi.mock("@/lib/rate-limit-guard", () => ({
  isApodRateLimited: isApodRateLimitedMock,
}));

const { fetchApodMock } = vi.hoisted(() => ({ fetchApodMock: vi.fn() }));
vi.mock("@/lib/nasa-client", () => ({ fetchApod: fetchApodMock }));

import { fetchApodGuarded } from "@/lib/fetch-apod-guarded";

describe("fetchApodGuarded", () => {
  beforeEach(() => {
    isApodRateLimitedMock.mockReset();
    fetchApodMock.mockReset();
  });

  it("skips the NASA fetch entirely when rate limited", async () => {
    isApodRateLimitedMock.mockResolvedValue(true);

    const result = await fetchApodGuarded("2024-01-01", 60);

    expect(result).toEqual({ rateLimited: true });
    expect(fetchApodMock).not.toHaveBeenCalled();
  });

  it("returns data and a fetchedAt timestamp on success", async () => {
    isApodRateLimitedMock.mockResolvedValue(false);
    const apod = { title: "T", date: "2024-01-01", explanation: "E", mediaType: "image" as const };
    fetchApodMock.mockResolvedValue(apod);

    const before = Date.now();
    const result = await fetchApodGuarded("2024-01-01", 60);
    const after = Date.now();

    expect(result.rateLimited).toBe(false);
    expect(result.data).toEqual(apod);
    expect(result.fetchedAt).toBeGreaterThanOrEqual(before);
    expect(result.fetchedAt).toBeLessThanOrEqual(after);
  });

  it("swallows an upstream fetch failure and reports rateLimited: false with no data", async () => {
    isApodRateLimitedMock.mockResolvedValue(false);
    fetchApodMock.mockRejectedValue(new Error("upstream down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await fetchApodGuarded("2024-01-01", 60);

    expect(result).toEqual({ rateLimited: false, data: undefined, fetchedAt: undefined });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
