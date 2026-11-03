import { z } from "zod";

// Mirrors the raw response of NASA's APOD API
// (science.nasa.gov/wp-json/wp/v2/apod-basic/YYMMDD). Every field NASA might
// omit is optional here — we decide how to degrade (fallback / omit) in
// nasa-client.ts, not in the UI. Text fields contain HTML, and the URL fields
// are plain strings because the HTML can hold protocol-relative URLs; both
// are cleaned and checked in nasa-client.ts.
export const nasaApodResponseSchema = z.object({
  title: z.string(),
  date: z.string(),
  explanation: z.string(),
  media_type: z.string().transform((type) => (type === "video" ? "video" : "image")),
  url: z.string().optional(),
  hdurl: z.string().optional(),
  credit: z.string().optional(),
  copyright: z.string().optional(),
  basic_html: z.string().optional(),
});

export type NasaApodResponse = z.infer<typeof nasaApodResponseSchema>;

// Our own re-shaped response — this is what /api/apod actually returns to the browser.
// Never the raw NASA payload: this is what stops upstream shape-changes from leaking through.
export const apodSchema = z.object({
  title: z.string(),
  date: z.string(),
  explanation: z.string(),
  mediaType: z.enum(["image", "video"]),
  imageUrl: z.string().url().optional(),
  hdImageUrl: z.string().url().optional(),
  videoEmbedUrl: z.string().url().optional(),
  videoFileUrl: z.string().url().optional(),
  copyright: z.string().optional(),
});

export type Apod = z.infer<typeof apodSchema>;
