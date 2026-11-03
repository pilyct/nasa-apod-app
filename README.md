<p align="center">
  <img src="app/favicon.ico" alt="Cosmica logo" width="64" height="64" />
  <h1>Cosmica — Astronomy Picture of the Day</h1>
</p>

**Live demo: [cosmica-apod-app.vercel.app](https://cosmica-apod-app.vercel.app/)**

A calm, editorial reader for [NASA's Astronomy Picture of the Day](https://science.nasa.gov/apod/) (APOD), built with Next.js. Instead of NASA's original page, Cosmica presents each day's image or video with a magazine-style layout, lets you browse the full archive back to 1995-06-16, and keeps the experience resilient when the network or the upstream API misbehaves.

## Features

- **Today's picture, front and center** — the home page renders the current day's APOD (image or video) with its title, explanation, and credit.
- **Full archive browsing** — navigate any date back to the archive's start (1995-06-16) via `/[date]`, either through the prev/next arrows, the date picker, or arrow-key navigation.
- **Image and video support** — images render full-bleed with a link to the HD version; videos render as a YouTube/Vimeo embed or a native `<video>` tag when NASA self-hosts the file, with a strict host allowlist so no unexpected embed source ever gets injected.
- **Graceful degradation** — dedicated states for loading (skeleton), no APOD published for a date (empty state), upstream/network failures (retryable error card), and an offline banner that reacts live to the browser's connection status.
- **Smart caching** — today's entry revalidates every 15 minutes (it can still be corrected or published late); past dates are cached for a week (they rarely change, but the cap limits how long a bad upstream response can survive). When NASA returns its generic artwork (site logo or "news thumbnail") instead of the real picture, the response is treated as an upstream error so it is never cached. The home page is fully static; archive pages are rendered on first visit and cached per date afterward.
- **Optimized media** — images go through `next/image` (responsive `srcset`, lazy loading, automatic resizing) instead of a plain `<img>`.
- **Animated canvas cursor + starfield background** — a subtle particle-trail cursor effect and a slowly-drifting parallax starfield tie the whole page together visually, both pausing automatically when the tab isn't visible.
- **Locked-down by default** — a strict Content-Security-Policy and other security headers (`X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) are set on every response (`next.config.ts`).

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) with a custom design-token theme (`app/globals.css`) layered on a [shadcn](https://ui.shadcn.com)-based setup
- [@base-ui/react](https://base-ui.com) for accessible, unstyled primitives (tooltips, etc.)
- [TanStack Query](https://tanstack.com/query) for client-side data fetching, caching, and retries
- [Zod](https://zod.dev) for runtime validation of NASA's API response, decoupling the app's own data shape from upstream changes
- [Vitest](https://vitest.dev) + [React Testing Library](https://testing-library.com/react) for unit and component tests

## Architecture

```
app/
  page.tsx                Today's APOD (statically prerendered)
  [date]/page.tsx         Archive route for any past date (rendered on
                          first visit, then cached per date)
  api/apod/route.ts       Internal API route — the only place the browser talks to
  layout.tsx              Root layout: fonts, background/cursor effects, security headers
components/
  Hero.tsx                Page shell: header, date nav, loading/error/data states
  MediaFrame.tsx          Renders the image or video (next/image under the hood)
  MetadataPanel.tsx       Title, date, explanation, credit
  DateNav.tsx             Prev/next + date-picker navigation
  states/                 Skeleton, ErrorCard, EmptyCard, OfflineBanner
hooks/
  useApod.ts              TanStack Query hook consumed by Hero
lib/
  nasa-client.ts          Server-only: the one function that calls NASA's APOD API
  apod-html.ts            Cleans NASA's HTML fields and finds the day's media in the page
  fetch-apod-guarded.ts   Shared SSR fetch + error-swallow logic for the two pages above
  date-range.ts           Date validation shared by the route and the pages
  rate-limit.ts           Upstash-backed sliding-window limiter used by the API route
schemas/
  apod.ts                 Zod schemas for NASA's raw response and our reshaped one
```

The browser never talks to NASA directly — `app/api/apod/route.ts` is the sole proxy, and `lib/nasa-client.ts` is the only module that calls NASA's APOD API. This gives the app one place to normalize errors, caching, and NASA's response shape.

### NASA's APOD API

Data comes from NASA's current APOD API, `https://science.nasa.gov/wp-json/wp/v2/apod-basic/YYMMDD`, which needs no API key. It replaced `api.nasa.gov/planetary/apod`, which NASA archives on December 1, 2026. Two quirks shape `lib/nasa-client.ts`:

- **Text fields are HTML.** `explanation`, `credit` and `copyright` contain links and labels ("Explanation:", "Image Credit & Copyright:", "Tomorrow's picture: ..."). `lib/apod-html.ts` turns them into plain text.
- **The URL fields don't reliably point at the picture.** `url` is the article page, and for videos and many older entries `hdurl` is a generic NASA thumbnail. The real image, YouTube embed or video file is read from the first `<center>` block of `basic_html` (the classic APOD page), then checked against the same scheme and host allowlists as before.

Server-rendered pages (`app/page.tsx`, `app/[date]/page.tsx`) call `fetchApod` directly rather than going through `/api/apod` — they're not IP-rate-limited themselves, since Next's fetch cache already dedupes identical-date requests to NASA within the revalidate window. Only the client-facing `/api/apod` route (used by `useApod` for refetches) enforces the per-IP limit below.

## Rate limiting

`/api/apod` is rate limited to 30 requests/minute per IP via a sliding-window limiter (`lib/rate-limit.ts`) backed by Upstash Redis, so scripted traffic can't run up serverless usage or hammer NASA's API through the app. The limit is enforced in shared Redis rather than in-memory, so it holds correctly across serverless instances. `scripts/verify-shared-rate-limit.mjs` is a manual diagnostic that proves this: it simulates two independent serverless instances and confirms the limit is enforced on their *combined* traffic. Run it with:

```bash
node --env-file=.env.local scripts/verify-shared-rate-limit.mjs
```

## Getting started

### Prerequisites

- Node.js 20+

### Setup

```bash
npm install
```

No API key is needed. `UPSTASH_REDIS_REST_URL`/`UPSTASH_REDIS_REST_TOKEN` (in `.env.local`) are optional — without them, rate limiting just logs a warning and bypasses instead of failing (see [Rate limiting](#rate-limiting)).

Then run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Mock mode

To work on the UI without Upstash credentials or any network call at all:

```bash
npm run dev:mock
```

This sets `MOCK_APOD=true`, which makes `lib/nasa-client.ts` return deterministic fixture data from `lib/apod-fixtures.ts` (covering both the image and video code paths, using a small local SVG placeholder instead of a real photo) instead of calling NASA. Useful for UI work — like the cursor/background effects — where the actual picture doesn't matter.

### Testing

```bash
npm run test        # run the full suite once (vitest)
npm run test:watch  # watch mode
```

Covers date validation edge cases, the URL/host sanitization that's the app's main XSS boundary (`lib/nasa-client.ts`), client-IP resolution, the API route's status-code branching, and UI state (loading/error/offline) via React Testing Library.

### CI

Every push to `main` and every pull request runs lint, a type check, the test suite, and a production build (`.github/workflows/ci.yml`). The build step sets `MOCK_APOD=true` since the home page is statically prerendered and would otherwise need live NASA API access during the build.

### Other scripts

```bash
npm run build   # production build
npm run start   # run the production build
npm run lint    # eslint
```
