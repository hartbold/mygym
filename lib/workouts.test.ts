import { beforeEach, describe, expect, it } from "vitest";
import { CATALOG_SEED } from "./catalog-seed";
import { db } from "./db";
import { groupSessions } from "./sessions";
import { SAMPLE_TEMPLATES } from "./template-samples";
import { buildTemplatesFile, importTemplates, parseTemplatesFile } from "./template-io";
import { createTemplate, duplicateTemplate, templateInputFromEntries } from "./templates";
import {
  addWorkoutExercise,
  addWorkoutSet,
  differsFromTemplate,
  finishWorkout,
  loadTemplate,
  moveWorkoutExercise,
  removeWorkoutExercise,
  removeWorkoutSet,
  toggleSetDone,
  updateWorkoutSet,
} from "./workouts";

const T0 = new Date(2026, 8, 24, 18, 0).getTime();
const MIN = 60_000;

beforeEach(async () => {
  await Promise.all([db.entries.clear(), db.templates.clear(), db.workouts.clear()]);
});

async function setup() {
  const templateId = await createTemplate(
    {
      name: "Empenta",
      exercises: [
        { name: "Pressió sobre banc", kind: "reps", sets: [{ weight: 60, reps: 8 }, { weight: 60, reps: 8 }] },
        { name: "Planxa amb quatre suports", kind: "time", sets: [{ durationSec: 60 }] },
      ],
    },
    T0 - 60 * MIN,
  );
  const workoutId = (await loadTemplate(templateId, T0))!;
  const w = (await db.workouts.get(workoutId))!;
  const [press, plank] = w.exercises;
  return { templateId, workoutId, press, plank };
}

