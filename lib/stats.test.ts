import { describe, expect, it } from "vitest";
import {
  addDays,
  bodyStats,
  consistency,
  durationByWeekday,
  estimate1RM,
  exerciseProgress,
  exerciseSummaries,
  muscleVolume,
  personalRecords,
  plateaus,
  recentRecords,
  weekStart,
  weekdayIndex,
  weightDrops,
} from "./stats";
import type { Entry, EntrySet } from "./types";

// Dimecres 23 de setembre de 2026, 20:00 (TZ Europe/Madrid, fixat a vitest.setup.ts).
const NOW = new Date(2026, 8, 23, 20, 0).getTime();
let seq = 0;

function at(date: string, hour = 18): number {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(y, m - 1, d, hour).getTime();
}

function entry(
  name: string,
  date: string,
  sets: Omit<EntrySet, "id" | "doneAt">[],
  opts: Partial<Entry> & { minutes?: number } = {},
): Entry {
  const startedAt = at(date);
  const { minutes = 20, ...rest } = opts;
  return {
    id: `e${++seq}`,
    name,
    kind: "reps",
    date,
    startedAt,
    endedAt: startedAt + minutes * 60_000,
    status: "done",
    sets: sets.map((s, i) => ({ id: `s${seq}-${i}`, doneAt: startedAt, ...s })),
    updatedAt: startedAt,
    ...rest,
  };
}

const bench = (date: string, ...weights: number[]) =>
  entry("Press de banca", date, weights.map((weight) => ({ weight, reps: 5 })));

describe("dates", () => {
  it("setmanes de dilluns a diumenge, també en canviar d'any i d'hora", () => {
    expect(weekdayIndex("2026-09-21")).toBe(0); // dilluns
    expect(weekdayIndex("2026-09-27")).toBe(6); // diumenge
    expect(weekStart("2026-09-23")).toBe("2026-09-21");
    expect(weekStart("2027-01-01")).toBe("2026-12-28");
    expect(addDays("2026-10-24", 2)).toBe("2026-10-26"); // canvi d'hora del 25 d'octubre
    expect(addDays("2026-03-28", 2)).toBe("2026-03-30");
  });
});

describe("estimate1RM", () => {
  it("Epley fins a 12 reps", () => {
    expect(estimate1RM(100, 1)).toBe(100);
    expect(estimate1RM(100, 5)).toBeCloseTo(116.67, 2);
    expect(estimate1RM(100, 13)).toBeUndefined();
    expect(estimate1RM(undefined, 5)).toBeUndefined();
  });
});

describe("per exercici", () => {
  const entries = [
    bench("2026-09-01", 60, 70),
    bench("2026-09-08", 65, 75),
    // Dues entrades del mateix exercici el mateix dia compten com una sessió.
    bench("2026-09-15", 70),
    bench("2026-09-15", 80),
    entry("Planxa", "2026-09-15", [{ durationSec: 60 }, { durationSec: 90 }], { kind: "time" }),
  ];

  it("resumeix màxim, mitjana, 1RM i sessions", () => {
    const [plank, press] = [
      exerciseSummaries(entries).find((s) => s.name === "Planxa")!,
      exerciseSummaries(entries).find((s) => s.name === "Press de banca")!,
    ];
    expect(press).toMatchObject({ sessions: 3, lastDate: "2026-09-15", maxWeight: 80, muscle: "pit" });
    expect(press.avgWeight).toBeCloseTo((60 + 70 + 65 + 75 + 70 + 80) / 6);
    expect(press.best1RM).toBeCloseTo(80 * (1 + 5 / 30));
    expect(press.trend).toEqual([70, 75, 80]);
    expect(plank).toMatchObject({ sessions: 1, maxDurationSec: 90, avgDurationSec: 75, muscle: "core" });
  });

  it("progressió: un punt per dia", () => {
    const points = exerciseProgress(entries, { name: "Press de banca", kind: "reps" });
    expect(points.map((p) => [p.date, p.maxWeight, p.sets])).toEqual([
      ["2026-09-01", 70, 2],
      ["2026-09-08", 75, 2],
      ["2026-09-15", 80, 2],
    ]);
  });

  it("rècords: el valor actual i el que va superar", () => {
    const pes = personalRecords(entries).find((r) => r.name === "Press de banca" && r.type === "pes");
    expect(pes).toMatchObject({ value: 80, date: "2026-09-15", previous: 75 });
    const recent = recentRecords([...entries, bench("2026-09-22", 85)], NOW);
    expect(recent.map((r) => [r.type, r.value, r.previous])).toContainEqual(["pes", 85, 80]);
    // La primera vegada no és un rècord «batut».
    expect(recentRecords([bench("2026-09-22", 85)], NOW)).toEqual([]);
  });
});

