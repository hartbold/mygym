"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { backupFileName, buildBackup, importBackup, parseBackupFile } from "@/lib/backup";
import { db } from "@/lib/db";
import { nowMs } from "@/lib/dates";
import { CheckIcon, ExportIcon, ImportIcon, InstallIcon, StorageIcon, WarningIcon } from "./icons";
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

/** Rajola d'icona de la fila, com a Configuració d'iOS (sempre negra: un sol color d'acció). */
function IconTile({ children }: { children: ReactNode }) {
  return (
    <span aria-hidden="true" className="grid size-7.5 place-items-center rounded-lg bg-accent text-on-accent">
      {children}
    </span>
  );
}

const TILE_ICON = { size: 18, strokeWidth: 2 } as const;

export function Settings() {
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
    const envelope = buildBackup(entries, now);
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

  const now = nowMs();
  const showIosWarning = isIos && !isStandalone;

  return (
    <Page>
      <NavHeader title="Ajustos" />

      <div className="space-y-8">
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
              <p>
                {lastBackupAt
                  ? `Última còpia: ${lastBackupLabel(lastBackupAt, now)}.`
                  : "Encara no has fet cap còpia de seguretat."}
              </p>
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
                <IconTile>
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

        <Section
          header="Instal·lació"
          footer={
            !isStandalone && !installEvent ? (
              isIos ? (
                <p className="text-pretty">
                  Al Safari, toca Comparteix i després «Afegeix a la pantalla d&apos;inici».
                </p>
              ) : (
                <p className="text-pretty">
                  Fes servir el menú del navegador per instal·lar l&apos;app (pot trigar uns segons
                  a aparèixer després d&apos;obrir la pàgina).
                </p>
              )
            ) : undefined
          }
        >
          <List>
            {installEvent && !isStandalone ? (
              <ListItem
                onClick={onInstallClick}
                leading={
                  <IconTile>
                    <InstallIcon {...TILE_ICON} />
                  </IconTile>
                }
                title="Instal·la MY GYM"
              />
            ) : (
              <ListItem
                leading={
                  <IconTile>
                    <InstallIcon {...TILE_ICON} />
                  </IconTile>
                }
                title="App instal·lada"
                trailing={
                  isStandalone ? (
                    <CheckIcon size={20} strokeWidth={2.4} className="block text-label" />
                  ) : (
                    "No"
                  )
                }
              />
            )}
          </List>
        </Section>

        <div className="px-4 text-center text-footnote text-label-3">
          <p className="font-semibold">MY GYM</p>
          <p>Les dades només es desen en aquest dispositiu.</p>
        </div>
      </div>
    </Page>
  );
}