describe("sessió guiada", () => {
  it("carregar una plantilla no comença res: ni hora d'inici ni entrades", async () => {
    const { workoutId } = await setup();
    const w = await db.workouts.get(workoutId);
    expect(w?.startedAt).toBeUndefined();
    expect(w?.date).toBe("2026-09-24");
    expect(await db.entries.count()).toBe(0);
  });

  it("la primera marca inicia la sessió i crea una entrada ja feta", async () => {
    const { workoutId, press } = await setup();
    await toggleSetDone(workoutId, press.id, press.sets[0].id, T0 + 5 * MIN);
    const w = (await db.workouts.get(workoutId))!;
    expect(w.startedAt).toBe(T0 + 5 * MIN);
    const [entry] = await db.entries.toArray();
    expect(entry).toMatchObject({
      name: "Pressió sobre banc",
      kind: "reps",
      status: "done",
      date: "2026-09-24",
      startedAt: T0 + 5 * MIN,
      endedAt: T0 + 5 * MIN,
    });
    expect(entry.sets).toEqual([expect.objectContaining({ weight: 60, reps: 8, doneAt: T0 + 5 * MIN })]);
    expect(w.exercises[0].entryId).toBe(entry.id);
  });

  it("cada exercici comença a l'última marca anterior i acaba a la seva última sèrie", async () => {
    const { workoutId, press, plank } = await setup();
    await toggleSetDone(workoutId, press.id, press.sets[0].id, T0 + 5 * MIN);
    await toggleSetDone(workoutId, press.id, press.sets[1].id, T0 + 8 * MIN);
    await toggleSetDone(workoutId, plank.id, plank.sets[0].id, T0 + 15 * MIN);
    const entries = await db.entries.toArray();
    const pressEntry = entries.find((e) => e.name === "Pressió sobre banc")!;
    const plankEntry = entries.find((e) => e.name === "Planxa amb quatre suports")!;
    expect([pressEntry.startedAt, pressEntry.endedAt]).toEqual([T0 + 5 * MIN, T0 + 8 * MIN]);
    expect([plankEntry.startedAt, plankEntry.endedAt]).toEqual([T0 + 8 * MIN, T0 + 15 * MIN]);
    // La sessió de l'historial dura de la primera a l'última marca.
    const [session] = groupSessions(entries, T0 + 60 * MIN);
    expect(session.durationMs).toBe(10 * MIN);
    expect(session.setCount).toBe(3);
  });

  it("desmarcar treu la sèrie; si l'exercici queda buit, l'entrada desapareix i la sessió «desarrenca»", async () => {
    const { workoutId, press } = await setup();
    await toggleSetDone(workoutId, press.id, press.sets[0].id, T0 + 5 * MIN);
    await toggleSetDone(workoutId, press.id, press.sets[1].id, T0 + 8 * MIN);
    await toggleSetDone(workoutId, press.id, press.sets[1].id, T0 + 9 * MIN);
    let [entry] = await db.entries.toArray();
    expect(entry.sets).toHaveLength(1);
    expect(entry.endedAt).toBe(T0 + 5 * MIN);
    await toggleSetDone(workoutId, press.id, press.sets[0].id, T0 + 10 * MIN);
    expect(await db.entries.count()).toBe(0);
    const w = (await db.workouts.get(workoutId))!;
    expect(w.startedAt).toBeUndefined();
    expect(w.exercises[0].entryId).toBeUndefined();
    [entry] = await db.entries.toArray();
    expect(entry).toBeUndefined();
  });

  it("no es pot marcar una sèrie sense reps (o sense temps)", async () => {
    const { workoutId, press } = await setup();
    await updateWorkoutSet(workoutId, press.id, press.sets[0].id, { weight: 60 }, T0);
    const r = await toggleSetDone(workoutId, press.id, press.sets[0].id, T0 + MIN);
    expect(r).toEqual({ ok: false, error: "Indica les repeticions abans de marcar la sèrie." });
    expect(await db.entries.count()).toBe(0);
  });

  it("canviar una sèrie feta també la canvia a l'historial", async () => {
    const { workoutId, press } = await setup();
    await toggleSetDone(workoutId, press.id, press.sets[0].id, T0 + 5 * MIN);
    await updateWorkoutSet(workoutId, press.id, press.sets[0].id, { weight: 62.5, reps: 7 }, T0 + 6 * MIN);
    const [entry] = await db.entries.toArray();
    expect(entry.sets[0]).toMatchObject({ weight: 62.5, reps: 7 });
  });

  it("afegir, treure i moure sèries i exercicis", async () => {
    const { workoutId, press, plank } = await setup();
    await addWorkoutSet(workoutId, press.id, T0);
    await addWorkoutExercise(workoutId, { name: "Dominació", kind: "reps", sets: [{ reps: 8 }] }, T0);
    await moveWorkoutExercise(workoutId, plank.id, 1, T0);
    let w = (await db.workouts.get(workoutId))!;
    expect(w.exercises.map((e) => e.name)).toEqual(["Pressió sobre banc", "Dominació", "Planxa amb quatre suports"]);
    expect(w.exercises[0].sets).toHaveLength(3);
    expect(w.exercises[0].sets[2]).toMatchObject({ weight: 60, reps: 8 });

    await toggleSetDone(workoutId, press.id, press.sets[0].id, T0 + MIN);
    await removeWorkoutSet(workoutId, press.id, press.sets[0].id, T0 + 2 * MIN);
    w = (await db.workouts.get(workoutId))!;
    expect(w.exercises[0].sets).toHaveLength(2);
    expect(await db.entries.count()).toBe(0);

    await removeWorkoutExercise(workoutId, plank.id, T0);
    w = (await db.workouts.get(workoutId))!;
    expect(w.exercises.map((e) => e.name)).toEqual(["Pressió sobre banc", "Dominació"]);
  });

  it("acabar esborra el pla i, si es demana, actualitza la plantilla amb els valors d'avui", async () => {
    const { workoutId, templateId, press } = await setup();
    await updateWorkoutSet(workoutId, press.id, press.sets[0].id, { weight: 65, reps: 8 }, T0);
    await toggleSetDone(workoutId, press.id, press.sets[0].id, T0 + MIN);
    const w = (await db.workouts.get(workoutId))!;
    expect(differsFromTemplate(w, await db.templates.get(templateId))).toBe(true);

    await finishWorkout(workoutId, { updateTemplate: true }, T0 + 30 * MIN);
    expect(await db.workouts.count()).toBe(0);
    const t = (await db.templates.get(templateId))!;
    expect(t.exercises[0].sets[0]).toEqual({ weight: 65, reps: 8 });
    expect(t.exercises[0].sets[1]).toEqual({ weight: 60, reps: 8 });
    expect(await db.entries.count()).toBe(1);
  });

  it("acabar sense actualitzar deixa la plantilla igual", async () => {
    const { workoutId, templateId, press } = await setup();
    await updateWorkoutSet(workoutId, press.id, press.sets[0].id, { weight: 65, reps: 8 }, T0);
    await finishWorkout(workoutId, { updateTemplate: false }, T0);
    expect((await db.templates.get(templateId))!.exercises[0].sets[0]).toEqual({ weight: 60, reps: 8 });
  });

  it("carregar una altra plantilla substitueix la sessió carregada", async () => {
    const { templateId } = await setup();
    await loadTemplate(templateId, T0 + MIN);
    expect(await db.workouts.count()).toBe(1);
  });
});

