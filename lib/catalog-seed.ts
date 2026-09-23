import type { ExerciseKind } from "./types";

export type MuscleGroup = "pit" | "esquena" | "cames" | "espatlles" | "bracos" | "core" | "cardio";

/** Noms per mostrar dels grups musculars («altres»: exercicis creats per l'usuari). */
export const MUSCLE_LABELS: Record<MuscleGroup | "altres", string> = {
  pit: "Pit",
  esquena: "Esquena",
  cames: "Cames",
  espatlles: "Espatlles",
  bracos: "Braços",
  core: "Abdominals",
  cardio: "Cardio",
  altres: "Altres",
};

export interface CatalogExercise {
  name: string;
  kind: ExerciseKind;
  muscle: MuscleGroup;
  /**
   * Noms en anglès i castellà (i variants habituals) per a la cerca. Mai es
   * mostren: la llista sempre surt en català.
   */
  aliases: string[];
}

/**
 * Catàleg inicial (constant, mai una taula Dexie — vegeu §Model de dades del
 * pla). El desplegable de l'exercici mostra aquesta llista unida als noms ja
 * usats a `entries`; no cal cap seeding ni idempotència.
 */
export const CATALOG_SEED: CatalogExercise[] = [
  // Pit
  { name: "Press de banca", kind: "reps", muscle: "pit", aliases: ["bench press", "press de banca", "press banca", "press plano"] },
  {
    name: "Press inclinat amb manuelles",
    kind: "reps",
    muscle: "pit",
    aliases: ["incline dumbbell press", "press inclinado con mancuernas"],
  },
  { name: "Obertures amb manuelles", kind: "reps", muscle: "pit", aliases: ["dumbbell fly", "chest fly", "aperturas con mancuernas"] },
  { name: "Fons en paral·leles", kind: "reps", muscle: "pit", aliases: ["dips", "chest dips", "fondos en paralelas"] },
  { name: "Encreuament a la politja", kind: "reps", muscle: "pit", aliases: ["cable crossover", "cable fly", "cruce de poleas"] },
  // Esquena
  { name: "Dominades", kind: "reps", muscle: "esquena", aliases: ["pull-ups", "pull ups", "chin-ups", "dominadas"] },
  { name: "Rem amb barra", kind: "reps", muscle: "esquena", aliases: ["barbell row", "bent-over row", "remo con barra"] },
  { name: "Rem amb manuella", kind: "reps", muscle: "esquena", aliases: ["dumbbell row", "one-arm row", "remo con mancuerna"] },
  { name: "Estirada al pit", kind: "reps", muscle: "esquena", aliases: ["lat pulldown", "pulldown", "jalón al pecho", "jalon"] },
  { name: "Rem a la politja baixa", kind: "reps", muscle: "esquena", aliases: ["seated cable row", "cable row", "remo en polea baja"] },
  { name: "Pes mort", kind: "reps", muscle: "esquena", aliases: ["deadlift", "peso muerto"] },
  { name: "Hiperextensions", kind: "reps", muscle: "esquena", aliases: ["back extension", "hyperextensions", "hiperextensiones"] },
  // Cames
  { name: "Esquats", kind: "reps", muscle: "cames", aliases: ["squat", "back squat", "sentadilla", "sentadillas"] },
  { name: "Premsa de cames", kind: "reps", muscle: "cames", aliases: ["leg press", "prensa de piernas", "prensa"] },
  { name: "Gambades", kind: "reps", muscle: "cames", aliases: ["lunges", "zancadas", "estocadas"] },
  { name: "Extensió de quàdriceps", kind: "reps", muscle: "cames", aliases: ["leg extension", "extensión de cuádriceps"] },
  { name: "Curl femoral ajagut", kind: "reps", muscle: "cames", aliases: ["lying leg curl", "leg curl", "curl femoral tumbado"] },
  { name: "Elevació de bessons", kind: "reps", muscle: "cames", aliases: ["calf raise", "elevación de gemelos", "gemelos"] },
  { name: "Empenta de maluc", kind: "reps", muscle: "cames", aliases: ["hip thrust", "empuje de cadera"] },
  { name: "Esquat búlgar", kind: "reps", muscle: "cames", aliases: ["bulgarian split squat", "sentadilla búlgara"] },
  // Espatlles
  { name: "Press militar", kind: "reps", muscle: "espatlles", aliases: ["overhead press", "military press", "shoulder press", "press militar"] },
  { name: "Elevacions laterals", kind: "reps", muscle: "espatlles", aliases: ["lateral raise", "elevaciones laterales"] },
  { name: "Elevacions frontals", kind: "reps", muscle: "espatlles", aliases: ["front raise", "elevaciones frontales"] },
  {
    name: "Obertures posteriors",
    kind: "reps",
    muscle: "espatlles",
    aliases: ["reverse fly", "rear delt fly", "pájaros", "pajaros", "deltoides posterior"],
  },
  { name: "Press Arnold", kind: "reps", muscle: "espatlles", aliases: ["arnold press"] },
  { name: "Rem al mentó", kind: "reps", muscle: "espatlles", aliases: ["upright row", "remo al mentón"] },
  // Braços
  { name: "Curl de bíceps amb barra", kind: "reps", muscle: "bracos", aliases: ["barbell curl", "curl de bíceps con barra"] },
  { name: "Curl de bíceps amb manuelles", kind: "reps", muscle: "bracos", aliases: ["dumbbell curl", "curl de bíceps con mancuernas"] },
  { name: "Curl martell", kind: "reps", muscle: "bracos", aliases: ["hammer curl", "curl martillo"] },
  { name: "Press francès", kind: "reps", muscle: "bracos", aliases: ["skull crusher", "french press", "press francés"] },
  {
    name: "Extensió de tríceps a la politja",
    kind: "reps",
    muscle: "bracos",
    aliases: ["triceps pushdown", "cable pushdown", "extensión de tríceps en polea"],
  },
  { name: "Fons de tríceps al banc", kind: "reps", muscle: "bracos", aliases: ["bench dips", "fondos de tríceps en banco"] },
  // Abdominals / core
  { name: "Encongiment abdominal", kind: "reps", muscle: "core", aliases: ["crunch", "abdominal crunch", "crunch abdominal"] },
  {
    name: "Elevació de cames penjat",
    kind: "reps",
    muscle: "core",
    aliases: ["hanging leg raise", "elevación de piernas colgado"],
  },
  { name: "Abdominals amb roda", kind: "reps", muscle: "core", aliases: ["ab wheel", "ab rollout", "rueda abdominal"] },
  { name: "Planxa", kind: "time", muscle: "core", aliases: ["plank", "plancha"] },
  { name: "Planxa lateral", kind: "time", muscle: "core", aliases: ["side plank", "plancha lateral"] },
  { name: "Gir rus", kind: "reps", muscle: "core", aliases: ["russian twist", "giro ruso"] },
  // Cardio / altres
  { name: "Cinta de córrer", kind: "time", muscle: "cardio", aliases: ["treadmill", "running", "cinta de correr", "correr"] },
  { name: "Bicicleta estàtica", kind: "time", muscle: "cardio", aliases: ["stationary bike", "exercise bike", "bicicleta estática"] },
  { name: "Màquina de rem", kind: "time", muscle: "cardio", aliases: ["rowing machine", "rower", "remo", "remoergómetro"] },
  { name: "Saltar a corda", kind: "time", muscle: "cardio", aliases: ["jump rope", "skipping", "saltar a la comba", "comba"] },
  { name: "Passeig del granger", kind: "time", muscle: "cardio", aliases: ["farmer walk", "farmer's walk", "paseo del granjero"] },
];

