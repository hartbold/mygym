"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "@/lib/db";
import { localDateKey, nowMs } from "@/lib/dates";
import { deName, formatClock, formatDayMonth, formatDuration, formatNumber, formatWeekdayShort } from "@/lib/format";
import { lastOccurrence } from "@/lib/sessions";
import { draftFromSet, parsePartialDraft, type SetDraft } from "@/lib/set-draft";
import type { Entry, ExerciseKind, Workout, WorkoutExercise, WorkoutSet } from "@/lib/types";
import {
  addWorkoutExercise,
  addWorkoutSet,
  differsFromTemplate,
  discardWorkout,
  doneSetCount,
  finishWorkout,
  lastMarkAt,
  moveWorkoutExercise,
  removeWorkoutExercise,
  removeWorkoutSet,
  toggleSetDone,
  updateWorkoutSet,
} from "@/lib/workouts";
import { confirmAction } from "./ConfirmHost";
import { ExercisePickerSheet } from "./ExercisePicker";
import { CheckIcon, PlusIcon, WarningIcon, XmarkIcon } from "./icons";
import { Button, CARD, IconButton, Section, SET_FIELD, StatGrid } from "./ui";

function sameDraft(a: SetDraft, b: SetDraft): boolean {
  return a.weight === b.weight && a.reps === b.reps && a.min === b.min && a.sec === b.sec;
}

/**
 * Sessió guiada carregada a «Avui»: el pla de la plantilla, editable, amb un
 * ✓ per sèrie. La sessió comença en marcar la primera; no hi ha cronòmetres
 * per exercici.
 */
export function WorkoutView({ workout, entries, now }: { workout: Workout; entries: Entry[]; now: number }) {
  const [adding, setAdding] = useState(false);
  const [finishing, setFinishing] = useState(false);
  const done = doneSetCount(workout);
  const total = workout.exercises.reduce((n, e) => n + e.sets.length, 0);
  const today = now > 0 ? localDateKey(now) : workout.date;

  let status: string;
  if (workout.startedAt === undefined) {
    status = "No començat · marca ✓ cada sèrie en acabar-la";
  } else {
    const end = Math.max(now, lastMarkAt(workout) ?? now);
    const elapsed = end - workout.startedAt;
    // Sota el minut no es mostra la durada ("0 s" just després de la primera marca no diu res).
    status = `Començat a les ${formatClock(workout.startedAt)}${elapsed >= 60_000 ? ` · ${formatDuration(elapsed)}` : ""}`;
  }

  async function onDiscard() {
    const ok = await confirmAction({
      title: `Descartar «${workout.name}»?`,
      message: "No s'ha registrat cap sèrie.",
      confirmLabel: "Descarta",
      destructive: true,
    });
    if (!ok) return;
    await discardWorkout(workout.id);
  }

  return (
    <Section header="Entrenament">
      <div className="space-y-3">
        <div className={`${CARD} px-4 py-3.5`}>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="min-w-0 text-title3 font-semibold break-words">{workout.name}</h2>
            <span className="shrink-0 text-subhead font-semibold tabular-nums text-label-2">
              {done}/{total}
            </span>
          </div>
          <p className="mt-0.5 text-subhead text-label-2">{status}</p>
          {workout.date !== today && workout.startedAt !== undefined && (
            <p className="mt-2 flex items-start gap-1.5 text-footnote text-danger-ink">
              <WarningIcon size={15} strokeWidth={2} className="mt-px shrink-0" />
              Entrenament del {formatWeekdayShort(workout.date)} {formatDayMonth(workout.date)} sense acabar.
            </p>
          )}
          <div
            aria-hidden="true"
            className="mt-3 h-1 overflow-hidden rounded-full bg-fill-3"
          >
            <div className="h-full rounded-full bg-accent transition-[width] duration-300 ease-ios" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
          </div>
        </div>

        {workout.exercises.map((ex, i) => (
          <ExerciseCard
            key={ex.id}
            workoutId={workout.id}
            exercise={ex}
            isFirst={i === 0}
            isLast={i === workout.exercises.length - 1}
          />
        ))}

        <Button variant="secondary" onClick={() => setAdding(true)} className="w-full">
          <PlusIcon size={18} strokeWidth={2.2} />
          Afegeix exercici
        </Button>

        {done > 0 ? (
          <Button size="lg" onClick={() => setFinishing(true)}>
            Acaba l&apos;entrenament
          </Button>
        ) : (
          <Button variant="plain" onClick={onDiscard} className="w-full text-danger-ink">
            Descarta l&apos;entrenament
          </Button>
        )}
      </div>

      <ExercisePickerSheet
        open={adding}
        title="Afegeix exercici"
        entries={entries}
        onClose={() => setAdding(false)}
        onPick={(name, kind) => void addExercise(workout.id, entries, name, kind)}
      />
      {finishing && <FinishSheet workout={workout} now={now} onClose={() => setFinishing(false)} />}
    </Section>
  );
}

