import { describe, expect, it, vi, afterEach } from "vitest";
import { fetchApod } from "@/lib/nasa-client";

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
