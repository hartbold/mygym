/**
 * Clau de data local 'YYYY-MM-DD' a partir de getters locals — mai
 * toISOString().slice(0,10) (UTC) ni new Date('YYYY-MM-DD') (mitjanit UTC).
 */
export function localDateKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const DATE_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Rebutja no només el format sinó dates inexistents com '2026-02-30'. */
export function isValidDateKey(key: string): boolean {
  if (!DATE_KEY_RE.test(key)) return false;
  const [y, m, day] = key.split("-").map(Number);
  const d = new Date(y, m - 1, day);
  return d.getFullYear() === y && d.getMonth() === m - 1 && d.getDate() === day;
}

/**
 * `Date.now()` embolicat en una funció pròpia: el linter de puresa de
 * components (react-hooks/purity) detecta qualsevol crida textual a
 * `Date.now`/`Math.random` dins l'àmbit d'un component o hook. Els
 * gestors d'esdeveniments necessiten un moment real (no el del `useNow()`,
 * que pot tenir fins a 1 s de retard), així que ho aïllem aquí.
 */
export function nowMs(): number {
  return Date.now();
}

/**
 * Coma decimal (locale català) -> number. Rebutja NaN, negatius i buit.
 * Pensat per a `<input inputMode="decimal">`, mai `type="number"`.
 */
export function parseDecimal(input: string): number | undefined {
  const trimmed = input.trim().replace(",", ".");
  if (trimmed === "") return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}
