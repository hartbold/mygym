export type View = "avui" | "historial" | "sessio" | "ajustos";

export interface Route {
  view: View;
  /** Només per a `view: 'sessio'`. */
  date?: string;
}

const VALID_VIEWS: View[] = ["avui", "historial", "sessio", "ajustos"];

/**
 * Tota la navegació interna viu al fragment `#` — mai `useSearchParams` ni
 * rutes de Next (vegeu §Decisió d'arquitectura del pla).
 */
export function parseHash(hash: string): Route {
  const raw = hash.replace(/^#/, "");
  const [viewPart, queryPart] = raw.split("?");
  const view = (VALID_VIEWS as string[]).includes(viewPart) ? (viewPart as View) : "avui";
  if (view === "sessio") {
    const date = new URLSearchParams(queryPart ?? "").get("d") ?? undefined;
    return { view, date };
  }
  return { view };
}

export function buildHash(route: Route): string {
  if (route.view === "sessio" && route.date) return `#sessio?d=${route.date}`;
  if (route.view === "avui") return "#";
  return `#${route.view}`;
}
