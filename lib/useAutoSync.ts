"use client";

import Dexie, { type ObservabilitySet } from "dexie";
import { useEffect, useSyncExternalStore } from "react";
import { getSyncState, requestSync, subscribeSyncState, type SyncState } from "./sync";

/** Espera després de l'últim canvi abans de pujar (una sèrie rere l'altra no fa un sync cadascuna). */
const DEBOUNCE_MS = 3000;

/** La sessió carregada (`workouts`) és local: si només canvia ella, no cal sincronitzar. */
function touchesSyncedData(parts: ObservabilitySet): boolean {
  return Object.keys(parts).some((part) => !/^idb:\/\/mygym\/workouts\//.test(part));
}

/**
 * Sincronitza en obrir l'app, en tornar-hi, en recuperar la xarxa i uns
 * segons després de cada canvi; en sortir de l'app, puja el que quedi pendent.
 */
export function useAutoSync(): void {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    function flush() {
      clearTimeout(timer);
      timer = undefined;
      void requestSync();
    }

    function onMutated(parts: ObservabilitySet) {
      if (!touchesSyncedData(parts)) return;
      clearTimeout(timer);
      timer = setTimeout(flush, DEBOUNCE_MS);
    }

    function onVisibility() {
      if (document.visibilityState === "visible") flush();
      else if (timer !== undefined) flush();
    }

    flush();
    Dexie.on("storagemutated", onMutated);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("online", flush);
    return () => {
      clearTimeout(timer);
      Dexie.on.storagemutated.unsubscribe(onMutated);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", flush);
    };
  }, []);
}

const EMPTY: SyncState = {};

export function useSyncState(): SyncState {
  return useSyncExternalStore(subscribeSyncState, getSyncState, () => EMPTY);
}
