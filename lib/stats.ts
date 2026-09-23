import { muscleGroupOf, type MuscleGroup } from "./catalog-seed";
import { localDateKey } from "./dates";
import { groupSessions } from "./sessions";
import type { BodyWeight, Entry, ExerciseKind, Profile } from "./types";

/*
 * Estadístiques de la pestanya «Progrés». Funcions pures: reben les dades
 * crues i tornen xifres llestes per pintar. Totes les dates són claus locals
 * 'YYYY-MM-DD' (mai UTC), com a la resta de l'app.
 */

// --- Dates -----------------------------------------------------------------

function dateFromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** Suma dies a una clau local (setDate: segur amb els canvis d'hora). */
export function addDays(key: string, days: number): string {
  const d = dateFromKey(key);
  d.setDate(d.getDate() + days);
  return localDateKey(d.getTime());
}

/** 0 = dilluns … 6 = diumenge. */
export function weekdayIndex(key: string): number {
  return (dateFromKey(key).getDay() + 6) % 7;
}

/** Dilluns de la setmana d'una data. */
export function weekStart(key: string): string {
  return addDays(key, -weekdayIndex(key));
}

function daysBetween(from: string, to: string): number {
  return Math.round((dateFromKey(to).getTime() - dateFromKey(from).getTime()) / 86_400_000);
}

// --- Per exercici ----------------------------------------------------------

/**
 * 1RM estimat (Epley). Només amb pes i ≤ 12 reps: per sobre, la fórmula
 * deixa de ser fiable.
 */
export function estimate1RM(weight: number | undefined, reps: number | undefined): number | undefined {
  if (!weight || !reps || reps < 1 || reps > 12) return undefined;
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

/** Tot el que s'ha fet d'un exercici en un dia (poden ser diverses entrades). */
export interface ExerciseSession {
  date: string;
  sets: number;
  maxWeight?: number;
  best1RM?: number;
  /** Σ pes × reps. */
  volume: number;
  totalReps: number;
  bestDurationSec?: number;
}

export interface ExerciseId {
  name: string;
  kind: ExerciseKind;
}

const idKey = (e: ExerciseId) => `${e.kind}\u0000${e.name}`;

function maxOf(a: number | undefined, b: number | undefined): number | undefined {
  if (a === undefined) return b;
  if (b === undefined) return a;
  return Math.max(a, b);
}

/** Sessions de cada exercici, ordenades per data ascendent. */
export function exerciseSessions(entries: Entry[]): Map<string, { id: ExerciseId; sessions: ExerciseSession[] }> {
  const byExercise = new Map<string, { id: ExerciseId; byDate: Map<string, ExerciseSession> }>();
  for (const e of entries) {
    if (e.sets.length === 0) continue;
    const key = idKey(e);
    let ex = byExercise.get(key);
    if (!ex) {
      ex = { id: { name: e.name, kind: e.kind }, byDate: new Map() };
      byExercise.set(key, ex);
    }
    let s = ex.byDate.get(e.date);
    if (!s) {
      s = { date: e.date, sets: 0, volume: 0, totalReps: 0 };
      ex.byDate.set(e.date, s);
    }
    for (const set of e.sets) {
      s.sets++;
      if (set.weight) s.maxWeight = maxOf(s.maxWeight, set.weight);
      if (set.reps) s.totalReps += set.reps;
      if (set.weight && set.reps) s.volume += set.weight * set.reps;
      s.best1RM = maxOf(s.best1RM, estimate1RM(set.weight, set.reps));
      if (set.durationSec) s.bestDurationSec = maxOf(s.bestDurationSec, set.durationSec);
    }
  }
  const result = new Map<string, { id: ExerciseId; sessions: ExerciseSession[] }>();
  for (const [key, ex] of byExercise) {
    const sessions = [...ex.byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
    result.set(key, { id: ex.id, sessions });
  }
  return result;
}

export interface ExerciseSummary extends ExerciseId {
  muscle: MuscleGroup | "altres";
  sessions: number;
  lastDate: string;
  maxWeight?: number;
  /** Mitjana del pes de totes les sèries amb pes. */
  avgWeight?: number;
  best1RM?: number;
  maxDurationSec?: number;
  avgDurationSec?: number;
  /** Valor principal de cada sessió (pes màxim o millor durada), per a l'sparkline. */
  trend: number[];
}

/** Resum per exercici, del més recent al més antic. */
export function exerciseSummaries(entries: Entry[]): ExerciseSummary[] {
  const weights = new Map<string, number[]>();
  const durations = new Map<string, number[]>();
  const push = (map: Map<string, number[]>, key: string, v: number) => {
    const list = map.get(key);
    if (list) list.push(v);
    else map.set(key, [v]);
  };
  for (const e of entries) {
    for (const set of e.sets) {
      if (set.weight) push(weights, idKey(e), set.weight);
      if (set.durationSec) push(durations, idKey(e), set.durationSec);
    }
  }
  const mean = (xs: number[] | undefined) => (xs?.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);

  const summaries: ExerciseSummary[] = [];
  for (const [key, { id, sessions }] of exerciseSessions(entries)) {
    const summary: ExerciseSummary = {
      ...id,
      muscle: muscleGroupOf(id),
      sessions: sessions.length,
      lastDate: sessions[sessions.length - 1].date,
      avgWeight: mean(weights.get(key)),
      avgDurationSec: mean(durations.get(key)),
      trend: [],
    };
    for (const s of sessions) {
      summary.maxWeight = maxOf(summary.maxWeight, s.maxWeight);
      summary.best1RM = maxOf(summary.best1RM, s.best1RM);
      summary.maxDurationSec = maxOf(summary.maxDurationSec, s.bestDurationSec);
      const main = id.kind === "time" ? s.bestDurationSec : s.maxWeight;
      if (main !== undefined) summary.trend.push(main);
    }
    summaries.push(summary);
  }
  return summaries.sort((a, b) => (a.lastDate < b.lastDate ? 1 : a.lastDate > b.lastDate ? -1 : a.name.localeCompare(b.name)));
}

export function exerciseProgress(entries: Entry[], id: ExerciseId): ExerciseSession[] {
  return exerciseSessions(entries.filter((e) => e.name === id.name && e.kind === id.kind)).get(idKey(id))?.sessions ?? [];
}

// --- Rècords ---------------------------------------------------------------

export type RecordType = "pes" | "1rm" | "volum" | "durada";

export interface PersonalRecord extends ExerciseId {
  type: RecordType;
  value: number;
  date: string;
  /** Millor valor anterior (undefined si és la primera vegada). */
  previous?: number;
}

function sessionValue(s: ExerciseSession, type: RecordType): number | undefined {
  if (type === "pes") return s.maxWeight;
  if (type === "1rm") return s.best1RM;
  if (type === "volum") return s.volume || undefined;
  return s.bestDurationSec;
}

const RECORD_TYPES: Record<ExerciseKind, RecordType[]> = {
  reps: ["pes", "1rm", "volum"],
  time: ["durada"],
};

/** Rècord actual de cada exercici i tipus, amb el valor que va superar. */
export function personalRecords(entries: Entry[]): PersonalRecord[] {
  const records: PersonalRecord[] = [];
  for (const { id, sessions } of exerciseSessions(entries).values()) {
    for (const type of RECORD_TYPES[id.kind]) {
      let best: number | undefined;
      let record: PersonalRecord | undefined;
      for (const s of sessions) {
        const v = sessionValue(s, type);
        if (v === undefined) continue;
        if (best === undefined || v > best) {
          record = { ...id, type, value: v, date: s.date, previous: best };
          best = v;
        }
      }
      if (record) records.push(record);
    }
  }
  return records;
}

/**
 * Rècords batuts en els últims `days` dies (inclòs avui). No compta la
 * primera vegada que es fa un exercici: allò no és superar-se.
 */
export function recentRecords(entries: Entry[], now: number, days = 7): PersonalRecord[] {
  const since = addDays(localDateKey(now), -(days - 1));
  return personalRecords(entries)
    .filter((r) => r.previous !== undefined && r.date >= since)
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
}

// --- Alertes: baixades i estancaments --------------------------------------

/** Una alerta només té sentit si l'exercici s'ha fet fa poc. */
const ALERT_WINDOW_DAYS = 45;

export interface WeightDrop extends ExerciseId {
  from: number;
  to: number;
  /** Percentatge de baixada (positiu). */
  pct: number;
  lastDate: string;
}

/**
 * Exercicis on el pes màxim de les 2 últimes sessions ha baixat un 5% o més
 * respecte del màxim de les 4 sessions anteriors.
 */
export function weightDrops(entries: Entry[], now: number): WeightDrop[] {
  const today = localDateKey(now);
  const drops: WeightDrop[] = [];
  for (const { id, sessions } of exerciseSessions(entries).values()) {
    if (id.kind !== "reps") continue;
    const weighted = sessions.filter((s) => s.maxWeight !== undefined);
    if (weighted.length < 3) continue;
    const last = weighted[weighted.length - 1];
    if (daysBetween(last.date, today) > ALERT_WINDOW_DAYS) continue;
    const recent = weighted.slice(-2);
    const prior = weighted.slice(-6, -2);
    const to = Math.max(...recent.map((s) => s.maxWeight!));
    const from = Math.max(...prior.map((s) => s.maxWeight!));
    if (to <= from * 0.95) {
      drops.push({ ...id, from, to, pct: ((from - to) / from) * 100, lastDate: last.date });
    }
  }
  return drops.sort((a, b) => b.pct - a.pct);
}

export interface Plateau extends ExerciseId {
  /** Sessions seguides sense millorar ni el pes màxim ni l'1RM. */
  sessionsWithoutProgress: number;
  best: number;
  lastDate: string;
}

/** Exercicis amb 3 o més sessions seguides sense cap millora. */
export function plateaus(entries: Entry[], now: number): Plateau[] {
  const today = localDateKey(now);
  const dropped = new Set(weightDrops(entries, now).map(idKey));
  const result: Plateau[] = [];
  for (const { id, sessions } of exerciseSessions(entries).values()) {
    if (id.kind !== "reps" || dropped.has(idKey(id))) continue;
    const weighted = sessions.filter((s) => s.maxWeight !== undefined);
    if (weighted.length < 4) continue;
    const last = weighted[weighted.length - 1];
    if (daysBetween(last.date, today) > ALERT_WINDOW_DAYS) continue;
    let bestW = -Infinity;
    let best1 = -Infinity;
    let lastImprovement = 0;
    weighted.forEach((s, i) => {
      const w = s.maxWeight ?? -Infinity;
      const r = s.best1RM ?? -Infinity;
      if (w > bestW || r > best1) lastImprovement = i;
      bestW = Math.max(bestW, w);
      best1 = Math.max(best1, r);
    });
    const since = weighted.length - 1 - lastImprovement;
    if (since >= 3) result.push({ ...id, sessionsWithoutProgress: since, best: bestW, lastDate: last.date });
  }
  return result.sort((a, b) => b.sessionsWithoutProgress - a.sessionsWithoutProgress);
}

// --- Sessions i constància -------------------------------------------------

export interface WeekdayDuration {
  /** 0 = dilluns … 6 = diumenge. */
  weekday: number;
  avgMs: number;
  sessions: number;
}

/**
 * Durada mitjana de sessió per dia de la setmana. Les entrades tancades
 * automàticament no compten (vegeu `groupSessions`); una sessió sense cap
 * durada fiable tampoc.
 */
export function durationByWeekday(entries: Entry[], now: number): WeekdayDuration[] {
  const totals = Array.from({ length: 7 }, (_, weekday) => ({ weekday, totalMs: 0, sessions: 0 }));
  for (const s of groupSessions(entries, now)) {
    if (s.durationMs <= 0) continue;
    const t = totals[weekdayIndex(s.date)];
    t.totalMs += s.durationMs;
    t.sessions++;
  }
  return totals.map((t) => ({ weekday: t.weekday, sessions: t.sessions, avgMs: t.sessions ? t.totalMs / t.sessions : 0 }));
}

export interface HeatmapDay {
  date: string;
  volume: number;
  sets: number;
  /** Dia encara per venir (setmana actual). */
  future: boolean;
}

export interface Consistency {
  sessionsThisWeek: number;
  /** Setmanes seguides amb almenys una sessió (la setmana en curs compta si ja n'hi ha). */
  streakWeeks: number;
  /** Mitjana de sessions per setmana de les últimes 12 (o des de la primera, si fa menys). */
  avgPerWeek: number;
  /** Últimes 12 setmanes, de la més antiga a l'actual. */
  weeks: { start: string; sessions: number }[];
  /** 16 setmanes × 7 dies, de dilluns a diumenge, de la més antiga a l'actual. */
  heatmap: HeatmapDay[][];
}

export function consistency(entries: Entry[], now: number): Consistency {
  const today = localDateKey(now);
  const thisWeek = weekStart(today);
  const sessionDates = new Set(entries.filter((e) => e.sets.length > 0).map((e) => e.date));

  const perWeek = new Map<string, number>();
  for (const d of sessionDates) perWeek.set(weekStart(d), (perWeek.get(weekStart(d)) ?? 0) + 1);

  const weeks = Array.from({ length: 12 }, (_, i) => {
    const start = addDays(thisWeek, (i - 11) * 7);
    return { start, sessions: perWeek.get(start) ?? 0 };
  });

  let streakWeeks = 0;
  // Si aquesta setmana encara no s'ha entrenat, la ratxa no es trenca fins que s'acabi.
  let cursor = perWeek.has(thisWeek) ? thisWeek : addDays(thisWeek, -7);
  while (perWeek.has(cursor)) {
    streakWeeks++;
    cursor = addDays(cursor, -7);
  }

  const first = [...sessionDates].sort()[0];
  const weeksSinceFirst = first ? daysBetween(weekStart(first), thisWeek) / 7 + 1 : 0;
  const span = Math.min(12, weeksSinceFirst);
  const inSpan = weeks.slice(12 - span).reduce((n, w) => n + w.sessions, 0);

  const perDay = new Map<string, { volume: number; sets: number }>();
  for (const e of entries) {
    const d = perDay.get(e.date) ?? { volume: 0, sets: 0 };
    for (const set of e.sets) {
      d.sets++;
      if (set.weight && set.reps) d.volume += set.weight * set.reps;
    }
    perDay.set(e.date, d);
  }
  const heatmap = Array.from({ length: 16 }, (_, w) =>
    Array.from({ length: 7 }, (_, day) => {
      const date = addDays(thisWeek, (w - 15) * 7 + day);
      const d = perDay.get(date);
      return { date, volume: d?.volume ?? 0, sets: d?.sets ?? 0, future: date > today };
    }),
  );

  return {
    sessionsThisWeek: perWeek.get(thisWeek) ?? 0,
    streakWeeks,
    avgPerWeek: span ? inSpan / span : 0,
    weeks,
    heatmap,
  };
}

// --- Grups musculars -------------------------------------------------------

export interface MuscleLoad {
  muscle: MuscleGroup | "altres";
  setsThisWeek: number;
  volumeThisWeek: number;
  /** Mitjana de sèries per setmana de les 4 setmanes anteriors. */
  avgSetsPrev4: number;
}

/** Sèries per grup muscular aquesta setmana vs. la mitjana de les 4 anteriors. */
export function muscleVolume(entries: Entry[], now: number): MuscleLoad[] {
  const thisWeek = weekStart(localDateKey(now));
  const prevStart = addDays(thisWeek, -28);
  const loads = new Map<MuscleGroup | "altres", MuscleLoad>();
  for (const e of entries) {
    if (e.date < prevStart || e.sets.length === 0) continue;
    const muscle = muscleGroupOf(e);
    const load = loads.get(muscle) ?? { muscle, setsThisWeek: 0, volumeThisWeek: 0, avgSetsPrev4: 0 };
    const volume = e.sets.reduce((v, s) => v + (s.weight && s.reps ? s.weight * s.reps : 0), 0);
    if (e.date >= thisWeek) {
      load.setsThisWeek += e.sets.length;
      load.volumeThisWeek += volume;
    } else {
      load.avgSetsPrev4 += e.sets.length / 4;
    }
    loads.set(muscle, load);
  }
  return [...loads.values()].sort(
    (a, b) => b.setsThisWeek - a.setsThisWeek || b.avgSetsPrev4 - a.avgSetsPrev4,
  );
}

// --- Cos ------------------------------------------------------------------

/** Exercicis de referència per a la força relativa, per ordre de preferència. */
const MAIN_LIFTS = ["Press de banca", "Esquats", "Pes mort", "Press militar"];

export interface BodyStats {
  current?: BodyWeight;
  /** Diferència amb el registre de fa ~30 dies (o el més antic dels últims 30). */
  change30?: { kg: number; since: string };
  bmi?: number;
  /** Millor 1RM estimat / pes corporal. */
  relativeStrength: { name: string; ratio: number; best1RM: number }[];
}

export function bodyStats(weights: BodyWeight[], profile: Profile | undefined, entries: Entry[], now: number): BodyStats {
  const sorted = [...weights].sort((a, b) => (a.date < b.date ? -1 : 1));
  const current = sorted[sorted.length - 1];
  const stats: BodyStats = { current, relativeStrength: [] };
  if (!current) return stats;

  const target = addDays(localDateKey(now), -30);
  const reference = [...sorted].reverse().find((w) => w.date <= target) ?? sorted.find((w) => w !== current);
  if (reference && reference !== current) stats.change30 = { kg: current.kg - reference.kg, since: reference.date };

  if (profile?.heightCm) {
    const m = profile.heightCm / 100;
    stats.bmi = current.kg / (m * m);
  }

  const summaries = exerciseSummaries(entries).filter((s) => s.kind === "reps" && s.best1RM);
  const main = MAIN_LIFTS.map((n) => summaries.find((s) => s.name === n)).filter((s) => s !== undefined);
  const chosen = main.length ? main : [...summaries].sort((a, b) => b.best1RM! - a.best1RM!).slice(0, 3);
  stats.relativeStrength = chosen.map((s) => ({ name: s.name, best1RM: s.best1RM!, ratio: s.best1RM! / current.kg }));
  return stats;
}
