"use client";

import { useSyncExternalStore } from "react";

/** Cronòmetre en marxa d'una sèrie d'un exercici de temps (com a molt un). */
export interface RunningStopwatch {
  entryId: string;
  setId: string;
  startedAt: number;
}

/**
 * Es desa a `localStorage` perquè sobrevisqui si el sistema descarta la PWA
 * amb el mòbil bloquejat a mitja planxa. És una comoditat d'aquest
 * dispositiu, no una dada: no va a la base de dades ni a les còpies. Si
 * l'emmagatzematge no hi és, funciona igual en memòria.
 */
const KEY = "mygym:stopwatch";

let current: RunningStopwatch | null | undefined;
const subscribers = new Set<() => void>();

function read(): RunningStopwatch | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Partial<RunningStopwatch>;
    if (typeof v.entryId !== "string" || typeof v.setId !== "string" || typeof v.startedAt !== "number") return null;
    return { entryId: v.entryId, setId: v.setId, startedAt: v.startedAt };
  } catch {
    return null;
  }
}

function write(value: RunningStopwatch | null) {
  current = value;
  try {
    if (value) localStorage.setItem(KEY, JSON.stringify(value));
    else localStorage.removeItem(KEY);
  } catch {
    // Sense emmagatzematge (navegació privada…): es queda en memòria.
  }
  subscribers.forEach((cb) => cb());
}

function getSnapshot(): RunningStopwatch | null {
  if (current === undefined) current = read();
  return current;
}

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

export function useStopwatch(): RunningStopwatch | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

export function startStopwatch(entryId: string, setId: string, now: number) {
  write({ entryId, setId, startedAt: now });
}

export function clearStopwatch() {
  write(null);
}

/** Segons sencers transcorreguts (mai negatius: `now` ve d'un rellotge d'1 s). */
export function stopwatchSeconds(sw: RunningStopwatch, now: number): number {
  return Math.max(0, Math.round((now - sw.startedAt) / 1000));
}
