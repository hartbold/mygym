import { db } from "./db";
import { isValidDateKey, localDateKey } from "./dates";
import type { Entry, EntrySet } from "./types";

export interface BackupEnvelope {
  app: "mygym";
  formatVersion: 1;
  exportedAt: string;
  data: { entries: Entry[] };
}

export function buildBackup(entries: Entry[], now: number): BackupEnvelope {
  return {
    app: "mygym",
    formatVersion: 1,
    exportedAt: new Date(now).toISOString(),
    data: { entries },
  };
}

export function backupFileName(now: number): string {
  return `mygym-backup-${localDateKey(now)}.json`;
}

export type ValidationResult =
  | { ok: true; value: BackupEnvelope }
  | { ok: false; error: string };

/** JSON.parse + validació en un pas, per llegir un fitxer importat. */
export function parseBackupFile(text: string): ValidationResult {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "El fitxer no es pot llegir com a JSON." };
  }
  return validateBackup(json);
}

export function validateBackup(input: unknown): ValidationResult {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "El contingut no és un objecte JSON." };
  }
  const obj = input as Record<string, unknown>;
  if (obj.app !== "mygym") {
    return { ok: false, error: "Aquest fitxer no és una còpia de MY GYM." };
  }
  if (obj.formatVersion !== 1) {
    return { ok: false, error: `Versió de format desconeguda (${String(obj.formatVersion)}).` };
  }
  if (typeof obj.exportedAt !== "string") {
    return { ok: false, error: "Falta la data d'exportació." };
  }
  const data = obj.data as Record<string, unknown> | undefined;
  if (!data || !Array.isArray(data.entries)) {
    return { ok: false, error: "Falten les dades." };
  }

  const entries: Entry[] = [];
  for (const raw of data.entries) {
    const entry = validateEntry(raw);
    if (!entry) return { ok: false, error: "Una de les entrades del fitxer no és vàlida." };
    entries.push(entry);
  }

  return {
    ok: true,
    value: { app: "mygym", formatVersion: 1, exportedAt: obj.exportedAt, data: { entries } },
  };
}

function isFiniteNonNegative(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0;
}

function validateEntry(raw: unknown): Entry | null {
  if (typeof raw !== "object" || raw === null) return null;
  const e = raw as Record<string, unknown>;

  if (typeof e.id !== "string" || e.id === "") return null;
  if (typeof e.name !== "string" || e.name === "") return null;
  if (e.kind !== "reps" && e.kind !== "time") return null;
  if (typeof e.date !== "string" || !isValidDateKey(e.date)) return null;
  if (!isFiniteNonNegative(e.startedAt)) return null;
  if (e.status !== "active" && e.status !== "done") return null;
  if (!isFiniteNonNegative(e.updatedAt)) return null;
  if (!Array.isArray(e.sets)) return null;

  // Coherència status <-> endedAt: un actiu no en té, un fet en té un de vàlid.
  if (e.status === "active" && e.endedAt !== undefined) return null;
  if (e.status === "done") {
    if (!isFiniteNonNegative(e.endedAt) || (e.endedAt as number) < (e.startedAt as number)) return null;
  }

  const sets: EntrySet[] = [];
  for (const rawSet of e.sets) {
    const set = validateSet(rawSet);
    if (!set) return null;
    sets.push(set);
  }

  const entry: Entry = {
    id: e.id,
    name: e.name,
    kind: e.kind,
    date: e.date,
    startedAt: e.startedAt as number,
    status: e.status,
    sets,
    updatedAt: e.updatedAt as number,
  };
  if (typeof e.endedAt === "number") entry.endedAt = e.endedAt;
  if (e.autoClosed === true) entry.autoClosed = true;
  return entry;
}

function validateSet(raw: unknown): EntrySet | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.id !== "string" || s.id === "") return null;
  if (!isFiniteNonNegative(s.doneAt)) return null;
  if (s.weight !== undefined && !isFiniteNonNegative(s.weight)) return null;
  if (s.reps !== undefined && !isFiniteNonNegative(s.reps)) return null;
  if (s.durationSec !== undefined && !isFiniteNonNegative(s.durationSec)) return null;

  const set: EntrySet = { id: s.id, doneAt: s.doneAt as number };
  if (typeof s.weight === "number") set.weight = s.weight;
  if (typeof s.reps === "number") set.reps = s.reps;
  if (typeof s.durationSec === "number") set.durationSec = s.durationSec;
  return set;
}

export interface ImportSummary {
  added: number;
  updated: number;
  skipped: number;
}

/**
 * Importa NOMÉS fusionant: ids nous s'afegeixen, per als existents guanya
 * el `updatedAt` més gran, mai s'esborra res. Tota entrada importada es
 * coerceix a `status:'done'` perquè la invariant «com a molt un actiu» es
 * mantingui per construcció, sense un pas separat després del commit.
 * Tot dins una única transacció: un error deixa les dades tal com estaven.
 */
export async function importBackup(envelope: BackupEnvelope): Promise<ImportSummary> {
  const summary: ImportSummary = { added: 0, updated: 0, skipped: 0 };
  await db.transaction("rw", db.entries, async () => {
    for (const raw of envelope.data.entries) {
      // raw.endedAt només falta quan raw.status era 'active' (validateEntry
      // ho garanteix per als 'done'); en aquest cas es dedueix de l'última
      // activitat coneguda perquè la invariant es mantingui sense un pas apart.
      const lastActivity = Math.max(
        raw.startedAt,
        raw.updatedAt,
        ...raw.sets.map((s) => s.doneAt),
      );
      const entry: Entry = {
        ...raw,
        status: "done",
        endedAt: raw.endedAt ?? lastActivity,
      };
      delete entry.autoClosed; // no coneixem la causa real del tancament al re-importar

      const existing = await db.entries.get(entry.id);
      if (!existing) {
        await db.entries.add(entry);
        summary.added++;
      } else if (entry.updatedAt > existing.updatedAt) {
        await db.entries.put(entry);
        summary.updated++;
      } else {
        summary.skipped++;
      }
    }
  });
  return summary;
}
