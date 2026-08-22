import "server-only";
import type { Apod } from "@/types/apod";

// Static fixtures used when MOCK_APOD=true, so local development can exercise
// the full UI (image + video code paths) without hitting api.nasa.gov or
// consuming its rate-limited quota.
const FIXTURES: Array<Omit<Apod, "date">> = [
  {
    title: "Mock: Whirlpool Galaxy",
    explanation:
      "A mock APOD image entry served locally because MOCK_APOD=true, standing in for a real NASA response so the UI can be exercised without a network call.",
    mediaType: "image",
    imageUrl:
      "https://apod.nasa.gov/apod/image/2306/M51LRGBHaOIII-Blanchard1024.jpg",
    hdImageUrl: "https://apod.nasa.gov/apod/image/2306/M51LRGBHaOIII-Blanchard.jpg",
    copyright: "Mock Copyright Holder",
  },
  {
    title: "Mock: A Colorful Solar Eruption",
    explanation:
      "A second mock image fixture so browsing between dates in mock mode shows visible variety instead of the same picture every time.",
    mediaType: "image",
    imageUrl: "https://apod.nasa.gov/apod/image/2310/GC_2000LY_JamesMcArthur1024.jpg",
  },
  {
    title: "Mock: A Sample Video Entry",
    explanation:
      "A mock video entry (YouTube embed) so the video code path in MediaFrame can be exercised in mock mode too.",
    mediaType: "video",
    videoEmbedUrl: "https://www.youtube.com/embed/M7lc1UVf-VE",
  },
];

function hashDate(date: string): number {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash << 5) - hash + date.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Deterministic per date — refreshing the same date keeps showing the same
// fixture, while different dates cycle through the set.
export function getMockApod(date: string): Apod {
  const fixture = FIXTURES[hashDate(date) % FIXTURES.length];
  return { ...fixture, date };
}
