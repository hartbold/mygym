import { describe, expect, it } from "vitest";
import {
  CATALOG_SEED,
  canonicalExerciseName,
  isExactCatalogMatch,
  LEGACY_EXERCISE_NAMES,
  matchesExerciseQuery,
  normalizeForSearch,
} from "./catalog-seed";

const search = (q: string) => CATALOG_SEED.filter((c) => matchesExerciseQuery(c, q)).map((c) => c.name);

describe("catàleg", () => {
  it("no té noms repetits i tots els noms antics apunten a un exercici del catàleg", () => {
    const names = CATALOG_SEED.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    for (const target of Object.values(LEGACY_EXERCISE_NAMES)) expect(names).toContain(target);
  });

  it("reanomena els noms de totes les versions anteriors al del TERMCAT", () => {
    expect(canonicalExerciseName("Plancha")).toBe("Planxa amb quatre suports");
    expect(canonicalExerciseName("Planxa")).toBe("Planxa amb quatre suports");
    expect(canonicalExerciseName("Press banca")).toBe("Pressió sobre banc");
    expect(canonicalExerciseName("Press de banca")).toBe("Pressió sobre banc");
    expect(canonicalExerciseName("Estirada al pit")).toBe("Tracció a la politja alta");
    expect(canonicalExerciseName("Pes mort")).toBe("Pes mort");
    expect(canonicalExerciseName("Rem al pal meu")).toBe("Rem al pal meu");
  });
});

describe("cerca", () => {
  it("troba pel nom català, castellà o anglès, sense accents ni majúscules", () => {
    expect(search("bench")).toContain("Pressió sobre banc");
    expect(search("press de banca")).toContain("Pressió sobre banc");
    expect(search("peso muerto")).toContain("Pes mort");
    expect(search("DEADLIFT")).toContain("Pes mort");
    expect(search("plancha")).toContain("Planxa amb quatre suports");
    expect(search("jalon")).toContain("Tracció a la politja alta");
    expect(search("lat pulldown")).toContain("Tracció a la politja alta");
    expect(search("hip thrust")).toContain("Elevació de malucs");
    expect(search("paralleles")).toContain("Fons a les paral·leles");
    expect(search("pull up")).toContain("Dominació");
  });

  it("les paraules poden anar en qualsevol ordre", () => {
    expect(search("curl leg")).toEqual(["Rull de cames"]);
    expect(search("polea baja")).toContain("Rem Gironda");
  });

  it("es pot cercar per material o per grup muscular en qualsevol dels tres idiomes", () => {
    expect(search("maquina")).toEqual(expect.arrayContaining(["Pressió de pit", "Papallona", "Pressió de cames"]));
    expect(search("machine pecho")).toEqual(expect.arrayContaining(["Pressió de pit", "Papallona"]));
    expect(search("polea")).toEqual(expect.arrayContaining(["Tracció a la politja alta", "Extensió de tríceps a la politja"]));
    expect(search("hombros")).toContain("Elevació lateral");
    expect(search("legs")).toContain("Esquat");
    expect(search("pecho")).not.toContain("Esquat");
  });

  it("un exercici creat per l'usuari es troba pel seu nom", () => {
    expect(matchesExerciseQuery({ name: "Rem en punta", kind: "reps" }, "punta")).toBe(true);
    expect(matchesExerciseQuery({ name: "Rem en punta", kind: "reps" }, "bench")).toBe(false);
  });

  it("un àlies sencer compta com a coincidència exacta (no proposa crear-lo)", () => {
    expect(isExactCatalogMatch("peso muerto")).toBe(true);
    expect(isExactCatalogMatch("Pes mort")).toBe(true);
    expect(isExactCatalogMatch("pes")).toBe(false);
  });

  it("normalitza per comparar", () => {
    expect(normalizeForSearch("  Mànuel·les  ")).toBe("manuelles");
    expect(normalizeForSearch("Pull-up")).toBe("pull up");
  });
});
