import { db } from "./db";
import { canonicalExerciseName } from "./catalog-seed";
import { isValidDateKey, localDateKey } from "./dates";
import type { BodyWeight, Entry, EntrySet, PlannedSet, Profile, Template } from "./types";

/**
 * v2 afegeix el pes corporal i el perfil (opcionals). Les còpies v1 (només
 * `entries`) es continuen important igual.
 */
export interface BackupEnvelope {
  app: "mygym";
  formatVersion: 2;
  exportedAt: string;
  data: { entries: Entry[]; bodyWeights?: BodyWeight[]; profile?: Profile; templates?: Template[] };
}

export function buildBackup(
  entries: Entry[],
  now: number,
  body: { bodyWeights?: BodyWeight[]; profile?: Profile; templates?: Template[] } = {},
): BackupEnvelope {
  const data: BackupEnvelope["data"] = { entries };
  if (body.bodyWeights?.length) data.bodyWeights = body.bodyWeights;
  if (body.profile) data.profile = body.profile;
  if (body.templates?.length) data.templates = body.templates;
  return { app: "mygym", formatVersion: 2, exportedAt: new Date(now).toISOString(), data };
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
  if (obj.formatVersion !== 1 && obj.formatVersion !== 2) {
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

  const value: BackupEnvelope = { app: "mygym", formatVersion: 2, exportedAt: obj.exportedAt, data: { entries } };

  if (data.bodyWeights !== undefined) {
    if (!Array.isArray(data.bodyWeights)) return { ok: false, error: "El registre de pes no és vàlid." };
    const weights: BodyWeight[] = [];
    for (const raw of data.bodyWeights) {
      const w = validateBodyWeight(raw);
      if (!w) return { ok: false, error: "Un dels registres de pes no és vàlid." };
      weights.push(w);
    }
    value.data.bodyWeights = weights;
  }
  if (data.profile !== undefined) {
    const profile = validateProfile(data.profile);
    if (!profile) return { ok: false, error: "El perfil no és vàlid." };
    value.data.profile = profile;
  }

  if (data.templates !== undefined) {
    if (!Array.isArray(data.templates)) return { ok: false, error: "Les plantilles no són vàlides." };
    const templates: Template[] = [];
    for (const raw of data.templates) {
      const t = validateTemplate(raw);
      if (!t) return { ok: false, error: "Una de les plantilles no és vàlida." };
      templates.push(t);
    }
    value.data.templates = templates;
  }

  return { ok: true, value };
}

function validatePlannedSet(raw: unknown): PlannedSet | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  const set: PlannedSet = {};
  for (const key of ["weight", "reps", "durationSec"] as const) {
    if (s[key] === undefined || s[key] === null) continue;
    if (!isFiniteNonNegative(s[key])) return null;
    set[key] = s[key];
  }
  return set;
}

function validateTemplate(raw: unknown): Template | null {
  if (typeof raw !== "object" || raw === null) return null;
  const t = raw as Record<string, unknown>;
  if (typeof t.id !== "string" || !t.id || typeof t.name !== "string") return null;
  if (!isFiniteNonNegative(t.createdAt) || !isFiniteNonNegative(t.updatedAt) || !Array.isArray(t.exercises)) return null;
  const exercises: Template["exercises"] = [];
  for (const rawEx of t.exercises) {
    const e = (typeof rawEx === "object" && rawEx !== null ? rawEx : {}) as Record<string, unknown>;
    if (typeof e.id !== "string" || typeof e.name !== "string" || (e.kind !== "reps" && e.kind !== "time")) return null;
    if (!Array.isArray(e.sets)) return null;
    const sets: PlannedSet[] = [];
    for (const rs of e.sets) {
      const set = validatePlannedSet(rs);
      if (!set) return null;
      sets.push(set);
    }
    exercises.push({ id: e.id, name: canonicalExerciseName(e.name), kind: e.kind, sets });
  }
  const template: Template = { id: t.id, name: t.name, exercises, createdAt: t.createdAt, updatedAt: t.updatedAt };
  if (typeof t.notes === "string" && t.notes) template.notes = t.notes;
  return template;
}

function validateBodyWeight(raw: unknown): BodyWeight | null {
  if (typeof raw !== "object" || raw === null) return null;
  const w = raw as Record<string, unknown>;
  if (typeof w.id !== "string" || w.id === "") return null;
  if (typeof w.date !== "string" || !isValidDateKey(w.date)) return null;
  if (typeof w.kg !== "number" || !Number.isFinite(w.kg) || w.kg <= 0) return null;
  if (!isFiniteNonNegative(w.updatedAt)) return null;
  return { id: w.id, date: w.date, kg: w.kg, updatedAt: w.updatedAt };
}

function validateProfile(raw: unknown): Profile | null {
  if (typeof raw !== "object" || raw === null) return null;
  const p = raw as Record<string, unknown>;
  if (p.id !== "me" || !isFiniteNonNegative(p.updatedAt)) return null;
  if (p.heightCm !== undefined && (typeof p.heightCm !== "number" || !(p.heightCm > 0))) return null;
  const profile: Profile = { id: "me", updatedAt: p.updatedAt };
  if (typeof p.heightCm === "number") profile.heightCm = p.heightCm;
  return profile;
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
    // Còpies fetes abans del catàleg en català: mateix nom que les entrades migrades.
    name: canonicalExerciseName(e.name),
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
  await db.transaction("rw", [db.entries, db.bodyWeights, db.profile, db.templates], async () => {
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

    // Pes corporal: un registre per dia, així que es fusiona per data (no per
    // id: dos dispositius poden haver anotat el mateix dia amb ids diferents).
    for (const w of envelope.data.bodyWeights ?? []) {
      const existing = await db.bodyWeights.where("date").equals(w.date).first();
      if (!existing) {
        await db.bodyWeights.add(w);
        summary.added++;
      } else if (w.updatedAt > existing.updatedAt) {
        await db.bodyWeights.update(existing.id, { kg: w.kg, updatedAt: w.updatedAt });
        summary.updated++;
      } else {
        summary.skipped++;
      }
    }

    for (const t of envelope.data.templates ?? []) {
      const existing = await db.templates.get(t.id);
      if (!existing) {
        await db.templates.add(t);
        summary.added++;
      } else if (t.updatedAt > existing.updatedAt) {
        await db.templates.put(t);
        summary.updated++;
      } else {
        summary.skipped++;
      }
    }

    const profile = envelope.data.profile;
    if (profile) {
      const existing = await db.profile.get("me");
      if (!existing || profile.updatedAt > existing.updatedAt) await db.profile.put(profile);
    }
  });
  return summary;
}
