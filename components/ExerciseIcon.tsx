import { catalogExercise } from "@/lib/catalog-seed";
import { CUSTOM_EXERCISE_ICON, EXERCISE_ICON_BY_NAME, EXERCISE_ICON_SVGS } from "@/lib/exercise-icons.generated";
import type { ExerciseKind } from "@/lib/types";

/**
 * Pictograma de l'exercici (figura i màquina) dins un quadrat arrodonit.
 * Els exercicis creats per l'usuari porten una figura amb un llapis, igual per
 * a tots. Decoratiu: el nom ja el diu el text del costat.
 */
export function ExerciseIcon({
  exercise,
  className = "size-11 rounded-xl",
}: {
  exercise: { name: string; kind: ExerciseKind };
  className?: string;
}) {
  const c = catalogExercise(exercise);
  const key = (c && EXERCISE_ICON_BY_NAME[c.name]) ?? CUSTOM_EXERCISE_ICON;
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center bg-fill-3 text-label ${className}`}>
      <svg
        viewBox="0 0 48 48"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
        className="size-[78%]"
        // Contingut estàtic generat per design/exercise-icons/build.py.
        dangerouslySetInnerHTML={{ __html: EXERCISE_ICON_SVGS[key] }}
      />
    </span>
  );
}
