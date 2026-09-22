import { db } from "./db";
import { localDateKey } from "./dates";
import { newId } from "./id";
import type { Entry, EntrySet, ExerciseKind } from "./types";

/** Passat aquest temps sense activitat, l'entrada activa es tanca sola. */
export const STALE_MS = 3 * 60 * 60 * 1000; // 3h

export interface NewSetInput {
  weight?: number;
  reps?: number;
  durationSec?: number;
}

export interface NewEntryInput {
  name: string;
  kind: ExerciseKind;
  sets: NewSetInput[];
}

/**
 * Tanca l'entrada activa (si n'hi ha) i en crea una de nova com a activa.
 * `openedAt` és el moment en què es va prémer «Nou exercici» (no el de
 * Desar): és quan s'entén que l'exercici anterior s'acaba, i és també
 * `startedAt` del nou — el temps al formulari no compta com a part de cap
 * dels dos.
 */
export async function startEntry(input: NewEntryInput, openedAt: number): Promise<string> {
  const id = newId();
  await db.transaction("rw", db.entries, async () => {
    const actives = await db.entries.where("status").equals("active").toArray();
    for (const active of actives) {
      await db.entries.update(active.id, {
        endedAt: Math.max(active.startedAt, openedAt),
        status: "done",
        updatedAt: openedAt,
      });
    }

    const sets: EntrySet[] = input.sets.map((s) => ({
      id: newId(),
      weight: s.weight,
      reps: s.reps,
      durationSec: s.durationSec,
      doneAt: openedAt,
    }));
    const entry: Entry = {
      id,
      name: input.name,
      kind: input.kind,
      date: localDateKey(openedAt),
      startedAt: openedAt,
      status: "active",
      sets,
      updatedAt: openedAt,
    };
    await db.entries.add(entry);
  });
  return id;
}

/** Idempotent: no fa res si l'entrada ja no és activa. */
export async function finishEntry(id: string, now: number): Promise<void> {
  await db.entries.where("id").equals(id).modify((e) => {
    if (e.status !== "active") return;
    e.endedAt = Math.max(now, e.startedAt);
    e.status = "done";
    e.updatedAt = now;
  });
}

/**
 * Tanca sola qualsevol entrada activa inactiva des de fa més de `STALE_MS`.
 * Cal cridar-la en muntar l'app I a cada `visibilitychange`/`pageshow`
 * (una PWA represa en segon pla no torna a navegar).
 */
export async function closeStaleActive(now: number): Promise<void> {
  await db.transaction("rw", db.entries, async () => {
    const actives = await db.entries.where("status").equals("active").toArray();
    for (const e of actives) {
      if (now - e.updatedAt > STALE_MS) {
        await db.entries.update(e.id, {
          endedAt: e.updatedAt,
          status: "done",
          autoClosed: true,
        });
      }
    }
  });
}

export async function addSet(entryId: string, set: NewSetInput, now: number): Promise<void> {
  await db.entries.where("id").equals(entryId).modify((e) => {
    e.sets.push({
      id: newId(),
      weight: set.weight,
      reps: set.reps,
      durationSec: set.durationSec,
      doneAt: now,
    });
    e.updatedAt = now;
  });
}

/**
 * «+ Sèrie» a la targeta: afegeix una còpia de l'última sèrie (o una de
 * buida). Llegeix l'última dins de la mateixa escriptura, no de la UI:
 * si l'usuari acaba d'editar-la, l'`updateSet` pendent ja s'hi ha aplicat
 * (Dexie serialitza les transaccions d'escriptura de la mateixa taula).
 * Torna la sèrie creada, o `undefined` si l'entrada ja no existeix.
 */
export async function duplicateLastSet(entryId: string, now: number): Promise<EntrySet | undefined> {
  let created: EntrySet | undefined;
  await db.entries.where("id").equals(entryId).modify((e) => {
    const last = e.sets[e.sets.length - 1];
    created = {
      id: newId(),
      weight: last?.weight,
      reps: last?.reps,
      durationSec: last?.durationSec,
      doneAt: now,
    };
    e.sets.push(created);
    e.updatedAt = now;
  });
  return created;
}

export async function updateSet(
  entryId: string,
  setId: string,
  patch: Partial<Pick<EntrySet, "weight" | "reps" | "durationSec">>,
  now: number,
): Promise<void> {
  await db.entries.where("id").equals(entryId).modify((e) => {
    const set = e.sets.find((s) => s.id === setId);
    if (!set) return;
    Object.assign(set, patch);
    e.updatedAt = now;
  });
}

export async function removeSet(entryId: string, setId: string, now: number): Promise<void> {
  await db.entries.where("id").equals(entryId).modify((e) => {
    e.sets = e.sets.filter((s) => s.id !== setId);
    e.updatedAt = now;
  });
}

/** v1: només es pot canviar el nom/tipus d'una entrada. `startedAt`/`date` són immutables. */
export async function updateEntry(
  entryId: string,
  patch: { name?: string; kind?: ExerciseKind },
  now: number,
): Promise<void> {
  await db.entries.where("id").equals(entryId).modify((e) => {
    if (patch.name !== undefined) e.name = patch.name;
    if (patch.kind !== undefined) e.kind = patch.kind;
    e.updatedAt = now;
  });
}

export async function deleteEntry(entryId: string): Promise<void> {
  await db.entries.delete(entryId);
}
