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

/** Músculs concrets que treballa cada exercici (etiquetes de la llista). */
export type Muscle =
  | "pectoral"
  | "dorsal"
  | "trapezi"
  | "lumbars"
  | "deltoides"
  | "biceps"
  | "triceps"
  | "avantbrac"
  | "quadriceps"
  | "isquios"
  | "glutis"
  | "bessons"
  | "adductors"
  | "abductors"
  | "abdominals"
  | "oblics"
  | "cardio";

/** Nom de cada múscul en català (el que es mostra), castellà i anglès (per a la cerca). */
export const MUSCLE_NAMES: Record<Muscle, { ca: string; es: string; en: string }> = {
  pectoral: { ca: "Pectoral", es: "Pectoral", en: "Chest" },
  dorsal: { ca: "Dorsal", es: "Dorsal", en: "Lats" },
  trapezi: { ca: "Trapezi", es: "Trapecio", en: "Traps" },
  lumbars: { ca: "Lumbars", es: "Lumbares", en: "Lower back" },
  deltoides: { ca: "Deltoides", es: "Deltoides", en: "Delts" },
  biceps: { ca: "Bíceps", es: "Bíceps", en: "Biceps" },
  triceps: { ca: "Tríceps", es: "Tríceps", en: "Triceps" },
  avantbrac: { ca: "Avantbraç", es: "Antebrazo", en: "Forearms" },
  quadriceps: { ca: "Quàdriceps", es: "Cuádriceps", en: "Quads" },
  isquios: { ca: "Isquiotibials", es: "Isquiotibiales", en: "Hamstrings" },
  glutis: { ca: "Glutis", es: "Glúteos", en: "Glutes" },
  bessons: { ca: "Bessons", es: "Gemelos", en: "Calves" },
  adductors: { ca: "Adductors", es: "Aductores", en: "Adductors" },
  abductors: { ca: "Abductors", es: "Abductores", en: "Abductors" },
  abdominals: { ca: "Abdominals", es: "Abdominales", en: "Abs" },
  oblics: { ca: "Oblics", es: "Oblicuos", en: "Obliques" },
  cardio: { ca: "Cardio", es: "Cardio", en: "Cardio" },
};

export interface CatalogExercise {
  /** Nom en català, el que es desa i es mostra a tot arreu. */
  name: string;
  /** Nom habitual en castellà i en anglès: es mostren en petit al cercador. */
  es: string;
  en: string;
  kind: ExerciseKind;
  muscle: MuscleGroup;
  /** Músculs que treballa, el principal primer. */
  muscles: Muscle[];
  /** Altres variants i material (màquina, politja, manuelles…) només per a la cerca. */
  aliases: string[];
}

/**
 * Catàleg inicial (constant, mai una taula Dexie — vegeu §Model de dades del
 * pla). Els noms són els que se senten al gimnàs (press, curl, crunch…) i no
 * els del TERMCAT, que costava reconèixer; el castellà i l'anglès es mostren
 * a sota. El desplegable de l'exercici mostra aquesta llista unida als noms ja
 * usats a `entries`.
 */
