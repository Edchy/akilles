import { DEFAULT_MOBILITY, WARMUP } from "@/data/conditioning";
import type { Pattern } from "@/data/exercises";
import { DEFAULT_WORKOUTS, type Entry, type Scheme, type Workout } from "@/data/split";

/**
 * The plans Klay comes with. Everyone starts on Push, pull, legs — three
 * workouts that start small and grow. Push, pull, legs, advanced is the
 * bigger one for someone who already trains: the same three days, with more
 * in each. Both are there from the start, with any plans you add, and
 * Settings switches between them; the one you leave waits as it was — see
 * `switchLoop` in the store. These are only where they start: once there, a
 * plan is yours to change.
 *
 * The advanced plan is built for dumbbells and kettlebells, with a pull-up
 * bar, dip bars and a leg extension. Each day opens with five minutes of
 * cardio and the day's mobility, and ends on the everyday stretch. It was six
 * workouts, a first and a second version of each day, until 23 November
 * 2026: trained every day, the doubles gave variety and nothing more, and
 * each lift came round half as often — see `toAdvanced` in storage. Its id
 * is still "pplppl".
 */

export type PlanId = "ppl" | "pplppl";

export const PLAN_IDS: PlanId[] = ["ppl", "pplppl"];

export const PLAN_NAME: Record<PlanId, string> = {
  ppl: "Push, pull, legs",
  pplppl: "Push, pull, legs, advanced",
};

/** The advanced plan's name before 23 November 2026. Frozen. */
export const OLD_PPLPPL_NAME = "Push, pull, legs, twice over";

/** The advanced plan's six days before 23 November 2026. Frozen: read only by old saves. */
export const OLD_PPLPPL_DAYS = ["push_a", "pull_a", "legs_a", "push_b", "pull_b", "legs_b"];

export const PLAN_ABOUT: Record<PlanId, string> = {
  ppl: "Three workouts. They start small and grow as you come back.",
  pplppl: "Three bigger workouts, for when you already train. Dumbbells and kettlebells.",
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
 * Three sets for every lift, core and carries included, where Klay usually
 * gives two. Ranges are on the app's even steps. Lifts with a range of their
 * own — curls, raises, core, leg extensions, swings — climb it whatever the
 * slot says. Each keeps the range it had in the six-day plan, so the weights
 * already earned carry on. The ids are the first-version days of the old
 * plan, so swaps made there stay.
 */
const PPLPPL: Workout[] = [
  {
    id: "push_a",
    name: "Push",
    subtitle: "chest, shoulders",
    ...PUSH,
    // The animal routine after the shoulders: floor work, and the get-up.
    extras: [{ id: "animal", part: "start", routine: "animal" }],
    exercises: [
      slot("Horizontal press", "horizontal_push", "db_bench", "6-10"),
      slot("Vertical press", "vertical_push", "kb_press", "6-10"),
      slot("Bodyweight press", "horizontal_push", "decline_push_up", "volume"),
      slot("Shoulders", "shoulders", "lateral_raise", "10-14"),
      slot("Dips", "horizontal_push", "dips", "volume"),
      slot("Abs", "abs", "hollow_hold", "4-8", 3),
    ],
  },
  {
    id: "pull_a",
    name: "Pull",
    subtitle: "back, arms, hips",
    ...PULL,
    exercises: [
      slot("Vertical pull", "vertical_pull", "pullup", "6-10"),
      slot("Row", "horizontal_pull", "db_row", "volume"),
      // The swing here, not on Legs, which has two hinges already. The rower
      // has warmed the hips.
      slot("Swing", "hinge", "kb_swing", "10-14"),
      slot("Biceps", "biceps", "hammer_curl", "10-14"),
      slot("Abs", "abs", "hanging_leg_raise", "10-14", 3),
    ],
  },
  {
    id: "legs_a",
    name: "Legs",
    subtitle: "squat and hinge",
    ...LEGS,
    exercises: [
      slot("Squat", "squat", "goblet_squat", "volume"),
      slot("Hinge", "hinge", "db_rdl", "volume"),
      slot("Single-leg hinge", "hinge", "single_leg_rdl", "8-10"),
      slot("Quads", "quads", "single_leg_ext", "10-14"),
      slot("Carry", "abs", "suitcase_carry", "6-8", 3),
    ],
  },
];

/** Each plan's workouts, in the order they come round. */
export const PLANS: Record<PlanId, Workout[]> = {
  ppl: DEFAULT_WORKOUTS,
  pplppl: PPLPPL,
};
