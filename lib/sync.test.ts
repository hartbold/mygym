import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { deleteEntry } from "./actions";
import { buildBackup, mergeEnvelope, parseBackupFile } from "./backup";
import { deleteBodyWeight, logBodyWeight } from "./body";
import { db } from "./db";
import { createFolder, SyncError, syncWith, verifyServer, type SyncConfig } from "./sync";
import { deleteTemplate } from "./templates";
import type { Entry, Template } from "./types";

const config: SyncConfig = { enabled: true, url: "https://dav.test/files/pau/", user: "pau", password: "secret" };
const FILE = "https://dav.test/files/pau/mygym/mygym.json";
const FOLDER = "https://dav.test/files/pau/mygym/";

/** WebDAV mínim en memòria: una carpeta i fitxers. */
function fakeDav(opts: { folder?: boolean } = {}) {
  const files = new Map<string, string>();
  let folder = opts.folder ?? true;
  const calls: string[] = [];
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    const method = init.method ?? "GET";
    calls.push(`${method} ${url}`);
    const auth = (init.headers as Record<string, string>).Authorization;
    if (auth !== "Basic " + btoa("pau:secret")) return new Response(null, { status: 401 });
    if (method === "PROPFIND") return new Response(null, { status: folder ? 207 : 404 });
    if (method === "MKCOL") {
      folder = true;
      return new Response(null, { status: 201 });
    }
    if (method === "GET") {
      const body = files.get(url);
      return body === undefined ? new Response(null, { status: 404 }) : new Response(body, { status: 200 });
    }
    if (method === "PUT") {
      if (!folder) return new Response(null, { status: 409 });
      files.set(url, String(init.body));
      return new Response(null, { status: 201 });
    }
    return new Response(null, { status: 405 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { files, calls };
}

function entry(overrides: Partial<Entry> & Pick<Entry, "id">): Entry {
  return {
    name: "Esquat",
    kind: "reps",
    date: "2026-09-21",
    startedAt: 1000,
    endedAt: 2000,
    status: "done",
    sets: [],
    updatedAt: 1000,
    ...overrides,
  };
}

function template(id: string, updatedAt: number): Template {
  return { id, name: `Plantilla ${id}`, exercises: [], createdAt: 1, updatedAt };
}

async function clearAll() {
  await Promise.all([db.entries, db.bodyWeights, db.profile, db.templates, db.deletions].map((t) => t.clear()));
}

function remote(files: Map<string, string>) {
  const parsed = parseBackupFile(files.get(FILE)!);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value.data;
}

beforeEach(clearAll);
afterEach(() => vi.unstubAllGlobals());

describe("verifyServer", () => {
  it("detecta que falta la carpeta i la crea", async () => {
    const dav = fakeDav({ folder: false });
    expect(await verifyServer(config)).toBe("missing-folder");
    await createFolder(config);
    expect(await verifyServer(config)).toBe("ok");
    expect(dav.calls).toContain(`MKCOL ${FOLDER}`);
  });

  it("tradueix el 401 a un error de credencials", async () => {
    fakeDav();
    await expect(verifyServer({ ...config, password: "dolenta" })).rejects.toMatchObject({ kind: "auth" });
  });

  it("tradueix un error de xarxa (CORS, offline) a un SyncError", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => Promise.reject(new TypeError("Failed to fetch"))));
    const err = await verifyServer(config).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SyncError);
    expect((err as SyncError).kind).toBe("network");
  });
});

