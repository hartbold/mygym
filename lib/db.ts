import Dexie, { type EntityTable } from "dexie";
import { canonicalExerciseName } from "./catalog-seed";
import type { BodyWeight, Entry, Profile, Template, Workout } from "./types";

/**
 * Una sola taula: cada `Entry` ja porta `name`/`kind`, així que no cal cap
 * taula de catàleg (vegeu `catalog-seed.ts`). Sense `startedAt` ni cap índex
 * compost: el volum de dades d'un únic usuari és petit i es llegeix tot en
 * memòria (`sessions.ts`).
 */
export const db = new Dexie("mygym", {
  chromeTransactionDurability: "strict",
}) as Dexie & {
  entries: EntityTable<Entry, "id">;
  bodyWeights: EntityTable<BodyWeight, "id">;
  profile: EntityTable<Profile, "id">;
  templates: EntityTable<Template, "id">;
  workouts: EntityTable<Workout, "id">;
};

db.version(1).stores({
  entries: "id, date, status",
});

// v2: el catàleg passa a noms en català correcte; les entrades desades amb
// els noms antics es reanomenen perquè continuïn lligades a l'exercici.
db.version(2)
  .stores({ entries: "id, date, status" })
  .upgrade((tx) =>
    tx
      .table<Entry, string>("entries")
      .toCollection()
      .modify((e) => {
        e.name = canonicalExerciseName(e.name);
      }),
  );

// v3: pes corporal (un registre per dia) i perfil (alçada). Només taules noves.
db.version(3).stores({
  entries: "id, date, status",
  bodyWeights: "id, &date",
  profile: "id",
});

// v4: plantilles d'entrenament i la sessió guiada carregada a «Avui».
db.version(4).stores({
  entries: "id, date, status",
  bodyWeights: "id, &date",
  profile: "id",
  templates: "id",
  workouts: "id",
});

// v5: el catàleg passa a la nomenclatura del TERMCAT. Es reanomenen els noms
// antics a les entrades, a les plantilles i a la sessió carregada.
db.version(5)
  .stores({
    entries: "id, date, status",
    bodyWeights: "id, &date",
    profile: "id",
    templates: "id",
    workouts: "id",
  })
  .upgrade(async (tx) => {
    await tx
      .table<Entry, string>("entries")
      .toCollection()
      .modify((e) => {
        e.name = canonicalExerciseName(e.name);
      });
    for (const table of ["templates", "workouts"] as const) {
      await tx
        .table<Template | Workout, string>(table)
        .toCollection()
        .modify((t) => {
          for (const ex of t.exercises) ex.name = canonicalExerciseName(ex.name);
        });
    }
  });
