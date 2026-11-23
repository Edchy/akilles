import { CATEGORY_LABEL, categoriesOf, PATTERN_ORDER, type Exercise, type Category } from "@/data/exercises";
import { MOVEMENT_LABEL, MUSCLE_LABEL, movementsOf, musclesOf } from "@/data/exercise-tags";

import { needsOf, type Gear } from "@/data/kit";

export const GEAR_NAME: Record<Gear, string> = {
  barbell: "Barbell", dumbbells: "Dumbbells", kettlebell: "Kettlebell", cable: "Cable",
  machine: "Machine", pullup_bar: "Pull-up bar", bench: "Bench", gym: "Gym",
  resistance_band: "Resistance band", band_anchor: "Band anchor", stability_ball: "Stability ball",
  medicine_ball: "Medicine ball", slam_ball: "Slam ball", rings: "Rings",
  suspension_trainer: "Suspension trainer", parallel_bars: "Parallel bars", ab_wheel: "Ab wheel",
};

export const exerciseTags = (exercise: Exercise): string[] => [
  ...categoriesOf(exercise).map((c) => CATEGORY_LABEL[c]),
  ...(exercise.bodyweight ? ["Bodyweight"] : []),
  ...(needsOf(exercise).length ? needsOf(exercise).map((g) => GEAR_NAME[g]) : ["No equipment"]),
];
export const matchesExerciseFilters = (exercise: Exercise, category: string, equipment: string) =>
  (!category || categoriesOf(exercise).includes(category as Category)) &&
  (!equipment || (equipment === "bodyweight" ? exercise.bodyweight === true
    : equipment === "no_equipment" ? needsOf(exercise).length === 0
    : needsOf(exercise).includes(equipment as Gear)));

/**
 * Finding an exercise by what you would call it. Add exercise's search box,
 * kept here so it can be tested without a screen.
 */

/** Lower case, letters and digits only: "Pull-ups" and "pullups" are one word. */
export const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** "Squats" finds Squat; "press" and "abs" stay as they are. */
const singular = (s: string) =>
  s.length >= 4 && s.endsWith("s") && !s.endsWith("ss") ? s.slice(0, -1) : s;

/** Within a family, presses together, then rows, and so on. */
export const byMovement = (a: Exercise, b: Exercise) =>
  PATTERN_ORDER.indexOf(a.patterns[0]) - PATTERN_ORDER.indexOf(b.patterns[0]);

/**
 * Everything that matches what was typed, best first: a name that starts
 * with it, then one that has it, then an other name (an alias), then the
 * muscle or movement — "chest" finds every chest exercise.
 */
export function searchExercises(all: Exercise[], typed: string): Exercise[] {
  const whole = singular(squash(typed));
  if (!whole) return [];
  const words = typed.split(/\s+/).map(squash).filter(Boolean).map(singular);
  const scored = all.flatMap((e) => {
    const name = squash(e.name);
    const aliases = (e.aliases ?? []).map(squash);
    const muscles = musclesOf(e);
    const kinds = [
      ...movementsOf(e).map((p) => squash(MOVEMENT_LABEL[p])),
      ...muscles.flatMap((m) => [squash(m), squash(MUSCLE_LABEL[m])]),
      ...(muscles.some((m) => ["lats", "upper_back", "lower_back"].includes(m)) ? ["back"] : []),
      ...exerciseTags(e).map(squash),
    ];
    const has = (hay: string[]) =>
      hay.some((h) => h.includes(whole)) || words.every((w) => hay.some((h) => h.includes(w)));
    const score = name.startsWith(whole)
      ? 0
      : has([name])
        ? 1
        : has(aliases)
          ? 2
          : has([name, ...aliases, ...kinds])
            ? 3
            : -1;
    return score < 0 ? [] : [{ e, score }];
  });
  return scored.sort((a, b) => a.score - b.score || byMovement(a.e, b.e)).map((x) => x.e);
}

/**
 * Already has this name, or one of its other names — give or take spaces,
 * case, hyphens and a plural: "pull ups" is the Pull-up.
 */
export const hasName = (all: Exercise[], typed: string) => {
  const want = singular(squash(typed));
  return (
    !!want &&
    all.some((e) => [e.name, ...(e.aliases ?? [])].some((n) => singular(squash(n)) === want))
  );
};
