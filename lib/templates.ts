import { db } from "./db";
import { newId } from "./id";
import type { Entry, PlannedSet, Template, TemplateExercise } from "./types";

export interface TemplateInput {
  name: string;
  notes?: string;
  exercises: { name: string; kind: TemplateExercise["kind"]; sets: PlannedSet[] }[];
}

/** Copia neta d'una sèrie planificada (sense camps buits ni estat). */
export function plannedSet(s: PlannedSet): PlannedSet {
  const out: PlannedSet = {};
  if (s.weight !== undefined) out.weight = s.weight;
  if (s.reps !== undefined) out.reps = s.reps;
  if (s.durationSec !== undefined) out.durationSec = s.durationSec;
  return out;
}

export function buildTemplate(input: TemplateInput, now: number): Template {
  const t: Template = {
    id: newId(),
    name: input.name.trim() || "Plantilla",
    exercises: input.exercises.map((e) => ({ id: newId(), name: e.name, kind: e.kind, sets: e.sets.map(plannedSet) })),
    createdAt: now,
    updatedAt: now,
  };
  if (input.notes?.trim()) t.notes = input.notes.trim();
  return t;
}

export async function createTemplate(input: TemplateInput, now: number): Promise<string> {
  const t = buildTemplate(input, now);
  await db.templates.add(t);
  return t.id;
}

/** Desa la plantilla sencera (l'editor treballa amb una còpia i la reescriu). */
export async function saveTemplate(template: Template, now: number): Promise<void> {
  await db.templates.put({ ...template, updatedAt: now });
}

export async function deleteTemplate(id: string): Promise<void> {
  await db.templates.delete(id);
}

export async function duplicateTemplate(id: string, now: number): Promise<string | undefined> {
  const t = await db.templates.get(id);
  if (!t) return undefined;
  return createTemplate({ name: `${t.name} (còpia)`, notes: t.notes, exercises: t.exercises }, now);
}

/** Plantilla a partir del que es va fer un dia (exercicis en ordre i sèries tal com es van fer). */
export function templateInputFromEntries(name: string, entries: Entry[]): TemplateInput {
  const sorted = [...entries].sort((a, b) => a.startedAt - b.startedAt);
  return {
    name,
    exercises: sorted
      .filter((e) => e.sets.length > 0)
      .map((e) => ({ name: e.name, kind: e.kind, sets: e.sets.map(plannedSet) })),
  };
}

export function templateSetCount(t: { exercises: { sets: unknown[] }[] }): number {
  return t.exercises.reduce((n, e) => n + e.sets.length, 0);
}

/**
 * Modifica una plantilla llegint-ne sempre la versió desada (dins una
 * transacció): dues edicions seguides (p. ex. sortir dels kg i de les reps
 * molt de pressa) no es trepitgen.
 */
export async function mutateTemplate(id: string, fn: (t: Template) => void, now: number): Promise<void> {
  await db.transaction("rw", db.templates, async () => {
    const t = await db.templates.get(id);
    if (!t) return;
    fn(t);
    t.updatedAt = now;
    await db.templates.put(t);
  });
}
