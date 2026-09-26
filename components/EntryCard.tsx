"use client";

import { useId, useRef, useState, type FocusEvent, type KeyboardEvent } from "react";
import {
  deleteEntry,
  duplicateLastSet,
  finishEntry,
  removeSet,
  STALE_MS,
  updateEntry,
  updateSet,
} from "@/lib/actions";
import { nowMs } from "@/lib/dates";
import { formatClock, formatClockTimer, formatDuration, formatWeight } from "@/lib/format";
import { draftFromSet, emptyDraft, parseSetDraft, type SetDraft } from "@/lib/set-draft";
import { clearStopwatch, startStopwatch, stopwatchSeconds, useStopwatch } from "@/lib/stopwatch";
import type { Entry, EntrySet, ExerciseKind } from "@/lib/types";
import { confirmAction } from "./ConfirmHost";
import { ExerciseIcon } from "./ExerciseIcon";
import { CheckIcon, PlayIcon, PlusIcon, StopIcon, TrashIcon, WarningIcon, XmarkIcon } from "./icons";
import { Button, CARD, FIELD, IconButton, SET_FIELD } from "./ui";

/** Xip d'estat de la capçalera (temps des que s'ha començat, «En curs» o «Inactiu»). */
const CHIP =
  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-subhead font-semibold tabular-nums";