export const CATALOG_SEED: CatalogExercise[] = [
  // Pit
  {
    name: "Press de banca",
    es: "Press de banca",
    en: "Bench press",
    kind: "reps",
    muscle: "pit",
    muscles: ["pectoral", "triceps", "deltoides"],
    aliases: ["flat bench press", "press banca", "press plano", "press de banca horizontal", "barra", "barbell", "pressio sobre banc"],
  },
  {
    name: "Press inclinat",
    es: "Press inclinado",
    en: "Incline bench press",
    kind: "reps",
    muscle: "pit",
    muscles: ["pectoral", "deltoides", "triceps"],
    aliases: ["incline dumbbell press", "press de banca inclinado", "press inclinado con mancuernas", "manuelles", "mancuernas", "dumbbells"],
  },
  {
    name: "Press declinat",
    es: "Press declinado",
    en: "Decline bench press",
    kind: "reps",
    muscle: "pit",
    muscles: ["pectoral", "triceps"],
    aliases: ["press de banca declinado"],
  },
  {
    name: "Press de pit a la màquina",
    es: "Press de pecho en máquina",
    en: "Chest press machine",
    kind: "reps",
    muscle: "pit",
    muscles: ["pectoral", "triceps", "deltoides"],
    aliases: ["chest press", "press de pecho", "maquina", "machine"],
  },
  {
    name: "Obertures amb manuelles",
    es: "Aperturas con mancuernas",
    en: "Dumbbell fly",
    kind: "reps",
    muscle: "pit",
    muscles: ["pectoral"],
    aliases: ["chest fly", "flyes", "apertura", "aperturas", "obertura", "manuelles", "mancuernas"],
  },
  {
    name: "Creuament de politges",
    es: "Cruce de poleas",
    en: "Cable crossover",
    kind: "reps",
    muscle: "pit",
    muscles: ["pectoral"],
    aliases: ["cable fly", "crossover", "aperturas en polea", "polea", "cable", "politja", "encreuament"],
  },
  {
    name: "Contractora de pit",
    es: "Contractora (mariposa)",
    en: "Pec deck",
    kind: "reps",
    muscle: "pit",
    muscles: ["pectoral"],
    aliases: ["peck deck", "butterfly", "mariposa", "papallona", "maquina de pectoral", "maquina", "machine"],
  },
  {
    name: "Fons a les paral·leles",
    es: "Fondos en paralelas",
    en: "Dips",
    kind: "reps",
    muscle: "pit",
    muscles: ["pectoral", "triceps", "deltoides"],
    aliases: ["chest dips", "fondos", "paralelas", "parallel bars"],
  },
  {
    name: "Flexions",
    es: "Flexiones",
    en: "Push-ups",
    kind: "reps",
    muscle: "pit",
    muscles: ["pectoral", "triceps", "deltoides"],
    aliases: ["push up", "pushups", "flexiones de brazos", "fons a terra", "lagartijas"],
  },
  // Esquena
  {
    name: "Dominades",
    es: "Dominadas",
    en: "Pull-ups",
    kind: "reps",
    muscle: "esquena",
    muscles: ["dorsal", "biceps"],
    aliases: ["pull up", "chin up", "chin-ups", "dominada", "barra fija"],
  },
  {
    name: "Dominades assistides",
    es: "Dominadas asistidas",
    en: "Assisted pull-up machine",
    kind: "reps",
    muscle: "esquena",
    muscles: ["dorsal", "biceps"],
    aliases: ["assisted pull up", "dominada en maquina", "maquina", "machine"],
  },
  {
    name: "Estirada al pit",
    es: "Jalón al pecho",
    en: "Lat pulldown",
    kind: "reps",
    muscle: "esquena",
    muscles: ["dorsal", "biceps"],
    aliases: ["pulldown", "polea al pecho", "jalon", "polea alta", "politja alta", "jalo al pit", "polea", "cable"],
  },
  {
    name: "Rem amb barra",
    es: "Remo con barra",
    en: "Barbell row",
    kind: "reps",
    muscle: "esquena",
    muscles: ["dorsal", "trapezi", "biceps"],
    aliases: ["bent over row", "bent-over row", "remo", "row", "barra", "barbell"],
  },
  {
    name: "Rem amb manuella",
    es: "Remo con mancuerna",
    en: "Dumbbell row",
    kind: "reps",
    muscle: "esquena",
    muscles: ["dorsal", "trapezi", "biceps"],
    aliases: ["one arm row", "single arm row", "remo a una mano", "remo", "row", "manuella", "mancuerna"],
  },
  {
    name: "Rem a la politja baixa",
    es: "Remo en polea baja",
    en: "Seated cable row",
    kind: "reps",
    muscle: "esquena",
    muscles: ["dorsal", "trapezi", "biceps"],
    aliases: ["cable row", "remo gironda", "rem gironda", "remo sentado", "polea baja", "polea", "cable", "politja"],
  },
  {
    name: "Rem a la màquina",
    es: "Remo en máquina",
    en: "Machine row",
    kind: "reps",
    muscle: "esquena",
    muscles: ["dorsal", "trapezi", "biceps"],
    aliases: ["chest supported row", "seated row machine", "remo al pecho", "maquina", "machine"],
  },
  {
    name: "Pullover",
    es: "Pullover",
    en: "Pullover",
    kind: "reps",
    muscle: "esquena",
    muscles: ["dorsal", "pectoral"],
    aliases: ["pull over", "pull-over", "pullover"],
  },
  {
    name: "Obertures posteriors",
    es: "Pájaros",
    en: "Reverse fly",
    kind: "reps",
    muscle: "esquena",
    muscles: ["deltoides", "trapezi"],
    aliases: ["rear delt fly", "pajaro", "ocell", "ocells", "deltoides posterior", "reverse pec deck"],
  },
  {
    name: "Pes mort",
    es: "Peso muerto",
    en: "Deadlift",
    kind: "reps",
    muscle: "cames",
    muscles: ["isquios", "glutis", "lumbars", "trapezi"],
    aliases: ["barra", "barbell"],
  },
  {
    name: "Hiperextensions",
    es: "Hiperextensiones",
    en: "Back extension",
    kind: "reps",
    muscle: "esquena",
    muscles: ["lumbars", "glutis", "isquios"],
    aliases: ["hyperextension", "hyperextensions", "extension de tronco", "extensio de tronc", "banco romano"],
  },
  // Cames
  {
    name: "Esquat",
    es: "Sentadilla",
    en: "Squat",
    kind: "reps",
    muscle: "cames",
    muscles: ["quadriceps", "glutis", "isquios"],
    aliases: ["back squat", "sentadillas", "esquats", "barra", "barbell"],
  },
  {
    name: "Esquat frontal",
    es: "Sentadilla frontal",
    en: "Front squat",
    kind: "reps",
    muscle: "cames",
    muscles: ["quadriceps", "glutis", "abdominals"],
    aliases: [],
  },
  {
    name: "Esquat al multipower",
    es: "Sentadilla en multipower",
    en: "Smith machine squat",
    kind: "reps",
    muscle: "cames",
    muscles: ["quadriceps", "glutis"],
    aliases: ["smith", "multipower", "maquina smith", "maquina", "machine"],
  },
  {
    name: "Esquat búlgar",
    es: "Sentadilla búlgara",
    en: "Bulgarian split squat",
    kind: "reps",
    muscle: "cames",
    muscles: ["quadriceps", "glutis"],
    aliases: ["split squat"],
  },
  {
    name: "Premsa de cames",
    es: "Prensa de piernas",
    en: "Leg press",
    kind: "reps",
    muscle: "cames",
    muscles: ["quadriceps", "glutis", "isquios"],
    aliases: ["prensa", "premsa", "maquina", "machine"],
  },
  {
    name: "Gambades",
    es: "Zancadas",
    en: "Lunges",
    kind: "reps",
    muscle: "cames",
    muscles: ["quadriceps", "glutis"],
    aliases: ["lunge", "zancada", "estocada", "estocadas", "tisora", "tisores"],
  },
  {
    name: "Extensió de quàdriceps",
    es: "Extensión de cuádriceps",
    en: "Leg extension",
    kind: "reps",
    muscle: "cames",
    muscles: ["quadriceps"],
    aliases: ["extension de rodillas", "extensio de cames", "extensio de genolls", "maquina", "machine"],
  },
  {
    name: "Curl femoral",
    es: "Curl femoral",
    en: "Leg curl",
    kind: "reps",
    muscle: "cames",
    muscles: ["isquios"],
    aliases: ["lying leg curl", "seated leg curl", "hamstring curl", "curl femoral tumbado", "curl femoral sentado", "maquina", "machine"],
  },
  {
    name: "Hip thrust",
    es: "Hip thrust",
    en: "Hip thrust",
    kind: "reps",
    muscle: "cames",
    muscles: ["glutis", "isquios"],
    aliases: ["glute bridge", "elevacion de pelvis", "elevacion de cadera", "empuje de cadera", "puente de gluteos", "empenta de maluc", "elevacio de malucs"],
  },
  {
    name: "Màquina d'abductors",
    es: "Máquina de abductores",
    en: "Hip abduction machine",
    kind: "reps",
    muscle: "cames",
    muscles: ["abductors", "glutis"],
    aliases: ["hip abduction", "abductor machine", "abduccion de cadera", "abduccio de maluc", "maquina", "machine"],
  },
  {
    name: "Màquina d'adductors",
    es: "Máquina de aductores",
    en: "Hip adduction machine",
    kind: "reps",
    muscle: "cames",
    muscles: ["adductors"],
    aliases: ["hip adduction", "adductor machine", "aduccion de cadera", "adduccio de maluc", "maquina", "machine"],
  },
  {
    name: "Elevació de bessons",
    es: "Elevación de gemelos",
    en: "Standing calf raise",
    kind: "reps",
    muscle: "cames",
    muscles: ["bessons"],
    aliases: ["calf raise", "elevacion de talones", "pantorrillas", "panxells"],
  },
  {
    name: "Bessons a la premsa",
    es: "Gemelos en prensa",
    en: "Calf press",
    kind: "reps",
    muscle: "cames",
    muscles: ["bessons"],
    aliases: ["leg press calf raise", "pantorrillas en prensa", "panxells", "maquina", "machine"],
  },
  // Espatlles
  {
    name: "Press d'espatlles",
    es: "Press militar",
    en: "Shoulder press",
    kind: "reps",
    muscle: "espatlles",
    muscles: ["deltoides", "triceps"],
    aliases: ["overhead press", "military press", "press de hombros", "ohp", "press militar"],
  },
  {
    name: "Press Arnold",
    es: "Press Arnold",
    en: "Arnold press",
    kind: "reps",
    muscle: "espatlles",
    muscles: ["deltoides", "triceps"],
    aliases: [],
  },
  {
    name: "Elevacions laterals",
    es: "Elevaciones laterales",
    en: "Lateral raise",
    kind: "reps",
    muscle: "espatlles",
    muscles: ["deltoides"],
    aliases: ["side raise", "elevacion lateral"],
  },
  {
    name: "Elevacions frontals",
    es: "Elevaciones frontales",
    en: "Front raise",
    kind: "reps",
    muscle: "espatlles",
    muscles: ["deltoides"],
    aliases: ["elevacion frontal"],
  },
  {
    name: "Rem al mentó",
    es: "Remo al mentón",
    en: "Upright row",
    kind: "reps",
    muscle: "espatlles",
    muscles: ["deltoides", "trapezi"],
    aliases: ["remo vertical", "rem vertical"],
  },
  {
    name: "Encongiments d'espatlles",
    es: "Encogimientos de hombros",
    en: "Shrugs",
    kind: "reps",
    muscle: "espatlles",
    muscles: ["trapezi"],
    aliases: ["shrug", "shoulder shrug", "encogimiento de hombros", "trapecio"],
  },
  // Braços
  {
    name: "Curl de bíceps amb barra",
    es: "Curl de bíceps con barra",
    en: "Barbell curl",
    kind: "reps",
    muscle: "bracos",
    muscles: ["biceps", "avantbrac"],
    aliases: ["biceps curl", "curl", "barra", "barbell"],
  },
  {
    name: "Curl de bíceps amb manuelles",
    es: "Curl con mancuernas",
    en: "Dumbbell curl",
    kind: "reps",
    muscle: "bracos",
    muscles: ["biceps", "avantbrac"],
    aliases: ["alternate curl", "curl alterno", "curl altern", "manuelles", "mancuernas"],
  },
  {
    name: "Curl martell",
    es: "Curl martillo",
    en: "Hammer curl",
    kind: "reps",
    muscle: "bracos",
    muscles: ["biceps", "avantbrac"],
    aliases: ["manuelles", "mancuernas"],
  },
  {
    name: "Curl Scott",
    es: "Curl en banco Scott",
    en: "Preacher curl",
    kind: "reps",
    muscle: "bracos",
    muscles: ["biceps"],
    aliases: ["curl scott", "banco scott", "banc scott"],
  },
  {
    name: "Curl concentrat",
    es: "Curl concentrado",
    en: "Concentration curl",
    kind: "reps",
    muscle: "bracos",
    muscles: ["biceps"],
    aliases: ["manuella", "mancuerna"],
  },
  {
    name: "Press francès",
    es: "Press francés",
    en: "Skull crusher",
    kind: "reps",
    muscle: "bracos",
    muscles: ["triceps"],
    aliases: ["french press", "lying triceps extension", "extension de triceps", "extensio de triceps"],
  },
  {
    name: "Tríceps a la politja",
    es: "Extensión de tríceps en polea",
    en: "Triceps pushdown",
    kind: "reps",
    muscle: "bracos",
    muscles: ["triceps"],
    aliases: ["cable pushdown", "pushdown", "jalon de triceps", "extensio de triceps", "polea", "cable", "politja"],
  },
  {
    name: "Fons de tríceps al banc",
    es: "Fondos de tríceps en banco",
    en: "Bench dips",
    kind: "reps",
    muscle: "bracos",
    muscles: ["triceps", "pectoral"],
    aliases: ["triceps dips", "fondos", "fondos en banco", "fons de bracos"],
  },
  {
    name: "Patada de tríceps",
    es: "Patada de tríceps",
    en: "Triceps kickback",
    kind: "reps",
    muscle: "bracos",
    muscles: ["triceps"],
    aliases: ["kickback", "manuella", "mancuerna"],
  },
  // Abdominals / zona central
  {
    name: "Crunch abdominal",
    es: "Crunch abdominal",
    en: "Crunch",
    kind: "reps",
    muscle: "core",
    muscles: ["abdominals"],
    aliases: ["abdominal crunch", "sit up", "encogimiento abdominal", "encongiment abdominal", "abdominales"],
  },
  {
    name: "Crunch invers",
    es: "Crunch inverso",
    en: "Reverse crunch",
    kind: "reps",
    muscle: "core",
    muscles: ["abdominals"],
    aliases: ["curl de caderas"],
  },
  {
    name: "Elevació de cames penjat",
    es: "Elevación de piernas colgado",
    en: "Hanging leg raise",
    kind: "reps",
    muscle: "core",
    muscles: ["abdominals", "oblics"],
    aliases: ["leg raise", "elevacion de piernas"],
  },
  {
    name: "Roda abdominal",
    es: "Rueda abdominal",
    en: "Ab wheel rollout",
    kind: "reps",
    muscle: "core",
    muscles: ["abdominals", "lumbars"],
    aliases: ["ab wheel", "ab rollout", "rueda", "roda"],
  },
  {
    name: "Planxa",
    es: "Plancha",
    en: "Plank",
    kind: "time",
    muscle: "core",
    muscles: ["abdominals", "lumbars"],
    aliases: ["front plank", "plancha abdominal"],
  },
  {
    name: "Planxa lateral",
    es: "Plancha lateral",
    en: "Side plank",
    kind: "time",
    muscle: "core",
    muscles: ["oblics", "abdominals"],
    aliases: ["side bridge", "pont lateral"],
  },
  {
    name: "Gir rus",
    es: "Giro ruso",
    en: "Russian twist",
    kind: "reps",
    muscle: "core",
    muscles: ["oblics", "abdominals"],
    aliases: [],
  },
  // Cardio / altres
  {
    name: "Cinta de córrer",
    es: "Cinta de correr",
    en: "Treadmill",
    kind: "time",
    muscle: "cardio",
    muscles: ["cardio", "quadriceps", "bessons"],
    aliases: ["running", "run", "cinta", "correr", "maquina", "machine"],
  },
  {
    name: "Bicicleta estàtica",
    es: "Bicicleta estática",
    en: "Stationary bike",
    kind: "time",
    muscle: "cardio",
    muscles: ["cardio", "quadriceps"],
    aliases: ["exercise bike", "spinning", "bici", "maquina", "machine"],
  },
  {
    name: "El·líptica",
    es: "Elíptica",
    en: "Elliptical",
    kind: "time",
    muscle: "cardio",
    muscles: ["cardio", "quadriceps", "glutis"],
    aliases: ["cross trainer", "maquina", "machine"],
  },
  {
    name: "Màquina de rem",
    es: "Remo (máquina)",
    en: "Rowing machine",
    kind: "time",
    muscle: "cardio",
    muscles: ["cardio", "dorsal", "quadriceps"],
    aliases: ["rower", "ergometer", "remo", "remoergometro", "ergometre de rem", "machine"],
  },
  {
    name: "Escaladora",
    es: "Escaladora",
    en: "Stair climber",
    kind: "time",
    muscle: "cardio",
    muscles: ["cardio", "glutis", "quadriceps"],
    aliases: ["stairmaster", "stepper", "escaleras", "maquina", "machine"],
  },
  {
    name: "Saltar a corda",
    es: "Saltar a la comba",
    en: "Jump rope",
    kind: "time",
    muscle: "cardio",
    muscles: ["cardio", "bessons"],
    aliases: ["skipping", "comba", "cuerda", "corda de saltar"],
  },
  {
    name: "Burpees",
    es: "Burpees",
    en: "Burpees",
    kind: "reps",
    muscle: "cardio",
    muscles: ["cardio", "pectoral", "quadriceps"],
    aliases: ["burpee"],
  },
  {
    name: "Passeig del granger",
    es: "Paseo del granjero",
    en: "Farmer's walk",
    kind: "time",
    muscle: "cardio",
    muscles: ["avantbrac", "trapezi", "abdominals"],
    aliases: ["farmer walk", "farmers walk", "farmer's carry"],
  },
];

