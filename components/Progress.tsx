"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState, type ReactNode } from "react";
import { MUSCLE_LABELS } from "@/lib/catalog-seed";
import { db } from "@/lib/db";
import { localDateKey } from "@/lib/dates";
import {
  formatClockTimer,
  formatDayMonth,
  formatDuration,
  formatNumber,
  formatShortDate,
  formatWeekdayShort,
} from "@/lib/format";
import {
  bodyStats,
  consistency,
  durationByWeekday,
  exerciseSummaries,
  muscleVolume,
  plateaus,
  recentRecords,
  weightDrops,
  type ExerciseId,
  type PersonalRecord,
  type RecordType,
} from "@/lib/stats";
import type { BodyWeight, Entry } from "@/lib/types";
import { BodyWeightSheet } from "./BodyWeightSheet";
import { ColumnChart, Heatmap, LineChart, Meter, Sparkline } from "./charts";
import { ChartIcon, PlateauIcon, PlusIcon, ScaleIcon, TrendDownIcon, TrophyIcon, type IconProps } from "./icons";
import { Button, CARD, EmptyState, List, ListItem, NavHeader, Page, Section, StatGrid } from "./ui";

const WEEKDAYS = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres", "Dissabte", "Diumenge"];
const WEEKDAYS_SHORT = ["Dl", "Dt", "Dc", "Dj", "Dv", "Ds", "Dg"];

export const RECORD_LABELS: Record<RecordType, string> = {
  pes: "Pes màxim",
  "1rm": "1RM estimat",
  volum: "Volum d'una sessió",
  durada: "Millor temps",
};

export function formatRecord(r: Pick<PersonalRecord, "type" | "value">): string {
  if (r.type === "durada") return formatClockTimer(r.value);
  return `${formatNumber(Math.round(r.value * 10) / 10)} kg`;
}

/** Data relativa curta: «avui», «ahir», «dl 21 de setembre». */
export function relativeDay(key: string, now: number): string {
  const today = localDateKey(now);
  if (key === today) return "avui";
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  if (key === localDateKey(d.getTime())) return "ahir";
  return `${formatWeekdayShort(key)} ${formatDayMonth(key)}`;
}

function AlertIcon({ icon: Icon }: { icon: (p: IconProps) => ReactNode }) {
  return (
    <span className="grid size-[30px] place-items-center rounded-[8px] bg-fill-3 text-label">
      <Icon size={18} strokeWidth={1.9} />
    </span>
  );
}

export function Progress({
  entries,
  now,
  loaded,
  onOpenExercise,
}: {
  entries: Entry[];
  now: number;
  loaded: boolean;
  onOpenExercise: (id: ExerciseId) => void;
}) {
  const weights = useLiveQuery(() => db.bodyWeights.orderBy("date").toArray(), []) ?? [];
  const profile = useLiveQuery(() => db.profile.get("me"), []);
  const [weightSheet, setWeightSheet] = useState<{ open: boolean; editing?: BodyWeight }>({ open: false });

  const trainingDays = new Set(entries.filter((e) => e.sets.length > 0).map((e) => e.date)).size;
  const enoughData = trainingDays >= 2;
  const today = now > 0 ? localDateKey(now) : "";

  return (
    <Page>
      <NavHeader title="Progrés" />
      <div className="space-y-8">
        {!enoughData && loaded && (
          <EmptyState icon={<ChartIcon size={44} strokeWidth={1.5} />} title="Encara no hi ha prou dades">
            Quan hagis registrat un parell de sessions, aquí veuràs rècords, constància i l&apos;evolució de cada
            exercici.
          </EmptyState>
        )}
        {enoughData && now > 0 && (
          <TrainingStats entries={entries} now={now} today={today} onOpenExercise={onOpenExercise} />
        )}
        {now > 0 && (
          <BodySection
            weights={weights}
            heightCm={profile?.heightCm}
            entries={entries}
            now={now}
            onLog={() => setWeightSheet({ open: true })}
            onEdit={(w) => setWeightSheet({ open: true, editing: w })}
          />
        )}
      </div>
      <BodyWeightSheet
        open={weightSheet.open}
        editing={weightSheet.editing}
        onClose={() => setWeightSheet({ open: false })}
      />
    </Page>
  );
}