/** Nou exercici a la sessió: sèries de l'última vegada, o tres de buides. */
export async function addExercise(workoutId: string, entries: Entry[], name: string, kind: ExerciseKind) {
  const prev = lastOccurrence(entries, name, kind);
  const sets = prev?.sets.length
    ? prev.sets.map((s) => ({ weight: s.weight, reps: s.reps, durationSec: s.durationSec }))
    : [{}, {}, {}];
  await addWorkoutExercise(workoutId, { name, kind, sets }, nowMs());
}

function ExerciseCard({
  workoutId,
  exercise,
  isFirst,
  isLast,
}: {
  workoutId: string;
  exercise: WorkoutExercise;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const done = exercise.sets.filter((s) => s.doneAt !== undefined).length;
  const allDone = done === exercise.sets.length && done > 0;

  async function onRemove() {
    const ok = await confirmAction({
      title: `Treure «${exercise.name}» de l'entrenament?`,
      message: done > 0 ? `Les ${done} sèries fetes es queden a l'historial.` : undefined,
      confirmLabel: "Treu",
      destructive: true,
    });
    if (!ok) return;
    await removeWorkoutExercise(workoutId, exercise.id, nowMs());
  }

  return (
    <article className={`${CARD} overflow-hidden`}>
      <header className="flex items-start gap-2 px-4 pt-3.5 pb-1">
        <div className="min-w-0 flex-1">
          <h3 className={`text-headline break-words ${allDone ? "text-label-2" : ""}`}>{exercise.name}</h3>
          <p className="mt-0.5 text-subhead tabular-nums text-label-2">
            {done}/{exercise.sets.length} sèries
          </p>
        </div>
        <button
          type="button"
          onClick={() => setMenu((m) => !m)}
          aria-expanded={menu}
          aria-label={`Opcions ${deName(exercise.name)}`}
          className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-label-2 active:bg-fill-4"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true" className="fill-current">
            <circle cx="5.5" cy="12" r="1.75" />
            <circle cx="12" cy="12" r="1.75" />
            <circle cx="18.5" cy="12" r="1.75" />
          </svg>
        </button>
      </header>
      {menu && (
        <div className="flex flex-wrap gap-2 px-4 pb-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={isFirst}
            onClick={() => void moveWorkoutExercise(workoutId, exercise.id, -1, nowMs())}
          >
            Puja
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={isLast}
            onClick={() => void moveWorkoutExercise(workoutId, exercise.id, 1, nowMs())}
          >
            Baixa
          </Button>
          <Button variant="destructive" size="sm" onClick={onRemove}>
            Treu l&apos;exercici
          </Button>
        </div>
      )}

      <ol className="list-inset">
        {exercise.sets.map((set, i) => (
          <SetRow key={set.id} workoutId={workoutId} exercise={exercise} set={set} index={i + 1} />
        ))}
      </ol>

      <footer className="border-t-[0.5px] border-separator px-4 py-3">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => void addWorkoutSet(workoutId, exercise.id, nowMs())}
          className="pl-3"
        >
          <PlusIcon size={16} strokeWidth={2.4} />
          Sèrie
        </Button>
      </footer>
    </article>
  );
}

