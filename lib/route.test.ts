import { describe, expect, it } from "vitest";
import { buildHash, parseHash } from "./route";

describe("parseHash", () => {
  it("defaults to avui for an empty hash", () => {
    expect(parseHash("")).toEqual({ view: "avui" });
    expect(parseHash("#")).toEqual({ view: "avui" });
  });

  it("parses a plain view", () => {
    expect(parseHash("#historial")).toEqual({ view: "historial" });
  });

  it("parses sessio with a date", () => {
    expect(parseHash("#sessio?d=2026-09-21")).toEqual({ view: "sessio", date: "2026-09-21" });
  });

  it("falls back to avui for an unknown view", () => {
    expect(parseHash("#nonsense")).toEqual({ view: "avui" });
  });
});

describe("buildHash", () => {
  it("round-trips", () => {
    expect(parseHash(buildHash({ view: "historial" }))).toEqual({ view: "historial" });
    expect(parseHash(buildHash({ view: "sessio", date: "2026-09-21" }))).toEqual({
      view: "sessio",
      date: "2026-09-21",
    });
  });
});
