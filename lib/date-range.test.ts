import { describe, expect, it } from "vitest";
import { validateApodDate, todayIsoDate } from "@/lib/date-range";
import { ARCHIVE_START_DATE } from "@/config/constants";

describe("validateApodDate", () => {
  it("accepts the archive start date", () => {
    expect(validateApodDate(ARCHIVE_START_DATE)).toBe(ARCHIVE_START_DATE);
  });

  it("accepts today", () => {
    const today = todayIsoDate();
    expect(validateApodDate(today)).toBe(today);
  });

  it("rejects a date before the archive start", () => {
    expect(validateApodDate("1995-06-15")).toBeNull();
  });

  it("rejects a date in the future", () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 1);
    expect(validateApodDate(future.toISOString().slice(0, 10))).toBeNull();
  });

  it("rejects malformed input", () => {
    expect(validateApodDate("not-a-date")).toBeNull();
    expect(validateApodDate("2024-13-40")).toBeNull();
    expect(validateApodDate("")).toBeNull();
    expect(validateApodDate("2024/01/01")).toBeNull();
  });
});