function SetRow({
  workoutId,
  exercise,
  set,
  index,
}: {
  workoutId: string;
  exercise: WorkoutExercise;
  set: WorkoutSet;
  index: number;
}) {
  const saved = draftFromSet(set);
  // Només mentre s'escriu; si no, es mostra el valor desat.
  const [draft, setDraft] = useState<SetDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shown = draft ?? saved;
  const isDone = set.doneAt !== undefined;
  const isTime = exercise.kind === "time";

  /** Desa el que s'ha escrit. Torna false si no és vàlid. */
  async function commit(): Promise<boolean> {
    if (!draft || sameDraft(draft, saved)) {
      setDraft(null);
      return true;
    }
    // Es desa el que hi hagi (p. ex. només els kg): la sèrie es pot anar omplint.
    const parsed = parsePartialDraft(exercise.kind, draft);
    if (!parsed.ok) {
      setError(parsed.error);
      return false;
    }
    await updateWorkoutSet(workoutId, exercise.id, set.id, parsed.value, nowMs());
    setDraft(null);
    setError(null);
    return true;
  }

  async function onToggle() {
    if (!(await commit())) return;
    const r = await toggleSetDone(workoutId, exercise.id, set.id, nowMs());
    if (!r.ok) setError(r.error);
    else setError(null);
  }

  async function onRemove() {
    if (
      isDone &&
      !(await confirmAction({
        title: "Treure aquesta sèrie?",
        message: "Ja és feta: també es traurà de l'historial.",
        confirmLabel: "Treu",
        destructive: true,
      }))
    ) {
      return;
    }
    await removeWorkoutSet(workoutId, exercise.id, set.id, nowMs());
  }

  const field = (key: keyof SetDraft, label: string, width: string, inputMode: "decimal" | "numeric", placeholder: string) => (
    <input
      inputMode={inputMode}
      autoComplete="off"
      enterKeyHint="done"
      placeholder={placeholder}
      value={shown[key]}
      onChange={(e) => {
        setDraft({ ...shown, [key]: e.target.value });
        setError(null);
      }}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => void commit()}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(null);
          setError(null);
        }
      }}
      aria-label={`${label}, ${exercise.name}, sèrie ${index}`}
      className={`${SET_FIELD} ${width} ${isDone ? "bg-transparent" : ""}`}
    />
  );
  const unit = (text: string) => (
    <span aria-hidden="true" className="text-subhead text-label-2">
      {text}
    </span>
  );

  return (
    <li className="flex items-stretch pl-4">
      <span className="mr-3 flex shrink-0 items-start pt-3.5">
        <span
          aria-hidden="true"
          className="grid size-6 place-items-center rounded-full bg-fill-3 text-caption font-semibold text-label-2 tabular-nums"
        >
          {index}
        </span>
      </span>
      <div className="cell min-w-0 flex-1 py-2 pr-1">
        <div className="flex items-center gap-2">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-2">
            {isTime ? (
              <>
                <span className="flex items-center gap-1">
                  {field("min", "Minuts", "w-12", "numeric", "0")}
                  <span aria-hidden="true" className="font-semibold text-label-3">
                    :
                  </span>
                  {field("sec", "Segons", "w-12", "numeric", "00")}
                </span>
                <span aria-hidden="true" className="text-subhead text-label-3">
                  ·
                </span>
                <span className="flex items-center gap-1.5">
                  {field("weight", "Pes en kg", "w-16", "decimal", "—")}
                  {unit("kg")}
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center gap-1.5">
                  {field("weight", "Pes en kg", "w-16", "decimal", "—")}
                  {unit("kg")}
                </span>
                <span aria-hidden="true" className="text-subhead text-label-3">
                  ×
                </span>
                <span className="flex items-center gap-1.5">
                  {field("reps", "Repeticions", "w-12", "numeric", "—")}
                  {unit("reps")}
                </span>
              </>
            )}
          </div>
          {!isDone && (
            <IconButton variant="ghost" label={`Treu la sèrie ${index} ${deName(exercise.name)}`} onClick={onRemove} className="-mx-1.5">
              <XmarkIcon size={15} strokeWidth={2.2} />
            </IconButton>
          )}
          <button
            type="button"
            onClick={() => void onToggle()}
            aria-pressed={isDone}
            aria-label={`${isDone ? "Desmarca" : "Marca"} la sèrie ${index} ${deName(exercise.name)}`}
            className={`grid size-9 shrink-0 place-items-center rounded-full transition-[background-color,transform] duration-150 ease-ios active:scale-[0.92] ${
              isDone ? "bg-accent text-on-accent" : "text-label-3 ring-[1.5px] ring-label-3 ring-inset"
            }`}
          >
            <CheckIcon size={18} strokeWidth={2.4} className={isDone ? "" : "opacity-60"} />
          </button>
        </div>
        {error && (
          <p role="alert" className="mt-1.5 flex items-start gap-1.5 text-footnote text-danger-ink">
            <WarningIcon size={15} strokeWidth={2} className="mt-px shrink-0" />
            {error}
          </p>
        )}
      </div>
    </li>
  );
}

