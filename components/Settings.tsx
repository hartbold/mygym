"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { isPlausibleHeight, setHeight } from "@/lib/body";
import { buildTemplatesFile, importTemplates, parseTemplatesFile, templatesFileName } from "@/lib/template-io";
import { SAMPLE_TEMPLATES } from "@/lib/template-samples";
import { createTemplate } from "@/lib/templates";
import { backupFileName, buildBackup, importBackup, parseBackupFile } from "@/lib/backup";
import { db } from "@/lib/db";
import { localDateKey, nowMs, parseDecimal } from "@/lib/dates";
import { formatDayMonth } from "@/lib/format";
import { useNow } from "@/lib/useNow";
import {
  CheckIcon,
  ExportIcon,
  ImportIcon,
  InstallIcon,
  PlusIcon,
  QuestionIcon,
  RulerIcon,
  StorageIcon,
  WarningIcon,
} from "./icons";
import { templateSummary } from "./TemplateSheet";
import { List, ListItem, NavHeader, Page, Section } from "./ui";

const LAST_BACKUP_KEY = "mygym:lastBackupAt";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type Status = { tone: "ok" | "error"; text: string };

/** Dies de calendari (no blocs de 24 h) entre dos instants: ahir a les 23:59 ja és «ahir». */
function calendarDaysAgo(ts: number, now: number): number {
  const from = new Date(ts);
  from.setHours(0, 0, 0, 0);
  const to = new Date(now);
  to.setHours(0, 0, 0, 0);
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000));
}

function lastBackupLabel(ts: number, now: number): string {
  const days = calendarDaysAgo(ts, now);
  if (days <= 0) return "avui";
  if (days === 1) return "ahir";
  return `fa ${days} dies`;
}

function useInstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  useEffect(() => {
    function onPrompt(e: Event) {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return event;
}

/**
 * Rajola d'icona de la fila, com a Configuració d'iOS. Negra només a les
 * files que fan alguna cosa (el negre vol dir «toca'm» a tota l'app);
 * `muted` (gris) a les files que només informen d'un estat.
 */
function IconTile({ muted = false, children }: { muted?: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={`grid size-7.5 place-items-center rounded-lg ${
        muted ? "bg-fill-2 text-label-2" : "bg-accent text-on-accent"
      }`}
    >
      {children}
    </span>
  );
}

/**
 * «Última còpia: avui / ahir / fa N dies.» Component a part perquè només
 * aquesta línia es torni a pintar amb el rellotge (i canviï sola a mitjanit).
 */
function LastBackupNote({ at }: { at: number | null }) {
  const now = useNow();
  if (!at) return <p>Encara no has fet cap còpia de seguretat.</p>;
  // `now` val 0 fins que el rellotge arrenca: data absoluta, mai «fa 20000 dies».
  const when = now > 0 ? lastBackupLabel(at, now) : formatDayMonth(localDateKey(at));
  return <p>Última còpia: {when}.</p>;
}

const TILE_ICON = { size: 18, strokeWidth: 2 } as const;

/** Documentació dels camps dels fitxers d'importació (`docs/importacio.md` del repositori). */
const IMPORT_DOCS_URL = "https://raw.githubusercontent.com/hartbold/mygym/main/docs/importacio.md";

/** Enllaç «?» al costat d'un botó d'importar, cap a la documentació del format. */
function ImportDocsLink({ label }: { label: string }) {
  return (
    <a
      href={IMPORT_DOCS_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      className="grid size-11 place-items-center rounded-full text-accent transition-opacity duration-150 focus-visible:-outline-offset-2 active:opacity-50"
    >
      <QuestionIcon size={22} strokeWidth={1.8} />
    </a>
  );
}

export function Settings({ onOpenTemplate }: { onOpenTemplate: (id: string) => void }) {
  const [status, setStatus] = useState<Status | null>(null);
  const [persisted, setPersisted] = useState<boolean | null>(null);
  const [lastBackupAt, setLastBackupAt] = useState<number | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const raw = localStorage.getItem(LAST_BACKUP_KEY);
      return raw ? Number(raw) : null;
    } catch {
      return null;
    }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const installEvent = useInstallPrompt();
  const isStandalone =
    typeof window !== "undefined" && window.matchMedia?.("(display-mode: standalone)").matches;
  const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!navigator.storage?.persisted) return;
      const already = await navigator.storage.persisted();
      if (cancelled) return;
      if (already) {
        setPersisted(true);
        return;
      }
      const granted = await navigator.storage.persist();
      if (!cancelled) setPersisted(granted);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onExport() {
    const now = nowMs();
    const entries = await db.entries.toArray();
    const envelope = buildBackup(entries, now, {
      bodyWeights: await db.bodyWeights.toArray(),
      profile: await db.profile.get("me"),
      templates: await db.templates.toArray(),
    });
    const fileName = backupFileName(now);
    const file = new File([JSON.stringify(envelope, null, 2)], fileName, {
      type: "application/json",
    });

    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] });
      } else {
        const url = URL.createObjectURL(file);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
      localStorage.setItem(LAST_BACKUP_KEY, String(now));
      setLastBackupAt(now);
      setStatus({ tone: "ok", text: `Desat com a ${fileName}` });
    } catch (err) {
      if ((err as DOMException)?.name === "AbortError") return;
      setStatus({ tone: "error", text: "No s'ha pogut desar la còpia." });
    }
  }

  async function onImportFile(file: File) {
    const text = await file.text();
    const result = parseBackupFile(text);
    if (!result.ok) {
      setStatus({ tone: "error", text: `Fitxer no vàlid: ${result.error}` });
      return;
    }
    const summary = await importBackup(result.value);
    setStatus({
      tone: "ok",
      text: `Importat: ${summary.added} de nous, ${summary.updated} actualitzats, ${summary.skipped} sense canvis.`,
    });
  }

  async function onInstallClick() {
    if (!installEvent) return;
    await installEvent.prompt();
  }

  const showIosWarning = isIos && !isStandalone;
  const showInstallRow = isStandalone || installEvent !== null;

  return (
    <Page>
      <NavHeader title="Ajustos" />

      <div className="space-y-8">
        <ProfileSection />

        <TemplatesSection onOpenTemplate={onOpenTemplate} />

        <Section
          header="Còpia de seguretat"
          footer={
            <div className="text-pretty">
              <div role="status" aria-live="polite">
                {status && (
                  <p
                    className={`mb-2 flex items-start gap-1.5 font-medium ${
                      status.tone === "error" ? "text-danger-ink" : "text-label"
                    }`}
                  >
                    {status.tone === "error" ? (
                      <WarningIcon size={16} strokeWidth={2} className="mt-px shrink-0" />
                    ) : (
                      <CheckIcon size={16} strokeWidth={2.4} className="mt-px shrink-0" />
                    )}
                    <span className="min-w-0 break-words">{status.text}</span>
                  </p>
                )}
              </div>
              <LastBackupNote at={lastBackupAt} />
              <p className="mt-2">
                Importar sempre fusiona: mai esborra res que ja tinguis. Si una entrada importada
                estava activa en un altre dispositiu, es marca com a feta.
              </p>
            </div>
          }
        >
          <List>
            <ListItem
              onClick={onExport}
              leading={
                <IconTile>
                  <ExportIcon {...TILE_ICON} />
                </IconTile>
              }
              title="Exporta una còpia"
            />
            <ListItem
              onClick={() => fileInputRef.current?.click()}
              leading={
                <IconTile>
                  <ImportIcon {...TILE_ICON} />
                </IconTile>
              }
              title="Importa una còpia"
              accessory={<ImportDocsLink label="Documentació: quins camps ha de tenir una còpia" />}
            />
          </List>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onImportFile(file);
            }}
          />
        </Section>

        <Section
          header="Emmagatzematge"
          footer={
            <div className="text-pretty">
              <p>
                {persisted === true &&
                  "El navegador no esborrarà les dades encara que li falti espai."}
                {persisted === false &&
                  "El navegador no ha concedit l'emmagatzematge persistent (és normal a la primera visita)."}
                {persisted === null && "Comprovant l'estat de l'emmagatzematge…"}
              </p>
              {showIosWarning && (
                <p className="mt-2">
                  A l&apos;iPhone/iPad, les dades d&apos;una pestanya del Safari no instal·lada es
                  poden esborrar després d&apos;uns dies sense obrir-la. Instal·la l&apos;app (a
                  sota) per evitar-ho.
                </p>
              )}
            </div>
          }
        >
          <List>
            <ListItem
              leading={
                <IconTile muted>
                  <StorageIcon {...TILE_ICON} />
                </IconTile>
              }
              title="Mode persistent"
              trailing={
                persisted === true ? "Activat" : persisted === false ? "No concedit" : "Comprovant…"
              }
            />
          </List>
        </Section>

        <Section header="Instal·lació">
          {showInstallRow ? (
            <List>
              {isStandalone ? (
                <ListItem
                  leading={
                    <IconTile muted>
                      <InstallIcon {...TILE_ICON} />
                    </IconTile>
                  }
                  title="App instal·lada"
                  trailing={<CheckIcon size={20} strokeWidth={2.4} className="block text-label" />}
                />
              ) : (
                <ListItem
                  onClick={onInstallClick}
                  leading={
                    <IconTile>
                      <InstallIcon {...TILE_ICON} />
                    </IconTile>
                  }
                  title="Instal·la MY GYM"
                />
              )}
            </List>
          ) : (
            // Sense botó d'instal·lar ni app instal·lada: només les instruccions, sense una fila morta.
            <p className="px-4 text-footnote text-pretty text-label-2">
              {isIos
                ? "Al Safari, toca Comparteix i després «Afegeix a la pantalla d'inici»."
                : "Fes servir el menú del navegador per instal·lar l'app (pot trigar uns segons a aparèixer després d'obrir la pàgina)."}
            </p>
          )}
        </Section>

        <div className="px-4 text-center text-footnote text-label-2">
          <p>
            <span className="font-semibold">MY GYM</span>
            {" · "}
            <a
              href="https://github.com/hartbold/mygym"
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-label-3 underline-offset-2 active:opacity-50"
            >
              Codi a GitHub
            </a>
          </p>
          <p>Les dades només es desen en aquest dispositiu.</p>
        </div>
      </div>
    </Page>
  );
}

