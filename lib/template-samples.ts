import type { TemplateInput } from "./templates";
import type { PlannedSet } from "./types";

const reps = (n: number, times: number, weight?: number): PlannedSet[] =>
  Array.from({ length: times }, () => (weight !== undefined ? { weight, reps: n } : { reps: n }));
const time = (sec: number, times: number): PlannedSet[] => Array.from({ length: times }, () => ({ durationSec: sec }));

/**
 * Rutines de mostra per començar. Els pesos són orientatius (cal ajustar-los
 * a cadascú); només fan servir exercicis del catàleg.
 */
export const SAMPLE_TEMPLATES: TemplateInput[] = [
  {
    name: "Cos sencer",
    notes: "Tres cops per setmana, amb un dia de descans entre sessions.",
    exercises: [
      { name: "Esquat", kind: "reps", sets: reps(8, 3, 60) },
      { name: "Pressió sobre banc", kind: "reps", sets: reps(8, 3, 50) },
      { name: "Rem a la cintura amb barra", kind: "reps", sets: reps(10, 3, 40) },
      { name: "Pressió d'espatlles", kind: "reps", sets: reps(10, 3, 25) },
      { name: "Planxa amb quatre suports", kind: "time", sets: time(45, 3) },
    ],
  },
  {
    name: "Pit, espatlles i tríceps",
    notes: "Exercicis d'empènyer.",
    exercises: [
      { name: "Pressió sobre banc", kind: "reps", sets: reps(6, 4, 60) },
      { name: "Pressió sobre banc inclinat", kind: "reps", sets: reps(10, 3, 20) },
      { name: "Pressió d'espatlles", kind: "reps", sets: reps(8, 3, 30) },
      { name: "Elevació lateral", kind: "reps", sets: reps(15, 3, 8) },
      { name: "Extensió de tríceps a la politja", kind: "reps", sets: reps(12, 3, 20) },
    ],
  },
  {
    name: "Esquena i bíceps",
    notes: "Exercicis d'estirar.",
    exercises: [
      { name: "Dominació", kind: "reps", sets: reps(8, 4) },
      { name: "Rem a la cintura amb barra", kind: "reps", sets: reps(8, 3, 50) },
      { name: "Tracció a la politja alta", kind: "reps", sets: reps(12, 3, 45) },
      { name: "Ocell", kind: "reps", sets: reps(15, 3, 6) },
      { name: "Rull de braços", kind: "reps", sets: reps(10, 3, 20) },
    ],
  },
  {
    name: "Cames",
    exercises: [
      { name: "Esquat", kind: "reps", sets: reps(6, 4, 70) },
      { name: "Pes mort", kind: "reps", sets: reps(5, 3, 80) },
      { name: "Pressió de cames", kind: "reps", sets: reps(12, 3, 100) },
      { name: "Rull de cames", kind: "reps", sets: reps(12, 3, 30) },
      { name: "Panxells", kind: "reps", sets: reps(15, 3, 40) },
    ],
  },
  {
    name: "Abdominals i cardio",
    exercises: [
      { name: "Cinta de córrer", kind: "time", sets: time(10 * 60, 1) },
      { name: "Planxa amb quatre suports", kind: "time", sets: time(60, 3) },
      { name: "Pont lateral", kind: "time", sets: time(30, 2) },
      { name: "Elevació de cames penjat", kind: "reps", sets: reps(12, 3) },
      { name: "Bicicleta estàtica", kind: "time", sets: time(15 * 60, 1) },
    ],
  },
];
