"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { closeStaleActive, startEntry, type NewSetInput } from "@/lib/actions";
import { CATALOG_SEED } from "@/lib/catalog-seed";
import { db } from "@/lib/db";
import { localDateKey, nowMs, parseDecimal } from "@/lib/dates";
import {
  durationParts,
  formatDayLabel,
  formatDayMonth,
  formatNumber,
  formatWeekdayShort,
} from "@/lib/format";
import { buildHash, parseHash, type Route, type View } from "@/lib/route";
import { lastOccurrence, recentExercises, selectToday } from "@/lib/sessions";
import type { Entry, ExerciseKind } from "@/lib/types";
import { useNow } from "@/lib/useNow";
import { EntryCard } from "./EntryCard";
import {
  CalendarIcon,
  ChevronLeftIcon,
  DumbbellIcon,
  GearIcon,
  PlusIcon,
  WarningIcon,
  XmarkIcon,
  type IconProps,
} from "./icons";
import { SessionView } from "./SessionView";
import { Settings } from "./Settings";
import {
  Button,
  CARD,
  EmptyState,
  FIELD,
  IconButton,
  List,
  ListItem,
  NavHeader,
  Page,
  SearchField,
  Section,
  SegmentedControl,
  StatGrid,
} from "./ui";

interface RowState {
  weight: string;
  reps: string;
  min: string;
  sec: string;
}

function emptyRow(): RowState {
  return { weight: "", reps: "", min: "", sec: "" };
}

function rowsFromLastOccurrence(entry: Entry): RowState[] {
  return entry.sets.map((s) => ({
    weight: s.weight !== undefined ? String(s.weight).replace(".", ",") : "",
    reps: s.reps !== undefined ? String(s.reps) : "",
    min: s.durationSec !== undefined ? String(Math.floor(s.durationSec / 60)) : "",
    // "1:00", no "1:0": els segons sempre amb dues xifres (Number("00") === 0).
    sec: s.durationSec !== undefined ? String(s.durationSec % 60).padStart(2, "0") : "",
  }));
}

const KIND_OPTIONS: { value: ExerciseKind; label: string }[] = [
  { value: "reps", label: "Reps" },
  { value: "time", label: "Temps" },
];

/**
 * `now` val 0 fins que el rellotge arrenca al client: un espai no separable
 * reserva la línia de la data sense mostrar l'1 de gener de 1970.
 */
const NBSP = String.fromCharCode(0xa0);

function newestFirst(a: Entry, b: Entry): number {
  return b.startedAt - a.startedAt;
}

function AvuiView({ entries, now, loaded }: { entries: Entry[]; now: number; loaded: boolean }) {
  const setCount = entries.reduce((n, e) => n + e.sets.length, 0);
  const volumeKg = entries.reduce(
    (v, e) => v + e.sets.reduce((sv, s) => sv + (s.weight && s.reps ? s.weight * s.reps : 0), 0),
    0,
  );
  const durationMs = entries.reduce(
    (d, e) => (e.autoClosed ? d : d + ((e.endedAt ?? now) - e.startedAt)),
    0,
  );
  const active = entries.filter((e) => e.status === "active").sort(newestFirst);
  const done = entries.filter((e) => e.status !== "active").sort(newestFirst);
  const duration = durationMs > 0 ? durationParts(durationMs) : { value: "—", unit: undefined };

  return (
    <Page>
      <NavHeader eyebrow={now > 0 ? formatDayLabel(localDateKey(now)) : NBSP} title="Avui" />
      {entries.length > 0 ? (
        <div className="space-y-8">
          <StatGrid
            items={[
              { label: "Exercicis", value: String(entries.length) },
              { label: "Sèries", value: String(setCount) },
              { label: "Volum", value: formatNumber(volumeKg), unit: "kg" },
              { label: "Temps", value: duration.value, unit: duration.unit },
            ]}
          />
          {active.length > 0 && (
            <Section header="En curs">
              <div className="space-y-3">
                {active.map((e) => (
                  <EntryCard key={e.id} entry={e} now={now} />
                ))}
              </div>
            </Section>
          )}
          {done.length > 0 && (
            <Section header="Fets">
              <div className="space-y-3">
                {done.map((e) => (
                  <EntryCard key={e.id} entry={e} now={now} />
                ))}
              </div>
            </Section>
          )}
        </div>
      ) : (
        loaded && (
          <div className="pt-[8dvh]">
            <EmptyState icon={<DumbbellIcon size={44} strokeWidth={1.5} />} title="Cap exercici avui">
              Prem{" "}
              <span className="inline-grid size-4.5 place-items-center rounded-full bg-accent align-middle text-on-accent">
                <PlusIcon size={12} strokeWidth={2.8} />
              </span>
              <span className="sr-only">{"el botó d'afegir"}</span> per registrar el primer exercici.
            </EmptyState>
          </div>
        )
      )}
    </Page>
  );
}