/**
 * Noms que el catàleg ha fet servir abans de la versió TERMCAT (castellanismes,
 * ortografia incorrecta…) → nom TERMCAT. `canonicalExerciseName` hi aplica
 * després `TERMCAT_TO_GYM_NAMES`. Les entrades, les plantilles i les còpies
 * importades es reanomenen perquè «Recents», l'historial i els valors de
 * l'última vegada continuïn lligats al mateix exercici.
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

/** Noms TERMCAT (tercera versió) → noms de gimnàs actuals. */
export const TERMCAT_TO_GYM_NAMES: Record<string, string> = {
  "Pressió sobre banc": "Press de banca",
  "Pressió sobre banc inclinat": "Press inclinat",
  "Pressió sobre banc declinat": "Press declinat",
  "Pressió de pit": "Press de pit a la màquina",
  Obertura: "Obertures amb manuelles",
  "Obertura a la politja": "Creuament de politges",
  Papallona: "Contractora de pit",
  "Fons a terra": "Flexions",
  Dominació: "Dominades",
  "Dominació a la màquina": "Dominades assistides",
  "Tracció a la politja alta": "Estirada al pit",
  "Rem a la cintura amb barra": "Rem amb barra",
  "Rem a la cintura amb manuella": "Rem amb manuella",
  "Rem Gironda": "Rem a la politja baixa",
  "Rem al pit": "Rem a la màquina",
  "Pul·lòver": "Pullover",
  Ocell: "Obertures posteriors",
  "Extensió de tronc": "Hiperextensions",
  "Esquat a la màquina Smith": "Esquat al multipower",
  "Pressió de cames": "Premsa de cames",
  Tisora: "Gambades",
  "Extensió de cames": "Extensió de quàdriceps",
  "Rull de cames": "Curl femoral",
  "Elevació de malucs": "Hip thrust",
  "Abducció de maluc": "Màquina d'abductors",
  "Adducció de maluc": "Màquina d'adductors",
  Panxells: "Elevació de bessons",
  "Pressió de panxells": "Bessons a la premsa",
  "Pressió d'espatlles": "Press d'espatlles",
  "Pressió Arnold": "Press Arnold",
  "Elevació lateral": "Elevacions laterals",
  "Elevació frontal": "Elevacions frontals",
  "Rem vertical": "Rem al mentó",
  "Encongiment d'espatlles": "Encongiments d'espatlles",
  "Rull de braços": "Curl de bíceps amb barra",
  "Rull de braços altern": "Curl de bíceps amb manuelles",
  "Rull de martell": "Curl martell",
  "Rull Scott": "Curl Scott",
  "Rull de braç concentrat": "Curl concentrat",
  "Pressió francesa": "Press francès",
  "Extensió de tríceps a la politja": "Tríceps a la politja",
  "Fons de braços": "Fons de tríceps al banc",
  "Puntada de tríceps": "Patada de tríceps",
  "Rull de tronc": "Crunch abdominal",
  "Rull de malucs": "Crunch invers",
  "Abdominals amb roda": "Roda abdominal",
  "Planxa amb quatre suports": "Planxa",
  "Pont lateral": "Planxa lateral",
  Burpee: "Burpees",
};

