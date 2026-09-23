import type { HeatmapDay } from "@/lib/stats";

/*
 * Gràfiques SVG sense dependències, en la mateixa línia sòbria de l'app:
 * traç negre, graella gris molt fina, etiquetes petites en xifres tabulars.
 * Totes porten un `aria-label` amb el resum en text (les dades no s'han de
 * veure per entendre-les).
 */

const AXIS_TEXT = "fill-label-2 text-[10px] tabular-nums";

function dayNumber(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / 86_400_000;
}

/** Tres valors «rodons» per a la graella horitzontal. */
function niceTicks(min: number, max: number): number[] {
  if (min === max) return [min];
  const raw = (max - min) / 2;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let t = start; t <= max + step * 0.001; t += step) ticks.push(t);
  if (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

/**
 * Evolució d'un valor en el temps (eix x proporcional a la data). Etiqueta
 * el darrer punt, que és el que interessa d'un cop d'ull.
 */
export function LineChart({
  points,
  format,
  formatDate,
  ariaLabel,
}: {
  points: { date: string; value: number }[];
  format: (n: number) => string;
  formatDate: (key: string) => string;
  ariaLabel: string;
}) {
  const W = 330;
  const H = 170;
  const pad = { top: 22, right: 14, bottom: 22, left: 40 };
  if (points.length === 0) return null;

  const values = points.map((p) => p.value);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1] === yMin ? yMin + 1 : ticks[ticks.length - 1];
  const x0 = dayNumber(points[0].date);
  const span = dayNumber(points[points.length - 1].date) - x0;
  const x = (key: string) =>
    span === 0 ? (pad.left + W - pad.right) / 2 : pad.left + ((dayNumber(key) - x0) / span) * (W - pad.left - pad.right);
  const y = (v: number) => pad.top + (1 - (v - yMin) / (yMax - yMin)) * (H - pad.top - pad.bottom);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)} ${y(p.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];
  const lastX = x(last.date);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="block h-auto w-full">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={pad.left} x2={W - pad.right} y1={y(t)} y2={y(t)} className="stroke-label-4" strokeWidth={0.5} />
          <text x={pad.left - 6} y={y(t)} dy="0.32em" textAnchor="end" className={AXIS_TEXT}>
            {format(t)}
          </text>
        </g>
      ))}
      <path d={path} fill="none" className="stroke-accent" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      {points.length <= 24 &&
        points.map((p) => <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={2.5} className="fill-accent" />)}
      <circle cx={lastX} cy={y(last.value)} r={4.5} className="fill-accent stroke-surface" strokeWidth={2} />
      <text
        x={lastX}
        y={y(last.value) - 10}
        textAnchor={lastX > W - 40 ? "end" : "middle"}
        className="fill-label text-[11px] font-semibold tabular-nums"
      >
        {format(last.value)}
      </text>
      <text x={pad.left} y={H - 4} className={AXIS_TEXT}>
        {formatDate(points[0].date)}
      </text>
      {points.length > 1 && (
        <text x={W - pad.right} y={H - 4} textAnchor="end" className={AXIS_TEXT}>
          {formatDate(last.date)}
        </text>
      )}
    </svg>
  );
}

