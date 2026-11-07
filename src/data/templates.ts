import type { Pattern } from "@/data/exercises";
import { DEFAULT_SCHEME, DEFAULT_WORKOUTS, type Workout } from "@/data/split";

/**
 * The plans Milo can start someone on, chosen by how long they have.
 *
 * Short visits have to cover the whole body every time; longer visits have
 * room to give each part a day of its own. The loop never cares how many
 * days a week you come — you just do the next one.
 *
 *   about 30 minutes   full body A / B       3 lifts
 *   about 45 minutes   upper / lower         5 lifts
 *   an hour or more    push / pull / legs    4–5 lifts, cardio at both ends
 *
 * Each slot names the exercise a gym would use. Somewhere with less, the
 * slot is filled from what is there when the plan is made — see `makePlan`
 * in the store — and a slot with nothing to fill it is left out.
 */

export type Time = "short" | "medium" | "long";
export type Shape = "full" | "upper_lower" | "ppl";

/** What each length of visit gets, unless you choose another shape. */
export const SHAPE_FOR: Record<Time, Shape> = {
  short: "full",
  medium: "upper_lower",
  long: "ppl",
};

export const TIME_LABEL: Record<Time, string> = {
  short: "About 30 minutes",
  medium: "About 45 minutes",
  long: "An hour or more",
};

export const SHAPE_LABEL: Record<Shape, string> = {
  full: "Full body, every time",
  upper_lower: "Upper body, then lower body",
  ppl: "Push, pull, legs",
};

const slot = (name: string, pattern: Pattern, option: string) => ({
  id: name,
  slot: name,
  pattern,
  options: [option],
  scheme: DEFAULT_SCHEME,
});

/** No cardio to finish: a short visit opens with five minutes and ends on the stretch. */
const OPEN_ONLY = { close: null };

const FULL: Workout[] = [
  {
    id: "full_a",
    name: "Full body A",
    subtitle: "legs, chest, back",
    cardio: OPEN_ONLY,
    exercises: [
      slot("Squat", "squat", "goblet_squat"),
      slot("Horizontal press", "horizontal_push", "db_bench"),
      slot("Row", "horizontal_pull", "cable_row"),
    ],
  },
  {
    id: "full_b",
    name: "Full body B",
    subtitle: "hips, shoulders, back",
    cardio: OPEN_ONLY,
    exercises: [
      slot("Hinge", "hinge", "db_rdl"),
      slot("Vertical press", "vertical_push", "db_shoulder"),
      slot("Vertical pull", "vertical_pull", "lat_pulldown"),
    ],
  },
];

const UPPER_LOWER: Workout[] = [
  {
    id: "upper",
    name: "Upper",
    subtitle: "chest, back, shoulders, arms",
    cardio: OPEN_ONLY,
    exercises: [
      slot("Horizontal press", "horizontal_push", "db_bench"),
      slot("Vertical pull", "vertical_pull", "lat_pulldown"),
      slot("Vertical press", "vertical_push", "db_shoulder"),
      slot("Row", "horizontal_pull", "cable_row"),
      slot("Biceps", "biceps", "db_curl"),
    ],
  },
  {
    id: "lower",
    name: "Lower",
    subtitle: "legs, hips",
    cardio: OPEN_ONLY,
    exercises: [
      slot("Squat", "squat", "goblet_squat"),
      slot("Hinge", "hinge", "db_rdl"),
      slot("Single leg", "lunge", "split_squat"),
      slot("Hamstrings", "hamstrings", "leg_curl"),
      slot("Abs", "abs", "plank"),
    ],
  },
];

export const SHAPES: Record<Shape, Workout[]> = {
  full: FULL,
  upper_lower: UPPER_LOWER,
  ppl: DEFAULT_WORKOUTS,
};

/**
 * Parts of the body to go easy on, and the exercises that load them most.
 * Not medical advice and never presented as such — a preference, like any
 * other. A slot left with nothing is dropped from the plan.
 */
export type Easy = "knees" | "back" | "shoulders";

export const EASY_LABEL: Record<Easy, string> = {
  knees: "My knees",
  back: "My lower back",
  shoulders: "My shoulders",
};

export const EASY_ON: Record<Easy, string[]> = {
  knees: [
    "bulgarian",
    "walking_lunge",
    "split_squat",
    "reverse_lunge",
    "step_up",
    "leg_ext",
    "box_jump",
    "depth_jump",
    "jump_squat",
    "broad_jump",
    "front_squat",
    "hack_squat",
  ],
  back: [
    "deadlift",
    "sumo_deadlift",
    "trap_bar_deadlift",
    "rdl",
    "db_rdl",
    "single_leg_rdl",
    "good_morning",
    "bb_row",
    "tbar_row",
    "back_squat",
    "kb_swing",
    "speed_deadlift",
    "speed_squat",
  ],
  shoulders: [
    "ohp",
    "db_shoulder",
    "machine_shoulder",
    "kb_press",
    "arnold_press",
    "smith_shoulder_press",
    "dips",
    "upright_row",
    "skullcrusher",
    "bench_dip",
  ],
};

/** Everything the chosen parts rule out, once each. */
export const avoidFor = (easy: readonly Easy[]): string[] => [
  ...new Set(easy.flatMap((e) => EASY_ON[e])),
];
