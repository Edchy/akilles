/**
 * The exercise pool.
 *
 * To add an exercise: copy a line, change the fields. That's it.
 * To remove one: delete the line. Slots fall back to whatever is left.
 * To stop an exercise appearing without deleting history: set `enabled: false`.
 *
 * `increment` is the smallest weight jump you can actually make on that
 * equipment: 2.5 for a barbell (2 x 1.25 plates), 2 for a dumbbell pair,
 * 5 for most machine stacks.
 */

export type Pattern =
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "squat"
  | "hinge"
  | "lunge"
  | "biceps"
  | "triceps"
  | "shoulders"
  | "quads"
  | "hamstrings"
  | "calves"
  | "abs"
  | "jump";

/**
 * Broad movement family. Used to decide what needs warming up: the first
 * exercise of each group gets a ramp, the rest are already warm.
 */
export type Group =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "quads"
  | "hamstrings"
  | "calves"
  | "core"
  | "explosive";

export type Exercise = {
  id: string;
  name: string;
  /**
   * Every movement type this exercise counts as. Most have one; some
   * genuinely belong to two — a hip thrust is both a hinge and hamstring
   * work — and appear under both headings in the library and in both slots.
   */
  patterns: Pattern[];
  /** Defaults to the group implied by `pattern` — see `groupOf`. */
  group?: Group;
  /** Smallest practical weight jump, in kg. */
  increment: number;
  /** Bodyweight movements track reps only until you add load. */
  bodyweight?: boolean;
  /**
   * A timed hold rather than a rep count — the ladder numbers are seconds.
   * Only affects how the target is labelled on screen.
   */
  timed?: boolean;
  /**
   * Can be done on an assist machine that takes weight off you. The weight
   * may then go negative — −30 means bodyweight minus 30 of assistance — and
   * progress is that number climbing back toward zero, then past it.
   */
  assistable?: boolean;
  /**
   * Held in each hand. The weight stored and shown is the weight of ONE
   * dumbbell — "20 kg ×2" — because that is the number written on the
   * dumbbell you pick up, not the total you are moving.
   */
  perHand?: boolean;
  /**
   * Only offered by a slot that names it explicitly. Speed work belongs to
   * the power day, not to every slot sharing its movement type.
   */
  restricted?: boolean;
  /**
   * Explosive work with no load to track: jumps and throws. Shows reps only,
   * no weight control, and never progresses on the ladder — you progress it
   * by jumping higher or further, which the app does not try to measure.
   */
  unloaded?: boolean;
  /** Set false to bench an exercise without losing its history. */
  enabled?: boolean;
  /** Shown once, on the first screen of the exercise. Keep it short. */
  cue?: string;
};

