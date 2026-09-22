import { describe, expect, it } from "vitest";
import { groupSessions, lastOccurrence, recentExercises, selectToday } from "./sessions";
import type { Entry } from "./types";

function makeEntry(overrides: Partial<Entry> & Pick<Entry, "id" | "date" | "startedAt">): Entry {
  return {
    name: "Press banca",
    kind: "reps",
    status: "done",
    sets: [],
    updatedAt: overrides.startedAt,
    ...overrides,
  };
}

describe("groupSessions", () => {
  it("groups entries by their stored date, most recent day first", () => {
    const e1 = makeEntry({ id: "1", date: "2026-09-20", startedAt: 1, endedAt: 2 });
    const e2 = makeEntry({ id: "2", date: "2026-09-21", startedAt: 3, endedAt: 4 });
    const sessions = groupSessions([e1, e2], 100);
    expect(sessions.map((s) => s.date)).toEqual(["2026-09-21", "2026-09-20"]);
  });

  it("sums duration as (endedAt ?? now) - startedAt, skipping autoClosed entries", () => {
    const start = new Date(2026, 8, 21, 10, 0).getTime();
    const end = new Date(2026, 8, 21, 10, 30).getTime();
    const done = makeEntry({ id: "1", date: "2026-09-21", startedAt: start, endedAt: end });
    const stale = makeEntry({
      id: "2",
      date: "2026-09-21",
      startedAt: start,
      endedAt: start,
      autoClosed: true,
    });
    const active = makeEntry({
      id: "3",
      date: "2026-09-21",
      startedAt: start,
      status: "active",
      endedAt: undefined,
    });
    const now = start + 45 * 60 * 1000;
    const [session] = groupSessions([done, stale, active], now);
    // done: 30min + active: 45min (no endedAt yet, uses `now`); stale excluded.
    expect(session.durationMs).toBe(30 * 60 * 1000 + 45 * 60 * 1000);
  });

  it("computes volume only from sets that have both weight and reps", () => {
    const entry = makeEntry({
      id: "1",
      date: "2026-09-21",
      startedAt: 1,
      endedAt: 2,
      sets: [
        { id: "s1", weight: 60, reps: 10, doneAt: 1 },
        { id: "s2", weight: 65, reps: 8, doneAt: 1 },
        { id: "s3", reps: 12, doneAt: 1 }, // bodyweight, no weight
        { id: "s4", durationSec: 30, doneAt: 1 }, // time-based, no volume
      ],
    });
    const [session] = groupSessions([entry], 100);
    expect(session.volumeKg).toBe(60 * 10 + 65 * 8);
    expect(session.setCount).toBe(4);
  });
});

describe("selectToday", () => {
  it("includes an active entry that started yesterday (crossed midnight)", () => {
    const yesterday2340 = new Date(2026, 8, 20, 23, 40).getTime();
    const active = makeEntry({
      id: "1",
      date: "2026-09-20",
      startedAt: yesterday2340,
      status: "active",
      endedAt: undefined,
    });
    const todayAt0005 = new Date(2026, 8, 21, 0, 5).getTime();
    const result = selectToday([active], todayAt0005);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });

  it("excludes a done entry from a different day", () => {
    const yesterday = makeEntry({ id: "1", date: "2026-09-20", startedAt: 1, endedAt: 2 });
    const todayAt0005 = new Date(2026, 8, 21, 0, 5).getTime();
    expect(selectToday([yesterday], todayAt0005)).toHaveLength(0);
  });
});

describe("lastOccurrence", () => {
  it("returns the most recent done entry with the same name and kind", () => {
    const older = makeEntry({ id: "1", date: "2026-09-19", startedAt: 1, endedAt: 2, sets: [{ id: "s", weight: 60, reps: 10, doneAt: 1 }] });
    const newer = makeEntry({ id: "2", date: "2026-09-20", startedAt: 3, endedAt: 4, sets: [{ id: "s", weight: 70, reps: 8, doneAt: 3 }] });
    const other = makeEntry({ id: "3", date: "2026-09-21", startedAt: 5, endedAt: 6, name: "Esquats", sets: [{ id: "s", weight: 100, reps: 5, doneAt: 5 }] });
    const result = lastOccurrence([older, newer, other], "Press banca", "reps");
    expect(result?.id).toBe("2");
  });

  it("ignores an active entry with no committed sets", () => {
    const active = makeEntry({ id: "1", date: "2026-09-21", startedAt: 1, status: "active", sets: [] });
    expect(lastOccurrence([active], "Press banca", "reps")).toBeUndefined();
  });
});

describe("recentExercises", () => {
  it("deduplicates by name+kind, most recent first", () => {
    const a = makeEntry({ id: "1", date: "2026-09-19", startedAt: 1, endedAt: 2, name: "Esquats" });
    const b = makeEntry({ id: "2", date: "2026-09-20", startedAt: 3, endedAt: 4, name: "Press banca" });
    const c = makeEntry({ id: "3", date: "2026-09-21", startedAt: 5, endedAt: 6, name: "Esquats" });
    const result = recentExercises([a, b, c]);
    expect(result).toEqual([
      { name: "Esquats", kind: "reps" },
      { name: "Press banca", kind: "reps" },
    ]);
  });
});
