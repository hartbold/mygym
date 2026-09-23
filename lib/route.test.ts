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

describe("progrés i exercici", () => {
  it("fa l'anada i tornada del detall d'un exercici, amb accents i espais", () => {
    const route = { view: "exercici" as const, exercise: { name: "Fons en paral·leles", kind: "reps" as const } };
    expect(parseHash(buildHash(route))).toEqual(route);
    expect(parseHash("#progres")).toEqual({ view: "progres" });
  });

  it("un detall sense nom o amb un tipus desconegut torna a Progrés", () => {
    expect(parseHash("#exercici")).toEqual({ view: "progres" });
    expect(parseHash("#exercici?n=Planxa&k=x")).toEqual({ view: "progres" });
  });
});

describe("plantilla", () => {
  it("fa l'anada i tornada de l'editor i sense id torna a Ajustos", () => {
    expect(parseHash(buildHash({ view: "plantilla", templateId: "abc-123" }))).toEqual({
      view: "plantilla",
      templateId: "abc-123",
    });
    expect(parseHash("#plantilla")).toEqual({ view: "ajustos" });
  });
});
