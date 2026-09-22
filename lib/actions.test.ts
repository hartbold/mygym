import { beforeEach, describe, expect, it } from "vitest";
import {
  addSet,
  closeStaleActive,
  deleteEntry,
  duplicateLastSet,
  finishEntry,
  removeSet,
  STALE_MS,
  startEntry,
  updateEntry,
  updateSet,
} from "./actions";
import { db } from "./db";

beforeEach(async () => {
  await db.entries.clear();
});

describe("startEntry", () => {
  it("creates a new active entry with startedAt/date from openedAt", async () => {
    const openedAt = new Date(2026, 8, 21, 18, 0, 0).getTime();
    const id = await startEntry({ name: "Press banca", kind: "reps", sets: [{ weight: 60, reps: 10 }] }, openedAt);
    const entry = await db.entries.get(id);
    expect(entry?.status).toBe("active");
    expect(entry?.startedAt).toBe(openedAt);
    expect(entry?.date).toBe("2026-09-21");
    expect(entry?.sets).toHaveLength(1);
  });

  it("closes the previous active entry at the moment the sheet was OPENED, not now", async () => {
    const openedAt1 = new Date(2026, 8, 21, 18, 0, 0).getTime();
    const firstId = await startEntry({ name: "Press banca", kind: "reps", sets: [] }, openedAt1);

    // User spends 90s in the modal for the second exercise.
    const openedAt2 = openedAt1 + 90_000;
    await startEntry({ name: "Esquats", kind: "reps", sets: [] }, openedAt2);

    const first = await db.entries.get(firstId);
    expect(first?.status).toBe("done");
    expect(first?.endedAt).toBe(openedAt2); // not openedAt2 + modal-fill time, since we only pass openedAt
  });

  it("never ends the previous entry before its own startedAt", async () => {
    const openedAt1 = 10_000;
    const firstId = await startEntry({ name: "A", kind: "reps", sets: [] }, openedAt1);
    // Pathological: a second openedAt earlier than the first's startedAt should never happen,
    // but the clamp must still hold if it somehow did.
    await startEntry({ name: "B", kind: "reps", sets: [] }, 5_000);
    const first = await db.entries.get(firstId);
    expect(first?.endedAt).toBeGreaterThanOrEqual(first!.startedAt);
  });

  it("cancelling the sheet (never calling startEntry) leaves the active entry untouched", async () => {
    const openedAt = 1000;
    const id = await startEntry({ name: "Press banca", kind: "reps", sets: [] }, openedAt);
    // No second call simulates "Cancel·la" — nothing should change.
    const entry = await db.entries.get(id);
    expect(entry?.status).toBe("active");
  });
});

describe("finishEntry", () => {
  it("closes the active entry explicitly", async () => {
    const openedAt = 1000;
    const id = await startEntry({ name: "Press banca", kind: "reps", sets: [] }, openedAt);
    await finishEntry(id, 5000);
    const entry = await db.entries.get(id);
    expect(entry?.status).toBe("done");
    expect(entry?.endedAt).toBe(5000);
  });

  it("is idempotent: a second call on an already-done entry does nothing", async () => {
    const id = await startEntry({ name: "Press banca", kind: "reps", sets: [] }, 1000);
    await finishEntry(id, 5000);
    await finishEntry(id, 9000);
    const entry = await db.entries.get(id);
    expect(entry?.endedAt).toBe(5000);
  });

  it("never ends before startedAt", async () => {
    const id = await startEntry({ name: "Press banca", kind: "reps", sets: [] }, 10_000);
    await finishEntry(id, 1_000);
    const entry = await db.entries.get(id);
    expect(entry?.endedAt).toBe(10_000);
  });
});

describe("closeStaleActive", () => {
  it("auto-closes an active entry idle for more than 3h, marking autoClosed", async () => {
    const start = 0;
    const id = await startEntry({ name: "Press banca", kind: "reps", sets: [] }, start);
    const now = start + STALE_MS + 1;
    await closeStaleActive(now);
    const entry = await db.entries.get(id);
    expect(entry?.status).toBe("done");
    expect(entry?.autoClosed).toBe(true);
    expect(entry?.endedAt).toBe(entry?.updatedAt);
  });

  it("does not touch an active entry within the threshold", async () => {
    const start = 0;
    const id = await startEntry({ name: "Press banca", kind: "reps", sets: [] }, start);
    await closeStaleActive(STALE_MS - 1);
    const entry = await db.entries.get(id);
    expect(entry?.status).toBe("active");
  });

  it("uses updatedAt (last real activity), not startedAt, as the reference point", async () => {
    const start = 0;
    const id = await startEntry({ name: "Press banca", kind: "reps", sets: [] }, start);
    const activityAt = 1000;
    await addSet(id, { weight: 60, reps: 10 }, activityAt);
    // now is > 3h after start, but only just over 3h after the real last activity too.
    await closeStaleActive(activityAt + STALE_MS - 1);
    expect((await db.entries.get(id))?.status).toBe("active");
    await closeStaleActive(activityAt + STALE_MS + 1);
    expect((await db.entries.get(id))?.status).toBe("done");
  });
});

