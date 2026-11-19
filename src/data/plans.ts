import { DEFAULT_MOBILITY, WARMUP } from "@/data/conditioning";
import type { Pattern } from "@/data/exercises";
import { DEFAULT_WORKOUTS, type Entry, type Scheme, type Workout } from "@/data/split";

/**
 * The plans Klay comes with. Everyone starts on Push, pull, legs — three
 * workouts that start small and grow. PPLPPL is the bigger one for someone
 * who already trains: six workouts, a first and a second version of each
 * day, done in turn. Both are there from the start, with any plans you add,
 * and Settings switches between them; the one you leave waits as it was —
 * see `switchLoop` in the store. These are only where they start: once
 * there, a plan is yours to change.
 *
 * PPLPPL is built for dumbbells and kettlebells, with a pull-up bar, dip bars
 * and a leg extension. Each day opens with five minutes of cardio and the
 * day's mobility, and ends on the everyday stretch.
 */

export type PlanId = "ppl" | "pplppl";

export const PLAN_IDS: PlanId[] = ["ppl", "pplppl"];

export const PLAN_NAME: Record<PlanId, string> = {
  ppl: "Push, pull, legs",
  pplppl: "Push, pull, legs, twice over",
};

export const PLAN_ABOUT: Record<PlanId, string> = {
  ppl: "Three workouts. They start small and grow as you come back.",
  pplppl: "Six workouts, two of each day, for when you already train. Dumbbells and kettlebells.",
};

/** One slot. Its id is its label: labels are unique within each workout. */
const slot = (
  label: string,
  pattern: Pattern,
  exercise: string,
  scheme: Scheme,
  sets?: number,
): Entry => ({
  id: label,
  slot: label,
  pattern,
  options: [exercise],
  scheme,
  ...(sets ? { sets } : {}),
});

/** Five easy minutes to open, nothing to finish. */
const warmup = (machine: string) => ({ open: { machine, minutes: 5 }, close: null });

const PUSH = { kind: "push" as const, cardio: warmup("ski_erg"), warmup: WARMUP.push, mobility: DEFAULT_MOBILITY };
const PULL = { kind: "pull" as const, cardio: warmup("row"), warmup: WARMUP.pull, mobility: DEFAULT_MOBILITY };
const LEGS = { kind: "legs" as const, cardio: warmup("treadmill"), warmup: WARMUP.legs, mobility: DEFAULT_MOBILITY };

/**
 * The first lift of each day gets four sets; everything else three — core
 * and carries too, where Klay usually gives two. Ranges
 * are on the app's even steps. Lifts with a range of their own — curls,
 * raises, core, leg extensions, swings — climb it whatever the slot says.
 */
const PPLPPL: Workout[] = [
  {
    id: "push_a",
    name: "Push A",
    subtitle: "chest first",
    ...PUSH,
    exercises: [
      slot("Horizontal press", "horizontal_push", "db_bench", "6-10", 4),
      slot("Vertical press", "vertical_push", "kb_press", "6-10"),
      slot("Bodyweight press", "horizontal_push", "decline_push_up", "volume"),
      slot("Shoulders", "shoulders", "lateral_raise", "10-14"),
      slot("Dips", "horizontal_push", "dips", "volume"),
      slot("Abs", "abs", "hollow_hold", "4-8", 3),
    ],
  },
  {
    id: "pull_a",
    name: "Pull A",
    subtitle: "lats first",
    ...PULL,
    exercises: [
      slot("Vertical pull", "vertical_pull", "pullup", "6-10", 4),
      slot("Row", "horizontal_pull", "db_row", "volume"),
      slot("Wide row", "horizontal_pull", "chest_supported_row", "10-12"),
      slot("Biceps", "biceps", "hammer_curl", "10-14"),
      slot("Abs", "abs", "hanging_leg_raise", "10-14", 3),
    ],
  },
  {
    id: "legs_a",
    name: "Legs A",
    subtitle: "squat and hinge",
    ...LEGS,
    exercises: [
      slot("Squat", "squat", "goblet_squat", "volume", 4),
      slot("Hinge", "hinge", "db_rdl", "volume"),
      slot("Single leg", "lunge", "bulgarian", "8-10"),
      slot("Quads", "quads", "single_leg_ext", "10-14"),
      slot("Carry", "abs", "suitcase_carry", "6-8", 3),
    ],
  },
  {
    id: "push_b",
    name: "Push B",
    subtitle: "shoulders first",
    ...PUSH,
    exercises: [
      slot("Vertical press", "vertical_push", "double_kb_press", "6-10", 4),
      slot("Incline press", "horizontal_push", "incline_db_press", "volume"),
      slot("Bodyweight press", "horizontal_push", "deficit_push_up", "volume"),
      slot("Shoulders", "shoulders", "upright_row", "10-14"),
      slot("Dips", "horizontal_push", "dips", "6-10"),
      slot("Get-up", "vertical_push", "turkish_get_up", "1-2"),
    ],
  },
  {
    id: "pull_b",
    name: "Pull B",
    subtitle: "upper back first",
    ...PULL,
    exercises: [
      slot("Vertical pull", "vertical_pull", "chinup", "6-10", 4),
      slot("Row", "horizontal_pull", "db_bent_over_row", "volume"),
      slot("High pull", "horizontal_pull", "kb_high_pull", "10-12"),
      slot("Biceps", "biceps", "incline_db_curl", "10-14"),
      slot("Abs", "abs", "twisting_knee_raise", "10-14", 3),
    ],
  },
  {
    id: "legs_b",
    name: "Legs B",
    subtitle: "front squat and one leg",
    ...LEGS,
    exercises: [
      slot("Squat", "squat", "double_kb_front_squat", "6-10", 4),
      slot("Hinge", "hinge", "single_leg_rdl", "8-10"),
      slot("Single leg", "lunge", "reverse_lunge", "volume"),
      slot("Quads", "quads", "single_leg_ext", "10-14"),
      slot("Swing", "hinge", "kb_swing", "10-14"),
      slot("Carry", "abs", "farmer_carry", "6-8", 3),
    ],
  },
];

/** Each plan's workouts, in the order they come round. */
export const PLANS: Record<PlanId, Workout[]> = {
  ppl: DEFAULT_WORKOUTS,
  pplppl: PPLPPL,
};
