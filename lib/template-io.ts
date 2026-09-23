import { CATALOG_SEED, canonicalExerciseName } from "./catalog-seed";
import { db } from "./db";
import { buildTemplate, plannedSet, type TemplateInput } from "./templates";
import type { ExerciseKind, PlannedSet, Template } from "./types";

/**
 * Fitxer per compartir plantilles (p. ex. preparat per un entrenador o
 * generat amb una IA). Tolerant amb el que no és essencial: si falta `kind`
 * es dedueix del catàleg (o dels valors), i els noms antics es normalitzen.
 */
export interface TemplatesFile {
  app: "mygym";
  type: "templates";
  formatVersion: 1;
  templates: TemplateInput[];
}

export function buildTemplatesFile(templates: Template[]): TemplatesFile {
  return {
    app: "mygym",
    type: "templates",
    formatVersion: 1,
    templates: templates.map((t) => ({
      name: t.name,
      ...(t.notes ? { notes: t.notes } : {}),
      exercises: t.exercises.map((e) => ({ name: e.name, kind: e.kind, sets: e.sets.map(plannedSet) })),
    })),
  };
}

export type TemplatesParse = { ok: true; value: TemplateInput[] } | { ok: false; error: string };

const isNonNegative = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v) && v >= 0;

function parseSet(raw: unknown): PlannedSet | null {
  if (typeof raw !== "object" || raw === null) return null;
  const s = raw as Record<string, unknown>;
  const out: PlannedSet = {};
  for (const key of ["weight", "reps", "durationSec"] as const) {
    if (s[key] === undefined || s[key] === null) continue;
    if (!isNonNegative(s[key])) return null;
    out[key] = s[key];
  }
  if (out.reps !== undefined && !Number.isInteger(out.reps)) return null;
  return out;
}

function inferKind(name: string, sets: PlannedSet[]): ExerciseKind {
  const known = CATALOG_SEED.find((c) => c.name === name);
  if (known) return known.kind;
  return sets.some((s) => s.durationSec !== undefined) && !sets.some((s) => s.reps !== undefined) ? "time" : "reps";
}

export function parseTemplatesFile(text: string): TemplatesParse {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return { ok: false, error: "El fitxer no es pot llegir com a JSON." };
  }
  const obj = (typeof json === "object" && json !== null ? json : {}) as Record<string, unknown>;
  // També s'accepta directament una llista de plantilles.
  const list = Array.isArray(json) ? json : obj.templates;
  if (!Array.isArray(json) && (obj.app !== "mygym" || obj.type !== "templates")) {
    return { ok: false, error: "Aquest fitxer no conté plantilles de MY GYM." };
  }
  if (!Array.isArray(list) || list.length === 0) return { ok: false, error: "El fitxer no té cap plantilla." };

  const templates: TemplateInput[] = [];
  for (const [i, raw] of list.entries()) {
    const t = (typeof raw === "object" && raw !== null ? raw : {}) as Record<string, unknown>;
    const where = `la plantilla ${i + 1}`;
    if (typeof t.name !== "string" || !t.name.trim()) return { ok: false, error: `Falta el nom de ${where}.` };
    if (!Array.isArray(t.exercises)) return { ok: false, error: `${t.name}: falten els exercicis.` };
    const exercises: TemplateInput["exercises"] = [];
    for (const rawEx of t.exercises) {
      const e = (typeof rawEx === "object" && rawEx !== null ? rawEx : {}) as Record<string, unknown>;
      if (typeof e.name !== "string" || !e.name.trim()) return { ok: false, error: `${t.name}: un exercici no té nom.` };
      const name = canonicalExerciseName(e.name.trim());
      const rawSets = Array.isArray(e.sets) ? e.sets : [];
      const sets: PlannedSet[] = [];
      for (const rs of rawSets) {
        const s = parseSet(rs);
        if (!s) return { ok: false, error: `${t.name} · ${name}: una sèrie no és vàlida.` };
        sets.push(s);
      }
      const kind = e.kind === "reps" || e.kind === "time" ? e.kind : inferKind(name, sets);
      exercises.push({ name, kind, sets });
    }
    templates.push({
      name: t.name.trim(),
      ...(typeof t.notes === "string" && t.notes.trim() ? { notes: t.notes.trim() } : {}),
      exercises,
    });
  }
  return { ok: true, value: templates };
}

/** Afegeix les plantilles (sempre noves); si el nom ja existeix, se li afegeix « (importada)». */
export async function importTemplates(inputs: TemplateInput[], now: number): Promise<number> {
  await db.transaction("rw", db.templates, async () => {
    const names = new Set((await db.templates.toArray()).map((t) => t.name));
    for (const input of inputs) {
      let name = input.name;
      if (names.has(name)) name = `${name} (importada)`;
      names.add(name);
      await db.templates.add(buildTemplate({ ...input, name }, now));
    }
  });
  return inputs.length;
}

export function templatesFileName(now: number): string {
  const d = new Date(now);
  return `mygym-plantilles-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.json`;
}
