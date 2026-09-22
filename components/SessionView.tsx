"use client";

import { Fragment } from "react";
import { localDateKey } from "@/lib/dates";
import {
  durationParts,
  formatDayLabel,
  formatDayMonth,
  formatDuration,
  formatMonthYear,
  formatNumber,
  formatWeekday,
  formatWeekdayShort,
  formatWeight,
} from "@/lib/format";
import { groupSessions, type Session } from "@/lib/sessions";
import type { Entry } from "@/lib/types";
import { EntryCard } from "./EntryCard";
import { CalendarIcon } from "./icons";
import { EmptyState, List, ListItem, NavHeader, Page, Section, StatGrid } from "./ui";

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

const monthFormatter = new Intl.DateTimeFormat("ca-ES", { month: "long" });

/** "Setembre" a partir d'una clau 'YYYY-MM-DD' (per als mesos de l'any en curs). */
function formatMonth(dateKey: string): string {
  const [y, m] = dateKey.split("-").map(Number);
  const label = monthFormatter.format(new Date(y, m - 1, 1));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * "3 exercicis · 9 sèries · 2.700 kg · 37min" (el volum i el temps només si
 * n'hi ha). Cada tros és indivisible: si no hi cap, salta de línia sencer i
 * el punt volat queda al final de la línia, com una coma.
 */
function SummaryLine({ session }: { session: Session }) {
  const parts = [
    plural(session.exerciseCount, "exercici", "exercicis"),
    plural(session.setCount, "sèrie", "sèries"),
  ];
  if (session.volumeKg > 0) parts.push(formatWeight(session.volumeKg));
  if (session.durationMs > 0) parts.push(formatDuration(session.durationMs));
  return (
    <span className="block text-footnote tabular-nums">
      {parts.map((p, i) => (
        <Fragment key={i}>
          {i > 0 && " "}
          <span className="whitespace-nowrap">
            {p}
            {i < parts.length - 1 && " ·"}
          </span>
        </Fragment>
      ))}
    </span>
  );
}

/** Els noms dels exercicis del dia, sense repetir, en l'ordre en què es van fer. */
function exerciseNames(session: Session): string {
  return [...new Set(session.entries.map((e) => e.name))].join(", ");
}

/** Rajola de data de 44px: dia de la setmana a dalt, número a sota. Avui, en negre. */
function DateTile({ date, today }: { date: string; today: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-11 flex-col items-center justify-center rounded-xl ${
        today ? "bg-accent text-on-accent" : "bg-fill-4 text-label"
      }`}
    >
      <span
        className={`text-caption2 leading-none font-semibold uppercase ${
          today ? "text-on-accent/70" : "text-label-2"
        }`}
      >
        {formatWeekdayShort(date)}
      </span>
      <span className="mt-0.5 text-title3 leading-none font-semibold tabular-nums">
        {Number(date.slice(8, 10))}
      </span>
    </span>
  );
}

function sessionStats(session: Session) {
  const time = durationParts(session.durationMs);
  return [
    { label: "Exercicis", value: String(session.exerciseCount) },
    { label: "Sèries", value: String(session.setCount) },
    { label: "Volum", value: formatNumber(session.volumeKg), unit: "kg" },
    session.durationMs > 0
      ? { label: "Temps", value: time.value, unit: time.unit }
      : { label: "Temps", value: "—" },
  ];
}

export function SessionView({
  entries,
  now,
  date,
  onOpenDay,
  onBack,
  loaded = true,
}: {
  entries: Entry[];
  now: number;
  date?: string;
  onOpenDay: (date: string) => void;
  /** Botó enrere de la vista d'un dia; sense ell, no n'hi ha. */
  onBack?: () => void;
  /** `false` mentre la base de dades encara carrega: no hi ha estats buits. */
  loaded?: boolean;
}) {
  const sessions = groupSessions(entries, now);
  const todayKey = localDateKey(now);

  if (date) {
    const session = sessions.find((s) => s.date === date);
    const year = date.slice(0, 4);
    const eyebrow =
      year === todayKey.slice(0, 4) ? formatWeekday(date) : `${formatWeekday(date)} · ${year}`;
    return (
      <Page>
        <NavHeader
          back={onBack ? { label: "Torna a l'historial", onClick: onBack } : undefined}
          eyebrow={eyebrow}
          title={formatDayMonth(date)}
        />
        {session ? (
          <div className="space-y-8">
            <StatGrid items={sessionStats(session)} />
            <Section header="Exercicis">
              <div className="space-y-3">
                {session.entries.map((e) => (
                  <EntryCard key={e.id} entry={e} now={now} />
                ))}
              </div>
            </Section>
          </div>
        ) : (
          loaded && (
            <EmptyState
              icon={<CalendarIcon size={44} strokeWidth={1.6} />}
              title="Cap exercici aquest dia"
            />
          )
        )}
      </Page>
    );
  }

  // S'agrupa per mes i any (dos setembres d'anys diferents no es barregen),
  // però a la capçalera l'any només hi surt si no és l'actual.
  const thisYear = todayKey.slice(0, 4);
  const months: { key: string; label: string; sessions: Session[] }[] = [];
  for (const s of sessions) {
    const key = formatMonthYear(s.date);
    const last = months[months.length - 1];
    if (last && last.key === key) last.sessions.push(s);
    else
      months.push({
        key,
        label: s.date.slice(0, 4) === thisYear ? formatMonth(s.date) : key,
        sessions: [s],
      });
  }

  return (
    <Page>
      <NavHeader title="Historial" />
      {sessions.length === 0 ? (
        loaded && (
          <EmptyState
            icon={<CalendarIcon size={44} strokeWidth={1.6} />}
            title="Encara no hi ha cap sessió"
          >
            Quan registris un exercici, el trobaràs aquí agrupat per dia.
          </EmptyState>
        )
      ) : (
        <div className="space-y-8">
          {months.map((m) => (
            <Section key={m.key} header={m.label}>
              <List>
                {m.sessions.map((s) => (
                  <ListItem
                    key={s.date}
                    onClick={() => onOpenDay(s.date)}
                    chevron
                    leading={
                      <>
                        <DateTile date={s.date} today={s.date === todayKey} />
                        <span className="sr-only">{formatDayLabel(s.date)}</span>
                      </>
                    }
                    title={exerciseNames(s)}
                    titleClassName="font-medium"
                    subtitle={<SummaryLine session={s} />}
                  />
                ))}
              </List>
            </Section>
          ))}
        </div>
      )}
    </Page>
  );
}
