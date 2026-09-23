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

/**
 * Com `parseSetDraft`, però conserva el que s'hagi escrit encara que la
 * sèrie no sigui completa (p. ex. només els kg): per a plantilles i sessions
 * guiades, on les sèries es poden anar omplint a poc a poc.
 */
export function parsePartialDraft(
  kind: ExerciseKind,
  draft: SetDraft,
): { ok: true; value: NewSetInput } | { ok: false; error: string } {
  const value: NewSetInput = {};
  if (draft.weight.trim() !== "") {
    const weight = parseDecimal(draft.weight);
    if (weight === undefined) return { ok: false, error: "El pes no és vàlid (fes servir coma o punt decimal)." };
    value.weight = weight;
  }
  if (kind === "reps") {
    if (draft.reps.trim() !== "") {
      const reps = Number(draft.reps);
      if (!Number.isInteger(reps) || reps < 1) {
        return { ok: false, error: "Les repeticions han de ser un número enter ≥ 1." };
      }
      value.reps = reps;
    }
    return { ok: true, value };
  }
  if (draft.min.trim() !== "" || draft.sec.trim() !== "") {
    const min = draft.min.trim() === "" ? 0 : Number(draft.min);
    const sec = draft.sec.trim() === "" ? 0 : Number(draft.sec);
    const durationSec = min * 60 + sec;
    if (!Number.isFinite(durationSec) || durationSec < 1) {
      return { ok: false, error: "La durada ha de ser d'almenys 1 segon." };
    }
    value.durationSec = durationSec;
  }
  return { ok: true, value };
}
