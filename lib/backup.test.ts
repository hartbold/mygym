import { beforeEach, describe, expect, it } from "vitest";
import { buildBackup, importBackup, parseBackupFile, validateBackup } from "./backup";
import { db } from "./db";
import type { Entry } from "./types";

beforeEach(async () => {
  await db.entries.clear();
  await db.bodyWeights.clear();
  await db.profile.clear();
});

function entry(overrides: Partial<Entry> & Pick<Entry, "id">): Entry {
  return {
    name: "Press banca",
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

describe("validateBackup", () => {
  it("accepts a well-formed envelope", () => {
    const envelope = buildBackup([entry({ id: "1" })], 5000);
    const result = validateBackup(envelope);
    expect(result.ok).toBe(true);
  });

  it("rejects a different app's file", () => {
    const result = validateBackup({ app: "other", formatVersion: 1, exportedAt: "x", data: { entries: [] } });
    expect(result.ok).toBe(false);
  });

  it("rejects an unknown format version", () => {
    const result = validateBackup({ app: "mygym", formatVersion: 3, exportedAt: "x", data: { entries: [] } });
    expect(result.ok).toBe(false);
  });

  it("rejects an active entry that carries endedAt", () => {
    const bad = entry({ id: "1", status: "active", endedAt: 2000 });
    const result = validateBackup(buildBackup([bad], 5000));
    expect(result.ok).toBe(false);
  });

  it("rejects a done entry with endedAt before startedAt", () => {
    const bad = entry({ id: "1", status: "done", startedAt: 2000, endedAt: 1000 });
    const result = validateBackup(buildBackup([bad], 5000));
    expect(result.ok).toBe(false);
  });

  it("rejects a date key that doesn't correspond to a real date", () => {
    const bad = entry({ id: "1", date: "2026-02-30" });
    const result = validateBackup(buildBackup([bad], 5000));
    expect(result.ok).toBe(false);
  });

  it("rejects a negative set weight", () => {
    const bad = entry({ id: "1", sets: [{ id: "s1", weight: -10, doneAt: 1000 }] });
    const result = validateBackup(buildBackup([bad], 5000));
    expect(result.ok).toBe(false);
  });
});

describe("parseBackupFile", () => {
  it("handles unparsable JSON gracefully", () => {
    const result = parseBackupFile("{not json");
    expect(result.ok).toBe(false);
  });
});

describe("importBackup (merge-only)", () => {
  it("adds entries with unknown ids", async () => {
    const envelope = buildBackup([entry({ id: "new-1" })], 5000);
    const summary = await importBackup(envelope);
    expect(summary).toEqual({ added: 1, updated: 0, skipped: 0 });
    expect(await db.entries.get("new-1")).toBeDefined();
  });

  it("for an existing id, the higher updatedAt wins and the lower is skipped without deleting anything", async () => {
    await db.entries.add(entry({ id: "1", name: "Local version", updatedAt: 100 }));

    const newer = buildBackup([entry({ id: "1", name: "Newer from backup", updatedAt: 200 })], 5000);
    await importBackup(newer);
    expect((await db.entries.get("1"))?.name).toBe("Newer from backup");

    const older = buildBackup([entry({ id: "1", name: "Stale from another backup", updatedAt: 50 })], 5000);
    const summary = await importBackup(older);
    expect(summary.skipped).toBe(1);
    expect((await db.entries.get("1"))?.name).toBe("Newer from backup");
  });

  it("never deletes an entry that isn't present in the imported file", async () => {
    await db.entries.add(entry({ id: "keep-me" }));
    await importBackup(buildBackup([entry({ id: "other" })], 5000));
    expect(await db.entries.get("keep-me")).toBeDefined();
  });

  it("coerces an imported active entry to done, preserving the at-most-one-active invariant", async () => {
    const activeRaw: Entry = {
      id: "was-active",
      name: "Esquats",
      kind: "reps",
      date: "2026-09-21",
      startedAt: 1000,
      status: "active",
      sets: [{ id: "s1", weight: 100, reps: 5, doneAt: 1500 }],
      updatedAt: 1500,
    };
    await importBackup(buildBackup([activeRaw], 5000));
    const imported = await db.entries.get("was-active");
    expect(imported?.status).toBe("done");
    expect(imported?.endedAt).toBeGreaterThanOrEqual(imported!.startedAt);

    const actives = await db.entries.where("status").equals("active").toArray();
    expect(actives).toHaveLength(0);
  });
});

describe("format v2: pes corporal i perfil", () => {
  it("continua acceptant còpies v1 (només entrades)", () => {
    const v1 = { app: "mygym", formatVersion: 1, exportedAt: "x", data: { entries: [entry({ id: "1" })] } };
    const result = validateBackup(v1);
    expect(result.ok && result.value.data.entries).toHaveLength(1);
  });

  it("fa l'anada i tornada del pes i l'alçada", async () => {
    const envelope = buildBackup([], 5000, {
      bodyWeights: [{ id: "w1", date: "2026-09-20", kg: 80.5, updatedAt: 10 }],
      profile: { id: "me", heightCm: 178, updatedAt: 10 },
    });
    const parsed = parseBackupFile(JSON.stringify(envelope));
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    await importBackup(parsed.value);
    expect(await db.bodyWeights.toArray()).toEqual([{ id: "w1", date: "2026-09-20", kg: 80.5, updatedAt: 10 }]);
    expect(await db.profile.get("me")).toEqual({ id: "me", heightCm: 178, updatedAt: 10 });
  });

  it("fusiona el pes per data: guanya el més recent, encara que l'id sigui un altre", async () => {
    await db.bodyWeights.add({ id: "local", date: "2026-09-20", kg: 81, updatedAt: 50 });
    await importBackup(buildBackup([], 0, { bodyWeights: [{ id: "remote", date: "2026-09-20", kg: 79, updatedAt: 100 }] }));
    expect(await db.bodyWeights.toArray()).toEqual([{ id: "local", date: "2026-09-20", kg: 79, updatedAt: 100 }]);
    await importBackup(buildBackup([], 0, { bodyWeights: [{ id: "old", date: "2026-09-20", kg: 90, updatedAt: 10 }] }));
    expect((await db.bodyWeights.get("local"))?.kg).toBe(79);
  });

  it("rebutja un pes no vàlid", () => {
    const bad = buildBackup([], 0, { bodyWeights: [{ id: "w", date: "2026-02-30", kg: 80, updatedAt: 1 }] });
    expect(validateBackup(bad).ok).toBe(false);
  });
});
