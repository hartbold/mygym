import type { NewSetInput } from "./actions";
import { parseDecimal } from "./dates";
import type { EntrySet, ExerciseKind } from "./types";

/**
 * Valors d'una sèrie tal com s'escriuen als camps (text, coma decimal).
 * El formulari «Nou exercici» i l'edició d'una sèrie a la targeta fan
 * servir els mateixos camps i la mateixa validació.
 */
export interface SetDraft {
  weight: string;
  reps: string;
  min: string;
  sec: string;
}

export function emptyDraft(): SetDraft {
  return { weight: "", reps: "", min: "", sec: "" };
}

export function draftFromSet(set: Pick<EntrySet, "weight" | "reps" | "durationSec">): SetDraft {
  return {
    weight: set.weight !== undefined ? String(set.weight).replace(".", ",") : "",
    reps: set.reps !== undefined ? String(set.reps) : "",
    min: set.durationSec !== undefined ? String(Math.floor(set.durationSec / 60)) : "",
    // "1:00", no "1:0": els segons sempre amb dues xifres (Number("00") === 0).
    sec: set.durationSec !== undefined ? String(set.durationSec % 60).padStart(2, "0") : "",
  };
}

export type ParsedDraft =
  | { ok: true; value: NewSetInput | null }
  | { ok: false; error: string };

/**
 * `value: null` vol dir fila buida (sense reps, o sense minuts ni segons):
 * el formulari la ignora i l'edició d'una sèrie la rebutja.
 */
export function parseSetDraft(kind: ExerciseKind, draft: SetDraft): ParsedDraft {
  const weightEntered = draft.weight.trim() !== "";
  const weight = weightEntered ? parseDecimal(draft.weight) : undefined;
  if (weightEntered && weight === undefined) {
    return { ok: false, error: "El pes no és vàlid (fes servir coma o punt decimal)." };
  }
  if (kind === "reps") {
    if (draft.reps.trim() === "") return { ok: true, value: null };
    const reps = Number(draft.reps);
    if (!Number.isInteger(reps) || reps < 1) {
      return { ok: false, error: "Les repeticions han de ser un número enter ≥ 1." };
    }
    return { ok: true, value: { weight, reps } };
  }
  if (draft.min.trim() === "" && draft.sec.trim() === "") return { ok: true, value: null };
  const min = draft.min.trim() === "" ? 0 : Number(draft.min);
  const sec = draft.sec.trim() === "" ? 0 : Number(draft.sec);
  const durationSec = min * 60 + sec;
  if (!Number.isFinite(durationSec) || durationSec < 1) {
    return { ok: false, error: "La durada ha de ser d'almenys 1 segon." };
  }
  return { ok: true, value: { weight, durationSec } };
}