export function canonicalExerciseName(name: string): string {
  const termcat = LEGACY_EXERCISE_NAMES[name] ?? name;
  return TERMCAT_TO_GYM_NAMES[termcat] ?? termcat;
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
    normalizeForSearch(
      [
        c.name,
        c.es,
        c.en,
        ...c.aliases,
        ...MUSCLE_ALIASES[c.muscle],
        ...c.muscles.flatMap((m) => Object.values(MUSCLE_NAMES[m])),
      ].join(" | "),
    ),
  ]),
);

/**
 * Coincideix si TOTES les paraules de la cerca apareixen (en qualsevol
 * ordre) al nom català, als noms en castellà o anglès, al material, al grup
 * muscular o als músculs: «curl leg», «polea», «pecho», «machine», «glutis»…
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
  return CATALOG_SEED.some((c) => [c.name, c.es, c.en, ...c.aliases].some((a) => normalizeForSearch(a) === q));
}

const CATALOG = new Map(CATALOG_SEED.map((c) => [`${c.name} ${c.kind}`, c]));

/** L'exercici del catàleg amb aquest nom i tipus (cap per als creats per l'usuari). */
export function catalogExercise(option: { name: string; kind: ExerciseKind }): CatalogExercise | undefined {
  return CATALOG.get(`${option.name} ${option.kind}`);
}

/**
 * Noms en castellà i anglès per mostrar sota el català, sense repetir-ne cap
 * d'igual (p. ex. «Hip thrust» surt només una vegada).
 */
export function otherLanguageNames(c: CatalogExercise): string[] {
  const seen = new Set([normalizeForSearch(c.name)]);
  return [c.es, c.en].filter((n) => {
    const key = normalizeForSearch(n);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Grup muscular d'un exercici del catàleg; «altres» per als creats per l'usuari. */
export function muscleGroupOf(option: { name: string; kind: ExerciseKind }): MuscleGroup | "altres" {
  return catalogExercise(option)?.muscle ?? "altres";
}
