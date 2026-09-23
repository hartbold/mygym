import type { ExerciseKind } from "./types";

export type View = "avui" | "historial" | "sessio" | "progres" | "exercici" | "ajustos";

export interface Route {
  view: View;
  /** Només per a `view: 'sessio'`. */
  date?: string;
  /** Només per a `view: 'exercici'`. */
  exercise?: { name: string; kind: ExerciseKind };
}

const VALID_VIEWS: View[] = ["avui", "historial", "sessio", "progres", "exercici", "ajustos"];

/**
 * Tota la navegació interna viu al fragment `#` — mai `useSearchParams` ni
 * rutes de Next (vegeu §Decisió d'arquitectura del pla).
 */
export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "");
  const [viewPart, queryPart] = raw.split("?");
  const view = (VALID_VIEWS as string[]).includes(viewPart) ? (viewPart as View) : "avui";
  const params = new URLSearchParams(queryPart ?? "");
  if (view === "sessio") {
    const date = params.get("d") ?? undefined;
    return { view, date };
  }
  if (view === "exercici") {
    const name = params.get("n");
    const kind = params.get("k");
    if (!name || (kind !== "reps" && kind !== "time")) return { view: "progres" };
    return { view, exercise: { name, kind } };
  }
  return { view };
}

export function buildHash(route: Route): string {
  if (route.view === "sessio" && route.date) return `#sessio?d=${route.date}`;
  if (route.view === "exercici" && route.exercise) {
    const params = new URLSearchParams({ n: route.exercise.name, k: route.exercise.kind });
    return `#exercici?${params}`;
  }
  if (route.view === "avui") return "#";
  return `#${route.view}`;
}
