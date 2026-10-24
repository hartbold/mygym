import { buildBackup, mergeEnvelope, parseBackupFile, type BackupEnvelope, type ImportSummary } from "./backup";
import { db } from "./db";
import { nowMs } from "./dates";

/*
 * Sincronització amb un WebDAV que configura l'usuari, a l'estil de Zotero:
 * dins l'URL donada, l'app fa servir una carpeta `mygym/` amb un sol fitxer
 * `mygym.json` (el mateix format que les còpies, amb els esborrats). Cada
 * sync baixa el fitxer, el fusiona amb les dades locals (`mergeEnvelope`) i
 * el torna a pujar si hi ha alguna diferència. Com que la fusió és una unió,
 * dos dispositius que pugen alhora no perden res: el que queda trepitjat ho
 * torna a pujar al seu proper sync.
 *
 * La configuració (amb la contrasenya) viu a `localStorage`, no a IndexedDB:
 * així no surt mai a les còpies exportades.
 */

export interface SyncConfig {
  enabled: boolean;
  url: string;
  user: string;
  password: string;
}

export interface SyncState {
  lastSyncAt?: number;
  error?: string;
}

export type SyncErrorKind = "auth" | "network" | "server" | "data";

export class SyncError extends Error {
  constructor(
    readonly kind: SyncErrorKind,
    message: string,
  ) {
    super(message);
  }
}

const CONFIG_KEY = "mygym:sync";
const STATE_KEY = "mygym:syncState";
const FOLDER = "mygym/";
const FILE = "mygym.json";

export function loadSyncConfig(): SyncConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw) as Partial<SyncConfig>;
    if (typeof c.url !== "string") return null;
    return { enabled: c.enabled === true, url: c.url, user: c.user ?? "", password: c.password ?? "" };
  } catch {
    return null;
  }
}

export function saveSyncConfig(config: SyncConfig | null): void {
  try {
    if (config) localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
    else localStorage.removeItem(CONFIG_KEY);
  } catch {
    // Sense emmagatzematge (navegació privada): la sync no es pot recordar.
  }
}

// --- Estat (última sync / últim error), observable des de la UI -----------

const listeners = new Set<() => void>();
let stateCache: SyncState | null = null;

export function getSyncState(): SyncState {
  if (stateCache) return stateCache;
  try {
    stateCache = JSON.parse(localStorage.getItem(STATE_KEY) ?? "{}") as SyncState;
  } catch {
    stateCache = {};
  }
  return stateCache;
}

function setSyncState(state: SyncState): void {
  stateCache = state;
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Igual que a saveSyncConfig.
  }
  for (const l of listeners) l();
}

export function subscribeSyncState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// --- WebDAV ---------------------------------------------------------------

export function folderUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/, "") + "/" + FOLDER;
}

function fileUrl(baseUrl: string): string {
  return folderUrl(baseUrl) + FILE;
}

function basicAuth(user: string, password: string): string {
  const bytes = new TextEncoder().encode(`${user}:${password}`);
  return "Basic " + btoa(String.fromCharCode(...bytes));
}

async function dav(config: SyncConfig, method: string, url: string, init: RequestInit = {}): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      method,
      cache: "no-store",
      credentials: "omit",
      headers: { Authorization: basicAuth(config.user, config.password), ...init.headers },
    });
  } catch {
    // fetch només falla així sense xarxa o quan el navegador bloqueja la
    // resposta (CORS, http des d'https, certificat): no es pot distingir.
    throw new SyncError(
      "network",
      "No s'ha pogut connectar amb el servidor. Comprova l'URL, la connexió, que sigui HTTPS i que permeti CORS.",
    );
  }
  if (response.status === 401 || response.status === 403) {
    throw new SyncError("auth", "Usuari o contrasenya incorrectes.");
  }
  return response;
}

function serverError(response: Response): SyncError {
  return new SyncError("server", `El servidor ha respost ${response.status} ${response.statusText}`.trim() + ".");
}

