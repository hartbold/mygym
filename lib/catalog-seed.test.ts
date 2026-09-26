import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CATALOG_SEED,
  canonicalExerciseName,
  isExactCatalogMatch,
  LEGACY_EXERCISE_NAMES,
  matchesExerciseQuery,
  normalizeForSearch,
  otherLanguageNames,
  TERMCAT_TO_GYM_NAMES,
} from "./catalog-seed";

const search = (q: string) => CATALOG_SEED.filter((c) => matchesExerciseQuery(c, q)).map((c) => c.name);

describe("catàleg", () => {
  it("no té noms repetits i tots els noms antics apunten a un exercici del catàleg", () => {
    const names = CATALOG_SEED.map((c) => c.name);
    expect(new Set(names).size).toBe(names.length);
    for (const old of [...Object.keys(LEGACY_EXERCISE_NAMES), ...Object.keys(TERMCAT_TO_GYM_NAMES)]) {
      expect(names).toContain(canonicalExerciseName(old));
    }
  });

  it("la documentació d'importació llista tots els exercicis amb el seu tipus", () => {
    const docs = readFileSync(new URL("../docs/importacio.md", import.meta.url), "utf8");
    for (const c of CATALOG_SEED) expect(docs).toContain(`| ${c.name} | \`${c.kind}\` | ${c.es} | ${c.en} |`);
  });

  it("els noms actuals no es reanomenen", () => {
    for (const c of CATALOG_SEED) expect(canonicalExerciseName(c.name)).toBe(c.name);
  });

  it("reanomena els noms de totes les versions anteriors als noms de gimnàs", () => {
    expect(canonicalExerciseName("Plancha")).toBe("Planxa");
    expect(canonicalExerciseName("Planxa")).toBe("Planxa");
    expect(canonicalExerciseName("Press banca")).toBe("Press de banca");
    expect(canonicalExerciseName("Press de banca")).toBe("Press de banca");
    expect(canonicalExerciseName("Estirada al pit")).toBe("Estirada al pit");
    expect(canonicalExerciseName("Curl femoral")).toBe("Curl femoral");
    expect(canonicalExerciseName("Curl femoral ajagut")).toBe("Curl femoral");
    expect(canonicalExerciseName("Pes mort")).toBe("Pes mort");
    expect(canonicalExerciseName("Rem al pal meu")).toBe("Rem al pal meu");
  });

  it("mostra el castellà i l'anglès sense repetir noms iguals", () => {
    const byName = (n: string) => CATALOG_SEED.find((c) => c.name === n)!;
    expect(otherLanguageNames(byName("Press de banca"))).toEqual(["Bench press"]);
    expect(otherLanguageNames(byName("Estirada al pit"))).toEqual(["Jalón al pecho", "Lat pulldown"]);
    expect(otherLanguageNames(byName("Hip thrust"))).toEqual([]);
  });
});

describe("cerca", () => {
  it("troba pel nom català, castellà o anglès, sense accents ni majúscules", () => {
    expect(search("bench")).toContain("Press de banca");
    expect(search("press de banca")).toContain("Press de banca");
    expect(search("peso muerto")).toContain("Pes mort");
    expect(search("DEADLIFT")).toContain("Pes mort");
    expect(search("plancha")).toContain("Planxa");
    expect(search("jalon")).toContain("Estirada al pit");
    expect(search("lat pulldown")).toContain("Estirada al pit");
    expect(search("hip thrust")).toContain("Hip thrust");
    expect(search("paralleles")).toContain("Fons a les paral·leles");
    expect(search("pull up")).toContain("Dominades");
  });

  it("les paraules poden anar en qualsevol ordre", () => {
    expect(search("curl leg")).toEqual(["Curl femoral"]);
    expect(search("polea baja")).toContain("Rem a la politja baixa");
  });

  it("es pot cercar per material o per grup muscular en qualsevol dels tres idiomes", () => {
    expect(search("maquina")).toEqual(expect.arrayContaining(["Press de pit a la màquina", "Contractora de pit", "Premsa de cames"]));
    expect(search("machine pecho")).toEqual(expect.arrayContaining(["Press de pit a la màquina", "Contractora de pit"]));
    expect(search("polea")).toEqual(expect.arrayContaining(["Estirada al pit", "Tríceps a la politja"]));
    expect(search("hombros")).toContain("Elevacions laterals");
    expect(search("legs")).toContain("Esquat");
    expect(search("pecho")).not.toContain("Esquat");
  });

  it("es pot cercar pels músculs en qualsevol dels tres idiomes", () => {
    expect(search("glutis")).toContain("Hip thrust");
    expect(search("gluteos")).toContain("Hip thrust");
    expect(search("hamstrings")).toContain("Curl femoral");
    expect(search("triceps")).toContain("Press francès");
  });

  it("un exercici creat per l'usuari es troba pel seu nom", () => {
    expect(matchesExerciseQuery({ name: "Rem en punta", kind: "reps" }, "punta")).toBe(true);
    expect(matchesExerciseQuery({ name: "Rem en punta", kind: "reps" }, "bench")).toBe(false);
  });

  it("un àlies sencer compta com a coincidència exacta (no proposa crear-lo)", () => {
    expect(isExactCatalogMatch("peso muerto")).toBe(true);
    expect(isExactCatalogMatch("Pes mort")).toBe(true);
    expect(isExactCatalogMatch("Lat pulldown")).toBe(true);
    expect(isExactCatalogMatch("pes")).toBe(false);
  });

  it("normalitza per comparar", () => {
    expect(normalizeForSearch("  Mànuel·les  ")).toBe("manuelles");
    expect(normalizeForSearch("Pull-up")).toBe("pull up");
  });
});
