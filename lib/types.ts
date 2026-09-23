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
