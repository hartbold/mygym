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

/**
 * Paraules per cercar per grup muscular en català, castellà i anglès
 * («pecho», «legs», «hombros»…): troben tots els exercicis del grup.
 */
const MUSCLE_ALIASES: Record<MuscleGroup, string[]> = {
  pit: ["pit", "pectoral", "pectorals", "pecho", "pectorales", "chest", "pecs"],
  esquena: ["esquena", "dorsal", "dorsals", "espalda", "back", "lats", "lumbar"],
  cames: ["cames", "cuixes", "gluti", "glutis", "piernas", "pierna", "cuadriceps", "gluteos", "isquios", "legs", "leg", "quads", "glutes", "hamstrings"],
  espatlles: ["espatlles", "deltoide", "hombros", "hombro", "deltoides", "shoulders", "shoulder", "delts"],
  bracos: ["bracos", "biceps", "triceps", "avantbracos", "brazos", "antebrazos", "arms", "forearms"],
  core: ["abdominals", "core", "abdominales", "abdomen", "abs", "oblicuos", "obliques"],
  cardio: ["cardio", "aerobic", "aerobico", "resistencia", "endurance"],
};

export interface CatalogExercise {
  name: string;
  kind: ExerciseKind;
  muscle: MuscleGroup;
  /**
   * Noms en castellà i anglès, variants habituals i material (màquina,
   * politja, manuelles…) per a la cerca. Mai es mostren: la llista sempre
   * surt en català.
   */
  aliases: string[];
}

/**
 * Catàleg inicial (constant, mai una taula Dexie — vegeu §Model de dades del
 * pla). Els noms segueixen el TERMCAT (Diccionari de ciències de l'esport i
 * de l'exercici físic, via Cercaterm); els pocs que no hi són segueixen el
 * mateix patró. El desplegable de l'exercici mostra aquesta llista unida als
 * noms ja usats a `entries`.
 */
