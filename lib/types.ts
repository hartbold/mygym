export type ExerciseKind = "reps" | "time";
export type EntryStatus = "active" | "done";

export interface EntrySet {
  id: string;
  /** kg, opcional (exercicis de pes corporal) */
  weight?: number;
  reps?: number;
  durationSec?: number;
  doneAt: number;
}

export interface Entry {
  id: string;
  name: string;
  kind: ExerciseKind;
  /** 'YYYY-MM-DD' local de startedAt — es desa a la creació i mai es recalcula. */
  date: string;
  startedAt: number;
  endedAt?: number;
  status: EntryStatus;
  /** Tancat automàticament per inactivitat (regla de 3h), no per l'usuari. */
  autoClosed?: true;
  sets: EntrySet[];
  updatedAt: number;
}

/** Un registre de pes corporal per dia (el darrer del dia substitueix l'anterior). */
export interface BodyWeight {
  id: string;
  /** 'YYYY-MM-DD' local. */
  date: string;
  kg: number;
  updatedAt: number;
}

/** Dades de l'usuari que no canvien sovint. Una sola fila, `id: "me"`. */
export interface Profile {
  id: "me";
  heightCm?: number;
  updatedAt: number;
}

/** Sèrie planificada d'una plantilla o d'una sessió guiada (sense estat). */
export interface PlannedSet {
  weight?: number;
  reps?: number;
  durationSec?: number;
}

export interface TemplateExercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  sets: PlannedSet[];
}

/** Rutina preparada: una sessió sencera per carregar a «Avui». */
export interface Template {
  id: string;
  name: string;
  notes?: string;
  exercises: TemplateExercise[];
  createdAt: number;
  updatedAt: number;
}

export interface WorkoutSet extends PlannedSet {
  id: string;
  /** Quan es va marcar com a feta (undefined = pendent). */
  doneAt?: number;
  /** Sèrie de l'`Entry` que la registra a l'historial. */
  entrySetId?: string;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  kind: ExerciseKind;
  /** `Entry` on es registren les sèries fetes (es crea en marcar-ne la primera). */
  entryId?: string;
  sets: WorkoutSet[];
}

/**
 * Sessió guiada carregada a «Avui» (com a molt una). Comença (`startedAt`)
 * en marcar la primera sèrie; en acabar-la s'esborra: el que s'ha fet ja
 * viu a `entries`.
 */
export interface Workout {
  id: string;
  templateId?: string;
  name: string;
  /** 'YYYY-MM-DD' del dia en què es va carregar. */
  date: string;
  loadedAt: number;
  startedAt?: number;
  exercises: WorkoutExercise[];
  updatedAt: number;
}
