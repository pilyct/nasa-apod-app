import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { limitMock } = vi.hoisted(() => ({ limitMock: vi.fn() }));

vi.mock("@/lib/rate-limit", () => ({
  apodRateLimit: { limit: limitMock },
}));

const { fetchApodMock } = vi.hoisted(() => ({ fetchApodMock: vi.fn() }));

vi.mock("@/lib/nasa-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/nasa-client")>(
    "@/lib/nasa-client",
  );
  return { ...actual, fetchApod: fetchApodMock };
});

import { GET } from "@/app/api/apod/route";
import { ApodNotFoundError } from "@/lib/nasa-client";

function makeRequest(url: string) {
  return new NextRequest(new Request(url));
}

describe("GET /api/apod", () => {
  beforeEach(() => {
    limitMock.mockReset();
    fetchApodMock.mockReset();
    limitMock.mockResolvedValue({
      success: true,
      limit: 30,
      remaining: 29,
      reset: Date.now() + 60_000,
    });
  });

  it("returns 429 with Retry-After when rate limited", async () => {
    limitMock.mockResolvedValue({
      success: false,
      limit: 30,
      remaining: 0,
      reset: Date.now() + 15_000,
    });

    const res = await GET(makeRequest("http://localhost/api/apod?date=2024-01-01"));

    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBeTruthy();
    expect(fetchApodMock).not.toHaveBeenCalled();
  });

  it("returns 400 for an invalid date without touching the rate-limited NASA client", async () => {
    const res = await GET(makeRequest("http://localhost/api/apod?date=not-a-date"));

    expect(res.status).toBe(400);
    expect(fetchApodMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the NASA client reports no APOD for the date", async () => {
    fetchApodMock.mockRejectedValue(new ApodNotFoundError("nope"));

    const res = await GET(makeRequest("http://localhost/api/apod?date=2024-01-01"));

    expect(res.status).toBe(404);
  });

  it("returns 200 with the APOD payload on success", async () => {
    const apod = {
      title: "Test",
      date: "2024-01-01",
      explanation: "...",
      mediaType: "image" as const,
      imageUrl: "https://example.com/img.jpg",
    };
    fetchApodMock.mockResolvedValue(apod);

    const res = await GET(makeRequest("http://localhost/api/apod?date=2024-01-01"));

    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual(apod);
  });
});
