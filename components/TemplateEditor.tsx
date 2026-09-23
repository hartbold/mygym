"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { db } from "@/lib/db";
import { newId } from "@/lib/id";
import { nowMs } from "@/lib/dates";
import { deName } from "@/lib/format";
import { draftFromSet, parsePartialDraft, type SetDraft } from "@/lib/set-draft";
import { deleteTemplate, duplicateTemplate, mutateTemplate, plannedSet } from "@/lib/templates";
import type { Entry, PlannedSet, Template, TemplateExercise } from "@/lib/types";
import { loadTemplate } from "@/lib/workouts";
import { confirmAction } from "./ConfirmHost";
import { ExercisePickerSheet } from "./ExercisePicker";
import { ChevronDownIcon, ChevronUpIcon, PlusIcon, WarningIcon, XmarkIcon } from "./icons";
import { Button, CARD, EmptyState, FIELD, IconButton, NavHeader, Page, Section, SET_FIELD } from "./ui";

/**
 * Editor d'una plantilla. Cada canvi es desa sol (en sortir d'un camp, en
 * afegir o treure): no hi ha botó «Desa».
 */
export function TemplateEditor({
  templateId,
  entries,
  onBack,
  onStarted,
  onOpenTemplate,
}: {
  templateId: string;
  entries: Entry[];
  onBack: () => void;
  onStarted: () => void;
  onOpenTemplate: (id: string) => void;
}) {
  const template = useLiveQuery(() => db.templates.get(templateId), [templateId]);
  const [adding, setAdding] = useState(false);

  if (template === undefined) {
    return (
      <Page>
        <NavHeader title="Plantilla" back={{ label: "Torna a Ajustos", onClick: onBack }} />
      </Page>
    );
  }

  const t = template;

  function save(mutate: (copy: Template) => void) {
    return mutateTemplate(t.id, mutate, nowMs());
  }

  function updateExercise(exId: string, fn: (e: TemplateExercise) => void) {
    return save((copy) => {
      const ex = copy.exercises.find((e) => e.id === exId);
      if (ex) fn(ex);
    });
  }

  /** Un exercici nou comença amb tres sèries buides: la plantilla es defineix a mà. */
  async function onAddExercise(name: string, kind: TemplateExercise["kind"]) {
    const sets: PlannedSet[] = [{}, {}, {}];
    await save((copy) => copy.exercises.push({ id: newId(), name, kind, sets }));
  }

  async function onDelete() {
    const ok = await confirmAction({
      title: `Esborrar «${t.name}»?`,
      message: "Les sessions ja fetes no es toquen.",
      confirmLabel: "Esborra",
      destructive: true,
    });
    if (!ok) return;
    // Primer se surt de l'editor i després s'esborra: l'editor no ha de pintar mai una plantilla que ja no hi és.
    onBack();
    await deleteTemplate(t.id);
  }

  async function onDuplicate() {
    const id = await duplicateTemplate(t.id, nowMs());
    if (id) onOpenTemplate(id);
  }

  async function onStart() {
    const loaded = await db.workouts.toCollection().first();
    if (loaded && loaded.exercises.some((e) => e.sets.some((s) => s.doneAt !== undefined))) {
      const ok = await confirmAction({
        title: `Substituir «${loaded.name}»?`,
        message: "Ja el tens en marxa. Les sèries fetes es queden a l'historial.",
        confirmLabel: "Substitueix",
      });
      if (!ok) return;
    }
    await loadTemplate(t.id, nowMs());
    onStarted();
  }

  return (
    <Page>
      <NavHeader title={t.name || "Plantilla"} eyebrow="Plantilla" back={{ label: "Torna a Ajustos", onClick: onBack }} />
      <div className="space-y-8">
        <Section>
          <div className={`${CARD} list-inset overflow-hidden`}>
            <TextRow
              label="Nom"
              value={t.name}
              placeholder="Nom de la plantilla"
              onCommit={(name) => save((copy) => void (copy.name = name.trim() || copy.name))}
            />
            <TextRow
              separator
              label="Notes"
              value={t.notes ?? ""}
              placeholder="Opcional"
              onCommit={(notes) =>
                save((copy) => {
                  if (notes.trim()) copy.notes = notes.trim();
                  else delete copy.notes;
                })
              }
            />
          </div>
        </Section>

        <Section header="Exercicis">
          <div className="space-y-3">
            {t.exercises.length === 0 && (
              <div className={CARD}>
                <EmptyState icon={null} title="Cap exercici encara">
                  Afegeix els exercicis de la sessió amb les sèries, els pesos i les reps o el temps.
                </EmptyState>
              </div>
            )}
            {t.exercises.map((ex, i) => (
              <article key={ex.id} className={`${CARD} overflow-hidden`}>
                <header className="flex items-center gap-2 px-4 pt-3.5 pb-1">
                  <h3 className="min-w-0 flex-1 text-headline break-words">{ex.name}</h3>
                  <IconButton
                    variant="ghost"
                    label={`Puja ${ex.name}`}
                    disabled={i === 0}
                    className="disabled:opacity-30"
                    onClick={() =>
                      void save((copy) => {
                        [copy.exercises[i - 1], copy.exercises[i]] = [copy.exercises[i], copy.exercises[i - 1]];
                      })
                    }
                  >
                    <ChevronUpIcon size={18} strokeWidth={2.2} />
                  </IconButton>
                  <IconButton
                    variant="ghost"
                    label={`Baixa ${ex.name}`}
                    disabled={i === t.exercises.length - 1}
                    className="-mx-2 disabled:opacity-30"
                    onClick={() =>
                      void save((copy) => {
                        [copy.exercises[i + 1], copy.exercises[i]] = [copy.exercises[i], copy.exercises[i + 1]];
                      })
                    }
                  >
                    <ChevronDownIcon size={18} strokeWidth={2.2} />
                  </IconButton>
                  <IconButton
                    variant="ghost"
                    label={`Treu ${ex.name}`}
                    className="-mr-2"
                    onClick={async () => {
                      const ok = await confirmAction({
                        title: `Treure «${ex.name}» de la plantilla?`,
                        confirmLabel: "Treu",
                        destructive: true,
                      });
                      if (ok) await save((copy) => void (copy.exercises = copy.exercises.filter((e) => e.id !== ex.id)));
                    }}
                  >
                    <XmarkIcon size={18} strokeWidth={2.2} />
                  </IconButton>
                </header>
                <ol className="list-inset">
                  {ex.sets.map((set, si) => (
                    <PlannedSetRow
                      // Canviar el nombre de sèries desmunta les files: el valor sempre surt de la plantilla.
                      key={`${ex.id}-${si}-${ex.sets.length}`}
                      exercise={ex}
                      set={set}
                      index={si + 1}
                      onCommit={(values) => updateExercise(ex.id, (e) => void (e.sets[si] = values))}
                      onRemove={() => updateExercise(ex.id, (e) => void e.sets.splice(si, 1))}
                    />
                  ))}
                </ol>
                <footer className="border-t-[0.5px] border-separator px-4 py-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="pl-3"
                    onClick={() =>
                      void updateExercise(ex.id, (e) => {
                        const last = e.sets[e.sets.length - 1];
                        e.sets.push(last ? plannedSet(last) : {});
                      })
                    }
                  >
                    <PlusIcon size={16} strokeWidth={2.4} />
                    Sèrie
                  </Button>
                </footer>
              </article>
            ))}
            <Button variant="secondary" className="w-full" onClick={() => setAdding(true)}>
              <PlusIcon size={18} strokeWidth={2.2} />
              Afegeix exercici
            </Button>
          </div>
        </Section>

        <div className="space-y-3">
          <Button size="lg" onClick={onStart} disabled={t.exercises.length === 0}>
            Comença-la ara
          </Button>
          <Button variant="secondary" className="w-full" onClick={onDuplicate}>
            Duplica la plantilla
          </Button>
          <Button variant="destructive" className="w-full" onClick={onDelete}>
            Esborra la plantilla
          </Button>
        </div>
      </div>

      <ExercisePickerSheet
        open={adding}
        title="Afegeix exercici"
        entries={entries}
        onClose={() => setAdding(false)}
        onPick={(name, kind) => void onAddExercise(name, kind)}
      />
    </Page>
  );
}

