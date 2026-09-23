import { db } from "./db";
import { localDateKey } from "./dates";
import { newId } from "./id";
import { plannedSet } from "./templates";
import type { Entry, EntrySet, ExerciseKind, PlannedSet, Template, Workout, WorkoutExercise } from "./types";

/*
 * Sessió guiada: una plantilla carregada a «Avui». El pla (què toca fer) viu
 * a `workouts`; cada sèrie marcada com a feta s'escriu també a `entries`,
 * que continua sent l'única font de l'historial i de les estadístiques.
 * Les entrades es creen ja «fetes» (sense cronòmetre per exercici): el
 * temps el marquen les mateixes marques.
 */

export function workoutFromTemplate(t: Template, now: number): Workout {
  return {
    id: newId(),
    templateId: t.id,
    name: t.name,
    date: localDateKey(now),
    loadedAt: now,
    exercises: t.exercises.map((e) => ({
      id: newId(),
      name: e.name,
      kind: e.kind,
      sets: e.sets.map((s) => ({ id: newId(), ...plannedSet(s) })),
    })),
    updatedAt: now,
  };
}

/** Carrega una plantilla. Substitueix qualsevol sessió carregada (la UI ho confirma abans si cal). */
export async function loadTemplate(templateId: string, now: number): Promise<string | undefined> {
  let id: string | undefined;
  await db.transaction("rw", db.templates, db.workouts, async () => {
    const t = await db.templates.get(templateId);
    if (!t) return;
    await db.workouts.clear();
    const w = workoutFromTemplate(t, now);
    await db.workouts.add(w);
    id = w.id;
  });
  return id;
}

export function doneSetCount(w: Workout): number {
  return w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.doneAt !== undefined).length, 0);
}

/** Moment de l'última sèrie marcada (undefined si no n'hi ha cap). */
export function lastMarkAt(w: Workout): number | undefined {
  let last: number | undefined;
  for (const e of w.exercises) for (const s of e.sets) if (s.doneAt !== undefined) last = Math.max(last ?? 0, s.doneAt);
  return last;
}

/** Ids de les entrades que pertanyen a la sessió (per no repetir-les a «Fets»). */
export function workoutEntryIds(w: Workout | undefined): Set<string> {
  return new Set((w?.exercises ?? []).flatMap((e) => (e.entryId ? [e.entryId] : [])));
}

async function mutate(workoutId: string, now: number, fn: (w: Workout) => void | Promise<void>): Promise<void> {
  await db.transaction("rw", db.workouts, db.entries, async () => {
    const w = await db.workouts.get(workoutId);
    if (!w) return;
    await fn(w);
    w.updatedAt = now;
    await db.workouts.put(w);
  });
}

function findExercise(w: Workout, exerciseId: string): WorkoutExercise | undefined {
  return w.exercises.find((e) => e.id === exerciseId);
}

/** Missatge d'error si la sèrie no es pot marcar (li falten les reps o el temps). */
export function setProblem(kind: ExerciseKind, s: PlannedSet): string | null {
  if (kind === "reps" && !(s.reps !== undefined && Number.isInteger(s.reps) && s.reps >= 1)) {
    return "Indica les repeticions abans de marcar la sèrie.";
  }
  if (kind === "time" && !(s.durationSec !== undefined && s.durationSec >= 1)) {
    return "Indica el temps abans de marcar la sèrie.";
  }
  return null;
}

/**
 * Marca o desmarca una sèrie. La primera marca de la sessió n'és l'inici.
 * Marcar crea (o amplia) l'entrada de l'exercici: comença a l'última marca
 * anterior de la sessió i acaba a aquesta. Desmarcar ho desfà.
 */
export async function toggleSetDone(
  workoutId: string,
  exerciseId: string,
  setId: string,
  now: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  let result: { ok: true } | { ok: false; error: string } = { ok: true };
  await mutate(workoutId, now, async (w) => {
    const ex = findExercise(w, exerciseId);
    const set = ex?.sets.find((s) => s.id === setId);
    if (!ex || !set) return;

    if (set.doneAt === undefined) {
      const problem = setProblem(ex.kind, set);
      if (problem) {
        result = { ok: false, error: problem };
        return;
      }
      const previousMark = lastMarkAt(w);
      if (w.startedAt === undefined) w.startedAt = now;
      const entrySet: EntrySet = { id: newId(), ...plannedSet(set), doneAt: now };
      const existing = ex.entryId ? await db.entries.get(ex.entryId) : undefined;
      if (existing) {
        existing.sets.push(entrySet);
        existing.endedAt = Math.max(existing.endedAt ?? now, now);
        existing.updatedAt = now;
        await db.entries.put(existing);
      } else {
        const startedAt = Math.min(previousMark ?? now, now);
        const entry: Entry = {
          id: newId(),
          name: ex.name,
          kind: ex.kind,
          date: localDateKey(w.startedAt),
          startedAt,
          endedAt: now,
          status: "done",
          sets: [entrySet],
          updatedAt: now,
        };
        await db.entries.add(entry);
        ex.entryId = entry.id;
      }
      set.doneAt = now;
      set.entrySetId = entrySet.id;
      return;
    }

    // Desmarcar.
    const entry = ex.entryId ? await db.entries.get(ex.entryId) : undefined;
    if (entry) {
      entry.sets = entry.sets.filter((s) => s.id !== set.entrySetId);
      if (entry.sets.length === 0) {
        await db.entries.delete(entry.id);
        ex.entryId = undefined;
      } else {
        entry.endedAt = Math.max(entry.startedAt, ...entry.sets.map((s) => s.doneAt));
        entry.updatedAt = now;
        await db.entries.put(entry);
      }
    }
    set.doneAt = undefined;
    set.entrySetId = undefined;
    if (doneSetCount(w) === 0) w.startedAt = undefined;
  });
  return result;
}

