"use client";

import { useState } from "react";
import { MUSCLE_LABELS, muscleGroupOf } from "@/lib/catalog-seed";
import { localDateKey } from "@/lib/dates";
import { deName, formatClockTimer, formatDayLabel, formatNumber, formatShortDate } from "@/lib/format";
import {
  addDays,
  exerciseProgress,
  exerciseSummaries,
  personalRecords,
  type ExerciseId,
  type ExerciseSession,
} from "@/lib/stats";
import type { Entry } from "@/lib/types";
import { LineChart } from "./charts";
import { ChartIcon } from "./icons";
import { formatRecord, RECORD_LABELS, relativeDay } from "./Progress";
import { CARD, EmptyState, List, ListItem, NavHeader, Page, Section, SegmentedControl, StatGrid } from "./ui";

type Metric = "pes" | "1rm" | "volum";
type Range = "3m" | "6m" | "tot";

const METRIC_OPTIONS: { value: Metric; label: string }[] = [
  { value: "pes", label: "Pes màxim" },
  { value: "1rm", label: "1RM" },
  { value: "volum", label: "Volum" },
];

const RANGE_OPTIONS: { value: Range; label: string }[] = [
  { value: "3m", label: "3 mesos" },
  { value: "6m", label: "6 mesos" },
  { value: "tot", label: "Tot" },
];

const round1 = (n: number) => Math.round(n * 10) / 10;

function metricValue(s: ExerciseSession, metric: Metric | "durada"): number | undefined {
  if (metric === "pes") return s.maxWeight;
  if (metric === "1rm") return s.best1RM;
  if (metric === "volum") return s.volume || undefined;
  return s.bestDurationSec;
}

export function ExerciseDetail({
  entries,
  exercise,
  now,
  onBack,
  onOpenDay,
}: {
  entries: Entry[];
  exercise: ExerciseId;
  now: number;
  onBack: () => void;
  onOpenDay: (date: string) => void;
}) {
  const [metric, setMetric] = useState<Metric>("pes");
  const [range, setRange] = useState<Range>("tot");

  const sessions = exerciseProgress(entries, exercise);
  const summary = exerciseSummaries(entries).find((s) => s.name === exercise.name && s.kind === exercise.kind);
  const records = personalRecords(entries).filter((r) => r.name === exercise.name && r.kind === exercise.kind);
  const isTime = exercise.kind === "time";
  const shown: Metric | "durada" = isTime ? "durada" : metric;

  const since = range === "tot" || now === 0 ? "" : addDays(localDateKey(now), range === "3m" ? -91 : -182);
  const points = sessions
    .filter((s) => s.date >= since)
    .flatMap((s) => {
      const value = metricValue(s, shown);
      return value === undefined ? [] : [{ date: s.date, value }];
    });
  const format = (n: number) => (shown === "durada" ? formatClockTimer(n) : formatNumber(Math.round(n)));

  return (
    <Page>
      <NavHeader
        eyebrow={MUSCLE_LABELS[muscleGroupOf(exercise)]}
        title={exercise.name}
        back={{ label: "Torna a Progrés", onClick: onBack }}
      />
      {!summary ? (
        <EmptyState icon={<ChartIcon size={44} strokeWidth={1.5} />} title="Sense dades">
          Encara no hi ha cap sèrie registrada d&apos;aquest exercici.
        </EmptyState>
      ) : (
        <div className="space-y-8">
          <StatGrid
            items={
              isTime
                ? [
                    { label: "Millor", value: summary.maxDurationSec ? formatClockTimer(summary.maxDurationSec) : "—" },
                    {
                      label: "Mitjana",
                      value: summary.avgDurationSec ? formatClockTimer(summary.avgDurationSec) : "—",
                    },
                    { label: "Sessions", value: String(summary.sessions) },
                  ]
                : [
                    { label: "Màxim", value: summary.maxWeight ? formatNumber(summary.maxWeight) : "—", unit: summary.maxWeight ? "kg" : undefined },
                    { label: "Mitjana", value: summary.avgWeight ? formatNumber(round1(summary.avgWeight)) : "—", unit: summary.avgWeight ? "kg" : undefined },
                    { label: "1RM", value: summary.best1RM ? formatNumber(Math.round(summary.best1RM)) : "—", unit: summary.best1RM ? "kg" : undefined },
                    { label: "Sessions", value: String(summary.sessions) },
                  ]
            }
          />

          <Section header="Evolució" footer={isTime ? "Millor sèrie de cada sessió." : metric === "1rm" ? "1RM estimat amb la fórmula d'Epley (sèries de fins a 12 reps)." : metric === "volum" ? "Volum = Σ pes × reps de la sessió." : "Sèrie més pesada de cada sessió."}>
            <div className="space-y-3">
              {!isTime && (
                <SegmentedControl label="Mètrica" options={METRIC_OPTIONS} value={metric} onChange={setMetric} />
              )}
              <div className={`${CARD} px-3 pt-3 pb-2`}>
                {points.length > 0 ? (
                  <LineChart
                    points={points}
                    format={format}
                    formatDate={formatShortDate}
                    ariaLabel={`Evolució ${deName(exercise.name)}: ${points.map((p) => `${formatShortDate(p.date)} ${format(p.value)}`).join(", ")}.`}
                  />
                ) : (
                  <p className="px-1 py-8 text-center text-subhead text-label-2">Cap dada en aquest període.</p>
                )}
              </div>
              <SegmentedControl label="Període" options={RANGE_OPTIONS} value={range} onChange={setRange} />
            </div>
          </Section>

          {records.length > 0 && (
            <Section header="Rècords">
              <List>
                {records.map((r) => (
                  <ListItem
                    key={r.type}
                    title={RECORD_LABELS[r.type]}
                    subtitle={relativeDay(r.date, now)}
                    trailing={<span className="font-semibold tabular-nums text-label">{formatRecord(r)}</span>}
                  />
                ))}
              </List>
            </Section>
          )}

          <Section header="Sessions">
            <List>
              {[...sessions]
                .reverse()
                .slice(0, 12)
                .map((s) => {
                  const parts = [`${s.sets} ${s.sets === 1 ? "sèrie" : "sèries"}`];
                  if (isTime && s.bestDurationSec) parts.push(`millor ${formatClockTimer(s.bestDurationSec)}`);
                  if (!isTime && s.maxWeight) parts.push(`màx ${formatNumber(s.maxWeight)} kg`);
                  if (!isTime && s.volume) parts.push(`volum ${formatNumber(Math.round(s.volume))} kg`);
                  if (!isTime && !s.maxWeight && s.totalReps) parts.push(`${s.totalReps} reps`);
                  return (
                    <ListItem
                      key={s.date}
                      title={formatDayLabel(s.date)}
                      subtitle={parts.join(" · ")}
                      chevron
                      onClick={() => onOpenDay(s.date)}
                    />
                  );
                })}
            </List>
          </Section>
        </div>
      )}
    </Page>
  );
}
