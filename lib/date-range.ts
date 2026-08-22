import { ARCHIVE_START_DATE } from "@/config/constants";

const DATE_FORMAT = /^\d{4}-\d{2}-\d{2}$/;

export function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

// Returns the validated date, or null if it's malformed / outside the valid archive window.
// This is the single gate that decides what's allowed to reach the outbound NASA fetch.
export function validateApodDate(date: string): string | null {
  if (!DATE_FORMAT.test(date)) return null;

  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;

  const today = todayIsoDate();
  if (date < ARCHIVE_START_DATE || date > today) return null;

  return date;
}