/** Canvia els valors d'una sèrie; si ja és feta, també a l'historial. */
export async function updateWorkoutSet(
  workoutId: string,
  exerciseId: string,
  setId: string,
  values: PlannedSet,
  now: number,
): Promise<void> {
  await mutate(workoutId, now, async (w) => {
    const ex = findExercise(w, exerciseId);
    const set = ex?.sets.find((s) => s.id === setId);
    if (!ex || !set) return;
    set.weight = values.weight;
    set.reps = values.reps;
    set.durationSec = values.durationSec;
    if (set.doneAt !== undefined && ex.entryId) {
      await db.entries.where("id").equals(ex.entryId).modify((e) => {
        const es = e.sets.find((s) => s.id === set.entrySetId);
        if (!es) return;
        es.weight = values.weight;
        es.reps = values.reps;
        es.durationSec = values.durationSec;
        e.updatedAt = now;
      });
    }
  });
}

/** Afegeix una sèrie pendent, còpia dels valors de l'última. */
export async function addWorkoutSet(workoutId: string, exerciseId: string, now: number): Promise<void> {
  await mutate(workoutId, now, (w) => {
    const ex = findExercise(w, exerciseId);
    if (!ex) return;
    const last = ex.sets[ex.sets.length - 1];
    ex.sets.push({ id: newId(), ...(last ? plannedSet(last) : {}) });
  });
}

/** Treu una sèrie del pla (si ja era feta, també de l'historial). */
export async function removeWorkoutSet(workoutId: string, exerciseId: string, setId: string, now: number): Promise<void> {
  const w = await db.workouts.get(workoutId);
  const set = w && findExercise(w, exerciseId)?.sets.find((s) => s.id === setId);
  if (set?.doneAt !== undefined) await toggleSetDone(workoutId, exerciseId, setId, now);
  await mutate(workoutId, now, (w2) => {
    const ex = findExercise(w2, exerciseId);
    if (ex) ex.sets = ex.sets.filter((s) => s.id !== setId);
  });
}

export async function addWorkoutExercise(
  workoutId: string,
  exercise: { name: string; kind: ExerciseKind; sets: PlannedSet[] },
  now: number,
): Promise<void> {
  await mutate(workoutId, now, (w) => {
    w.exercises.push({
      id: newId(),
      name: exercise.name,
      kind: exercise.kind,
      sets: exercise.sets.map((s) => ({ id: newId(), ...plannedSet(s) })),
    });
  });
}

/**
 * Treu un exercici del pla. Les sèries que ja s'hagin fet es queden a
 * l'historial (com una entrada normal).
 */
export async function removeWorkoutExercise(workoutId: string, exerciseId: string, now: number): Promise<void> {
  await mutate(workoutId, now, (w) => {
    w.exercises = w.exercises.filter((e) => e.id !== exerciseId);
    if (doneSetCount(w) === 0) w.startedAt = undefined;
  });
}

export async function moveWorkoutExercise(workoutId: string, exerciseId: string, delta: -1 | 1, now: number): Promise<void> {
  await mutate(workoutId, now, (w) => {
    const i = w.exercises.findIndex((e) => e.id === exerciseId);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= w.exercises.length) return;
    [w.exercises[i], w.exercises[j]] = [w.exercises[j], w.exercises[i]];
  });
}

/**
 * Acaba la sessió: el que s'ha fet ja és a l'historial, així que només
 * s'esborra el pla. Opcionalment, la plantilla adopta els exercicis i els
 * valors d'avui (sense l'estat de fet).
 */
export async function finishWorkout(
  workoutId: string,
  opts: { updateTemplate: boolean },
  now: number,
): Promise<void> {
  await db.transaction("rw", db.workouts, db.templates, async () => {
    const w = await db.workouts.get(workoutId);
    if (!w) return;
    if (opts.updateTemplate && w.templateId) {
      const t = await db.templates.get(w.templateId);
      if (t) {
        t.exercises = w.exercises.map((e) => ({
          id: newId(),
          name: e.name,
          kind: e.kind,
          sets: e.sets.map(plannedSet),
        }));
        t.updatedAt = now;
        await db.templates.put(t);
      }
    }
    await db.workouts.delete(workoutId);
  });
}

/** Descarta el pla (només té sentit si no s'ha marcat res: les marques ja són historial). */
export async function discardWorkout(workoutId: string): Promise<void> {
  await db.workouts.delete(workoutId);
}

/** Hi ha canvis respecte de la plantilla d'origen? (per oferir «Actualitza la plantilla»). */
export function differsFromTemplate(w: Workout, t: Template | undefined): boolean {
  if (!t) return false;
  const shape = (xs: { name: string; kind: string; sets: PlannedSet[] }[]) =>
    JSON.stringify(xs.map((e) => [e.name, e.kind, e.sets.map((s) => [s.weight ?? null, s.reps ?? null, s.durationSec ?? null])]));
  return shape(w.exercises) !== shape(t.exercises);
}
