import type { Pattern } from "@/data/exercises";

/**
 * The split: five workouts in a cycle, each a fixed list of exercises.
 *
 * The cycle advances when you TRAIN, not when the calendar moves.
 * Miss a day and you simply pick up at the next workout in the cycle.
 * There is no debt and nothing to make up.
 *
 * To change a workout, edit its `exercises` list. The ids come from
 * `exercises.ts` — that file is the menu, this file is the order.
 */

/**
 * Which rep ladder an exercise climbs before adding weight.
 *
 * The same lift appears on more than one scheme — bench is heavy on day 1 and
 * lighter on day 3 — and each scheme keeps its own weight and its own rung.
 * See the `history` key in `store/session.ts`.
 */
export type Scheme = "strength" | "volume" | "pump" | "speed";

export const LADDERS: Record<Scheme, number[]> = {
  strength: [5, 6, 8],
  volume: [8, 10, 12],
  pump: [12, 15, 20],
  // Speed work does not climb: the reps stay at 3 and the weight comes from
  // the heavy day. Moving it faster is the progression.
  speed: [3],
};

export const SETS: Record<Scheme, number> = {
  strength: 4,
  volume: 3,
  pump: 3,
  speed: 6,
};

export type Entry = {
  /**
   * What this slot is for. Fixed — it is the module's contract, and does not
   * change when you swap the exercise inside it.
   */
  slot: string;
  /**
   * The movement type this slot holds. An exercise qualifies if it counts as
   * this type — some count as two, so a hip thrust appears in both the Hinge
   * and the Hamstrings slot.
   */
  pattern: Pattern;
  /**
   * The exercises that can fill this slot: the first is the default, the rest
   * are what the swap button cycles through. Same movement pattern and
   * similar loading, so any of them keeps the module coherent.
   */
  options: string[];
  scheme: Scheme;
  /**
   * Take the weight from another exercise instead of tracking its own.
   * Speed squat at 65% of whatever your heavy squat currently is, so it keeps
   * up automatically with no second number to maintain and no 1RM test.
   */
  derive?: { from: string; scheme: Scheme; fraction: number };
  /**
   * Override the scheme's set count for this entry.
   * Used to keep the daily arms/abs work at 2 sets so it doesn't outweigh
   * the compound lifts over a week.
   */
  sets?: number;
  /**
   * Arms/abs work you can fold into an earlier exercise as a superset.
   * Only entries marked here are offered as superset partners.
   */
  floater?: boolean;
};

export type Workout = {
  id: string;
  /** A letter. The subtitle says what it actually is. */
  name: string;
  /** What the workout trains, in lower case. Keep it to a few words. */
  subtitle: string;
  exercises: Entry[];
};

