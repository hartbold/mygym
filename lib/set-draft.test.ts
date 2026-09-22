import { describe, expect, it } from "vitest";
import { draftFromSet, emptyDraft, parseSetDraft } from "./set-draft";

describe("draftFromSet", () => {
  it("escriu els pesos amb coma i els segons amb dues xifres", () => {
    expect(draftFromSet({ weight: 42.5, reps: 8 })).toEqual({ weight: "42,5", reps: "8", min: "", sec: "" });
    expect(draftFromSet({ durationSec: 60 })).toEqual({ weight: "", reps: "", min: "1", sec: "00" });
    expect(draftFromSet({ durationSec: 905, weight: 10 })).toEqual({ weight: "10", reps: "", min: "15", sec: "05" });
  });

  it("torna al mateix valor en tornar-lo a llegir", () => {
    const set = { weight: 62.5, reps: 7 };
    expect(parseSetDraft("reps", draftFromSet(set))).toEqual({ ok: true, value: set });
    const timed = { durationSec: 15 * 60, weight: undefined };
    expect(parseSetDraft("time", draftFromSet(timed))).toEqual({ ok: true, value: timed });
  });
});

describe("parseSetDraft", () => {
  it("accepta coma o punt decimal i pes buit (pes corporal)", () => {
    expect(parseSetDraft("reps", { ...emptyDraft(), weight: "60,5", reps: "10" })).toEqual({
      ok: true,
      value: { weight: 60.5, reps: 10 },
    });
    expect(parseSetDraft("reps", { ...emptyDraft(), weight: "60.5", reps: "10" })).toEqual({
      ok: true,
      value: { weight: 60.5, reps: 10 },
    });
    expect(parseSetDraft("reps", { ...emptyDraft(), reps: "12" })).toEqual({
      ok: true,
      value: { weight: undefined, reps: 12 },
    });
  });

  it("una fila sense reps (o sense temps) és buida", () => {
    expect(parseSetDraft("reps", { ...emptyDraft(), weight: "60" })).toEqual({ ok: true, value: null });
    expect(parseSetDraft("time", { ...emptyDraft(), weight: "10" })).toEqual({ ok: true, value: null });
  });

  it("rebutja pesos, reps i durades no vàlids amb el missatge de sempre", () => {
    expect(parseSetDraft("reps", { ...emptyDraft(), weight: "abc", reps: "5" })).toEqual({
      ok: false,
      error: "El pes no és vàlid (fes servir coma o punt decimal).",
    });
    for (const reps of ["0", "2,5", "-3", "x"]) {
      expect(parseSetDraft("reps", { ...emptyDraft(), reps })).toEqual({
        ok: false,
        error: "Les repeticions han de ser un número enter ≥ 1.",
      });
    }
    expect(parseSetDraft("time", { ...emptyDraft(), min: "0", sec: "0" })).toEqual({
      ok: false,
      error: "La durada ha de ser d'almenys 1 segon.",
    });
  });

  it("suma minuts i segons, i qualsevol dels dos pot quedar buit", () => {
    expect(parseSetDraft("time", { ...emptyDraft(), min: "15", sec: "" })).toEqual({
      ok: true,
      value: { weight: undefined, durationSec: 900 },
    });
    expect(parseSetDraft("time", { ...emptyDraft(), min: "", sec: "45" })).toEqual({
      ok: true,
      value: { weight: undefined, durationSec: 45 },
    });
  });
});
