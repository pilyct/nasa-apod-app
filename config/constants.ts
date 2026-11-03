// NASA's current APOD API (no key needed). Replaces api.nasa.gov/planetary/apod,
// which NASA archives on 2026-12-01. One entry per date: `${base}/YYMMDD`.
export const NASA_APOD_BASE_URL = "https://science.nasa.gov/wp-json/wp/v2/apod-basic";

// The APOD archive starts on this date — anything earlier is invalid input.
export const ARCHIVE_START_DATE = "1995-06-16";

export const NASA_FETCH_TIMEOUT_MS = 8000;