/**
 * Alçada (per a l'IMC de la pestanya Progrés). Es desa en sortir del camp o
 * amb Enter; buit l'esborra. El pes es registra des de Progrés, amb data.
 */
function ProfileSection() {
  const profile = useLiveQuery(() => db.profile.get("me"), []);
  const saved = profile?.heightCm !== undefined ? String(profile.heightCm) : "";
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const value = draft ?? saved;

  async function commit() {
    if (draft === null) return;
    const text = draft.trim();
    if (text === "") {
      await setHeight(undefined, nowMs());
    } else {
      const cm = parseDecimal(text);
      if (cm === undefined || !isPlausibleHeight(cm)) {
        setError("Escriu l'alçada en centímetres (per exemple, 178).");
        return;
      }
      await setHeight(Math.round(cm), nowMs());
    }
    setDraft(null);
    setError(null);
  }

  return (
    <Section
      header="Perfil"
      footer={
        error ? (
          <span role="alert" className="text-danger-ink">
            {error}
          </span>
        ) : (
          "Serveix per calcular l'IMC. El pes corporal es registra des de Progrés."
        )
      }
    >
      <List>
        <ListItem
          leading={
            <IconTile muted>
              <RulerIcon size={18} />
            </IconTile>
          }
          title={<label htmlFor="height-input">Alçada</label>}
          trailing={
            <span className="flex items-center gap-1.5">
              <input
                id="height-input"
                inputMode="numeric"
                autoComplete="off"
                enterKeyHint="done"
                placeholder="—"
                value={value}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setError(null);
                }}
                onBlur={() => void commit()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") {
                    setDraft(null);
                    setError(null);
                  }
                }}
                aria-invalid={error ? true : undefined}
                className="h-9 w-20 rounded-[9px] bg-fill-3 px-2.5 text-right text-body font-semibold text-label tabular-nums outline-hidden transition-[box-shadow,background-color] duration-150 placeholder:font-normal placeholder:text-label-3 focus:bg-surface focus:ring-[1.5px] focus:ring-accent"
              />
              <span aria-hidden="true">cm</span>
            </span>
          }
        />
      </List>
    </Section>
  );
}

/** Descarrega (o comparteix, al mòbil) un fitxer JSON. Torna false si l'usuari ho cancel·la. */
async function shareOrDownload(fileName: string, data: unknown): Promise<boolean> {
  const file = new File([JSON.stringify(data, null, 2)], fileName, { type: "application/json" });
  try {
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file] });
    } else {
      const url = URL.createObjectURL(file);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }
    return true;
  } catch (err) {
    if ((err as DOMException)?.name === "AbortError") return false;
    throw err;
  }
}