describe("syncWith", () => {
  it("puja les dades locals la primera vegada", async () => {
    const dav = fakeDav();
    await db.entries.add(entry({ id: "a" }));
    await syncWith(config, 5000);
    expect(remote(dav.files).entries.map((e) => e.id)).toEqual(["a"]);
  });

  it("un dispositiu buit ho baixa tot, i no torna a pujar si no hi ha canvis", async () => {
    const dav = fakeDav();
    dav.files.set(FILE, JSON.stringify(buildBackup([entry({ id: "a" })], 1, { templates: [template("t", 5)] })));
    await syncWith(config, 5000);
    expect(await db.entries.get("a")).toBeDefined();
    expect(await db.templates.get("t")).toBeDefined();
    // Ja coincideixen: el segon sync només llegeix.
    dav.calls.length = 0;
    await syncWith(config, 6000);
    expect(dav.calls).toEqual([`GET ${FILE}`]);
  });

  it("fusiona en les dues direccions", async () => {
    const dav = fakeDav();
    dav.files.set(FILE, JSON.stringify(buildBackup([entry({ id: "remot" })], 1)));
    await db.entries.add(entry({ id: "local" }));
    await syncWith(config, 5000);
    expect((await db.entries.toArray()).map((e) => e.id).sort()).toEqual(["local", "remot"]);
    expect(remote(dav.files).entries.map((e) => e.id).sort()).toEqual(["local", "remot"]);
  });

  it("un esborrat local s'aplica al servidor i no ressuscita", async () => {
    const dav = fakeDav();
    await db.entries.add(entry({ id: "a" }));
    await syncWith(config, 5000);
    await deleteEntry("a", 6000);
    await syncWith(config, 7000);
    expect(remote(dav.files).entries).toEqual([]);
    expect(await db.entries.get("a")).toBeUndefined();
  });

  it("un esborrat d'un altre dispositiu treu l'element d'aquí", async () => {
    const dav = fakeDav();
    await db.entries.add(entry({ id: "a", updatedAt: 1000 }));
    await db.templates.add(template("t", 1000));
    dav.files.set(
      FILE,
      JSON.stringify(
        buildBackup([], 1, {
          deletions: [
            { key: "entries:a", table: "entries", id: "a", deletedAt: 2000 },
            { key: "templates:t", table: "templates", id: "t", deletedAt: 2000 },
          ],
        }),
      ),
    );
    await syncWith(config, 5000);
    expect(await db.entries.get("a")).toBeUndefined();
    expect(await db.templates.get("t")).toBeUndefined();
  });

  it("una edició posterior a l'esborrat guanya", async () => {
    const dav = fakeDav();
    await db.templates.add(template("t", 3000));
    dav.files.set(
      FILE,
      JSON.stringify(buildBackup([], 1, { deletions: [{ key: "templates:t", table: "templates", id: "t", deletedAt: 2000 }] })),
    );
    await syncWith(config, 5000);
    expect(await db.templates.get("t")).toBeDefined();
  });

  it("el pes corporal s'esborra per data, encara que l'altre dispositiu tingui un altre id", async () => {
    const dav = fakeDav();
    await logBodyWeight("2026-09-20", 80, 1000);
    const [w] = await db.bodyWeights.toArray();
    await deleteBodyWeight(w.id, 2000);
    dav.files.set(
      FILE,
      JSON.stringify(buildBackup([], 1, { bodyWeights: [{ id: "altre", date: "2026-09-20", kg: 80, updatedAt: 1000 }] })),
    );
    await syncWith(config, 5000);
    expect(await db.bodyWeights.toArray()).toEqual([]);
    expect(remote(dav.files).bodyWeights).toBeUndefined();
  });

  it("no sobreescriu mai un fitxer remot que no entén", async () => {
    const dav = fakeDav();
    dav.files.set(FILE, '{"app":"mygym","formatVersion":99}');
    await expect(syncWith(config, 5000)).rejects.toMatchObject({ kind: "data" });
    expect(dav.files.get(FILE)).toBe('{"app":"mygym","formatVersion":99}');
  });

  it("esborrar una plantilla deixa constància per a la sync", async () => {
    await db.templates.add(template("t", 1));
    await deleteTemplate("t", 50);
    expect(await db.deletions.get("templates:t")).toEqual({ key: "templates:t", table: "templates", id: "t", deletedAt: 50 });
  });
});

describe("mergeEnvelope en mode sync", () => {
  const active = entry({ id: "remot", status: "active", endedAt: undefined, updatedAt: 1500 });

  it("manté activa l'entrada activa d'un altre dispositiu si aquí no n'hi ha cap", async () => {
    await mergeEnvelope(buildBackup([active], 1), "sync");
    expect((await db.entries.get("remot"))?.status).toBe("active");
  });

  it("la tanca si aquí ja n'hi ha una d'activa (com a molt una)", async () => {
    await db.entries.add(entry({ id: "local", status: "active", endedAt: undefined }));
    await mergeEnvelope(buildBackup([active], 1), "sync");
    expect((await db.entries.get("remot"))?.status).toBe("done");
    expect(await db.entries.where("status").equals("active").count()).toBe(1);
  });

  it("si no hi ha res nou, no escriu res", async () => {
    await db.entries.add(entry({ id: "a" }));
    const summary = await mergeEnvelope(buildBackup([entry({ id: "a" })], 1), "sync");
    expect(summary).toEqual({ added: 0, updated: 0, skipped: 1, removed: 0 });
  });
});
