import Dexie, { type EntityTable } from "dexie";
import { canonicalExerciseName } from "./catalog-seed";
import type { BodyWeight, Entry, Profile } from "./types";

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
