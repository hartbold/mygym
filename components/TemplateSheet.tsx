"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef } from "react";
import { db } from "@/lib/db";
import { nowMs } from "@/lib/dates";
import { SAMPLE_TEMPLATES } from "@/lib/template-samples";
import { createTemplate, templateSetCount, type TemplateInput } from "@/lib/templates";
import { loadTemplate } from "@/lib/workouts";
import { XmarkIcon } from "./icons";
import { Button, IconButton, List, ListItem, Section, useSheetViewport } from "./ui";

export function templateSummary(t: { exercises: { sets: unknown[] }[] }): string {
  const n = t.exercises.length;
  const sets = templateSetCount(t);
  return `${n} ${n === 1 ? "exercici" : "exercicis"} · ${sets} ${sets === 1 ? "sèrie" : "sèries"}`;
}

/** Full per triar la plantilla que es carrega a «Avui». */
export function TemplateSheet({
  open,
  onClose,
  onManage,
}: {
  open: boolean;
  onClose: () => void;
  onManage: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropDown = useRef(false);
  const templates = useLiveQuery(() => db.templates.toArray(), []);
  const sorted = [...(templates ?? [])].sort((a, b) => a.name.localeCompare(b.name, "ca"));
  const samples = SAMPLE_TEMPLATES.filter((sample) => !sorted.some((t) => t.name === sample.name));

  useSheetViewport(dialogRef, open);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  function requestClose() {
    const d = dialogRef.current;
    if (!d) return;
    if (typeof d.requestClose === "function") d.requestClose();
    else d.close();
  }

  async function start(templateId: string) {
    await loadTemplate(templateId, nowMs());
    requestClose();
  }

  async function startSample(sample: TemplateInput) {
    const id = await createTemplate(sample, nowMs());
    await start(id);
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="template-sheet-title"
      onPointerDown={(e) => {
        backdropDown.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && backdropDown.current) requestClose();
      }}
      className="sheet w-full max-w-none overflow-hidden rounded-t-[1.75rem] bg-canvas p-0 text-label sm:m-auto sm:h-auto sm:max-h-[85dvh] sm:max-w-md sm:rounded-[1.75rem]"
    >
      <div className="flex h-full flex-col sm:max-h-[85dvh]">
        <div aria-hidden="true" className="mx-auto mt-[5px] h-[5px] w-9 shrink-0 rounded-full bg-label-4 sm:hidden" />
        <header className="grid shrink-0 grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 px-4 pt-2 pb-3 sm:pt-4">
          <span />
          <h2 id="template-sheet-title" className="truncate text-center text-headline">
            Comença una plantilla
          </h2>
          <IconButton label="Tanca" onClick={requestClose} className="justify-self-end">
            <XmarkIcon size={18} strokeWidth={2.2} />
          </IconButton>
        </header>
        <div className="min-h-0 flex-1 space-y-7 overflow-y-auto overscroll-contain px-4 pt-2 pb-[max(env(safe-area-inset-bottom),1.5rem)]">
          {sorted.length > 0 && (
            <Section header="Les teves plantilles">
              <List>
                {sorted.map((t) => (
                  <ListItem
                    key={t.id}
                    title={t.name}
                    titleClassName="font-medium"
                    subtitle={templateSummary(t)}
                    chevron
                    ariaLabel={`Comença ${t.name}`}
                    onClick={() => void start(t.id)}
                  />
                ))}
              </List>
            </Section>
          )}
          {templates && samples.length > 0 && (
            <Section
              header="Plantilles de mostra"
              footer="Els pesos són orientatius: ajusta'ls abans de començar o a Ajustos."
            >
              <List>
                {samples.map((s) => (
                  <ListItem
                    key={s.name}
                    title={s.name}
                    titleClassName="font-medium"
                    subtitle={templateSummary(s)}
                    chevron
                    ariaLabel={`Comença ${s.name}`}
                    onClick={() => void startSample(s)}
                  />
                ))}
              </List>
            </Section>
          )}
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              requestClose();
              onManage();
            }}
          >
            Gestiona les plantilles
          </Button>
        </div>
      </div>
    </dialog>
  );
}