/** Resum en acabar, amb l'opció d'actualitzar la plantilla d'origen. */
function FinishSheet({ workout, now, onClose }: { workout: Workout; now: number; onClose: () => void }) {
  const template = useLiveQuery(
    () => (workout.templateId ? db.templates.get(workout.templateId) : undefined),
    [workout.templateId],
  );
  const [updateTemplate, setUpdateTemplate] = useState(false);
  const [saving, setSaving] = useState(false);
  const changed = differsFromTemplate(workout, template);

  const doneSets = workout.exercises.flatMap((e) => e.sets.filter((s) => s.doneAt !== undefined));
  const volume = doneSets.reduce((v, s) => v + (s.weight && s.reps ? s.weight * s.reps : 0), 0);
  const durationMs = workout.startedAt !== undefined ? (lastMarkAt(workout) ?? now) - workout.startedAt : 0;
  const skipped = workout.exercises.reduce((n, e) => n + e.sets.filter((s) => s.doneAt === undefined).length, 0);

  async function onDone() {
    setSaving(true);
    try {
      await finishWorkout(workout.id, { updateTemplate: changed && updateTemplate }, nowMs());
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="finish-title"
      className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 sm:items-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-t-[1.75rem] bg-canvas px-4 pt-5 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-float sm:rounded-[1.75rem]">
        <h2 id="finish-title" className="text-center text-title3 font-semibold">
          Acabar «{workout.name}»
        </h2>
        <div className="mt-4 space-y-3">
          <StatGrid
            items={[
              { label: "Sèries fetes", value: String(doneSets.length) },
              { label: "Volum", value: formatNumber(Math.round(volume)), unit: "kg" },
              { label: "Durada", value: durationMs >= 60_000 ? formatDuration(durationMs) : "—" },
            ]}
          />
          {skipped > 0 && (
            <p className="px-4 text-footnote text-label-2">
              {skipped} {skipped === 1 ? "sèrie pendent no es registrarà" : "sèries pendents no es registraran"}.
            </p>
          )}
          {changed && (
            <label className={`${CARD} flex min-h-12 items-center gap-3 px-4 py-3`}>
              <input
                type="checkbox"
                checked={updateTemplate}
                onChange={(e) => setUpdateTemplate(e.target.checked)}
                className="size-5 shrink-0 accent-black"
              />
              <span className="text-body">
                Actualitza la plantilla «{template?.name}» amb els canvis d&apos;avui
              </span>
            </label>
          )}
          <Button size="lg" onClick={onDone} disabled={saving}>
            {saving ? "Desant…" : "Fet"}
          </Button>
          <Button variant="plain" onClick={onClose} className="w-full">
            Continua entrenant
          </Button>
        </div>
      </div>
    </div>
  );
}