/**
 * Plantilles d'entrenament: crear-ne, obrir-ne l'editor, importar-ne o
 * exportar-ne en JSON i, si no n'hi ha cap, afegir-ne de mostra.
 */
function TemplatesSection({ onOpenTemplate }: { onOpenTemplate: (id: string) => void }) {
  const templates = useLiveQuery(() => db.templates.toArray(), []);
  const [status, setStatus] = useState<Status | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const sorted = [...(templates ?? [])].sort((a, b) => a.name.localeCompare(b.name, "ca"));
  // Les mostres sempre hi són; només s'amaguen les que ja tens (pel nom).
  const samples = SAMPLE_TEMPLATES.filter((sample) => !sorted.some((t) => t.name === sample.name));

  async function onNew() {
    const id = await createTemplate({ name: "Nova plantilla", exercises: [] }, nowMs());
    onOpenTemplate(id);
  }

  async function onImport(file: File) {
    const parsed = parseTemplatesFile(await file.text());
    if (!parsed.ok) {
      setStatus({ tone: "error", text: parsed.error });
      return;
    }
    const n = await importTemplates(parsed.value, nowMs());
    setStatus({ tone: "ok", text: n === 1 ? "S'ha importat 1 plantilla." : `S'han importat ${n} plantilles.` });
  }

  async function onExport() {
    const now = nowMs();
    try {
      if (await shareOrDownload(templatesFileName(now), buildTemplatesFile(sorted))) {
        setStatus({ tone: "ok", text: `Desat com a ${templatesFileName(now)}` });
      }
    } catch {
      setStatus({ tone: "error", text: "No s'han pogut exportar les plantilles." });
    }
  }

  return (
    <>
      <Section
        header="Plantilles d'entrenament"
        footer={
          status ? (
            <span className={`flex items-start gap-1.5 ${status.tone === "error" ? "text-danger-ink" : ""}`} role="status">
              {status.tone === "error" ? (
                <WarningIcon size={15} strokeWidth={2} className="mt-px shrink-0" />
              ) : (
                <CheckIcon size={15} strokeWidth={2.2} className="mt-px shrink-0" />
              )}
              {status.text}
            </span>
          ) : (
            "Rutines amb exercicis, sèries i pesos per carregar-les a Avui i anar marcant cada sèrie. El fitxer JSON serveix per compartir-les."
          )
        }
      >
        <div className="space-y-3">
          {sorted.length > 0 && (
            <List>
              {sorted.map((t) => (
                <ListItem
                  key={t.id}
                  title={t.name}
                  titleClassName="font-medium"
                  subtitle={templateSummary(t)}
                  chevron
                  onClick={() => onOpenTemplate(t.id)}
                />
              ))}
            </List>
          )}
          <List>
            <ListItem
              leading={
                <IconTile>
                  <PlusIcon size={18} strokeWidth={2.2} />
                </IconTile>
              }
              title="Nova plantilla"
              onClick={() => void onNew()}
            />
            <ListItem
              leading={
                <IconTile>
                  <ImportIcon size={18} />
                </IconTile>
              }
              title="Importa plantilles"
              onClick={() => fileRef.current?.click()}
              accessory={<ImportDocsLink label="Documentació: quins camps ha de tenir un fitxer de plantilles" />}
            />
            {sorted.length > 0 && (
              <ListItem
                leading={
                  <IconTile>
                    <ExportIcon size={18} />
                  </IconTile>
                }
                title="Exporta plantilles"
                onClick={() => void onExport()}
              />
            )}
          </List>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            aria-label="Fitxer de plantilles"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) void onImport(file);
            }}
          />
        </div>
      </Section>
      {templates && samples.length > 0 && (
        <Section
          header="Plantilles de mostra"
          footer="Rutines per començar. Els pesos són orientatius: ajusta'ls a l'editor."
        >
          <List>
            {samples.map((sample) => (
              <ListItem
                key={sample.name}
                title={sample.name}
                subtitle={templateSummary(sample)}
                trailing={<span className="font-semibold text-label">Afegeix</span>}
                ariaLabel={`Afegeix la plantilla de mostra ${sample.name}`}
                onClick={() => void createTemplate(sample, nowMs())}
              />
            ))}
          </List>
        </Section>
      )}
    </>
  );
}
