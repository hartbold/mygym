"use client";

import { useState } from "react";
import { addSet, deleteEntry, finishEntry, removeSet, STALE_MS, updateEntry } from "@/lib/actions";
import { nowMs } from "@/lib/dates";
import { formatClock, formatClockTimer, formatDuration, formatWeight } from "@/lib/format";
import type { Entry, EntrySet, ExerciseKind } from "@/lib/types";
import { PlusIcon, TrashIcon, XmarkIcon } from "./icons";
import { Button, CARD, FIELD, IconButton } from "./ui";

/** Xip d'estat de la capçalera (cronòmetre en directe o «Inactiu»). */
const CHIP =
  "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-2.5 text-subhead font-semibold tabular-nums";

export function EntryCard({ entry, now }: { entry: Entry; now: number }) {
  const [finishing, setFinishing] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(entry.name);
  const isActive = entry.status === "active";
  const stale = isActive && now - entry.updatedAt > STALE_MS;
  const elapsedMs = now - entry.startedAt;

  async function onFinish() {
    if (finishing) return;
    setFinishing(true);
    try {
      await finishEntry(entry.id, nowMs());
    } finally {
      setFinishing(false);
    }
  }

  async function onAddSet() {
    const last = entry.sets[entry.sets.length - 1];
    await addSet(
      entry.id,
      { weight: last?.weight, reps: last?.reps, durationSec: last?.durationSec },
      nowMs(),
    );
  }

  async function onRemoveSet(setId: string) {
    if (!confirm("Esborrar aquesta sèrie?")) return;
    await removeSet(entry.id, setId, nowMs());
  }

  async function onDelete() {
    if (!confirm(`Esborrar «${entry.name}» sencer?`)) return;
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
                className="max-w-full rounded-md text-left text-headline text-pretty break-words transition-opacity duration-150 active:opacity-50"
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
                <span className="sr-only">En curs: </span>
                {formatClockTimer(elapsedMs / 1000)}
              </span>
            ))}
        </div>
        <p
          className={`${editingName ? "mt-1.5" : "mt-0.5"} text-subhead text-pretty text-label-2 tabular-nums`}
        >
          {meta.join(" · ")}
        </p>
      </header>

      {entry.sets.length > 0 ? (
        <ol className="list-inset">
          {entry.sets.map((set, i) => (
            <li key={set.id} className="flex items-stretch pl-4">
              <span className="mr-3 flex shrink-0 items-center">
                <span className="grid size-6 place-items-center rounded-full bg-fill-3 text-caption font-semibold text-label-2 tabular-nums">
                  {i + 1}
                </span>
              </span>
              <span className="cell flex min-h-11 min-w-0 flex-1 items-center gap-2">
                <SetValue set={set} kind={entry.kind} />
                <IconButton
                  variant="ghost"
                  label="Esborra la sèrie"
                  onClick={() => onRemoveSet(set.id)}
                >
                  <XmarkIcon size={16} strokeWidth={2.2} />
                </IconButton>
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="flex min-h-11 items-center px-4 text-subhead text-label-2">Cap sèrie encara.</p>
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

/** «60,5 kg × 10 reps», «10 reps» o «1:00 · 10 kg»: xifra en negreta, detall en gris. */
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
  if (set.weight === undefined) {
    return (
      <span className="min-w-0 flex-1 text-body font-semibold tabular-nums">{set.reps ?? "—"} reps</span>
    );
  }
  return (
    <span className="min-w-0 flex-1 text-body">
      <span className="font-semibold tabular-nums">{formatWeight(set.weight)}</span>
      <span className="text-label-2 tabular-nums"> × {set.reps ?? "—"} reps</span>
    </span>
  );
}
