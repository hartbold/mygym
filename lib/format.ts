const weightFormatter = new Intl.NumberFormat("ca-ES", { maximumFractionDigits: 1 });
const clockFormatter = new Intl.DateTimeFormat("ca-ES", { hour: "2-digit", minute: "2-digit" });
const dayFormatter = new Intl.DateTimeFormat("ca-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
});
const weekdayFormatter = new Intl.DateTimeFormat("ca-ES", { weekday: "long" });
const weekdayShortFormatter = new Intl.DateTimeFormat("ca-ES", { weekday: "short" });
const dayMonthFormatter = new Intl.DateTimeFormat("ca-ES", { day: "numeric", month: "long" });
const monthYearFormatter = new Intl.DateTimeFormat("ca-ES", { month: "long", year: "numeric" });

function dateFromKey(dateKey: string): Date {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function capitalize(label: string): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}

export function formatWeight(kg: number): string {
  return `${weightFormatter.format(kg)} kg`;
}

/** "2.700", "42,5" — sense unitat, per a xifres destacades. */
export function formatNumber(n: number): string {
  return weightFormatter.format(n);
}

export function formatClock(ts: number): string {
  return clockFormatter.format(new Date(ts));
}

/** Data llegible en català a partir d'una clau 'YYYY-MM-DD'. */
export function formatDayLabel(dateKey: string): string {
  return capitalize(dayFormatter.format(dateFromKey(dateKey)));
}

/** "Diumenge" */
export function formatWeekday(dateKey: string): string {
  return capitalize(weekdayFormatter.format(dateFromKey(dateKey)));
}

/** "dg" (sense el punt final de l'abreviatura). */
export function formatWeekdayShort(dateKey: string): string {
  return weekdayShortFormatter.format(dateFromKey(dateKey)).replace(/\.$/, "");
}

/** "20 de setembre", "1 d’abril" */
export function formatDayMonth(dateKey: string): string {
  return dayMonthFormatter.format(dateFromKey(dateKey));
}

/** "Setembre del 2026" */
export function formatMonthYear(dateKey: string): string {
  return capitalize(monthYearFormatter.format(dateFromKey(dateKey)));
}

/** Durada partida per a xifres destacades: 37min → {37, min}; 1h 5min → {1:05, h}. */
export function durationParts(ms: number): { value: string; unit: string } {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return { value: `${h}:${String(m).padStart(2, "0")}`, unit: "h" };
  if (m > 0) return { value: String(m), unit: "min" };
  return { value: String(totalSeconds % 60), unit: "s" };
}

const NBSP = " ";

/**
 * "1 h 05 min", "45 min", "32 s": espai (no separable) entre xifra i unitat,
 * com a `formatWeight` i a les xifres de `StatGrid`.
 */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}${NBSP}h ${String(m).padStart(2, "0")}${NBSP}min`;
  if (m > 0) return `${m}${NBSP}min`;
  return `${s}${NBSP}s`;
}

/** "1:05" a partir de segons, per al cronòmetre en directe. */
export function formatClockTimer(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
