"use client";

import { useEffect, useRef, useState } from "react";
import { CATALOG_SEED, isExactCatalogMatch, matchesExerciseQuery, normalizeForSearch } from "@/lib/catalog-seed";
import { recentExercises } from "@/lib/sessions";
import type { Entry, ExerciseKind } from "@/lib/types";
import { XmarkIcon } from "./icons";
import { Button, CARD, IconButton, List, ListItem, SearchField, Section, SegmentedControl, useSheetViewport } from "./ui";

const KIND_OPTIONS: { value: ExerciseKind; label: string }[] = [
  { value: "reps", label: "Reps" },
  { value: "time", label: "Temps" },
];

/**
 * Llista per triar un exercici: «Crea …» (si la cerca no coincideix amb cap),
 * Recents i Tots els exercicis. La cerca (en català, anglès o castellà) la
 * porta qui la conté, perquè el camp va fix a la capçalera del full.
 */
export function ExercisePicker({
  entries,
  search,
  onPick,
}: {
  entries: Entry[];
  search: string;
  onPick: (name: string, kind: ExerciseKind) => void;
}) {
  const [newKind, setNewKind] = useState<ExerciseKind>("reps");
  const recents = recentExercises(entries, 8);
  const seedOptions = CATALOG_SEED.filter((c) => !recents.some((r) => r.name === c.name && r.kind === c.kind));
  const allOptions = [...recents, ...seedOptions];
  const query = normalizeForSearch(search);
  const matches = (o: { name: string; kind: ExerciseKind }) => matchesExerciseQuery(o, search);
  const recentMatches = recents.filter(matches);
  const seedMatches = seedOptions.filter(matches);
  const exactMatch = allOptions.some((o) => normalizeForSearch(o.name) === query) || isExactCatalogMatch(search);
  const showCreate = query !== "" && !exactMatch;

  function optionList(options: { name: string; kind: ExerciseKind }[]) {
    return (
      <List>
        {options.map((o) => (
          <ListItem
            key={`${o.name} ${o.kind}`}
            title={o.name}
            ariaLabel={o.name}
            chevron
            onClick={() => onPick(o.name, o.kind)}
            trailing={
              o.kind === "time" ? (
                <span aria-hidden="true" className="text-subhead text-label-2">
                  Temps
                </span>
              ) : undefined
            }
          />
        ))}
      </List>
    );
  }

  return (
    <div className="space-y-7">
      {showCreate && (
        <div className={`${CARD} space-y-3.5 p-4`}>
          <p className="text-headline break-words">Crea «{search.trim()}»</p>
          <SegmentedControl label="Tipus d'exercici" options={KIND_OPTIONS} value={newKind} onChange={setNewKind} />
          <Button className="w-full" onClick={() => onPick(search.trim(), newKind)}>
            Crea i continua
          </Button>
        </div>
      )}
      {recentMatches.length > 0 && <Section header="Recents">{optionList(recentMatches)}</Section>}
      {seedMatches.length > 0 && <Section header="Tots els exercicis">{optionList(seedMatches)}</Section>}
    </div>
  );
}

/** Full només per triar un exercici (editor de plantilles i sessió guiada). */
export function ExercisePickerSheet({
  open,
  title,
  entries,
  onPick,
  onClose,
}: {
  open: boolean;
  title: string;
  entries: Entry[];
  onPick: (name: string, kind: ExerciseKind) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const backdropDown = useRef(false);
  const [search, setSearch] = useState("");
  const [scrolled, setScrolled] = useState(false);

  useSheetViewport(dialogRef, open);

  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (open && !d.open) {
      setSearch("");
      setScrolled(false);
      d.showModal();
      if (window.matchMedia("(pointer: coarse) and (hover: none)").matches) {
        titleRef.current?.focus({ preventScroll: true });
      }
    } else if (!open && d.open) {
      d.close();
    }
  }, [open]);

  function requestClose() {
    const d = dialogRef.current;
    if (!d) return;
    if (typeof d.requestClose === "function") d.requestClose();
    else d.close();
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      aria-labelledby="picker-sheet-title"
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
        <div
          className={`shrink-0 border-b-[0.5px] transition-colors duration-200 ${
            scrolled ? "border-separator" : "border-transparent"
          }`}
        >
          <header className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 px-4 pt-2 pb-3 sm:pt-4">
            <span />
            <h2 id="picker-sheet-title" ref={titleRef} tabIndex={-1} className="truncate rounded-md text-center text-headline">
              {title}
            </h2>
            <IconButton label="Tanca" onClick={requestClose} className="justify-self-end">
              <XmarkIcon size={18} strokeWidth={2.2} />
            </IconButton>
          </header>
          <div className="px-4 pb-3">
            <SearchField
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cerca un exercici o una màquina…"
              aria-label="Cerca un exercici"
            />
          </div>
        </div>
        <div
          onScroll={(e) => setScrolled(e.currentTarget.scrollTop > 0)}
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-2 pb-[max(env(safe-area-inset-bottom),1.5rem)]"
        >
          <ExercisePicker
            entries={entries}
            search={search}
            onPick={(name, kind) => {
              onPick(name, kind);
              requestClose();
            }}
          />
        </div>
      </div>
    </dialog>
  );
}
