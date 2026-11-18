import { familyOf, familyOfPattern, type Family } from "@/data/families";
import { needsOf } from "@/data/kit";
import type { Exercise } from "@/data/exercises";
import { DEFAULT_SCHEME, DEFAULT_WORKOUTS, type Entry, type Workout } from "@/data/split";

/**
 * What a workout is for. It guides and never locks: a new workout of a kind
 * arrives filled with a balanced set of lifts for it, and Add exercise shows
 * the ones that fit first, with every other exercise one tap further. An
 * experienced lifter can put a press in a pull day; a newcomer never has to
 * wonder what goes where. "Empty" is for building from nothing.
 */
export type WorkoutKind = "push" | "pull" | "legs" | "full" | "bodyweight" | "free";

export const KIND_ORDER: WorkoutKind[] = ["push", "pull", "legs", "full", "bodyweight", "free"];

export const KIND_NAME: Record<WorkoutKind, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  full: "Full body",
  bodyweight: "Bodyweight",
  free: "Empty",
};

/** Said under the name when choosing, and kept as the workout's subtitle. */
export const KIND_SUBTITLE: Record<WorkoutKind, string> = {
  push: "chest, shoulders, arms",
  pull: "back, arms",
  legs: "legs, hips",
  full: "a bit of everything",
  bodyweight: "no equipment needed",
  free: "you add the exercises",
};

/**
 * The families a kind is made of. Core fits every kind; a full body or
 * empty workout takes anything.
 */
const KIND_FAMILIES: Record<WorkoutKind, Family[] | null> = {
  push: ["push", "core"],
  pull: ["pull", "core"],
  legs: ["legs", "core"],
  full: null,
  bodyweight: null,
  free: null,
};

/**
 * Whether an exercise belongs in a workout of this kind — by any movement it
 * counts as, so a face pull (shoulders, and a row) fits a pull day.
 */
export const fitsKind = (kind: WorkoutKind, ex: Exercise): boolean => {
  if (kind === "bodyweight") return needsOf(ex).length === 0;
  const families = KIND_FAMILIES[kind];
  if (!families) return true;
  return families.includes(familyOf(ex)) || ex.patterns.some((p) => families.includes(familyOfPattern(p)));
};

const fromDefault = (id: string): Entry[] =>
  DEFAULT_WORKOUTS.find((w) => w.id === id)?.exercises.map((e) => ({ ...e })) ?? [];

const lift = (slot: string, pattern: Entry["pattern"], option: string): Entry => ({
  id: slot,
  slot,
  pattern,
  options: [option],
  scheme: DEFAULT_SCHEME,
});

/** The lifts a new workout of each kind starts with: Klay's own, balanced. */
export const KIND_LIFTS: Record<WorkoutKind, () => Entry[]> = {
  push: () => fromDefault("push"),
  pull: () => fromDefault("pull"),
  legs: () => fromDefault("legs"),
  full: () => [
    lift("Squat", "squat", "goblet_squat"),
    lift("Horizontal press", "horizontal_push", "db_bench"),
    lift("Row", "horizontal_pull", "cable_row"),
    lift("Hinge", "hinge", "db_rdl"),
    lift("Vertical press", "vertical_push", "db_shoulder"),
    lift("Vertical pull", "vertical_pull", "lat_pulldown"),
  ],
  bodyweight: () => [
    lift("Squat", "squat", "bw_squat"),
    lift("Horizontal press", "horizontal_push", "push_up"),
    lift("Single leg", "lunge", "bw_split_squat"),
    lift("Vertical press", "vertical_push", "pike_push_up"),
    lift("Core", "abs", "plank"),
  ].map((entry) => ({ ...entry, sets: 2 })),
  free: () => [],
};

/**
 * A workout's kind. Workouts made before kinds existed read as one from
 * their id — Klay's own Push, Pull and Legs, and the full-body pair — and
 * anything else as Empty, which guides nothing and so changes nothing.
 */
export const kindOf = (workout: Pick<Workout, "id" | "kind">): WorkoutKind => {
  if (workout.kind) return workout.kind;
  if (workout.id === "push" || workout.id === "pull" || workout.id === "legs") return workout.id;
  if (workout.id === "full_a" || workout.id === "full_b") return "full";
  return "free";
};

/**
 * A workout's family — its shape and colour in Plan and on Today — from its
 * kind first: a Push day is push, a Full body day is full, whatever is in it.
 * Without one (an Empty workout, or one made before kinds), from what is in
 * it: the family more than half its exercises belong to; else, if it trains
 * at least two of push, pull and legs, full body; else the most common.
 * Undefined when it has no exercises.
 */
export const familyOfLifts = (kind: WorkoutKind, families: Family[]): Family | undefined => {
  if (kind === "full" || kind === "bodyweight") return "full";
  if (kind !== "free") return kind;
  if (families.length === 0) return undefined;
  const count = new Map<Family, number>();
  for (const f of families) count.set(f, (count.get(f) ?? 0) + 1);
  let best = families[0];
  for (const [f, n] of count) if (n > (count.get(best) ?? 0)) best = f;
  if ((count.get(best) ?? 0) * 2 > families.length) return best;
  const big = (["push", "pull", "legs"] as Family[]).filter((f) => count.has(f));
  return big.length >= 2 ? "full" : best;
};

/** More than this and a workout gets a gentle word: six is plenty. */
export const LONG_WORKOUT = 8;