function subscribeHash(callback: () => void): () => void {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

function getHashSnapshot(): string {
  return window.location.hash;
}

function getServerHashSnapshot(): string {
  return "";
}

function scrollToTop() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: (props: IconProps) => React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`flex min-w-0 flex-1 select-none flex-col items-center justify-center gap-0.5 rounded-full transition-[background-color,color,transform] duration-200 ease-ios active:scale-[0.96] ${
        active ? "bg-fill-3 text-accent" : "text-label-2 active:bg-fill-4"
      }`}
    >
      <Icon size={24} strokeWidth={active ? 2 : 1.8} />
      <span className="text-caption2 font-semibold">{label}</span>
    </button>
  );
}

export function AppShell() {
  const liveEntries = useLiveQuery(() => db.entries.toArray(), []);
  // `undefined` mentre Dexie carrega: els estats buits esperen a tenir dades.
  const loaded = liveEntries !== undefined;
  const entries = liveEntries ?? [];
  const now = useNow();

  // Sincronitza amb el fragment `#` — mai amb `useSearchParams`/rutes de Next
  // (§Decisió d'arquitectura del pla). `useSyncExternalStore`, no un efecte
  // amb `setState`: llegeix `location.hash` directament al primer render
  // client (getServerSnapshot torna "" durant el prerender) i es
  // resubscriu sol a `hashchange`.
  const hash = useSyncExternalStore(subscribeHash, getHashSnapshot, getServerHashSnapshot);
  const route = parseHash(hash);
  const routeKey = buildHash(route);

  // Cada vista comença amunt (el scroll és el de la finestra, compartit).
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [routeKey]);

  useEffect(() => {
    function sweep() {
      void closeStaleActive(nowMs());
    }
    sweep();
    document.addEventListener("visibilitychange", sweep);
    window.addEventListener("pageshow", sweep);
    return () => {
      document.removeEventListener("visibilitychange", sweep);
      window.removeEventListener("pageshow", sweep);
    };
  }, []);

  function navigate(next: Route) {
    window.location.hash = buildHash(next);
  }

  /** Pestanya: com a iOS, tocar la pestanya on ja ets torna a dalt (des d'un dia, torna a la llista). */
  function openTab(view: View) {
    if (route.view === view) scrollToTop();
    else navigate({ view });
  }

  // --- Modal «Nou exercici» -------------------------------------------
  const dialogRef = useRef<HTMLDialogElement>(null);
  const backdropDown = useRef(false);
  const [openedAt, setOpenedAt] = useState<number | null>(null);
  const [step, setStep] = useState<"pick" | "sets">("pick");
  const [search, setSearch] = useState("");
  const [newKind, setNewKind] = useState<ExerciseKind>("reps");
  const [selected, setSelected] = useState<{ name: string; kind: ExerciseKind } | null>(null);
  const [rows, setRows] = useState<RowState[]>([]);
  /** Data ('YYYY-MM-DD') de l'entrada d'on surten els valors precarregats. */
  const [prefillDate, setPrefillDate] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  /** El contingut del full passa per sota de la capçalera: hi apareix el separador. */
  const sheetBodyRef = useRef<HTMLDivElement>(null);
  const [sheetScrolled, setSheetScrolled] = useState(false);

  /** Cada pas (i cada obertura) comença amunt. */
  function showStep(next: "pick" | "sets") {
    sheetBodyRef.current?.scrollTo(0, 0);
    setSheetScrolled(false);
    setStep(next);
  }

  function openSheet() {
    setOpenedAt(nowMs());
    showStep("pick");
    setSearch("");
    setSelected(null);
    setRows([]);
    setPrefillDate(null);
    setFormError(null);
    dialogRef.current?.showModal();
  }

  function requestCloseSheet() {
    const d = dialogRef.current;
    if (!d) return;
    if (typeof d.requestClose === "function") d.requestClose();
    else d.close();
  }

  function pickExercise(name: string, kind: ExerciseKind) {
    const prev = lastOccurrence(entries, name, kind);
    const prefill = prev && prev.sets.length > 0 ? prev : undefined;
    setSelected({ name, kind });
    setRows(prefill ? rowsFromLastOccurrence(prefill) : [emptyRow(), emptyRow(), emptyRow()]);
    setPrefillDate(prefill ? prefill.date : null);
    setFormError(null);
    showStep("sets");
  }

  function updateRow(i: number, patch: Partial<RowState>) {
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function addRow() {
    setRows((r) => [...r, r.length > 0 ? { ...r[r.length - 1] } : emptyRow()]);
  }

  function removeRow(i: number) {
    setRows((r) => r.filter((_, idx) => idx !== i));
  }

  async function onSave() {
    if (!selected || openedAt === null || saving) return;
    const filled: NewSetInput[] = [];
    for (const row of rows) {
      const weightEntered = row.weight.trim() !== "";
      const weight = weightEntered ? parseDecimal(row.weight) : undefined;
      if (weightEntered && weight === undefined) {
        setFormError("El pes no és vàlid (fes servir coma o punt decimal).");
        return;
      }
      if (selected.kind === "reps") {
        if (row.reps.trim() === "") continue; // fila buida, s'ignora
        const reps = Number(row.reps);
        if (!Number.isInteger(reps) || reps < 1) {
          setFormError("Les repeticions han de ser un número enter ≥ 1.");
          return;
        }
        filled.push({ weight, reps });
      } else {
        if (row.min.trim() === "" && row.sec.trim() === "") continue; // fila buida
        const min = row.min.trim() === "" ? 0 : Number(row.min);
        const sec = row.sec.trim() === "" ? 0 : Number(row.sec);
        const durationSec = min * 60 + sec;
        if (!Number.isFinite(durationSec) || durationSec < 1) {
          setFormError("La durada ha de ser d'almenys 1 segon.");
          return;
        }
        filled.push({ weight, durationSec });
      }
    }
    if (filled.length === 0) {
      setFormError("Afegeix com a mínim una sèrie.");
      return;
    }
    setSaving(true);
    setFormError(null);
    try {
      await startEntry({ name: selected.name, kind: selected.kind, sets: filled }, openedAt);
      requestCloseSheet();
      navigate({ view: "avui" });
    } catch {
      setFormError("No s'ha pogut desar. Torna-ho a provar.");
    } finally {
      setSaving(false);
    }
  }

  const recents = recentExercises(entries, 8);
  const seedOptions = CATALOG_SEED.filter(
    (c) => !recents.some((r) => r.name === c.name && r.kind === c.kind),
  );
  const allOptions = [...recents, ...seedOptions];
  const query = search.trim().toLowerCase();
  const matches = (o: { name: string }) => !query || o.name.toLowerCase().includes(query);
  const recentMatches = recents.filter(matches);
  const seedMatches = seedOptions.filter(matches);
  const exactMatch = allOptions.some((o) => o.name.toLowerCase() === query);
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
            onClick={() => pickExercise(o.name, o.kind)}
            trailing={
              o.kind === "time" ? (
                <span aria-hidden="true" className="text-subhead text-label-3">
                  Temps
                </span>
              ) : undefined
            }
          />
        ))}
      </List>
    );
  }

  const isTime = selected?.kind === "time";
  const tabIsHistorial = route.view === "historial" || route.view === "sessio";

  return (
    <>
      <main className="flex-1">
        {route.view === "avui" && (
          <AvuiView entries={selectToday(entries, now)} now={now} loaded={loaded} />
        )}
        {route.view === "historial" && (
          <SessionView
            entries={entries}
            now={now}
            loaded={loaded}
            onOpenDay={(date) => navigate({ view: "sessio", date })}
          />
        )}
        {route.view === "sessio" && (
          <SessionView
            entries={entries}
            now={now}
            loaded={loaded}
            date={route.date && /^\d{4}-\d{2}-\d{2}$/.test(route.date) ? route.date : localDateKey(now)}
            onOpenDay={(date) => navigate({ view: "sessio", date })}
            onBack={() => navigate({ view: "historial" })}
          />
        )}
        {route.view === "ajustos" && <Settings />}
      </main>

      {/* Efecte de vora de scroll d'iOS: el contingut s'esvaeix sota la barra. */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-20 h-[calc(env(safe-area-inset-bottom)+7rem)] bg-linear-to-t from-canvas from-25% to-canvas/0"
      />

      <nav
        aria-label="Seccions"
        className="fixed inset-x-0 bottom-[max(calc(env(safe-area-inset-bottom)_-_0.5rem),0.75rem)] z-20 mx-auto flex max-w-lg items-center gap-3 px-4"
      >
        <div className="flex h-[3.875rem] min-w-0 flex-1 items-stretch rounded-full border-[0.5px] border-black/5 bg-surface/80 p-1 shadow-float backdrop-blur-xl backdrop-saturate-150">
          <TabButton active={route.view === "avui"} onClick={() => openTab("avui")} icon={DumbbellIcon} label="Avui" />
          <TabButton active={tabIsHistorial} onClick={() => openTab("historial")} icon={CalendarIcon} label="Historial" />
          <TabButton active={route.view === "ajustos"} onClick={() => openTab("ajustos")} icon={GearIcon} label="Ajustos" />
        </div>
        <button
          type="button"
          onClick={openSheet}
          aria-label="Nou exercici"
          className="grid size-[3.875rem] shrink-0 select-none place-items-center rounded-full bg-accent text-on-accent shadow-float transition-transform duration-150 ease-ios active:scale-[0.94]"
        >
          <PlusIcon size={26} strokeWidth={2.2} />
        </button>
      </nav>

      <dialog
        ref={dialogRef}
        onClose={() => setOpenedAt(null)}
        aria-labelledby="sheet-title"
        onPointerDown={(e) => {
          backdropDown.current = e.target === e.currentTarget;
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget && backdropDown.current) requestCloseSheet();
        }}
        className="sheet m-0 mt-auto h-[92dvh] max-h-[92dvh] w-full max-w-none overflow-hidden rounded-t-[1.75rem] bg-canvas p-0 text-label sm:m-auto sm:h-auto sm:max-h-[85dvh] sm:max-w-md sm:rounded-[1.75rem]"
      >
        {/* Al mòbil, alçada fixa («large detent»): el full no salta entre passos i «Desa» sempre queda al mateix lloc. */}
        <div className="flex h-full max-h-[92dvh] flex-col sm:max-h-[85dvh]">
          <div aria-hidden="true" className="mx-auto mt-[5px] h-[5px] w-9 shrink-0 rounded-full bg-label-4 sm:hidden" />

          <div
            className={`shrink-0 border-b-[0.5px] transition-colors duration-200 ${
              sheetScrolled ? "border-separator" : "border-transparent"
            }`}
          >
            <header className="grid grid-cols-[2.75rem_1fr_2.75rem] items-center gap-2 px-4 pt-2 pb-3 sm:pt-4">
              <div>
                {step === "sets" && (
                  <IconButton label="Canvia d'exercici" onClick={() => showStep("pick")}>
                    <ChevronLeftIcon size={20} strokeWidth={2.2} />
                  </IconButton>
                )}
              </div>
              <h2 id="sheet-title" className="truncate text-center text-headline">
                {step === "pick" ? "Nou exercici" : selected?.name}
              </h2>
              <IconButton label="Tanca" onClick={requestCloseSheet} className="justify-self-end">
                <XmarkIcon size={18} strokeWidth={2.2} />
              </IconButton>
            </header>

            {step === "pick" && (
              <div className="px-4 pb-3">
                <SearchField
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Cerca un exercici…"
                  aria-label="Cerca un exercici"
                />
              </div>
            )}
          </div>

          <div
            ref={sheetBodyRef}
            onScroll={(e) => setSheetScrolled(e.currentTarget.scrollTop > 0)}
            className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 ${
              step === "pick" ? "pt-2 pb-[max(env(safe-area-inset-bottom),1.5rem)]" : "pt-1 pb-4"
            }`}
          >
            {step === "pick" ? (
              <div className="space-y-7">
                {showCreate && (
                  <div className={`${CARD} space-y-3.5 p-4`}>
                    <p className="text-headline break-words">Crea «{search.trim()}»</p>
                    <SegmentedControl
                      label="Tipus d'exercici"
                      options={KIND_OPTIONS}
                      value={newKind}
                      onChange={setNewKind}
                    />
                    <Button className="w-full" onClick={() => pickExercise(search.trim(), newKind)}>
                      Crea i continua
                    </Button>
                  </div>
                )}
                {recentMatches.length > 0 && <Section header="Recents">{optionList(recentMatches)}</Section>}
                {seedMatches.length > 0 && (
                  <Section header="Tots els exercicis">{optionList(seedMatches)}</Section>
                )}
              </div>
            ) : (
              selected && (
                <Section
                  footer={
                    prefillDate &&
                    `Valors de l'última vegada (${formatWeekdayShort(prefillDate)} ${formatDayMonth(prefillDate)}).`
                  }
                >
                  <div className={`${CARD} overflow-hidden`}>
                    <div
                      aria-hidden="true"
                      className="flex items-end pt-3 pb-1 pl-2 text-caption font-semibold tracking-[0.02em] text-label-2 uppercase"
                    >
                      <span className="w-10 shrink-0 text-center">Sèrie</span>
                      <span className="flex min-w-0 flex-1 gap-2 pr-1 pl-2">
                        <span className="flex-1 text-center">Kg</span>
                        <span className={`${isTime ? "flex-[2]" : "flex-1"} text-center`}>
                          {isTime ? "Temps" : "Reps"}
                        </span>
                        <span className="w-11 shrink-0" />
                      </span>
                    </div>

                    <ul>
                      {rows.map((row, i) => (
                        <li key={i} className="flex items-stretch pl-2">
                          <span className="flex w-10 shrink-0 items-center justify-center text-subhead font-semibold text-label-2 tabular-nums">
                            {i + 1}
                          </span>
                          <div
                            className={`flex min-w-0 flex-1 items-center gap-2 py-1.5 pr-1 pl-2 ${
                              i > 0 ? "border-t-[0.5px] border-separator" : ""
                            }`}
                          >
                            <input
                              inputMode="decimal"
                              autoComplete="off"
                              placeholder="kg"
                              aria-label={`Sèrie ${i + 1}, pes en kg`}
                              value={row.weight}
                              onChange={(e) => updateRow(i, { weight: e.target.value })}
                              className={`${FIELD} flex-1 text-center font-semibold`}
                            />
                            {selected.kind === "reps" ? (
                              <input
                                inputMode="numeric"
                                autoComplete="off"
                                placeholder="reps"
                                aria-label={`Sèrie ${i + 1}, repeticions`}
                                value={row.reps}
                                onChange={(e) => updateRow(i, { reps: e.target.value })}
                                className={`${FIELD} flex-1 text-center font-semibold`}
                              />
                            ) : (
                              <span className="flex min-w-0 flex-[2] items-center gap-1">
                                <input
                                  inputMode="numeric"
                                  autoComplete="off"
                                  placeholder="min"
                                  aria-label={`Sèrie ${i + 1}, minuts`}
                                  value={row.min}
                                  onChange={(e) => updateRow(i, { min: e.target.value })}
                                  className={`${FIELD} flex-1 text-center font-semibold`}
                                />
                                <span aria-hidden="true" className="text-body font-semibold text-label-3">
                                  :
                                </span>
                                <input
                                  inputMode="numeric"
                                  autoComplete="off"
                                  placeholder="s"
                                  aria-label={`Sèrie ${i + 1}, segons`}
                                  value={row.sec}
                                  onChange={(e) => updateRow(i, { sec: e.target.value })}
                                  className={`${FIELD} flex-1 text-center font-semibold`}
                                />
                              </span>
                            )}
                            <IconButton variant="ghost" label="Esborra la fila" onClick={() => removeRow(i)}>
                              <XmarkIcon size={18} strokeWidth={2} />
                            </IconButton>
                          </div>
                        </li>
                      ))}
                    </ul>

                    <button
                      type="button"
                      onClick={addRow}
                      className="flex h-12 w-full items-stretch pl-2 text-left text-body font-medium text-label transition-colors duration-150 active:bg-fill-4"
                    >
                      <span className="flex w-10 shrink-0 items-center justify-center">
                        <PlusIcon size={20} strokeWidth={2.2} />
                      </span>
                      <span
                        className={`flex flex-1 items-center pl-2 ${
                          rows.length > 0 ? "border-t-[0.5px] border-separator" : ""
                        }`}
                      >
                        Afegeix sèrie
                      </span>
                    </button>
                  </div>
                </Section>
              )
            )}
          </div>

          {step === "sets" && (
            <footer className="shrink-0 bg-canvas px-4 pt-2 pb-[max(env(safe-area-inset-bottom),1rem)]">
              {formError && (
                <p role="alert" className="mb-3 flex items-start gap-2 px-1 text-subhead text-danger-ink">
                  <WarningIcon size={18} strokeWidth={2} className="mt-px shrink-0" />
                  <span>{formError}</span>
                </p>
              )}
              <Button size="lg" onClick={onSave} disabled={saving}>
                {saving ? "Desant…" : "Desa"}
              </Button>
            </footer>
          )}
        </div>
      </dialog>
    </>
  );
}
