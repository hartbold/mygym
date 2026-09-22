"use client";

import { useSyncExternalStore } from "react";

let current = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const subscribers = new Set<() => void>();

function tick() {
  current = Date.now();
  subscribers.forEach((cb) => cb());
}

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  if (subscribers.size === 1) {
    tick();
    timer = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("pageshow", tick);
  }
  return () => {
    subscribers.delete(callback);
    if (subscribers.size === 0) {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("pageshow", tick);
    }
  };
}

function getSnapshot(): number {
  return current;
}

function getServerSnapshot(): number {
  return 0;
}

/**
 * Rellotge compartit d'1 s, recalculat també a `visibilitychange`/`pageshow`
 * (els temporitzadors es congelen en segon pla; una PWA represa no navega).
 * Mai deriva l'hora de `Date.now()` directament al render — evita l'error
 * de puresa de `react-hooks` i garanteix que tothom vegi el mateix instant.
 */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