export const EXERCISES: Exercise[] = [
  // ---------- horizontal push ----------
  { id: "bench", name: "Barbell bench press", patterns: ["horizontal_push"], increment: 2.5, cue: "Elbows ~45°, touch low chest." },
  { id: "db_bench", name: "Dumbbell bench press", patterns: ["horizontal_push"], increment: 2.5, perHand: true, cue: "Lower until you feel a stretch." },
  { id: "incline_bench", name: "Incline barbell press", patterns: ["horizontal_push"], increment: 2.5 },
  { id: "machine_chest", name: "Machine chest press", patterns: ["horizontal_push"], increment: 5 },
  { id: "dips", name: "Dips", patterns: ["horizontal_push", "triceps"], increment: 2.5, bodyweight: true, assistable: true },

  // ---------- vertical push ----------
  { id: "ohp", name: "Overhead press", patterns: ["vertical_push"], increment: 2.5, cue: "Squeeze glutes, ribs down." },
  { id: "db_shoulder", name: "Dumbbell shoulder press", patterns: ["vertical_push"], increment: 2.5, perHand: true },
  { id: "machine_shoulder", name: "Machine shoulder press", patterns: ["vertical_push"], increment: 5 },

  // ---------- vertical pull ----------
  { id: "pullup", name: "Pull-up", patterns: ["vertical_pull"], increment: 2.5, bodyweight: true, assistable: true, cue: "Chest to bar, full hang each rep." },
  { id: "lat_pulldown", name: "Lat pulldown", patterns: ["vertical_pull"], increment: 5 },
  { id: "chinup", name: "Chin-up", patterns: ["vertical_pull", "biceps"], increment: 2.5, bodyweight: true, assistable: true },

  // ---------- horizontal pull ----------
  { id: "bb_row", name: "Barbell row", patterns: ["horizontal_pull"], increment: 2.5, cue: "Torso still, pull to navel." },
  { id: "cable_row", name: "Seated cable row", patterns: ["horizontal_pull"], increment: 5 },
  { id: "chest_supported_row", name: "Chest-supported row", patterns: ["horizontal_pull"], increment: 2.5 },

  // ---------- squat ----------
  { id: "back_squat", name: "Back squat", patterns: ["squat"], increment: 2.5, cue: "Knees track over toes." },
  { id: "front_squat", name: "Front squat", patterns: ["squat"], increment: 2.5 },
  { id: "goblet_squat", name: "Goblet squat", patterns: ["squat"], increment: 2.5 },
  { id: "hack_squat", name: "Hack squat", patterns: ["quads"], increment: 5 },
  { id: "leg_press", name: "Leg press", patterns: ["quads"], increment: 5 },

  // ---------- hinge ----------
  { id: "deadlift", name: "Deadlift", patterns: ["hinge"], increment: 2.5, cue: "Bar close, push the floor away." },
  { id: "rdl", name: "Romanian deadlift", patterns: ["hinge"], increment: 2.5, cue: "Hips back, slight knee bend." },
  { id: "good_morning", name: "Good morning", patterns: ["hinge"], increment: 2.5 },
  { id: "hip_thrust", name: "Hip thrust", patterns: ["hinge", "hamstrings"], increment: 2.5 },
  { id: "back_ext", name: "Back extension", patterns: ["hinge", "hamstrings"], increment: 2.5, bodyweight: true },
  { id: "nordic_curl", name: "Nordic curl", patterns: ["hamstrings"], increment: 2.5, bodyweight: true },

  // ---------- lunge / single leg ----------
  { id: "bulgarian", name: "Bulgarian split squat", patterns: ["lunge", "quads"], increment: 2.5, perHand: true },
  { id: "walking_lunge", name: "Walking lunge", patterns: ["lunge", "quads"], increment: 2.5, perHand: true },
  { id: "step_up", name: "Step-up", patterns: ["lunge", "quads"], increment: 2.5, perHand: true },

  // ---------- quads / hams isolation ----------
  { id: "leg_ext", name: "Leg extension", patterns: ["quads"], increment: 5 },
  { id: "leg_curl", name: "Leg curl", patterns: ["hamstrings"], increment: 5 },

  // ---------- shoulders ----------
  { id: "lateral_raise", name: "Lateral raise", patterns: ["shoulders"], increment: 2.5, perHand: true },
  { id: "rear_delt_fly", name: "Rear delt fly", patterns: ["shoulders"], increment: 2.5, perHand: true },
  { id: "face_pull", name: "Face pull", patterns: ["shoulders", "horizontal_pull"], increment: 5 },

  // ---------- biceps ----------
  { id: "db_curl", name: "Dumbbell curl", patterns: ["biceps"], increment: 2.5, perHand: true },
  { id: "hammer_curl", name: "Hammer curl", patterns: ["biceps"], increment: 2.5, perHand: true },
  { id: "cable_curl", name: "Cable curl", patterns: ["biceps"], increment: 2.5 },

  // ---------- triceps ----------
  { id: "pushdown", name: "Triceps pushdown", patterns: ["triceps"], increment: 2.5 },
  { id: "overhead_ext", name: "Overhead triceps extension", patterns: ["triceps"], increment: 2.5, perHand: true },
  { id: "skullcrusher", name: "Skullcrusher", patterns: ["triceps"], increment: 2.5 },

  // ---------- calves ----------
  { id: "calf_raise", name: "Standing calf raise", patterns: ["calves"], increment: 5 },
  { id: "seated_calf", name: "Seated calf raise", patterns: ["calves"], increment: 5 },
  { id: "leg_press_calf", name: "Leg press calf raise", patterns: ["calves"], increment: 5 },

  // ---------- jumps ----------
  // Explosive, unloaded. Progress these by height or distance, not by weight.
  { id: "box_jump", name: "Box jump", patterns: ["jump"], increment: 0, unloaded: true, cue: "Land soft, step back down." },
  { id: "broad_jump", name: "Broad jump", patterns: ["jump"], increment: 0, unloaded: true, cue: "Reach with the hips, stick the landing." },
  { id: "depth_jump", name: "Depth jump", patterns: ["jump"], increment: 0, unloaded: true, cue: "Off the box, rebound instantly." },
  { id: "jump_squat", name: "Jump squat", patterns: ["jump"], increment: 0, unloaded: true, cue: "Every rep as high as the first." },

  // ---------- speed work ----------
  // Submaximal weight moved fast. The weight is derived from the heavy day's
  // working weight rather than tracked on its own — see `derive` in split.ts.
  { id: "speed_squat", name: "Speed squat", patterns: ["squat"], increment: 2.5, restricted: true, cue: "Fast up, controlled down." },
  { id: "speed_deadlift", name: "Speed deadlift", patterns: ["hinge"], increment: 2.5, restricted: true, cue: "Accelerate through the whole pull." },

  // ---------- abs ----------
  { id: "hanging_leg_raise", name: "Hanging leg raise", patterns: ["abs"], increment: 2.5, bodyweight: true },
  { id: "cable_crunch", name: "Cable crunch", patterns: ["abs"], increment: 5 },
  { id: "plank", name: "Plank", patterns: ["abs"], increment: 0, bodyweight: true, timed: true },
];