/** Columnes verticals (p. ex. sessions per setmana). La darrera, la més fosca. */
export function ColumnChart({
  bars,
  ariaLabel,
  labelEvery = 1,
}: {
  bars: { label: string; value: number }[];
  ariaLabel: string;
  labelEvery?: number;
}) {
  const W = 330;
  const H = 110;
  const pad = { top: 16, bottom: 18 };
  const max = Math.max(1, ...bars.map((b) => b.value));
  const slot = W / bars.length;
  const barW = Math.min(18, slot * 0.6);
  const h = (v: number) => (v / max) * (H - pad.top - pad.bottom);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="block h-auto w-full">
      <line x1={0} x2={W} y1={H - pad.bottom} y2={H - pad.bottom} className="stroke-label-4" strokeWidth={0.5} />
      {bars.map((b, i) => {
        const cx = slot * i + slot / 2;
        const isLast = i === bars.length - 1;
        return (
          <g key={i}>
            {b.value > 0 && (
              <rect
                x={cx - barW / 2}
                y={H - pad.bottom - h(b.value)}
                width={barW}
                height={h(b.value)}
                rx={Math.min(4, barW / 2)}
                className={isLast ? "fill-accent" : "fill-label-3"}
              />
            )}
            {b.value > 0 && (
              <text x={cx} y={H - pad.bottom - h(b.value) - 4} textAnchor="middle" className={AXIS_TEXT}>
                {b.value}
              </text>
            )}
            {(i % labelEvery === 0 || isLast) && (
              <text x={cx} y={H - 4} textAnchor="middle" className={AXIS_TEXT}>
                {b.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Tendència mínima dins d'una fila de llista. */
export function Sparkline({ values, className = "" }: { values: number[]; className?: string }) {
  const W = 56;
  const H = 22;
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const y = (v: number) => (max === min ? H / 2 : 2 + (1 - (v - min) / (max - min)) * (H - 4));
  const path = values.map((v, i) => `${i ? "L" : "M"}${((i / (values.length - 1)) * (W - 4) + 2).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden="true" className={className}>
      <path d={path} fill="none" className="stroke-label-2" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const WEEKDAY_LABELS = ["dl", "", "dc", "", "dv", "", "dg"];

/**
 * Calendari d'entrenaments: una columna per setmana, una fila per dia. La
 * intensitat del quadrat segueix el volum (quartils dels dies entrenats).
 */
export function Heatmap({ weeks, today, ariaLabel }: { weeks: HeatmapDay[][]; today: string; ariaLabel: string }) {
  const cell = 14;
  const gap = 3;
  const left = 18;
  const W = left + weeks.length * (cell + gap);
  const H = 7 * (cell + gap);
  const loads = weeks.flat().filter((d) => d.sets > 0).map((d) => d.volume || d.sets).sort((a, b) => a - b);
  const q = (p: number) => loads[Math.min(loads.length - 1, Math.floor(p * loads.length))] ?? 0;
  const [q1, q2, q3] = [q(0.25), q(0.5), q(0.75)];
  const level = (d: HeatmapDay) => {
    const v = d.volume || d.sets;
    return v <= q1 ? 0.35 : v <= q2 ? 0.55 : v <= q3 ? 0.75 : 1;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={ariaLabel} className="block h-auto w-full">
      {WEEKDAY_LABELS.map((l, i) =>
        l ? (
          <text key={i} x={0} y={i * (cell + gap) + cell / 2} dy="0.32em" className={AXIS_TEXT}>
            {l}
          </text>
        ) : null,
      )}
      {weeks.map((week, w) =>
        week.map((d, i) =>
          d.future ? null : (
            <rect
              key={d.date}
              x={left + w * (cell + gap)}
              y={i * (cell + gap)}
              width={cell}
              height={cell}
              rx={3}
              className={d.sets > 0 ? "fill-accent" : "fill-fill-3"}
              fillOpacity={d.sets > 0 ? level(d) : 1}
              stroke={d.date === today ? "var(--label)" : undefined}
              strokeWidth={d.date === today ? 1.5 : undefined}
            />
          ),
        ),
      )}
    </svg>
  );
}

/** Barra horitzontal fina (0–1) per a files de llista. */
export function Meter({ value, marker }: { value: number; marker?: number }) {
  const pct = (v: number) => `${Math.max(0, Math.min(1, v)) * 100}%`;
  return (
    <span aria-hidden="true" className="relative block h-1.5 w-full rounded-full bg-fill-3">
      <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: pct(value) }} />
      {marker !== undefined && (
        <span className="absolute -inset-y-0.5 w-0.5 rounded-full bg-label-2" style={{ left: pct(marker) }} />
      )}
    </span>
  );
}