export const CYCLE: Workout[] = [
  /*
   * Each module is a fixed sequence of slots. The slot says what the position
   * is for; `options` says which exercises can fill it — first is the default,
   * the rest are what the swap button offers.
   *
   * Progression follows the exercise, not the slot: swap bench for dumbbell
   * bench and you get dumbbell bench's own weight and ladder, and barbell
   * bench is still where you left it when you swap back.
   */
  {
    id: "upper_strength",
    name: "Push · Pull · Heavy",
    subtitle: "bench, pull-up, overhead press",
    exercises: [
      {
        slot: "Horizontal press",
        pattern: "horizontal_push",
        options: ["bench", "db_bench", "incline_bench"],
        scheme: "strength",
      },
      {
        slot: "Vertical pull",
        pattern: "vertical_pull",
        options: ["pullup", "chinup", "lat_pulldown"],
        scheme: "strength",
      },
      {
        slot: "Vertical press",
        pattern: "vertical_push",
        options: ["ohp", "db_shoulder", "machine_shoulder"],
        scheme: "strength",
      },
      {
        slot: "Horizontal pull",
        pattern: "horizontal_pull",
        options: ["bb_row", "cable_row", "chest_supported_row"],
        scheme: "volume",
      },
      {
        slot: "Rear delts",
        pattern: "shoulders",
        options: ["face_pull", "rear_delt_fly"],
        scheme: "volume",
        sets: 2,
        floater: true,
      },
      {
        slot: "Biceps",
        pattern: "biceps",
        options: ["db_curl", "hammer_curl", "cable_curl"],
        scheme: "volume",
        sets: 2,
        floater: true,
      },
      {
        slot: "Triceps",
        pattern: "triceps",
        options: ["pushdown", "skullcrusher", "overhead_ext"],
        scheme: "volume",
        sets: 2,
        floater: true,
      },
      {
        slot: "Abs",
        pattern: "abs",
        options: ["hanging_leg_raise", "cable_crunch", "plank"],
        scheme: "volume",
        sets: 2,
        floater: true,
      },
    ],
  },
  {
    id: "lower_strength",
    name: "Legs · Heavy",
    subtitle: "squat, hinge, lunge",
    exercises: [
      {
        slot: "Squat",
        pattern: "squat",
        options: ["back_squat", "front_squat", "goblet_squat"],
        scheme: "strength",
      },
      {
        slot: "Hinge",
        pattern: "hinge",
        options: ["rdl", "deadlift", "good_morning"],
        scheme: "strength",
      },
      {
        slot: "Lunge",
        pattern: "lunge",
        options: ["bulgarian", "walking_lunge", "step_up"],
        scheme: "volume",
      },
      {
        slot: "Hamstrings",
        pattern: "hamstrings",
        options: ["leg_curl", "back_ext", "hip_thrust"],
        scheme: "volume",
      },
      {
        slot: "Calves",
        pattern: "calves",
        options: ["calf_raise", "seated_calf", "leg_press_calf"],
        scheme: "volume",
      },
      {
        slot: "Biceps",
        pattern: "biceps",
        options: ["hammer_curl", "db_curl", "cable_curl"],
        scheme: "volume",
        sets: 2,
        floater: true,
      },
      {
        slot: "Triceps",
        pattern: "triceps",
        options: ["overhead_ext", "pushdown", "skullcrusher"],
        scheme: "volume",
        sets: 2,
        floater: true,
      },
      {
        slot: "Abs",
        pattern: "abs",
        options: ["cable_crunch", "hanging_leg_raise", "plank"],
        scheme: "volume",
        sets: 2,
        floater: true,
      },
    ],
  },
  {
    id: "upper_volume",
    name: "Push · Pull",
    subtitle: "same lifts, higher reps",
    exercises: [
      {
        slot: "Horizontal press",
        pattern: "horizontal_push",
        options: ["bench", "db_bench", "incline_bench"],
        scheme: "volume",
      },
      {
        slot: "Vertical pull",
        pattern: "vertical_pull",
        options: ["pullup", "lat_pulldown", "chinup"],
        scheme: "volume",
      },
      {
        slot: "Vertical press",
        pattern: "vertical_push",
        options: ["ohp", "db_shoulder", "machine_shoulder"],
        scheme: "volume",
      },
      {
        slot: "Horizontal pull",
        pattern: "horizontal_pull",
        options: ["bb_row", "cable_row", "chest_supported_row"],
        scheme: "pump",
      },
      {
        slot: "Side delts",
        pattern: "shoulders",
        options: ["lateral_raise", "face_pull", "rear_delt_fly"],
        scheme: "pump",
        sets: 3,
        floater: true,
      },
      {
        slot: "Biceps",
        pattern: "biceps",
        options: ["cable_curl", "db_curl", "hammer_curl"],
        scheme: "volume",
        sets: 2,
        floater: true,
      },
      {
        slot: "Triceps",
        pattern: "triceps",
        options: ["skullcrusher", "pushdown", "overhead_ext"],
        scheme: "volume",
        sets: 2,
        floater: true,
      },
      {
        slot: "Abs",
        pattern: "abs",
        options: ["hanging_leg_raise", "cable_crunch", "plank"],
        scheme: "pump",
        sets: 2,
        floater: true,
      },
    ],
  },
  {
    id: "lower_power",
    name: "Legs · Explosive",
    subtitle: "jumps and speed work",
    exercises: [
      // Jumps first — most demanding on the nervous system, so they want you
      // fresh. Then loaded speed work, then the accessory.
      {
        slot: "Jump",
        pattern: "jump",
        options: ["box_jump", "broad_jump", "jump_squat", "depth_jump"],
        scheme: "speed",
        sets: 5,
      },
      {
        slot: "Speed squat",
        pattern: "squat",
        options: ["speed_squat"],
        scheme: "speed",
        derive: { from: "back_squat", scheme: "strength", fraction: 0.65 },
      },
      {
        slot: "Speed hinge",
        pattern: "hinge",
        options: ["speed_deadlift"],
        scheme: "speed",
        derive: { from: "rdl", scheme: "strength", fraction: 0.65 },
      },
      {
        slot: "Quads",
        pattern: "quads",
        options: ["leg_ext", "leg_press", "hack_squat"],
        scheme: "volume",
        sets: 4,
      },
      {
        slot: "Hamstrings",
        pattern: "hamstrings",
        options: ["leg_curl", "back_ext", "hip_thrust"],
        scheme: "volume",
      },
      {
        slot: "Calves",
        pattern: "calves",
        options: ["calf_raise", "seated_calf", "leg_press_calf"],
        scheme: "pump",
        sets: 3,
        floater: true,
      },
      {
        slot: "Biceps",
        pattern: "biceps",
        options: ["db_curl", "hammer_curl", "cable_curl"],
        scheme: "pump",
        sets: 2,
        floater: true,
      },
      {
        slot: "Triceps",
        pattern: "triceps",
        options: ["pushdown", "overhead_ext", "skullcrusher"],
        scheme: "pump",
        sets: 2,
        floater: true,
      },
      {
        slot: "Abs",
        pattern: "abs",
        options: ["cable_crunch", "hanging_leg_raise", "plank"],
        scheme: "pump",
        sets: 2,
        floater: true,
      },
    ],
  },
  {
    id: "upper_pump",
    name: "Shoulders · Arms",
    subtitle: "machines and cables",
    exercises: [
      {
        slot: "Horizontal press",
        pattern: "horizontal_push",
        options: ["machine_chest", "db_bench", "dips"],
        scheme: "pump",
      },
      {
        slot: "Vertical pull",
        pattern: "vertical_pull",
        options: ["lat_pulldown", "chinup", "pullup"],
        scheme: "pump",
      },
      {
        slot: "Vertical press",
        pattern: "vertical_push",
        options: ["machine_shoulder", "db_shoulder", "ohp"],
        scheme: "pump",
      },
      {
        slot: "Horizontal pull",
        pattern: "horizontal_pull",
        options: ["cable_row", "chest_supported_row", "bb_row"],
        scheme: "pump",
      },
      {
        slot: "Side delts",
        pattern: "shoulders",
        options: ["lateral_raise", "face_pull", "rear_delt_fly"],
        scheme: "volume",
      },
      {
        slot: "Rear delts",
        pattern: "shoulders",
        options: ["rear_delt_fly", "face_pull"],
        scheme: "pump",
        sets: 2,
        floater: true,
      },
      {
        slot: "Biceps",
        pattern: "biceps",
        options: ["hammer_curl", "cable_curl", "db_curl"],
        scheme: "pump",
        sets: 2,
        floater: true,
      },
      {
        slot: "Triceps",
        pattern: "triceps",
        options: ["overhead_ext", "pushdown", "skullcrusher"],
        scheme: "pump",
        sets: 2,
        floater: true,
      },
      {
        slot: "Abs",
        pattern: "abs",
        options: ["cable_crunch", "plank", "hanging_leg_raise"],
        scheme: "pump",
        sets: 2,
        floater: true,
      },
    ],
  },
];

export const workoutAt = (cycleIndex: number): Workout =>
  CYCLE[cycleIndex % CYCLE.length];

/** Set count for an entry: its own override, else the scheme default. */
export const setsFor = (entry: Entry): number => entry.sets ?? SETS[entry.scheme];
