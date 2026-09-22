import Dexie, { type EntityTable } from "dexie";
import type { Entry } from "./types";

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
};

db.version(1).stores({
  entries: "id, date, status",
});