export const CATALOG_SEED: CatalogExercise[] = [
  // Pit
  {
    name: "Pressió sobre banc",
    kind: "reps",
    muscle: "pit",
    aliases: ["bench press", "flat bench press", "press de banca", "press banca", "press plano", "press de banca horizontal", "barra", "barbell"],
  },
  {
    name: "Pressió sobre banc inclinat",
    kind: "reps",
    muscle: "pit",
    aliases: ["incline bench press", "incline dumbbell press", "press de banca inclinado", "press inclinado", "press inclinado con mancuernas", "manuelles", "mancuernas", "dumbbells"],
  },
  {
    name: "Pressió sobre banc declinat",
    kind: "reps",
    muscle: "pit",
    aliases: ["decline bench press", "press de banca declinado", "press declinado"],
  },
  {
    name: "Pressió de pit",
    kind: "reps",
    muscle: "pit",
    aliases: ["chest press", "chest press machine", "press de pecho", "press de pecho en maquina", "maquina", "machine"],
  },
  {
    name: "Obertura",
    kind: "reps",
    muscle: "pit",
    aliases: ["chest fly", "dumbbell fly", "flyes", "apertura", "aperturas", "aperturas con mancuernas", "obertures", "manuelles", "mancuernas"],
  },
  {
    name: "Obertura a la politja",
    kind: "reps",
    muscle: "pit",
    aliases: ["cable fly", "cable crossover", "crossover", "cruce de poleas", "aperturas en polea", "polea", "cable", "encreuament"],
  },
  {
    name: "Papallona",
    kind: "reps",
    muscle: "pit",
    aliases: ["pec deck", "peck deck", "butterfly", "mariposa", "contractora", "maquina de pectoral", "maquina", "machine"],
  },
  {
    name: "Fons a les paral·leles",
    kind: "reps",
    muscle: "pit",
    aliases: ["dips", "chest dips", "fondos", "fondos en paralelas", "paralelas", "parallel bars"],
  },
  {
    name: "Fons a terra",
    kind: "reps",
    muscle: "pit",
    aliases: ["push up", "push-ups", "pushups", "flexiones", "flexiones de brazos", "flexions", "lagartijas"],
  },
  // Esquena
  {
    name: "Dominació",
    kind: "reps",
    muscle: "esquena",
    aliases: ["pull up", "pull-ups", "chin up", "chin-ups", "dominada", "dominadas", "dominades", "barra fija"],
  },
  {
    name: "Dominació a la màquina",
    kind: "reps",
    muscle: "esquena",
    aliases: ["assisted pull up", "assisted pull-up machine", "dominada en maquina", "dominadas asistidas", "maquina", "machine"],
  },
  {
    name: "Tracció a la politja alta",
    kind: "reps",
    muscle: "esquena",
    aliases: ["lat pulldown", "pulldown", "polea al pecho", "jalon al pecho", "jalon", "polea alta", "estirada al pit", "polea", "cable"],
  },
  {
    name: "Rem a la cintura amb barra",
    kind: "reps",
    muscle: "esquena",
    aliases: ["barbell row", "bent over row", "bent-over row", "remo con barra", "remo a la cintura", "remo", "row", "rem amb barra"],
  },
  {
    name: "Rem a la cintura amb manuella",
    kind: "reps",
    muscle: "esquena",
    aliases: ["dumbbell row", "one arm row", "single arm row", "remo con mancuerna", "remo a una mano", "remo", "row", "manuella", "mancuerna"],
  },
  {
    name: "Rem Gironda",
    kind: "reps",
    muscle: "esquena",
    aliases: ["seated cable row", "cable row", "remo con polea baja", "remo gironda", "remo sentado", "polea baja", "rem a la politja baixa", "polea", "cable"],
  },
  {
    name: "Rem al pit",
    kind: "reps",
    muscle: "esquena",
    aliases: ["chest row", "machine row", "seated row machine", "remo al pecho", "remo en maquina", "maquina", "machine"],
  },
  {
    name: "Pul·lòver",
    kind: "reps",
    muscle: "esquena",
    aliases: ["pullover", "pull over", "pull-over"],
  },
  {
    name: "Ocell",
    kind: "reps",
    muscle: "esquena",
    aliases: ["reverse fly", "rear delt fly", "pajaro", "pajaros", "deltoides posterior", "obertures posteriors", "reverse pec deck"],
  },
  {
    name: "Pes mort",
    kind: "reps",
    muscle: "cames",
    aliases: ["deadlift", "peso muerto", "barra", "barbell"],
  },
  {
    name: "Extensió de tronc",
    kind: "reps",
    muscle: "esquena",
    aliases: ["back extension", "hyperextension", "hyperextensions", "hiperextensio", "hiperextensions", "extension de tronco", "hiperextensiones", "lumbares", "banco romano"],
  },
  // Cames
  {
    name: "Esquat",
    kind: "reps",
    muscle: "cames",
    aliases: ["squat", "back squat", "sentadilla", "sentadillas", "esquats", "barra", "barbell"],
  },
  {
    name: "Esquat frontal",
    kind: "reps",
    muscle: "cames",
    aliases: ["front squat", "sentadilla frontal"],
  },
  {
    name: "Esquat a la màquina Smith",
    kind: "reps",
    muscle: "cames",
    aliases: ["smith machine squat", "smith", "multipower", "sentadilla en multipower", "sentadilla en maquina multipower", "maquina", "machine"],
  },
  {
    name: "Esquat búlgar",
    kind: "reps",
    muscle: "cames",
    aliases: ["bulgarian split squat", "split squat", "sentadilla bulgara"],
  },
  {
    name: "Pressió de cames",
    kind: "reps",
    muscle: "cames",
    aliases: ["leg press", "prensa", "prensa de piernas", "premsa de cames", "maquina", "machine"],
  },
  {
    name: "Tisora",
    kind: "reps",
    muscle: "cames",
    aliases: ["lunge", "lunges", "zancada", "zancadas", "estocada", "estocadas", "gambades", "tisores"],
  },
  {
    name: "Extensió de cames",
    kind: "reps",
    muscle: "cames",
    aliases: ["leg extension", "extension de rodillas", "extension de cuadriceps", "extensio de genolls", "extensio de quadriceps", "maquina", "machine"],
  },
  {
    name: "Rull de cames",
    kind: "reps",
    muscle: "cames",
    aliases: ["leg curl", "lying leg curl", "seated leg curl", "hamstring curl", "curl femoral", "curl femoral tumbado", "curl femoral sentado", "maquina", "machine"],
  },
  {
    name: "Elevació de malucs",
    kind: "reps",
    muscle: "cames",
    aliases: ["hip thrust", "glute bridge", "elevacion de pelvis", "elevacion de cadera", "empuje de cadera", "puente de gluteos", "empenta de maluc"],
  },
  {
    name: "Abducció de maluc",
    kind: "reps",
    muscle: "cames",
    aliases: ["hip abduction", "abductor machine", "abduccion de cadera", "abductores", "maquina de abductores", "maquina", "machine"],
  },
  {
    name: "Adducció de maluc",
    kind: "reps",
    muscle: "cames",
    aliases: ["hip adduction", "adductor machine", "aduccion de cadera", "aductores", "maquina de aductores", "maquina", "machine"],
  },
  {
    name: "Panxells",
    kind: "reps",
    muscle: "cames",
    aliases: ["calf raise", "standing calf raise", "elevacion de talones", "gemelos", "elevacio de bessons", "pantorrillas", "calves"],
  },
  {
    name: "Pressió de panxells",
    kind: "reps",
    muscle: "cames",
    aliases: ["calf press", "press calf raise", "gemelos en prensa", "pantorrillas en prensa", "maquina", "machine"],
  },
  // Espatlles
  {
    name: "Pressió d'espatlles",
    kind: "reps",
    muscle: "espatlles",
    aliases: ["shoulder press", "overhead press", "military press", "press militar", "press de hombros", "ohp"],
  },
  {
    name: "Pressió Arnold",
    kind: "reps",
    muscle: "espatlles",
    aliases: ["arnold press", "press arnold"],
  },
  {
    name: "Elevació lateral",
    kind: "reps",
    muscle: "espatlles",
    aliases: ["lateral raise", "side raise", "elevaciones laterales", "elevacion lateral", "elevacions laterals"],
  },
  {
    name: "Elevació frontal",
    kind: "reps",
    muscle: "espatlles",
    aliases: ["front raise", "elevaciones frontales", "elevacion frontal", "elevacions frontals"],
  },
  {
    name: "Rem vertical",
    kind: "reps",
    muscle: "espatlles",
    aliases: ["upright row", "remo vertical", "remo al menton", "rem al mento"],
  },
  {
    name: "Encongiment d'espatlles",
    kind: "reps",
    muscle: "espatlles",
    aliases: ["shrug", "shoulder shrug", "shrugs", "encogimiento de hombros", "trapecio"],
  },
  // Braços
  {
    name: "Rull de braços",
    kind: "reps",
    muscle: "bracos",
    aliases: ["biceps curl", "barbell curl", "curl", "curl de biceps", "curl con barra", "curl de biceps amb barra"],
  },
  {
    name: "Rull de braços altern",
    kind: "reps",
    muscle: "bracos",
    aliases: ["alternate curl", "dumbbell curl", "curl alterno", "curl con mancuernas", "curl de biceps con mancuernas", "manuelles", "mancuernas"],
  },
  {
    name: "Rull de martell",
    kind: "reps",
    muscle: "bracos",
    aliases: ["hammer curl", "curl martillo", "curl martell"],
  },
  {
    name: "Rull Scott",
    kind: "reps",
    muscle: "bracos",
    aliases: ["preacher curl", "curl scott", "banco scott", "biceps con banca romana"],
  },
  {
    name: "Rull de braç concentrat",
    kind: "reps",
    muscle: "bracos",
    aliases: ["concentration curl", "curl concentrado"],
  },
  {
    name: "Pressió francesa",
    kind: "reps",
    muscle: "bracos",
    aliases: ["skull crusher", "french press", "lying triceps extension", "press frances", "extension de triceps", "extensio de triceps"],
  },
  {
    name: "Extensió de tríceps a la politja",
    kind: "reps",
    muscle: "bracos",
    aliases: ["triceps pushdown", "cable pushdown", "pushdown", "extension de triceps en polea", "jalon de triceps", "polea", "cable"],
  },
  {
    name: "Fons de braços",
    kind: "reps",
    muscle: "bracos",
    aliases: ["triceps dips", "bench dips", "fondos", "fondos de triceps", "fondos en banco", "fons de triceps al banc"],
  },
  {
    name: "Puntada de tríceps",
    kind: "reps",
    muscle: "bracos",
    aliases: ["triceps kickback", "kickback", "patada de triceps"],
  },
  // Abdominals / zona central
  {
    name: "Rull de tronc",
    kind: "reps",
    muscle: "core",
    aliases: ["crunch", "abdominal crunch", "sit up", "curl de tronco", "encogimiento abdominal", "abdominales", "encongiment abdominal"],
  },
  {
    name: "Rull de malucs",
    kind: "reps",
    muscle: "core",
    aliases: ["reverse crunch", "curl de caderas", "crunch inverso"],
  },
  {
    name: "Elevació de cames penjat",
    kind: "reps",
    muscle: "core",
    aliases: ["hanging leg raise", "leg raise", "elevacion de piernas", "elevacion de piernas colgado"],
  },
  {
    name: "Abdominals amb roda",
    kind: "reps",
    muscle: "core",
    aliases: ["ab wheel", "ab rollout", "rueda abdominal", "rueda"],
  },
  {
    name: "Planxa amb quatre suports",
    kind: "time",
    muscle: "core",
    aliases: ["plank", "front plank", "four point plank", "plancha", "plancha abdominal", "plancha con cuatro apoyos", "planxa"],
  },
  {
    name: "Pont lateral",
    kind: "time",
    muscle: "core",
    aliases: ["side plank", "side bridge", "plancha lateral", "planxa lateral"],
  },
  {
    name: "Gir rus",
    kind: "reps",
    muscle: "core",
    aliases: ["russian twist", "giro ruso"],
  },
  // Cardio / altres
  {
    name: "Cinta de córrer",
    kind: "time",
    muscle: "cardio",
    aliases: ["treadmill", "running", "run", "cinta de correr", "cinta", "correr", "maquina", "machine"],
  },
  {
    name: "Bicicleta estàtica",
    kind: "time",
    muscle: "cardio",
    aliases: ["stationary bike", "exercise bike", "spinning", "bicicleta estatica", "bici", "maquina", "machine"],
  },
  {
    name: "El·líptica",
    kind: "time",
    muscle: "cardio",
    aliases: ["elliptical", "cross trainer", "eliptica", "maquina", "machine"],
  },
  {
    name: "Màquina de rem",
    kind: "time",
    muscle: "cardio",
    aliases: ["rowing machine", "rower", "ergometer", "remo", "remoergometro", "maquina de remo", "ergometre de rem", "machine"],
  },
  {
    name: "Escaladora",
    kind: "time",
    muscle: "cardio",
    aliases: ["stair climber", "stairmaster", "stepper", "escaladora", "escaleras", "maquina", "machine"],
  },
  {
    name: "Saltar a corda",
    kind: "time",
    muscle: "cardio",
    aliases: ["jump rope", "skipping", "saltar a la comba", "comba", "cuerda", "corda de saltar"],
  },
  {
    name: "Burpee",
    kind: "reps",
    muscle: "cardio",
    aliases: ["burpees"],
  },
  {
    name: "Passeig del granger",
    kind: "time",
    muscle: "cardio",
    aliases: ["farmer walk", "farmers walk", "farmer's carry", "paseo del granjero"],
  },
];

