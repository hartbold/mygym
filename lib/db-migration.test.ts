import Dexie from "dexie";
import { expect, it } from "vitest";

it("v2 reanomena les entrades desades amb els noms antics del catàleg", async () => {
  // Una base de dades tal com la deixava la v1 de l'app.
  const v1 = new Dexie("mygym");
  v1.version(1).stores({ entries: "id, date, status" });
  const base = { kind: "reps", date: "2026-09-20", startedAt: 0, endedAt: 1, status: "done", sets: [], updatedAt: 1 };
  await v1.table("entries").bulkAdd([
    { ...base, id: "a", name: "Peso mort" },
    { ...base, id: "b", name: "Plancha", kind: "time" },
    { ...base, id: "c", name: "Esquats" },
    { ...base, id: "d", name: "El meu exercici" },
  ]);
  v1.close();

  const { db } = await import("./db");
  const names = Object.fromEntries((await db.entries.toArray()).map((e) => [e.id, e.name]));
  expect(names).toEqual({ a: "Pes mort", b: "Planxa", c: "Esquats", d: "El meu exercici" });
});
