// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach } from "vitest";
import { renderHook, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useApod, ApodFetchError } from "@/hooks/useApod";

function wrapper({ children }: { children: ReactNode }) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return Promise.resolve(new Response(JSON.stringify(body), init));
}

describe("useApod", () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("does not retry a 404 (permanent, no APOD for the date)", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementation(() =>
        jsonResponse({ error: "No picture published for this date" }, { status: 404 }),
      );

    const { result } = renderHook(() => useApod("1999-01-01"), { wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toBeInstanceOf(ApodFetchError);
    expect((result.current.error as ApodFetchError).status).toBe(404);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("retries a 429 (transient rate limit)", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockImplementationOnce(() =>
        jsonResponse(
          { error: "Too many requests" },
          { status: 429, headers: { "Retry-After": "0" } },
        ),
      )
      .mockImplementationOnce(() =>
        jsonResponse({
          title: "T",
          date: "1999-01-01",
          explanation: "E",
          mediaType: "image",
        }),
      );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: (count: number) => count < 1 } },
    });
    const { result } = renderHook(() => useApod("1999-01-01"), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      ),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true), { timeout: 3000 });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("resolves with the parsed APOD payload on success", async () => {
    const apod = {
      title: "T",
      date: "1999-01-01",
      explanation: "E",
      mediaType: "image" as const,
      imageUrl: "https://example.com/a.jpg",
    };
    vi.spyOn(globalThis, "fetch").mockImplementation(() => jsonResponse(apod));

    const { result } = renderHook(() => useApod("1999-01-01"), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(apod);
  });
});