describe("plantilles", () => {
  it("les de mostra només fan servir exercicis del catàleg, amb el tipus correcte", () => {
    for (const t of SAMPLE_TEMPLATES) {
      for (const e of t.exercises) {
        expect(CATALOG_SEED.some((c) => c.name === e.name && c.kind === e.kind), `${t.name}: ${e.name}`).toBe(true);
        expect(e.sets.length).toBeGreaterThan(0);
      }
    }
  });

  it("duplicar i crear-ne una a partir d'una sessió feta", async () => {
    const id = await createTemplate({ name: "A", exercises: [] }, T0);
    const copy = await duplicateTemplate(id, T0);
    expect((await db.templates.get(copy!))?.name).toBe("A (còpia)");
    const input = templateInputFromEntries("Dimarts", [
      {
        id: "e2",
        name: "Esquat",
        kind: "reps",
        date: "2026-09-22",
        startedAt: 2,
        endedAt: 3,
        status: "done",
        sets: [{ id: "s", weight: 100, reps: 5, doneAt: 3 }],
        updatedAt: 3,
      },
      { id: "e1", name: "Planxa amb quatre suports", kind: "time", date: "2026-09-22", startedAt: 1, status: "done", sets: [], updatedAt: 1 },
    ]);
    expect(input.exercises).toEqual([{ name: "Esquat", kind: "reps", sets: [{ weight: 100, reps: 5 }] }]);
  });
});

describe("importar i exportar plantilles", () => {
  it("anada i tornada", async () => {
    await createTemplate({ name: "Cames", notes: "Dijous", exercises: [{ name: "Esquat", kind: "reps", sets: [{ weight: 80, reps: 5 }] }] }, T0);
    const file = buildTemplatesFile(await db.templates.toArray());
    const parsed = parseTemplatesFile(JSON.stringify(file));
    expect(parsed).toEqual({ ok: true, value: file.templates });
    await importTemplates(parsed.ok ? parsed.value : [], T0);
    expect((await db.templates.toArray()).map((t) => t.name).sort()).toEqual(["Cames", "Cames (importada)"]);
  });

  it("és tolerant: dedueix el tipus i normalitza noms antics; accepta una llista sola", () => {
    const parsed = parseTemplatesFile(
      JSON.stringify([
        {
          name: "IA",
          exercises: [
            { name: "Plancha", sets: [{ durationSec: 45 }] },
            { name: "Press banca", sets: [{ weight: 50, reps: 10 }] },
            { name: "Salts a la caixa", sets: [{ reps: 10 }] },
          ],
        },
      ]),
    );
    expect(parsed.ok && parsed.value[0].exercises).toEqual([
      { name: "Planxa amb quatre suports", kind: "time", sets: [{ durationSec: 45 }] },
      { name: "Pressió sobre banc", kind: "reps", sets: [{ weight: 50, reps: 10 }] },
      { name: "Salts a la caixa", kind: "reps", sets: [{ reps: 10 }] },
    ]);
  });

  it("rebutja fitxers que no són plantilles o amb valors no vàlids", () => {
    expect(parseTemplatesFile("no és json").ok).toBe(false);
    expect(parseTemplatesFile(JSON.stringify({ app: "mygym", formatVersion: 2, data: {} })).ok).toBe(false);
    const bad = { app: "mygym", type: "templates", formatVersion: 1, templates: [{ name: "X", exercises: [{ name: "Esquat", sets: [{ reps: -3 }] }] }] };
    expect(parseTemplatesFile(JSON.stringify(bad))).toEqual({ ok: false, error: "X · Esquat: una sèrie no és vàlida." });
  });
});

describe("mutateTemplate", () => {
  it("dues edicions seguides no es trepitgen", async () => {
    const { mutateTemplate } = await import("./templates");
    const id = await createTemplate({ name: "X", exercises: [{ name: "Esquat", kind: "reps", sets: [{}] }] }, T0);
    await Promise.all([
      mutateTemplate(id, (t) => void (t.exercises[0].sets[0].weight = 100), T0 + 1),
      mutateTemplate(id, (t) => void (t.exercises[0].sets[0].reps = 5), T0 + 2),
    ]);
    expect((await db.templates.get(id))!.exercises[0].sets[0]).toEqual({ weight: 100, reps: 5 });
  });
});
