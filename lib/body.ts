import { db } from "./db";
import { newId } from "./id";
import type { Profile } from "./types";

/**
 * Anota el pes d'un dia. Un sol registre per dia: si ja n'hi ha un, se
 * substitueix el valor (es conserva l'id perquè les còpies es fusionin bé).
 */
export async function logBodyWeight(date: string, kg: number, now: number): Promise<void> {
  await db.transaction("rw", db.bodyWeights, async () => {
    const existing = await db.bodyWeights.where("date").equals(date).first();
    if (existing) {
      await db.bodyWeights.update(existing.id, { kg, updatedAt: now });
    } else {
      await db.bodyWeights.add({ id: newId(), date, kg, updatedAt: now });
    }
  });
}

export async function deleteBodyWeight(id: string): Promise<void> {
  await db.bodyWeights.delete(id);
}

/** `undefined` esborra l'alçada. */
export async function setHeight(heightCm: number | undefined, now: number): Promise<void> {
  const profile: Profile = { id: "me", updatedAt: now };
  if (heightCm !== undefined) profile.heightCm = heightCm;
  await db.profile.put(profile);
}

/** Alçada raonable en cm (evita errors com escriure metres o mil·límetres). */
export function isPlausibleHeight(cm: number): boolean {
  return Number.isFinite(cm) && cm >= 100 && cm <= 250;
}

/** Pes corporal raonable en kg. */
export function isPlausibleBodyWeight(kg: number): boolean {
  return Number.isFinite(kg) && kg >= 25 && kg <= 350;
}