/**
 * Noms que el catàleg ha fet servir abans (castellanismes, ortografia
 * incorrecta i els de la versió anterior, que no seguien el TERMCAT) → nom
 * actual. Les entrades, les plantilles i les còpies importades es reanomenen
 * perquè «Recents», l'historial i els valors de l'última vegada continuïn
 * lligats al mateix exercici.
 */
export const LEGACY_EXERCISE_NAMES: Record<string, string> = {
  // Primera versió
  "Press banca": "Pressió sobre banc",
  "Press inclinat amb mànuel·les": "Pressió sobre banc inclinat",
  "Obertures amb mànuel·les": "Obertura",
  "Fondos en paral·leles": "Fons a les paral·leles",
  "Creuament de politja": "Obertura a la politja",
  Dominades: "Dominació",
  "Remo amb barra": "Rem a la cintura amb barra",
  "Remo amb mànuel·la": "Rem a la cintura amb manuella",
  "Jalón al pit": "Tracció a la politja alta",
  "Remo en politja baixa": "Rem Gironda",
  "Peso mort": "Pes mort",
  Hiperextensions: "Extensió de tronc",
  Esquats: "Esquat",
  "Premsa de cames": "Pressió de cames",
  Zancades: "Tisora",
  "Extensió de quàdriceps": "Extensió de cames",
  "Femoral tombat": "Rull de cames",
  "Elevació de bessons": "Panxells",
  "Hip thrust": "Elevació de malucs",
  "Sentadilla búlgara": "Esquat búlgar",
  "Press militar": "Pressió d'espatlles",
  "Elevacions laterals": "Elevació lateral",
  "Elevacions frontals": "Elevació frontal",
  "Pájaros (deltoide posterior)": "Ocell",
  "Press Arnold": "Pressió Arnold",
  "Remo al mentó": "Rem vertical",
  "Curl de bíceps amb barra": "Rull de braços",
  "Curl de bíceps amb mànuel·les": "Rull de braços altern",
  "Curl martell": "Rull de martell",
  "Press francès": "Pressió francesa",
  "Extensió de tríceps en politja": "Extensió de tríceps a la politja",
  "Fondos de tríceps (banc)": "Fons de braços",
  "Crunch abdominal": "Rull de tronc",
  Plancha: "Planxa amb quatre suports",
  "Plancha lateral": "Pont lateral",
  "Russian twist": "Gir rus",
  "Remador (rem)": "Màquina de rem",
  "Corda de saltar": "Saltar a corda",
  "Farmer walk": "Passeig del granger",
  // Segona versió
  "Press de banca": "Pressió sobre banc",
  "Press inclinat amb manuelles": "Pressió sobre banc inclinat",
  "Obertures amb manuelles": "Obertura",
  "Fons en paral·leles": "Fons a les paral·leles",
  "Encreuament a la politja": "Obertura a la politja",
  "Rem amb barra": "Rem a la cintura amb barra",
  "Rem amb manuella": "Rem a la cintura amb manuella",
  "Estirada al pit": "Tracció a la politja alta",
  "Rem a la politja baixa": "Rem Gironda",
  Gambades: "Tisora",
  "Curl femoral ajagut": "Rull de cames",
  "Empenta de maluc": "Elevació de malucs",
  "Obertures posteriors": "Ocell",
  "Rem al mentó": "Rem vertical",
  "Curl de bíceps amb manuelles": "Rull de braços altern",
  "Fons de tríceps al banc": "Fons de braços",
  "Encongiment abdominal": "Rull de tronc",
  Planxa: "Planxa amb quatre suports",
  "Planxa lateral": "Pont lateral",
};

