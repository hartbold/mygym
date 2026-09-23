"use client";

import { useEffect, useRef, useState } from "react";
import { deleteBodyWeight, isPlausibleBodyWeight, logBodyWeight } from "@/lib/body";
import { isValidDateKey, localDateKey, nowMs, parseDecimal } from "@/lib/dates";
import type { BodyWeight } from "@/lib/types";
import { confirmAction } from "./ConfirmHost";
import { WarningIcon, XmarkIcon } from "./icons";
import { Button, CARD, IconButton, useSheetViewport } from "./ui";

/**
 * Full per anotar (o corregir) el pes corporal d'un dia. `editing` obre un
 * registre existent; si no, proposa avui. Un sol registre per dia: desar un
 * dia que ja en té un el substitueix.
 */
export function BodyWeightSheet({
  open,
  editing,
  onClose,
}: {
  open: boolean;
  editing?: BodyWeight;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropDown = useRef(false);
  const [date, setDate] = useState("");
  const [kg, setKg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useSheetViewport(dialogRef, open);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      setDate(editing?.date ?? localDateKey(nowMs()));
      setKg(editing ? String(editing.kg).replace(".", ",") : "");
      setError(null);
      d.showModal();
    } else if (!open && d.open) {
      d.close();
    }
  }, [open, editing]);

  function requestClose() {
    const d = dialogRef.current;
    if (!d) return;
    if (typeof d.requestClose === "function") d.requestClose();
    else d.close();
  }

  async function onSave() {
    if (saving) return;
    const value = parseDecimal(kg);
    if (!isValidDateKey(date)) {
      setError("La data no és vàlida.");
      return;
    }
    if (date > localDateKey(nowMs())) {
      setError("No es pot anotar el pes d'un dia que encara no ha arribat.");
      return;
    }
    if (value === undefined || !isPlausibleBodyWeight(value)) {
      setError("Escriu el pes en kg (per exemple, 78,5).");
      return;
    }
    setSaving(true);
    try {
      // Si es canvia la data d'un registre existent, el vell s'esborra: un per dia.
      if (editing && editing.date !== date) await deleteBodyWeight(editing.id);
      await logBodyWeight(date, Math.round(value * 10) / 10, nowMs());
      requestClose();
    } catch {
      setError("No s'ha pogut desar. Torna-ho a provar.");
    } finally {
      setSaving(false);
    }
  }

  async function onDelete() {
    if (!editing) return;
    const ok = await confirmAction({ title: "Esborrar aquest registre de pes?", confirmLabel: "Esborra", destructive: true });
    if (!ok) return;
    await deleteBodyWeight(editing.id);
    requestClose();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="weight-sheet-title"
      onPointerDown={(e) => {
        backdropDown.current = e.target === e.currentTarget;
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && backdropDown.current) requestClose();
      }}
      className="sheet w-full max-w-none overflow-hidden rounded-t-[1.75rem] bg-canvas p-0 text-label sm:m-auto sm:h-auto sm:max-h-[85dvh] sm:max-w-md sm:rounded-[1.75rem]"
    >
      <form
        method="dialog"
        onSubmit={(e) => {
          e.preventDefault();
          void onSave();
        }}
        className="flex h-full flex-col sm:max-h-[85dvh]"
      >
        <div aria-hidden="true" className="mx-auto mt-[5px] h-[5px] w-9 shrink-0 rounded-full bg-label-4 sm:hidden" />
        <header className="grid shrink-0 grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 px-4 pt-2 pb-3 sm:pt-4">
          <span />
          <h2 id="weight-sheet-title" className="truncate text-center text-headline">
            {editing ? "Pes corporal" : "Registra el pes"}
          </h2>
          <IconButton label="Tanca" onClick={requestClose} className="justify-self-end">
            <XmarkIcon size={18} strokeWidth={2.2} />
          </IconButton>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-1 pb-4">
          <div className={`${CARD} list-inset overflow-hidden`}>
            <label className="flex min-h-12 items-center gap-3 px-4">
              <span className="w-16 shrink-0 text-body">Data</span>
              <input
                type="date"
                value={date}
                max={localDateKey(nowMs())}
                onChange={(e) => {
                  setDate(e.target.value);
                  setError(null);
                }}
                className="h-12 min-w-0 flex-1 bg-transparent text-right text-body text-label-2 outline-hidden"
              />
            </label>
            <label className="flex min-h-12 items-center gap-3 border-t-[0.5px] border-separator px-4">
              <span className="w-16 shrink-0 text-body">Pes</span>
              <input
                inputMode="decimal"
                autoComplete="off"
                enterKeyHint="done"
                placeholder="78,5"
                value={kg}
                onChange={(e) => {
                  setKg(e.target.value);
                  setError(null);
                }}
                aria-invalid={error ? true : undefined}
                className="ml-auto h-11 w-28 flex-none rounded-[10px] bg-fill-3 px-3 text-right text-body font-semibold text-label tabular-nums outline-hidden transition-[box-shadow,background-color] duration-150 placeholder:font-normal placeholder:text-label-3 focus:bg-surface focus:ring-[1.5px] focus:ring-accent"
              />
              <span aria-hidden="true" className="text-body text-label-2">
                kg
              </span>
            </label>
          </div>
          <p className="px-4 pt-2 text-footnote text-label-2">
            Un registre per dia. Per comparar bé, pesa&apos;t sempre en condicions semblants (p. ex. en llevar-te).
          </p>
          {editing && (
            <Button variant="destructive" size="md" onClick={onDelete} className="mt-6 w-full">
              Esborra el registre
            </Button>
          )}
        </div>

        <footer className="shrink-0 space-y-3 bg-canvas px-4 pt-2 pb-[max(env(safe-area-inset-bottom),1rem)]">
          {error && (
            <p role="alert" className="flex items-start gap-1.5 text-subhead text-danger-ink">
              <WarningIcon size={17} strokeWidth={2} className="mt-px shrink-0" />
              {error}
            </p>
          )}
          <Button type="submit" size="lg" disabled={saving}>
            {saving ? "Desant…" : "Desa el pes"}
          </Button>
        </footer>
      </form>
    </dialog>
  );
}