function TextRow({
  label,
  value,
  placeholder,
  onCommit,
  separator = false,
}: {
  separator?: boolean;
  label: string;
  value: string;
  placeholder: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <label className={`flex min-h-12 items-center gap-3 px-4 ${separator ? "border-t-[0.5px] border-separator" : ""}`}>
      <span className="w-16 shrink-0 text-body">{label}</span>
      <input
        value={draft ?? value}
        placeholder={placeholder}
        autoComplete="off"
        enterKeyHint="done"
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          if (draft !== null && draft !== value) onCommit(draft);
          setDraft(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setDraft(null);
        }}
        className={`${FIELD} bg-transparent px-0 text-right focus:bg-transparent focus:ring-0`}
      />
    </label>
  );
}

function PlannedSetRow({
  exercise,
  set,
  index,
  onCommit,
  onRemove,
}: {
  exercise: TemplateExercise;
  set: PlannedSet;
  index: number;
  onCommit: (values: PlannedSet) => void;
  onRemove: () => void;
}) {
  const saved = draftFromSet(set);
  const [draft, setDraft] = useState<SetDraft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const shown = draft ?? saved;
  const isTime = exercise.kind === "time";

  function commit() {
    if (!draft) return;
    // Es desa el que hi hagi (p. ex. només els kg): no cal omplir la sèrie en un ordre concret.
    const parsed = parsePartialDraft(exercise.kind, draft);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    onCommit(plannedSet(parsed.value));
    setDraft(null);
    setError(null);
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
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        if (e.key === "Escape") {
          setDraft(null);
          setError(null);
        }
      }}
      aria-label={`${label}, ${exercise.name}, sèrie ${index}`}
      className={`${SET_FIELD} ${width}`}
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
          <IconButton variant="ghost" label={`Treu la sèrie ${index} ${deName(exercise.name)}`} onClick={onRemove}>
            <XmarkIcon size={15} strokeWidth={2.2} />
          </IconButton>
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