export function canonicalExerciseName(name: string): string {
  return LEGACY_EXERCISE_NAMES[name] ?? name;
}

/**
 * Minúscules, sense accents; el punt volat desapareix («paral·leles» ≈
 * «paralleles») i guions i apòstrofs fan de separador («pull-up» ≈ «pull up»).
 */
export function normalizeForSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[·.]/g, "")
    .replace(/[-'’/()]/g, " ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

const SEARCH_TEXT = new Map(
  CATALOG_SEED.map((c) => [
    `${c.name} ${c.kind}`,
    normalizeForSearch([c.name, ...c.aliases, ...MUSCLE_ALIASES[c.muscle]].join(" | ")),
  ]),
);

/**
 * Coincideix si TOTES les paraules de la cerca apareixen (en qualsevol
 * ordre) al nom català, als noms en castellà o anglès, al material o al grup
 * muscular: «curl leg», «polea», «pecho», «machine», «jalon»…
 */
export function matchesExerciseQuery(option: { name: string; kind: ExerciseKind }, query: string): boolean {
  const words = normalizeForSearch(query).split(" ").filter(Boolean);
  if (words.length === 0) return true;
  const text = SEARCH_TEXT.get(`${option.name} ${option.kind}`) ?? normalizeForSearch(option.name);
  return words.every((w) => text.includes(w));
}

/** La cerca és exactament el nom (o un àlies sencer) d'un exercici del catàleg? */
export function isExactCatalogMatch(query: string): boolean {
  const q = normalizeForSearch(query);
  return CATALOG_SEED.some((c) => normalizeForSearch(c.name) === q || c.aliases.some((a) => normalizeForSearch(a) === q));
}

const MUSCLES = new Map(CATALOG_SEED.map((c) => [`${c.name} ${c.kind}`, c.muscle]));

/** Grup muscular d'un exercici del catàleg; «altres» per als creats per l'usuari. */
export function muscleGroupOf(option: { name: string; kind: ExerciseKind }): MuscleGroup | "altres" {
  return MUSCLES.get(`${option.name} ${option.kind}`) ?? "altres";
}
