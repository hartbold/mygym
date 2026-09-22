import { describe, expect, it } from "vitest";
import {
  durationParts,
  formatDayLabel,
  formatDayMonth,
  formatMonthYear,
  formatNumber,
  formatWeekday,
  formatWeekdayShort,
  formatWeight,
} from "./format";

describe("format", () => {
  it("formata pesos i xifres amb la coma catalana", () => {
    expect(formatWeight(60.5)).toBe("60,5 kg");
    expect(formatNumber(2700)).toBe("2.700");
    expect(formatNumber(42.5)).toBe("42,5");
  });

  it("formata dates a partir d'una clau local", () => {
    expect(formatDayLabel("2026-09-20")).toBe("Diumenge, 20 de setembre");
    expect(formatWeekday("2026-09-20")).toBe("Diumenge");
    expect(formatWeekdayShort("2026-09-20")).toBe("dg");
    expect(formatDayMonth("2026-09-20")).toBe("20 de setembre");
    expect(formatMonthYear("2026-09-20")).toBe("Setembre del 2026");
  });

  it("parteix durades en valor i unitat", () => {
    expect(durationParts(37 * 60_000)).toEqual({ value: "37", unit: "min" });
    expect(durationParts(65 * 60_000)).toEqual({ value: "1:05", unit: "h" });
    expect(durationParts(45_000)).toEqual({ value: "45", unit: "s" });
    expect(durationParts(-5)).toEqual({ value: "0", unit: "s" });
  });
});
