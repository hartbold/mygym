import type { ExerciseKind } from "./types";

/**
 * Catàleg inicial (constant, mai una taula Dexie — vegeu §Model de dades del
 * pla). El desplegable de l'exercici mostra aquesta llista unida als noms ja
 * usats a `entries`; no cal cap seeding ni idempotència.
 */
export const CATALOG_SEED: { name: string; kind: ExerciseKind }[] = [
  // Pit
  { name: "Press banca", kind: "reps" },
  { name: "Press inclinat amb mànuel·les", kind: "reps" },
  { name: "Obertures amb mànuel·les", kind: "reps" },
  { name: "Fondos en paral·leles", kind: "reps" },
  { name: "Creuament de politja", kind: "reps" },
  // Esquena
  { name: "Dominades", kind: "reps" },
  { name: "Remo amb barra", kind: "reps" },
  { name: "Remo amb mànuel·la", kind: "reps" },
  { name: "Jalón al pit", kind: "reps" },
  { name: "Remo en politja baixa", kind: "reps" },
  { name: "Peso mort", kind: "reps" },
  { name: "Hiperextensions", kind: "reps" },
  // Cames
  { name: "Esquats", kind: "reps" },
  { name: "Premsa de cames", kind: "reps" },
  { name: "Zancades", kind: "reps" },
  { name: "Extensió de quàdriceps", kind: "reps" },
  { name: "Femoral tombat", kind: "reps" },
  { name: "Elevació de bessons", kind: "reps" },
  { name: "Hip thrust", kind: "reps" },
  { name: "Sentadilla búlgara", kind: "reps" },
  // Espatlles
  { name: "Press militar", kind: "reps" },
  { name: "Elevacions laterals", kind: "reps" },
  { name: "Elevacions frontals", kind: "reps" },
  { name: "Pájaros (deltoide posterior)", kind: "reps" },
  { name: "Press Arnold", kind: "reps" },
  { name: "Remo al mentó", kind: "reps" },
  // Braços
  { name: "Curl de bíceps amb barra", kind: "reps" },
  { name: "Curl de bíceps amb mànuel·les", kind: "reps" },
  { name: "Curl martell", kind: "reps" },
  { name: "Press francès", kind: "reps" },
  { name: "Extensió de tríceps en politja", kind: "reps" },
  { name: "Fondos de tríceps (banc)", kind: "reps" },
  // Abdominals / core
  { name: "Crunch abdominal", kind: "reps" },
  { name: "Elevació de cames penjat", kind: "reps" },
  { name: "Abdominals amb roda", kind: "reps" },
  { name: "Plancha", kind: "time" },
  { name: "Plancha lateral", kind: "time" },
  { name: "Russian twist", kind: "reps" },
  // Cardio / altres
  { name: "Cinta de córrer", kind: "time" },
  { name: "Bicicleta estàtica", kind: "time" },
  { name: "Remador (rem)", kind: "time" },
  { name: "Corda de saltar", kind: "time" },
  { name: "Farmer walk", kind: "time" },
];