describe("addSet / updateSet / removeSet", () => {
  it("addSet appends a set and bumps updatedAt", async () => {
    const id = await startEntry({ name: "Press banca", kind: "reps", sets: [] }, 0);
    await addSet(id, { weight: 60, reps: 10 }, 500);
    const entry = await db.entries.get(id);
    expect(entry?.sets).toHaveLength(1);
    expect(entry?.updatedAt).toBe(500);
  });

  it("updateSet patches only the targeted set via read-modify-write, not a full overwrite", async () => {
    const id = await startEntry(
      { name: "Press banca", kind: "reps", sets: [{ weight: 60, reps: 10 }, { weight: 65, reps: 8 }] },
      0,
    );
    const entry = await db.entries.get(id);
    const targetSetId = entry!.sets[1].id;
    await updateSet(id, targetSetId, { weight: 70 }, 1000);
    const after = await db.entries.get(id);
    expect(after?.sets[0].weight).toBe(60); // untouched
    expect(after?.sets[1].weight).toBe(70);
  });

  it("removeSet drops only the targeted set", async () => {
    const id = await startEntry(
      { name: "Press banca", kind: "reps", sets: [{ weight: 60, reps: 10 }, { weight: 65, reps: 8 }] },
      0,
    );
    const entry = await db.entries.get(id);
    await removeSet(id, entry!.sets[0].id, 1000);
    const after = await db.entries.get(id);
    expect(after?.sets).toHaveLength(1);
    expect(after?.sets[0].weight).toBe(65);
  });

  it("is a no-op on a row that no longer exists (deleted concurrently)", async () => {
    const id = await startEntry({ name: "Press banca", kind: "reps", sets: [] }, 0);
    await deleteEntry(id);
    await expect(addSet(id, { weight: 10, reps: 1 }, 100)).resolves.not.toThrow();
    await expect(duplicateLastSet(id, 100)).resolves.toBeUndefined();
  });

  it("updateSet can clear the weight (bodyweight) and change a timed set's duration", async () => {
    const id = await startEntry({ name: "Cinta de córrer", kind: "time", sets: [{ durationSec: 1200, weight: 5 }] }, 0);
    const setId = (await db.entries.get(id))!.sets[0].id;
    await updateSet(id, setId, { weight: undefined, durationSec: 900 }, 1000);
    const after = await db.entries.get(id);
    expect(after?.sets[0].durationSec).toBe(900);
    expect(after?.sets[0].weight).toBeUndefined();
    expect(after?.updatedAt).toBe(1000);
  });
});

describe("duplicateLastSet", () => {
  it("appends a copy of the last set with a new id and returns it", async () => {
    const id = await startEntry(
      { name: "Press banca", kind: "reps", sets: [{ weight: 60, reps: 10 }, { weight: 65, reps: 8 }] },
      0,
    );
    const created = await duplicateLastSet(id, 500);
    const entry = await db.entries.get(id);
    expect(entry?.sets).toHaveLength(3);
    expect(entry?.sets[2]).toEqual(created);
    expect(created).toMatchObject({ weight: 65, reps: 8, doneAt: 500 });
    expect(created?.id).not.toBe(entry?.sets[1].id);
    expect(entry?.updatedAt).toBe(500);
  });

  it("adds an empty set when there are none yet", async () => {
    const id = await startEntry({ name: "Press banca", kind: "reps", sets: [] }, 0);
    const created = await duplicateLastSet(id, 500);
    expect(created).toMatchObject({ weight: undefined, reps: undefined, durationSec: undefined });
    expect((await db.entries.get(id))?.sets).toHaveLength(1);
  });

  it("copies the values of an edit that was issued just before it (not stale UI state)", async () => {
    const id = await startEntry({ name: "Press banca", kind: "reps", sets: [{ weight: 60, reps: 10 }] }, 0);
    const setId = (await db.entries.get(id))!.sets[0].id;
    // La targeta llança l'edició (en perdre el focus) i «+ Sèrie» sense esperar-se.
    const edit = updateSet(id, setId, { weight: 62.5, reps: 7 }, 900);
    const dup = duplicateLastSet(id, 1000);
    await Promise.all([edit, dup]);
    expect(await dup).toMatchObject({ weight: 62.5, reps: 7 });
  });
});

describe("updateEntry", () => {
  it("only changes name/kind, never startedAt/date", async () => {
    const id = await startEntry({ name: "Press banca", kind: "reps", sets: [] }, 0);
    await updateEntry(id, { name: "Press banca inclinat", kind: "reps" }, 1000);
    const entry = await db.entries.get(id);
    expect(entry?.name).toBe("Press banca inclinat");
    expect(entry?.startedAt).toBe(0);
  });
});