function TrainingStats({
  entries,
  now,
  today,
  onOpenExercise,
}: {
  entries: Entry[];
  now: number;
  today: string;
  onOpenExercise: (id: ExerciseId) => void;
}) {
  const records = recentRecords(entries, now);
  const drops = weightDrops(entries, now);
  const stalls = plateaus(entries, now);
  const c = consistency(entries, now);
  const byWeekday = durationByWeekday(entries, now);
  const maxWeekday = Math.max(1, ...byWeekday.map((d) => d.avgMs));
  const loads = muscleVolume(entries, now);
  const maxSets = Math.max(1, ...loads.map((l) => Math.max(l.setsThisWeek, l.avgSetsPrev4)));
  const summaries = exerciseSummaries(entries);

  // Un sol avís de rècord per exercici (el tipus més rellevant primer).
  const recordsByExercise = new Map<string, PersonalRecord[]>();
  for (const r of records) {
    const key = `${r.kind}\u0000${r.name}`;
    recordsByExercise.set(key, [...(recordsByExercise.get(key) ?? []), r]);
  }
  const alerts = [
    ...[...recordsByExercise.values()].slice(0, 4).map((rs) => {
      const r = rs[0];
      return (
        <ListItem
          key={`r-${r.kind}-${r.name}`}
          leading={<AlertIcon icon={TrophyIcon} />}
          title={`Rècord a ${r.name}`}
          subtitle={`${rs.map((x) => `${RECORD_LABELS[x.type]}: ${formatRecord(x)}`).join(" · ")} · ${relativeDay(r.date, now)}`}
          chevron
          onClick={() => onOpenExercise(r)}
        />
      );
    }),
    ...drops.map((d) => (
      <ListItem
        key={`d-${d.name}`}
        leading={<AlertIcon icon={TrendDownIcon} />}
        title={`Baixada a ${d.name}`}
        subtitle={`Últimes sessions: ${formatNumber(d.to)} kg, abans ${formatNumber(d.from)} kg (−${formatNumber(Math.round(d.pct))} %)`}
        chevron
        onClick={() => onOpenExercise(d)}
      />
    )),
    ...stalls.map((p) => (
      <ListItem
        key={`p-${p.name}`}
        leading={<AlertIcon icon={PlateauIcon} />}
        title={`Estancament a ${p.name}`}
        subtitle={`${p.sessionsWithoutProgress} sessions sense superar ${formatNumber(p.best)} kg`}
        chevron
        onClick={() => onOpenExercise(p)}
      />
    )),
  ];

  return (
    <>
      {alerts.length > 0 && (
        <Section header="Novetats">
          <List>{alerts}</List>
        </Section>
      )}

      <Section header="Constància">
        <div className="space-y-3">
          <StatGrid
            items={[
              { label: "Aquesta setmana", value: String(c.sessionsThisWeek), unit: c.sessionsThisWeek === 1 ? "sessió" : "sessions" },
              { label: "Ratxa", value: String(c.streakWeeks), unit: "setm." },
              { label: "Mitjana", value: formatNumber(Math.round(c.avgPerWeek * 10) / 10), unit: "/setm." },
            ]}
          />
          <div className={`${CARD} px-4 py-4`}>
            <p className="mb-3 text-footnote font-medium text-label-2">Últimes 16 setmanes</p>
            <Heatmap
              weeks={c.heatmap}
              today={today}
              ariaLabel={`Calendari d'entrenaments: ${c.heatmap.flat().filter((d) => d.sets > 0).length} dies entrenats en 16 setmanes.`}
            />
            <p className="mt-5 mb-2 text-footnote font-medium text-label-2">Sessions per setmana</p>
            <ColumnChart
              bars={c.weeks.map((w) => ({ label: formatShortDate(w.start), value: w.sessions }))}
              labelEvery={3}
              ariaLabel={`Sessions per setmana, últimes 12 setmanes: ${c.weeks.map((w) => w.sessions).join(", ")}.`}
            />
          </div>
        </div>
      </Section>

      <Section header="Durada mitjana per dia" footer="Mitjana de les sessions de cada dia de la setmana.">
        <ul className={`${CARD} space-y-2.5 px-4 py-4`}>
          {byWeekday.map((d) => (
            <li key={d.weekday} className="grid grid-cols-[2.25rem_1fr_4.5rem] items-center gap-3">
              <span className="text-subhead font-medium" aria-label={WEEKDAYS[d.weekday]}>
                {WEEKDAYS_SHORT[d.weekday]}
              </span>
              <Meter value={d.avgMs / maxWeekday} />
              <span className="text-right text-subhead tabular-nums text-label-2">
                {d.sessions ? formatDuration(d.avgMs) : "—"}
              </span>
            </li>
          ))}
        </ul>
      </Section>

      {loads.length > 0 && (
        <Section
          header="Grups musculars"
          footer="Sèries d'aquesta setmana. La marca indica la mitjana de les 4 setmanes anteriors."
        >
          <List>
            {loads.map((l) => (
              <ListItem
                key={l.muscle}
                title={MUSCLE_LABELS[l.muscle]}
                trailing={
                  <span className="tabular-nums">
                    {l.setsThisWeek} {l.setsThisWeek === 1 ? "sèrie" : "sèries"}
                  </span>
                }
                subtitle={
                  <span className="mt-1.5 block pb-0.5">
                    <Meter value={l.setsThisWeek / maxSets} marker={l.avgSetsPrev4 / maxSets} />
                  </span>
                }
              />
            ))}
          </List>
        </Section>
      )}

      <Section header="Exercicis">
        <List>
          {summaries.map((s) => {
            const parts =
              s.kind === "time"
                ? [s.maxDurationSec !== undefined && `Millor ${formatClockTimer(s.maxDurationSec)}`]
                : [
                    s.maxWeight !== undefined && `Màx ${formatNumber(s.maxWeight)} kg`,
                    s.best1RM !== undefined && `1RM ${formatNumber(Math.round(s.best1RM))} kg`,
                  ];
            parts.push(`${s.sessions} ${s.sessions === 1 ? "sessió" : "sessions"}`);
            return (
              <ListItem
                key={`${s.kind}-${s.name}`}
                title={s.name}
                titleClassName="font-medium"
                subtitle={parts.filter(Boolean).join(" · ")}
                trailing={<Sparkline values={s.trend.slice(-12)} />}
                chevron
                onClick={() => onOpenExercise(s)}
              />
            );
          })}
        </List>
      </Section>
    </>
  );
}