/** Com «Verify Server» de Zotero: comprova l'accés i si ja hi ha la carpeta. */
export async function verifyServer(config: SyncConfig): Promise<"ok" | "missing-folder"> {
  if (!/^https?:\/\//i.test(config.url.trim())) {
    throw new SyncError("network", "L'URL ha de començar per https://.");
  }
  const response = await dav(config, "PROPFIND", folderUrl(config.url), { headers: { Depth: "0" } });
  if (response.ok || response.status === 207) return "ok";
  if (response.status === 404 || response.status === 409) return "missing-folder";
  throw serverError(response);
}

export async function createFolder(config: SyncConfig): Promise<void> {
  const response = await dav(config, "MKCOL", folderUrl(config.url));
  // 405: ja existeix.
  if (!response.ok && response.status !== 405) throw serverError(response);
}

async function localSnapshot(now: number): Promise<BackupEnvelope> {
  return db.transaction("r", [db.entries, db.bodyWeights, db.profile, db.templates, db.deletions], async () =>
    buildBackup(await db.entries.toArray(), now, {
      bodyWeights: await db.bodyWeights.toArray(),
      profile: await db.profile.get("me"),
      templates: await db.templates.toArray(),
      deletions: await db.deletions.toArray(),
    }),
  );
}

/** JSON amb claus i llistes en ordre fix, per comparar dues còpies pel contingut. */
function canonical(data: BackupEnvelope["data"]): string {
  const byKey = (xs: { id?: string; key?: string }[] | undefined) =>
    [...(xs ?? [])].sort((a, b) => ((a.key ?? a.id ?? "") < (b.key ?? b.id ?? "") ? -1 : 1));
  const sorted = {
    entries: byKey(data.entries),
    bodyWeights: byKey(data.bodyWeights),
    profile: data.profile ?? null,
    templates: byKey(data.templates),
    deletions: byKey(data.deletions),
  };
  return JSON.stringify(sorted, (_k, v: unknown) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v).sort(([a], [b]) => (a < b ? -1 : 1)))
      : v,
  );
}

/** Baixa, fusiona i, si cal, puja. Llança `SyncError`. */
export async function syncWith(config: SyncConfig, now: number): Promise<ImportSummary | null> {
  const url = fileUrl(config.url);
  const got = await dav(config, "GET", url);
  let remote: BackupEnvelope | null = null;
  if (got.ok) {
    const parsed = parseBackupFile(await got.text());
    // Mai es sobreescriu un fitxer remot que no s'entén (podria ser d'una
    // versió més nova de l'app): millor aturar-se i avisar.
    if (!parsed.ok) throw new SyncError("data", `El fitxer del servidor no és vàlid: ${parsed.error}`);
    remote = parsed.value;
  } else if (got.status !== 404) {
    throw serverError(got);
  }

  const summary = remote ? await mergeEnvelope(remote, "sync") : null;
  const local = await localSnapshot(now);
  if (!remote || canonical(remote.data) !== canonical(local.data)) {
    const put = await dav(config, "PUT", url, {
      body: JSON.stringify(local),
      headers: { "Content-Type": "application/json" },
    });
    if (put.status === 404 || put.status === 409) {
      throw new SyncError("server", "Falta la carpeta mygym/ al servidor. Torna a verificar-lo.");
    }
    if (!put.ok) throw serverError(put);
  }
  return summary;
}

// --- Coordinació ----------------------------------------------------------

let running: Promise<void> | null = null;
let again = false;

/**
 * Sincronitza si està activada. Com a molt un sync alhora: si se'n demana un
 * mentre n'hi ha un en marxa, se'n fa un altre en acabar. Mai llança: l'error
 * queda a l'estat (sense xarxa és el cas normal, no cal molestar).
 */
export function requestSync(): Promise<void> {
  if (running) {
    again = true;
    return running;
  }
  const config = loadSyncConfig();
  if (!config?.enabled || !config.url) return Promise.resolve();

  running = (async () => {
    try {
      await syncWith(config, nowMs());
      setSyncState({ lastSyncAt: nowMs() });
    } catch (err) {
      const message = err instanceof SyncError ? err.message : "No s'ha pogut sincronitzar.";
      setSyncState({ ...getSyncState(), error: message });
    } finally {
      running = null;
      if (again) {
        again = false;
        void requestSync();
      }
    }
  })();
  return running;
}