describe("alertes", () => {
  it("detecta una baixada de pes ≥ 5% a les dues últimes sessions", () => {
    const entries = [
      bench("2026-08-25", 80),
      bench("2026-09-01", 82.5),
      bench("2026-09-08", 85),
      bench("2026-09-15", 77.5),
      bench("2026-09-22", 80),
    ];
    expect(weightDrops(entries, NOW)).toEqual([
      expect.objectContaining({ name: "Press de banca", from: 85, to: 80, lastDate: "2026-09-22" }),
    ]);
    expect(weightDrops(entries, NOW)[0].pct).toBeCloseTo(5.88, 1);
  });

  it("no avisa d'una baixada petita ni d'un exercici abandonat fa temps", () => {
    expect(weightDrops([bench("2026-09-01", 80), bench("2026-09-08", 80), bench("2026-09-15", 78)], NOW)).toEqual([]);
    const old = [bench("2026-05-01", 80), bench("2026-05-08", 80), bench("2026-05-15", 60)];
    expect(weightDrops(old, NOW)).toEqual([]);
  });

  it("detecta 3 sessions seguides sense millorar", () => {
    const entries = [
      bench("2026-08-25", 80),
      bench("2026-09-01", 80),
      bench("2026-09-08", 80),
      bench("2026-09-15", 80),
    ];
    expect(plateaus(entries, NOW)).toEqual([
      expect.objectContaining({ name: "Press de banca", sessionsWithoutProgress: 3, best: 80 }),
    ]);
    // Més reps amb el mateix pes (1RM més alt) sí que és progrés.
    const better = [...entries.slice(0, 3), entry("Press de banca", "2026-09-15", [{ weight: 80, reps: 8 }])];
    expect(plateaus(better, NOW)).toEqual([]);
  });
});

describe("sessions i constància", () => {
  it("durada mitjana per dia de la setmana, sense les tancades automàticament", () => {
    const entries = [
      bench("2026-09-14", 60), // dilluns, 20 min
      entry("Esquats", "2026-09-21", [{ weight: 100, reps: 5 }], { minutes: 40 }), // dilluns, 40 min
      entry("Esquats", "2026-09-22", [{ weight: 100, reps: 5 }], { autoClosed: true }), // dimarts
    ];
    const byDay = durationByWeekday(entries, NOW);
    expect(byDay[0]).toEqual({ weekday: 0, sessions: 2, avgMs: 30 * 60_000 });
    expect(byDay[1]).toEqual({ weekday: 1, sessions: 0, avgMs: 0 });
  });

  it("ratxa de setmanes, mitjana i mapa de calor", () => {
    const entries = [
      bench("2026-09-01", 60), // setmana del 31/8
      bench("2026-09-08", 60), // setmana del 7/9
      bench("2026-09-10", 60),
      bench("2026-09-14", 60), // setmana del 14/9
      bench("2026-09-22", 60), // aquesta setmana
    ];
    const c = consistency(entries, NOW);
    expect(c.sessionsThisWeek).toBe(1);
    expect(c.streakWeeks).toBe(4);
    expect(c.avgPerWeek).toBeCloseTo(5 / 4);
    expect(c.weeks).toHaveLength(12);
    expect(c.weeks[11]).toEqual({ start: "2026-09-21", sessions: 1 });
    expect(c.heatmap).toHaveLength(16);
    expect(c.heatmap[15].map((d) => d.date)).toEqual([
      "2026-09-21",
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
    ]);
    expect(c.heatmap[15][1]).toMatchObject({ volume: 300, sets: 1, future: false });
    expect(c.heatmap[15][3].future).toBe(true);
  });

  it("la setmana en curs sense entrenar no trenca la ratxa", () => {
    const c = consistency([bench("2026-09-08", 60), bench("2026-09-15", 60)], NOW);
    expect(c.sessionsThisWeek).toBe(0);
    expect(c.streakWeeks).toBe(2);
  });
});

describe("grups musculars", () => {
  it("sèries d'aquesta setmana vs. mitjana de les 4 anteriors", () => {
    const entries = [
      bench("2026-09-22", 60, 60, 60),
      bench("2026-09-08", 60, 60, 60, 60),
      entry("El meu exercici", "2026-09-22", [{ reps: 10 }]),
      bench("2026-07-01", 60), // fora de la finestra
    ];
    const loads = muscleVolume(entries, NOW);
    expect(loads.find((l) => l.muscle === "pit")).toEqual({
      muscle: "pit",
      setsThisWeek: 3,
      volumeThisWeek: 900,
      avgSetsPrev4: 1,
    });
    expect(loads.find((l) => l.muscle === "altres")?.setsThisWeek).toBe(1);
  });
});

describe("cos", () => {
  const weights = [
    { id: "a", date: "2026-08-20", kg: 82, updatedAt: 0 },
    { id: "b", date: "2026-09-10", kg: 80.5, updatedAt: 0 },
    { id: "c", date: "2026-09-23", kg: 80, updatedAt: 0 },
  ];

  it("pes actual, canvi a 30 dies, IMC i força relativa", () => {
    const stats = bodyStats(weights, { id: "me", heightCm: 180, updatedAt: 0 }, [bench("2026-09-15", 90)], NOW);
    expect(stats.current?.kg).toBe(80);
    expect(stats.change30).toEqual({ kg: -2, since: "2026-08-20" });
    expect(stats.bmi).toBeCloseTo(80 / 1.8 ** 2, 5);
    expect(stats.relativeStrength).toEqual([
      { name: "Press de banca", best1RM: 105, ratio: 105 / 80 },
    ]);
  });

  it("sense alçada no hi ha IMC; sense pesos, res", () => {
    expect(bodyStats(weights, undefined, [], NOW).bmi).toBeUndefined();
    expect(bodyStats([], undefined, [], NOW)).toEqual({ relativeStrength: [] });
  });
});