function BodySection({
  weights,
  heightCm,
  entries,
  now,
  onLog,
  onEdit,
}: {
  weights: BodyWeight[];
  heightCm?: number;
  entries: Entry[];
  now: number;
  onLog: () => void;
  onEdit: (w: BodyWeight) => void;
}) {
  const stats = bodyStats(weights, heightCm ? { id: "me", heightCm, updatedAt: 0 } : undefined, entries, now);
  const recent = [...weights].reverse().slice(0, 5);
  const change = stats.change30;

  return (
    <Section
      header="Cos"
      footer={
        stats.bmi !== undefined
          ? "L'IMC és orientatiu: no distingeix múscul de greix."
          : stats.current
            ? "Afegeix l'alçada a Ajustos per veure l'IMC."
            : undefined
      }
    >
      <div className="space-y-3">
        {stats.current ? (
          <>
            <StatGrid
              items={[
                { label: "Pes", value: formatNumber(stats.current.kg), unit: "kg" },
                {
                  label: "30 dies",
                  value: change ? `${change.kg > 0 ? "+" : change.kg < 0 ? "−" : ""}${formatNumber(Math.abs(Math.round(change.kg * 10) / 10))}` : "—",
                  unit: change ? "kg" : undefined,
                },
                { label: "IMC", value: stats.bmi !== undefined ? formatNumber(Math.round(stats.bmi * 10) / 10) : "—" },
              ]}
            />
            {weights.length >= 2 && (
              <div className={`${CARD} px-3 pt-3 pb-2`}>
                <LineChart
                  points={weights.map((w) => ({ date: w.date, value: w.kg }))}
                  format={(n) => formatNumber(Math.round(n * 10) / 10)}
                  formatDate={formatShortDate}
                  ariaLabel={`Evolució del pes corporal: de ${formatNumber(weights[0].kg)} kg a ${formatNumber(stats.current.kg)} kg.`}
                />
              </div>
            )}
          </>
        ) : (
          <div className={`${CARD} flex items-center gap-3 px-4 py-3.5`}>
            <ScaleIcon size={28} strokeWidth={1.6} className="shrink-0 text-label-3" />
            <p className="text-subhead text-label-2">
              Anota el teu pes de tant en tant per veure&apos;n l&apos;evolució i la força relativa.
            </p>
          </div>
        )}

        <Button variant="secondary" size="md" onClick={onLog} className="w-full">
          <PlusIcon size={18} strokeWidth={2.2} />
          Registra el pes
        </Button>

        {stats.relativeStrength.length > 0 && (
          <List>
            {stats.relativeStrength.map((r) => (
              <ListItem
                key={r.name}
                title={r.name}
                subtitle={`1RM estimat ${formatNumber(Math.round(r.best1RM))} kg`}
                trailing={
                  <span className="font-semibold tabular-nums text-label">
                    {formatNumber(Math.round(r.ratio * 100) / 100)}× <span className="font-normal text-label-2">pes</span>
                  </span>
                }
              />
            ))}
          </List>
        )}

        {recent.length > 0 && (
          <List>
            {recent.map((w) => (
              <ListItem
                key={w.id}
                title={relativeDay(w.date, now).replace(/^./, (c) => c.toUpperCase())}
                trailing={<span className="tabular-nums">{formatNumber(w.kg)} kg</span>}
                chevron
                ariaLabel={`Edita el pes del ${formatDayMonth(w.date)}: ${formatNumber(w.kg)} kg`}
                onClick={() => onEdit(w)}
              />
            ))}
          </List>
        )}
      </div>
    </Section>
  );
}

