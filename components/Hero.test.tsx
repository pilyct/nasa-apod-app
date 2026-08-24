// @vitest-environment jsdom
import { describe, expect, it, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { Hero } from "@/components/Hero";
import type { Apod } from "@/types/apod";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

const { useApodMock } = vi.hoisted(() => ({ useApodMock: vi.fn() }));
vi.mock("@/hooks/useApod", async () => {
  const actual = await vi.importActual<typeof import("@/hooks/useApod")>("@/hooks/useApod");
  return { ...actual, useApod: useApodMock };
});

const apod: Apod = {
  title: "A Nice Nebula",
  date: "2024-01-01",
  explanation: "E",
  mediaType: "image",
  imageUrl: "https://example.com/a.jpg",
};

function setOnLine(value: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    value,
  });
}

describe("Hero", () => {
  beforeEach(() => {
    useApodMock.mockReset();
    setOnLine(true);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("shows the offline banner when the client is offline on mount", () => {
    setOnLine(false);
    useApodMock.mockReturnValue({ data: apod, error: null, isLoading: false, refetch: vi.fn() });

    render(<Hero date="2024-01-01" initialData={apod} />);

    expect(screen.getByText(/You're offline/)).toBeInTheDocument();
  });

  it("does not show the offline banner while online", () => {
    useApodMock.mockReturnValue({ data: apod, error: null, isLoading: false, refetch: vi.fn() });

    render(<Hero date="2024-01-01" initialData={apod} />);

    expect(screen.queryByText(/You're offline/)).not.toBeInTheDocument();
  });

  it("reacts to online/offline events after mount", () => {
    useApodMock.mockReturnValue({ data: apod, error: null, isLoading: false, refetch: vi.fn() });

    render(<Hero date="2024-01-01" initialData={apod} />);
    expect(screen.queryByText(/You're offline/)).not.toBeInTheDocument();

    // A real browser updates navigator.onLine before dispatching the event —
    // jsdom doesn't link the two, so the test does it explicitly.
    setOnLine(false);
    fireEvent(window, new Event("offline"));
    expect(screen.getByText(/You're offline/)).toBeInTheDocument();

    setOnLine(true);
    fireEvent(window, new Event("online"));
    expect(screen.queryByText(/You're offline/)).not.toBeInTheDocument();
  });

  it("shows the rate-limited error card instead of firing a query when SSR was rate limited with no cached data", () => {
    useApodMock.mockReturnValue({ data: undefined, error: null, isLoading: false, refetch: vi.fn() });

    render(<Hero date="2024-01-01" rateLimited />);

    expect(screen.getByText("Too many requests — try again shortly")).toBeInTheDocument();
    expect(useApodMock).toHaveBeenCalledWith(
      "2024-01-01",
      undefined,
      expect.objectContaining({ enabled: false }),
    );
  });

  it("still queries when SSR was rate limited but cached initialData exists", () => {
    useApodMock.mockReturnValue({ data: apod, error: null, isLoading: false, refetch: vi.fn() });

    render(<Hero date="2024-01-01" initialData={apod} rateLimited />);

    expect(useApodMock).toHaveBeenCalledWith(
      "2024-01-01",
      apod,
      expect.objectContaining({ enabled: true }),
    );
  });

  it("renders the media and metadata once data is available", () => {
    useApodMock.mockReturnValue({ data: apod, error: null, isLoading: false, refetch: vi.fn() });

    render(<Hero date="2024-01-01" initialData={apod} />);

    expect(screen.getByText("A Nice Nebula")).toBeInTheDocument();
    expect(screen.getByAltText("A Nice Nebula")).toBeInTheDocument();
  });
});
