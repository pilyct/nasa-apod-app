<p align="center">
  <img src="app/favicon.ico" alt="Cosmica logo" width="64" height="64" />
  <h1>Cosmica — Astronomy Picture of the Day</h1>
</p>

**Live demo: [cosmica-apod-app.vercel.app](https://cosmica-apod-app.vercel.app/)**

A calm, editorial reader for [NASA's Astronomy Picture of the Day](https://apod.nasa.gov/apod/astropix.html) (APOD), built with Next.js. Instead of NASA's original page, Cosmica presents each day's image or video with a magazine-style layout, lets you browse the full archive back to 1995-06-16, and keeps the experience resilient when the network or the upstream API misbehaves.

## Features

- **Today's picture, front and center** — the home page server-renders the current day's APOD (image or video) with its title, explanation, and copyright.
- **Full archive browsing** — navigate any date back to the archive's start (1995-06-16) via `/[date]`, either through the prev/next arrows, the date picker, or arrow-key navigation.
- **Image and video support** — images render full-bleed with a link to the HD version; videos render as a YouTube/Vimeo embed or a native `<video>` tag when NASA self-hosts the file, with a strict host allowlist so no unexpected embed source ever gets injected.
- **Graceful degradation** — dedicated states for loading (skeleton), no APOD published for a date (empty state), upstream/network failures (retryable error card), and an offline banner that reacts live to the browser's connection status.
- **Smart caching** — today's entry revalidates every 15 minutes (it can still be corrected or published late); past dates are cached for a year since they're immutable once published.
- **Animated canvas cursor** — a subtle particle-trail cursor effect follows the pointer, tying the whole page together visually.

## Tech stack

- [Next.js 16](https://nextjs.org) (App Router, Turbopack) + React 19 + TypeScript
- [Tailwind CSS v4](https://tailwindcss.com) with a custom design-token theme (`app/globals.css`) layered on a [shadcn](https://ui.shadcn.com)-based setup
- [@base-ui/react](https://base-ui.com) for accessible, unstyled primitives (tooltips, etc.)
- [TanStack Query](https://tanstack.com/query) for client-side data fetching, caching, and retries
- [Zod](https://zod.dev) for runtime validation of NASA's API response, decoupling the app's own data shape from upstream changes

## Architecture

```
app/
  page.tsx            Today's APOD (server component)
  [date]/page.tsx      Archive route for any past date
  api/apod/route.ts    Internal API route — the only place the browser talks to
components/
  Hero.tsx             Page shell: header, date nav, loading/error/data states
  MediaFrame.tsx       Renders the image or video
  MetadataPanel.tsx    Title, date, explanation, copyright
  DateNav.tsx          Prev/next + date-picker navigation
  states/              Skeleton, ErrorCard, EmptyCard, OfflineBanner
hooks/
  useApod.ts           TanStack Query hook consumed by Hero
lib/
  nasa-client.ts       Server-only: the one function that calls api.nasa.gov
  date-range.ts        Date validation shared by the route and the pages
schemas/
  apod.ts              Zod schemas for NASA's raw response and our reshaped one
```

The browser never talks to NASA directly — `app/api/apod/route.ts` is the sole proxy, and `lib/nasa-client.ts` is the only module that reads the API key or calls `api.nasa.gov`. This keeps the key server-side and gives the app one place to normalize errors, caching, and NASA's response shape.

## Getting started

### Prerequisites

- Node.js 20+
- A free [NASA API key](https://api.nasa.gov/) (the `DEMO_KEY` works too, but is rate-limited)

### Setup

```bash
npm install
```

Create a `.env.local` file in the project root:

```
NASA_API_KEY=your_key_here
```

Then run the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Other scripts

```bash
npm run build   # production build
npm run start   # run the production build
npm run lint     # eslint
```
