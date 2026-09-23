import { beforeEach, describe, expect, it } from "vitest";
import { deleteBodyWeight, isPlausibleBodyWeight, isPlausibleHeight, logBodyWeight, setHeight } from "./body";
import { db } from "./db";

beforeEach(async () => {
  await db.bodyWeights.clear();
  await db.profile.clear();
});

describe("logBodyWeight", () => {
  it("un registre per dia: tornar-lo a anotar el substitueix", async () => {
    await logBodyWeight("2026-09-20", 80.5, 100);
    await logBodyWeight("2026-09-21", 80.1, 200);
    const firstId = (await db.bodyWeights.where("date").equals("2026-09-20").first())!.id;
    await logBodyWeight("2026-09-20", 79.9, 300);
    const all = await db.bodyWeights.orderBy("date").toArray();
    expect(all.map((w) => [w.date, w.kg])).toEqual([
      ["2026-09-20", 79.9],
      ["2026-09-21", 80.1],
    ]);
    expect(all[0].id).toBe(firstId);
    expect(all[0].updatedAt).toBe(300);
  });

  it("es pot esborrar", async () => {
    await logBodyWeight("2026-09-20", 80, 100);
    const [w] = await db.bodyWeights.toArray();
    await deleteBodyWeight(w.id);
    expect(await db.bodyWeights.count()).toBe(0);
  });
});

describe("setHeight", () => {
  it("desa i esborra l'alçada", async () => {
    await setHeight(178, 100);
    expect(await db.profile.get("me")).toEqual({ id: "me", heightCm: 178, updatedAt: 100 });
    await setHeight(undefined, 200);
    expect(await db.profile.get("me")).toEqual({ id: "me", updatedAt: 200 });
  });

  it("valida rangs raonables", () => {
    expect(isPlausibleHeight(178)).toBe(true);
    expect(isPlausibleHeight(1.78)).toBe(false);
    expect(isPlausibleBodyWeight(80)).toBe(true);
    expect(isPlausibleBodyWeight(0)).toBe(false);
  });
});
