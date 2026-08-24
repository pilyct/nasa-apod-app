import { describe, expect, it, vi, beforeEach } from "vitest";

const { fetchApodMock } = vi.hoisted(() => ({ fetchApodMock: vi.fn() }));
vi.mock("@/lib/nasa-client", () => ({ fetchApod: fetchApodMock }));

import { fetchApodGuarded } from "@/lib/fetch-apod-guarded";

describe("fetchApodGuarded", () => {
  beforeEach(() => {
    fetchApodMock.mockReset();
  });

  it("returns data and a fetchedAt timestamp on success", async () => {
    const apod = { title: "T", date: "2024-01-01", explanation: "E", mediaType: "image" as const };
    fetchApodMock.mockResolvedValue(apod);

    const before = Date.now();
    const result = await fetchApodGuarded("2024-01-01", 60);
    const after = Date.now();

    expect(result.data).toEqual(apod);
    expect(result.fetchedAt).toBeGreaterThanOrEqual(before);
    expect(result.fetchedAt).toBeLessThanOrEqual(after);
  });

  it("swallows an upstream fetch failure and returns no data", async () => {
    fetchApodMock.mockRejectedValue(new Error("upstream down"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const result = await fetchApodGuarded("2024-01-01", 60);

    expect(result).toEqual({ data: undefined, fetchedAt: undefined });
    expect(consoleErrorSpy).toHaveBeenCalled();
  });
});