export function EntryCard({ entry, now }: { entry: Entry; now: number }) {
  const [finishing, setFinishing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(entry.name);
  // Sèrie en edició. El ref és la veritat per evitar desar dues vegades quan
  // coincideixen la pèrdua de focus i un toc («Fet», «+ Sèrie», una altra fila).
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const editingSetRef = useRef<string | null>(null);
  const [setDraft, setSetDraft] = useState<SetDraft>(emptyDraft);
  const [setError, setSetError] = useState<string | null>(null);
  const isActive = entry.status === "active";
  const stale = isActive && now - entry.updatedAt > STALE_MS;
  const elapsedMs = now - entry.startedAt;
  // Els exercicis de temps es cronometren sèrie a sèrie (▶ a cada fila).
  const canTime = isActive && entry.kind === "time";
  const stopwatch = useStopwatch();
  const timing = stopwatch?.entryId === entry.id ? stopwatch : null;

  function startEditingSet(set: Pick<EntrySet, "id" | "weight" | "reps" | "durationSec">) {
    editingSetRef.current = set.id;
    setEditingSetId(set.id);
    setSetDraft(draftFromSet(set));
    setSetError(null);
  }

  function stopEditingSet() {
    editingSetRef.current = null;
    setEditingSetId(null);
    setSetError(null);
  }

  async function commitSet() {
    const setId = editingSetRef.current;
    if (!setId) return;
    const parsed = parseSetDraft(entry.kind, setDraft);
    if (!parsed.ok || !parsed.value) {
      // Una sèrie existent no pot quedar buida: per treure-la hi ha la ×.
      setSetError(
        parsed.ok
          ? entry.kind === "reps"
            ? "Les repeticions han de ser un número enter ≥ 1."
            : "La durada ha de ser d'almenys 1 segon."
          : parsed.error,
      );
      return;
    }
    stopEditingSet();
    const { weight, reps, durationSec } = parsed.value;
    const current = entry.sets.find((s) => s.id === setId);
    if (current?.weight === weight && current?.reps === reps && current?.durationSec === durationSec) return;
    // Sense cap `await` abans: així l'escriptura queda a la cua abans que un
    // «+ Sèrie» tocat just després (vegeu `duplicateLastSet`).
    await updateSet(
      entry.id,
      setId,
      entry.kind === "reps" ? { weight, reps } : { weight, durationSec },
      nowMs(),
    );
  }

  /** Engega el cronòmetre d'una sèrie; si n'hi havia un altre d'aquest exercici, el desa abans. */
  async function onStartTiming(setId: string) {
    if (editingSetRef.current) void commitSet();
    if (editingSetRef.current) return; // l'edició no és vàlida: se'n mostra l'error
    await onStopTiming();
    startStopwatch(entry.id, setId, nowMs());
  }

  /**
   * Atura el cronòmetre i desa la durada a la sèrie (el pes no es toca). Si
   * al final hi ha algun decalatge, la sèrie es pot editar com qualsevol altra.
   */
  async function onStopTiming() {
    if (!timing) return;
    const seconds = stopwatchSeconds(timing, nowMs());
    clearStopwatch();
    if (seconds < 1 || !entry.sets.some((s) => s.id === timing.setId)) return;
    await updateSet(entry.id, timing.setId, { durationSec: seconds }, nowMs());
  }

  /** Sense cap sèrie encara: en crea una de buida i la cronometra. */
  async function onTimeNewSet() {
    const created = await duplicateLastSet(entry.id, nowMs());
    if (created) await onStartTiming(created.id);
  }

  async function onFinish() {
    if (finishing) return;
    setFinishing(true);
    try {
      await onStopTiming();
      await finishEntry(entry.id, nowMs());
    } finally {
      setFinishing(false);
    }
  }

  /** Copia l'última sèrie i l'obre per editar-la: el més habitual és ajustar-ne pes o reps. */
  async function onAddSet() {
    // Desa primer una edició en curs (si el focus no ha sortit del camp, no s'ha desat).
    if (editingSetRef.current) void commitSet();
    if (editingSetRef.current) return; // l'edició no és vàlida: se'n mostra l'error
    const created = await duplicateLastSet(entry.id, nowMs());
    if (created) startEditingSet(created);
  }

  async function onRemoveSet(setId: string) {
    if (!(await confirmAction({ title: "Esborrar aquesta sèrie?", confirmLabel: "Esborra", destructive: true }))) return;
    if (timing?.setId === setId) clearStopwatch();
    await removeSet(entry.id, setId, nowMs());
  }

  async function onDelete() {
    const ok = await confirmAction({
      title: `Esborrar «${entry.name}»?`,
      message: "S'esborren totes les sèries d'aquest exercici.",
      confirmLabel: "Esborra",
      destructive: true,
    });
    if (!ok) return;
    if (timing) clearStopwatch();
    await deleteEntry(entry.id);
  }

  async function commitName() {
    const trimmed = draftName.trim();
    setEditingName(false);
    if (trimmed && trimmed !== entry.name) {
      await updateEntry(entry.id, { name: trimmed }, nowMs());
    } else {
      setDraftName(entry.name);
    }
  }

  const meta = [formatClock(entry.startedAt)];
  if (stale) meta.push("Sense activitat des de fa una estona");
  if (!isActive) {
    if (entry.autoClosed) meta.push("Tancat automàticament");
    else if (entry.endedAt !== undefined) meta.push(formatDuration(entry.endedAt - entry.startedAt));
  }
  // Centra el xip amb la primera línia del nom (22px) o amb el camp d'edició (44px).
  const chipOffset = editingName ? "mt-2" : "-mt-0.75";

  return (
    <article className={`${CARD} overflow-hidden`}>
      <header className="px-4 pt-3.5 pb-1.5">
        {/* El botó del nom es diu «Edita el nom»; el títol dona nom a la targeta per als lectors de pantalla. */}
        <h3 className="sr-only">{entry.name}</h3>
        <div className="flex items-start gap-3">
          <ExerciseIcon exercise={entry} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                {editingName ? (
                  <input
                    autoFocus
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    onBlur={commitName}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                      if (e.key === "Escape") {
                        setDraftName(entry.name);
                        setEditingName(false);
                      }
                    }}
                    aria-label="Nom de l'exercici"
                    autoComplete="off"
                    enterKeyHint="done"
                    className={`${FIELD} font-semibold`}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingName(true)}
                    // Zona tàctil de 46px sense moure res (el marge negatiu compensa el farciment);
                    // `relative` la posa per sobre de la línia de sota perquè no li prengui els tocs.
                    className="relative -my-3 max-w-full rounded-md py-3 text-left text-headline text-pretty break-words transition-opacity duration-150 active:opacity-50"
                    aria-label="Edita el nom"
                  >
                    {entry.name}
                  </button>
                )}
              </div>
              {isActive &&
                (stale ? (
                  <span className={`${CHIP} ${chipOffset} bg-fill-3 text-label-2`}>
                    <span aria-hidden="true" className="size-1.75 rounded-full bg-label-3" />
                    Inactiu
                  </span>
                ) : (
                  <span className={`${CHIP} ${chipOffset} bg-live/15 text-live-ink`}>
                    <span aria-hidden="true" className="size-1.75 animate-live rounded-full bg-live" />
                    {entry.kind === "time" ? (
                      // Un rellotge aquí semblaria el de la sèrie: el cronòmetre és a cada fila.
                      "En curs"
                    ) : (
                      <>
                        <span className="sr-only">En curs: </span>
                        {formatClockTimer(elapsedMs / 1000)}
                      </>
                    )}
                  </span>
                ))}
            </div>
            <p
              className={`${editingName ? "mt-1.5" : "mt-0.5"} text-subhead text-pretty text-label-2 tabular-nums`}
            >
              {meta.join(" · ")}
            </p>
          </div>
        </div>
      </header>

      {entry.sets.length > 0 ? (
        <ol className="list-inset">
          {entry.sets.map((set, i) => (
            <li key={set.id} className="flex items-stretch pl-4">
              {/* En edició, alineat amb els camps (8px + 36/2 − 24/2) i no amb el missatge d'error. */}
              <span
                className={`mr-3 flex shrink-0 ${editingSetId === set.id ? "items-start pt-3.5" : "items-center"}`}
              >
                <span
                  aria-hidden="true"
                  className="grid size-6 place-items-center rounded-full bg-fill-3 text-caption font-semibold text-label-2 tabular-nums"
                >
                  {i + 1}
                </span>
              </span>
              {editingSetId === set.id ? (
                <SetEditor
                  kind={entry.kind}
                  index={i + 1}
                  draft={setDraft}
                  error={setError}
                  onChange={(patch) => {
                    setSetDraft((d) => ({ ...d, ...patch }));
                    setSetError(null);
                  }}
                  onCommit={() => void commitSet()}
                  onCancel={stopEditingSet}
                />
              ) : timing?.setId === set.id ? (
                <span className="cell flex min-h-11 min-w-0 flex-1 items-center gap-2">
                  <span
                    role="timer"
                    aria-label={`Cronòmetre de la sèrie ${i + 1}`}
                    className="flex min-w-0 flex-1 items-center gap-2 text-body"
                  >
                    <span aria-hidden="true" className="size-1.75 animate-live rounded-full bg-live" />
                    <span className="font-semibold text-live-ink tabular-nums">
                      {formatClockTimer(stopwatchSeconds(timing, now))}
                    </span>
                  </span>
                  <IconButton variant="ghost" label="Atura i desa el temps" onClick={() => void onStopTiming()}>
                    <StopIcon size={20} className="text-live-ink" />
                  </IconButton>
                  <IconButton variant="ghost" label="Cancel·la el cronòmetre" onClick={clearStopwatch}>
                    <XmarkIcon size={16} strokeWidth={2.2} />
                  </IconButton>
                </span>
              ) : (
                <span className="cell flex min-h-11 min-w-0 flex-1 items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startEditingSet(set)}
                    className="flex min-h-11 min-w-0 flex-1 items-center text-left transition-opacity duration-150 focus-visible:-outline-offset-2 active:opacity-50"
                  >
                    <span className="sr-only">Edita la sèrie {i + 1}: </span>
                    <SetValue set={set} kind={entry.kind} />
                  </button>
                  {canTime && (
                    <IconButton
                      variant="ghost"
                      label={`Cronometra la sèrie ${i + 1}`}
                      onClick={() => void onStartTiming(set.id)}
                    >
                      <PlayIcon size={18} />
                    </IconButton>
                  )}
                  <IconButton
                    variant="ghost"
                    label="Esborra la sèrie"
                    onClick={() => onRemoveSet(set.id)}
                  >
                    <XmarkIcon size={16} strokeWidth={2.2} />
                  </IconButton>
                </span>
              )}
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex min-h-11 items-center justify-between gap-2 px-4">
          <p className="text-subhead text-label-2">Cap sèrie encara.</p>
          {canTime && (
            <Button variant="secondary" size="sm" onClick={() => void onTimeNewSet()} className="pl-3">
              <PlayIcon size={14} />
              Cronometra
            </Button>
          )}
        </div>
      )}

      <footer className="flex items-center gap-2 border-t-[0.5px] border-separator py-3 pl-4">
        <Button variant="secondary" size="sm" onClick={onAddSet} className="pl-3">
          <PlusIcon size={16} strokeWidth={2.4} />
          Sèrie
        </Button>
        {isActive && (
          <Button variant="primary" size="sm" onClick={onFinish} disabled={finishing}>
            Acaba
          </Button>
        )}
        <IconButton variant="ghost" label="Esborra l'exercici" onClick={onDelete} className="ml-auto">
          <TrashIcon size={20} />
        </IconButton>
      </footer>
    </article>
  );
}

/**
 * Edició d'una sèrie dins la mateixa fila, amb el mateix ordre que es llegeix:
 * «[60,5] kg × [10] reps» o «[15] : [00] · [—] kg». Desa amb «Fet», Enter o
 * en sortir de la fila; Escape descarta.
 */
function SetEditor({
  kind,
  index,
  draft,
  error,
  onChange,
  onCommit,
  onCancel,
}: {
  kind: ExerciseKind;
  index: number;
  draft: SetDraft;
  error: string | null;
  onChange: (patch: Partial<SetDraft>) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const errorId = useId();

  function onBlur(e: FocusEvent<HTMLDivElement>) {
    // Moure's entre els camps de la mateixa sèrie no desa; sortir-ne, sí.
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) return;
    onCommit();
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onCommit();
    }
    if (e.key === "Escape") {
      e.stopPropagation();
      onCancel();
    }
  }

  const field = (
    key: keyof SetDraft,
    label: string,
    width: string,
    opts: { inputMode: "decimal" | "numeric"; placeholder?: string; autoFocus?: boolean },
  ) => (
    <input
      autoFocus={opts.autoFocus}
      inputMode={opts.inputMode}
      placeholder={opts.placeholder}
      value={draft[key]}
      onChange={(e) => onChange({ [key]: e.target.value })}
      onFocus={(e) => e.currentTarget.select()}
      aria-label={`${label}, sèrie ${index}`}
      aria-invalid={error ? true : undefined}
      aria-describedby={error ? errorId : undefined}
      autoComplete="off"
      enterKeyHint="done"
      className={`${SET_FIELD} ${width}`}
    />
  );
  const unit = (text: string) => (
    <span aria-hidden="true" className="text-subhead text-label-2">
      {text}
    </span>
  );

  return (
    <div className="cell min-w-0 flex-1 py-2 pr-1" onBlur={onBlur} onKeyDown={onKeyDown}>
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-2">
          {kind === "reps" ? (
            <>
              <span className="flex items-center gap-1.5">
                {field("weight", "Pes en kg", "w-16", { inputMode: "decimal", placeholder: "—", autoFocus: true })}
                {unit("kg")}
              </span>
              <span aria-hidden="true" className="text-subhead text-label-3">
                ×
              </span>
              <span className="flex items-center gap-1.5">
                {field("reps", "Repeticions", "w-12", { inputMode: "numeric" })}
                {unit("reps")}
              </span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1">
                {field("min", "Minuts", "w-12", { inputMode: "numeric", placeholder: "0", autoFocus: true })}
                <span aria-hidden="true" className="font-semibold text-label-3">
                  :
                </span>
                {field("sec", "Segons", "w-12", { inputMode: "numeric", placeholder: "00" })}
              </span>
              <span aria-hidden="true" className="text-subhead text-label-3">
                ·
              </span>
              <span className="flex items-center gap-1.5">
                {field("weight", "Pes en kg", "w-16", { inputMode: "decimal", placeholder: "—" })}
                {unit("kg")}
              </span>
            </>
          )}
        </div>
        <button
          type="button"
          onClick={onCommit}
          aria-label="Fet"
          className="grid size-9 shrink-0 place-items-center rounded-full bg-accent text-on-accent transition-transform duration-150 ease-ios active:scale-[0.94]"
        >
          <CheckIcon size={18} strokeWidth={2.4} />
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1.5 flex items-start gap-1.5 text-footnote text-danger-ink">
          <WarningIcon size={15} strokeWidth={2} className="mt-px shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

/** «60,5 kg × 10 reps», «10 reps» o «1:00 · 10 kg»: xifres en negreta, «reps» i detall en gris. */
function SetValue({ set, kind }: { set: EntrySet; kind: ExerciseKind }) {
  if (kind === "time") {
    return (
      <span className="min-w-0 flex-1 text-body">
        <span className="font-semibold tabular-nums">
          {set.durationSec !== undefined ? formatClockTimer(set.durationSec) : "—"}
        </span>
        {set.weight !== undefined && (
          <span className="text-label-2 tabular-nums"> · {formatWeight(set.weight)}</span>
        )}
      </span>
    );
  }
  const reps = (
    <>
      <span className="font-semibold">{set.reps ?? "—"}</span>
      <span className="text-label-2"> reps</span>
    </>
  );
  if (set.weight === undefined) {
    return <span className="min-w-0 flex-1 text-body tabular-nums">{reps}</span>;
  }
  return (
    <span className="min-w-0 flex-1 text-body tabular-nums">
      <span className="font-semibold">{formatWeight(set.weight)}</span>
      <span className="text-label-3"> × </span>
      {reps}
    </span>
  );
}
