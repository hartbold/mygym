import { describe, expect, it } from "vitest";
import {
  CATALOG_SEED,
  canonicalExerciseName,
  LEGACY_EXERCISE_NAMES,
  matchesExerciseQuery,
  normalizeForSearch,
} from "./catalog-seed";

const find = (name: string) => CATALOG_SEED.find((c) => c.name === name)!;

describe("catàleg", () => {
  it("no té noms repetits i tots els noms antics apunten a un exercici del catàleg", () => {
    const names = CATALOG_SEED.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    for (const target of Object.values(LEGACY_EXERCISE_NAMES)) expect(names).toContain(target);
  });

  it("reanomena els noms antics i deixa igual la resta (també els creats per l'usuari)", () => {
    expect(canonicalExerciseName("Plancha")).toBe("Planxa");
    expect(canonicalExerciseName("Peso mort")).toBe("Pes mort");
    expect(canonicalExerciseName("Esquats")).toBe("Esquats");
    expect(canonicalExerciseName("Rem al pal meu")).toBe("Rem al pal meu");
  });
});

describe("cerca", () => {
  it("troba per català, anglès o castellà, sense accents ni majúscules", () => {
    expect(matchesExerciseQuery(find("Press de banca"), "bench")).toBe(true);
    expect(matchesExerciseQuery(find("Pes mort"), "peso muerto")).toBe(true);
    expect(matchesExerciseQuery(find("Pes mort"), "DEADLIFT")).toBe(true);
    expect(matchesExerciseQuery(find("Planxa"), "plancha")).toBe(true);
    expect(matchesExerciseQuery(find("Esquat búlgar"), "bulgar")).toBe(true);
    expect(matchesExerciseQuery(find("Press inclinat amb manuelles"), "mancuernas")).toBe(true);
    expect(matchesExerciseQuery(find("Fons en paral·leles"), "paralleles")).toBe(true);
    expect(matchesExerciseQuery(find("Planxa"), "deadlift")).toBe(false);
  });

  it("un exercici creat per l'usuari es troba pel seu nom", () => {
    expect(matchesExerciseQuery({ name: "Rem en punta", kind: "reps" }, "punta")).toBe(true);
    expect(matchesExerciseQuery({ name: "Rem en punta", kind: "reps" }, "bench")).toBe(false);
  });

  it("normalitza per comparar", () => {
    expect(normalizeForSearch("  Mànuel·les  ")).toBe("manuelles");
  });
});
