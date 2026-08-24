import { describe, expect, it, vi, afterEach } from "vitest";
import { getClientIp } from "@/lib/get-client-ip";

function headersFrom(values: Record<string, string>) {
  return { get: (name: string) => values[name.toLowerCase()] ?? null };
}

describe("getClientIp", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("falls back to 'unknown' when no relevant header is present", () => {
    expect(getClientIp(headersFrom({}))).toBe("unknown");
  });

  it("uses x-real-ip when x-forwarded-for is absent", () => {
    expect(getClientIp(headersFrom({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("uses the first entry of x-forwarded-for, trimmed", () => {
    expect(
      getClientIp(headersFrom({ "x-forwarded-for": " 1.2.3.4 , 5.6.7.8" })),
    ).toBe("1.2.3.4");
  });

  it("prefers x-forwarded-for over x-real-ip off Vercel", () => {
    expect(
      getClientIp(
        headersFrom({ "x-forwarded-for": "1.2.3.4", "x-real-ip": "9.9.9.9" }),
      ),
    ).toBe("1.2.3.4");
  });

  it("ignores x-vercel-forwarded-for when not running on Vercel", () => {
    expect(
      getClientIp(
        headersFrom({
          "x-vercel-forwarded-for": "attacker-controlled",
          "x-forwarded-for": "1.2.3.4",
        }),
      ),
    ).toBe("1.2.3.4");
  });

  it("prefers x-vercel-forwarded-for over x-forwarded-for when on Vercel", () => {
    vi.stubEnv("VERCEL", "1");

    expect(
      getClientIp(
        headersFrom({
          "x-vercel-forwarded-for": "1.1.1.1",
          "x-forwarded-for": "2.2.2.2",
        }),
      ),
    ).toBe("1.1.1.1");
  });

  it("falls back to x-forwarded-for on Vercel when its own header is absent", () => {
    vi.stubEnv("VERCEL", "1");

    expect(
      getClientIp(headersFrom({ "x-forwarded-for": "2.2.2.2" })),
    ).toBe("2.2.2.2");
  });
});