/**
 * Noms que el catàleg feia servir abans (castellanismes i ortografia
 * incorrecta) → nom català actual. Les entrades desades i les còpies
 * importades es reanomenen perquè «Recents», l'historial i els valors de
 * l'última vegada continuïn lligats al mateix exercici.
 */
export const LEGACY_EXERCISE_NAMES: Record<string, string> = {
  "Press banca": "Press de banca",
  "Press inclinat amb mànuel·les": "Press inclinat amb manuelles",
  "Obertures amb mànuel·les": "Obertures amb manuelles",
  "Fondos en paral·leles": "Fons en paral·leles",
  "Creuament de politja": "Encreuament a la politja",
  "Remo amb barra": "Rem amb barra",
  "Remo amb mànuel·la": "Rem amb manuella",
  "Jalón al pit": "Estirada al pit",
  "Remo en politja baixa": "Rem a la politja baixa",
  "Peso mort": "Pes mort",
  Zancades: "Gambades",
  "Femoral tombat": "Curl femoral ajagut",
  "Hip thrust": "Empenta de maluc",
  "Sentadilla búlgara": "Esquat búlgar",
  "Pájaros (deltoide posterior)": "Obertures posteriors",
  "Remo al mentó": "Rem al mentó",
  "Curl de bíceps amb mànuel·les": "Curl de bíceps amb manuelles",
  "Extensió de tríceps en politja": "Extensió de tríceps a la politja",
  "Fondos de tríceps (banc)": "Fons de tríceps al banc",
  "Crunch abdominal": "Encongiment abdominal",
  Plancha: "Planxa",
  "Plancha lateral": "Planxa lateral",
  "Russian twist": "Gir rus",
  "Remador (rem)": "Màquina de rem",
  "Corda de saltar": "Saltar a corda",
  "Farmer walk": "Passeig del granger",
};

export function canonicalExerciseName(name: string): string {
  return LEGACY_EXERCISE_NAMES[name] ?? name;
}

/** Minúscules, sense accents ni punt volat: «Mànuel·les» ≈ «manuelles». */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[·.'’-]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const ALIASES = new Map(CATALOG_SEED.map((c) => [`${c.name} ${c.kind}`, c.aliases]));

/** Coincideix per nom (català) o per qualsevol àlies anglès/castellà del catàleg. */
export function matchesExerciseQuery(option: { name: string; kind: ExerciseKind }, query: string): boolean {
  const q = normalizeForSearch(query);
  if (!q) return true;
  const haystack = [option.name, ...(ALIASES.get(`${option.name} ${option.kind}`) ?? [])];
  return haystack.some((h) => normalizeForSearch(h).includes(q));
}

const MUSCLES = new Map(CATALOG_SEED.map((c) => [`${c.name} ${c.kind}`, c.muscle]));

/** Grup muscular d'un exercici del catàleg; «altres» per als creats per l'usuari. */
export function muscleGroupOf(option: { name: string; kind: ExerciseKind }): MuscleGroup | "altres" {
  return MUSCLES.get(`${option.name} ${option.kind}`) ?? "altres";
}