/**
 * Which muscle group a pattern belongs to. The library browses by muscle —
 * you look under Shoulders for an overhead press — while slots still match on
 * the finer pattern underneath.
 */
const GROUP_BY_PATTERN: Record<Pattern, Group> = {
  horizontal_push: "chest",
  vertical_push: "shoulders",
  horizontal_pull: "back",
  vertical_pull: "back",
  squat: "quads",
  hinge: "hamstrings",
  lunge: "quads",
  quads: "quads",
  hamstrings: "hamstrings",
  calves: "calves",
  shoulders: "shoulders",
  biceps: "arms",
  triceps: "arms",
  abs: "core",
  jump: "explosive",
};

export const GROUP_LABEL: Record<Group, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  quads: "Quads & squats",
  hamstrings: "Hamstrings & hinge",
  calves: "Calves",
  core: "Core",
  explosive: "Explosive",
};

/** The order groups appear in the library. */
export const GROUP_ORDER: Group[] = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "quads",
  "hamstrings",
  "calves",
  "core",
  "explosive",
];

/** Which muscle group a movement type belongs to. */
export const groupForPattern = (pattern: Pattern): Group =>
  GROUP_BY_PATTERN[pattern];

/** Every group an exercise belongs to, from all of its patterns. */
export const groupsOf = (ex: Exercise): Group[] => [
  ...new Set(ex.patterns.map((p) => GROUP_BY_PATTERN[p])),
];

/** The group an exercise belongs to, taken from its first pattern. */
export const groupOf = (ex: Exercise): Group =>
  ex.group ?? GROUP_BY_PATTERN[ex.patterns[0]];

/** Whether an exercise counts as a given movement type. */
export const isPattern = (ex: Exercise, pattern: Pattern): boolean =>
  ex.patterns.includes(pattern);

/** Human-readable heading for each pattern, used by the exercise library. */
export const PATTERN_LABEL: Record<Pattern, string> = {
  horizontal_push: "Horizontal press",
  vertical_push: "Vertical press",
  horizontal_pull: "Horizontal pull",
  vertical_pull: "Vertical pull",
  squat: "Squat",
  hinge: "Hinge",
  lunge: "Lunge",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  abs: "Abs",
  jump: "Explosive",
};

/** The order patterns appear in the library. */
export const PATTERN_ORDER: Pattern[] = [
  "horizontal_push",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "squat",
  "hinge",
  "lunge",
  "quads",
  "hamstrings",
  "calves",
  "shoulders",
  "biceps",
  "triceps",
  "abs",
  "jump",
];

/** Every exercise of a pattern, in pool order. */
export const byPattern = (pattern: Pattern): Exercise[] =>
  EXERCISES.filter((e) => isPattern(e, pattern) && e.enabled !== false);

/**
 * Exercises you have added, kept here so `byId` resolves them everywhere
 * without threading session state through every call site. The store keeps
 * this in sync; nothing else should write to it.
 */
let customExercises: Exercise[] = [];

export const setCustomExercises = (list: Exercise[]) => {
  customExercises = list;
};

export const byId = (id: string): Exercise | undefined =>
  EXERCISES.find((e) => e.id === id) ?? customExercises.find((e) => e.id === id);
