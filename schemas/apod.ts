import { z } from "zod";

// Mirrors NASA's raw response shape. Every field NASA might omit is optional here —
// we decide how to degrade (fallback / omit) in nasa-client.ts, not in the UI.
export const nasaApodResponseSchema = z.object({
  title: z.string(),
  date: z.string(),
  explanation: z.string(),
  url: z.string().url().optional(),
  hdurl: z.string().url().optional(),
  media_type: z.enum(["image", "video"]),
  copyright: z.string().optional(),
  service_version: z.string().optional(),
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
