import { describe, expect, it } from "vitest";
import { isValidDateKey, localDateKey, parseDecimal } from "./dates";

describe("localDateKey", () => {
  it("uses local getters, not UTC", () => {
    // 23:30 local time must stay on the same local day, regardless of UTC.
    const late = new Date(2026, 8, 21, 23, 30).getTime();
    expect(localDateKey(late)).toBe("2026-09-21");
  });

  it("pads month and day", () => {
    const d = new Date(2026, 0, 5).getTime();
    expect(localDateKey(d)).toBe("2026-01-05");
  });

  it("crosses a DST boundary correctly (Europe/Madrid, 2026-03-29)", () => {
    const beforeDst = new Date(2026, 2, 29, 1, 30).getTime();
    const afterDst = new Date(2026, 2, 29, 3, 30).getTime();
    expect(localDateKey(beforeDst)).toBe("2026-03-29");
    expect(localDateKey(afterDst)).toBe("2026-03-29");
  });
});

describe("isValidDateKey", () => {
  it("accepts a real date", () => {
    expect(isValidDateKey("2026-09-21")).toBe(true);
  });

  it("rejects a malformed string", () => {
    expect(isValidDateKey("2026-9-21")).toBe(false);
    expect(isValidDateKey("NaN-NaN-NaN")).toBe(false);
    expect(isValidDateKey("not-a-date")).toBe(false);
  });

  it("rejects a date that doesn't exist", () => {
    expect(isValidDateKey("2026-02-30")).toBe(false);
    expect(isValidDateKey("2026-13-01")).toBe(false);
  });
});

describe("parseDecimal", () => {
  it("accepts a Catalan-locale comma", () => {
    expect(parseDecimal("62,5")).toBe(62.5);
  });

  it("accepts a dot", () => {
    expect(parseDecimal("62.5")).toBe(62.5);
  });

  it("returns undefined for empty input (bodyweight exercise)", () => {
    expect(parseDecimal("")).toBeUndefined();
    expect(parseDecimal("   ")).toBeUndefined();
  });

  it("rejects garbage and negatives", () => {
    expect(parseDecimal("abc")).toBeUndefined();
    expect(parseDecimal("-3")).toBeUndefined();
  });

  it("accepts zero", () => {
    expect(parseDecimal("0")).toBe(0);
  });
});
