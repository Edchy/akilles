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
  | "chest_iso"
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
  { id: "incline_db_press", name: "Incline dumbbell press", patterns: ["horizontal_push"], increment: 2.5, perHand: true, cue: "Bench at about 30°. Press over the collarbones." },
  { id: "dips", name: "Dips", patterns: ["horizontal_push", "triceps"], increment: 2.5, bodyweight: true, assistable: true },

  // ---------- chest isolation ----------
  // Flyes open the chest rather than pressing. Kept as their own type so they
  // never turn up as a substitute for the day's press.
  { id: "cable_fly", name: "Cable incline fly", patterns: ["chest_iso"], increment: 2.5, cue: "Low pulleys, slight bend in the elbows. Squeeze at the top." },
  { id: "cable_crossover", name: "Cable crossover", patterns: ["chest_iso"], increment: 2.5, cue: "High pulleys, hands meet low in front of the hips." },

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
  { id: "machine_row", name: "Row machine", patterns: ["horizontal_pull"], increment: 5 },
  { id: "db_row", name: "Dumbbell row", patterns: ["horizontal_pull"], increment: 2.5, perHand: true, cue: "One arm at a time. Pull to the hip, not the chest." },

  // ---------- squat ----------
  { id: "back_squat", name: "Back squat", patterns: ["squat"], increment: 2.5, cue: "Knees track over toes." },
  { id: "front_squat", name: "Front squat", patterns: ["squat"], increment: 2.5 },
  { id: "goblet_squat", name: "Goblet squat", patterns: ["squat"], increment: 2.5 },
  // Squat-pattern machines: they fill a Squat slot as well as quad work.
  { id: "hack_squat", name: "Hack squat", patterns: ["squat", "quads"], increment: 5 },
  { id: "leg_press", name: "Leg press", patterns: ["squat", "quads"], increment: 5 },

  // ---------- hinge ----------
  { id: "deadlift", name: "Deadlift", patterns: ["hinge"], increment: 2.5, cue: "Bar close, push the floor away." },
  { id: "rdl", name: "Romanian deadlift", patterns: ["hinge"], increment: 2.5, cue: "Hips back, slight knee bend." },
  { id: "good_morning", name: "Good morning", patterns: ["hinge"], increment: 2.5 },
  { id: "hip_thrust", name: "Hip thrust", patterns: ["hinge", "hamstrings"], increment: 2.5 },
  { id: "back_ext", name: "Back extension", patterns: ["hinge", "hamstrings"], increment: 2.5, bodyweight: true },
  { id: "db_rdl", name: "Dumbbell Romanian deadlift", patterns: ["hamstrings", "hinge"], increment: 2.5, perHand: true, cue: "Hips back, dumbbells close to the legs." },
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
  { id: "bb_curl", name: "Barbell curl", patterns: ["biceps"], increment: 2.5, cue: "Elbows pinned, no swing." },
  { id: "hammer_curl", name: "Hammer curl", patterns: ["biceps"], increment: 2.5, perHand: true },
  { id: "cable_curl", name: "Cable curl", patterns: ["biceps"], increment: 2.5 },
  { id: "spider_curl", name: "Spider curl", patterns: ["biceps"], increment: 2.5, perHand: true, cue: "Chest on the incline, arms straight down. No swing." },

  // ---------- triceps ----------
  { id: "pushdown", name: "Triceps pushdown", patterns: ["triceps"], increment: 2.5 },
  { id: "overhead_ext", name: "Overhead triceps extension", patterns: ["triceps"], increment: 2.5, perHand: true },
  { id: "skullcrusher", name: "Skullcrusher", patterns: ["triceps"], increment: 2.5 },
  { id: "kickback", name: "Triceps kickback", patterns: ["triceps"], increment: 2.5, perHand: true, cue: "Upper arm pinned to your side, straighten from the elbow." },

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
  // Retired: the same machine as ab_machine below. Kept, disabled, so any
  // record that points at it still resolves.
  { id: "rotation_machine", name: "Rotation machine", patterns: ["abs"], increment: 5, enabled: false, cue: "Turn from the ribs, hips still. Both directions." },
  { id: "cable_crunch", name: "Cable crunch", patterns: ["abs"], increment: 5 },
  // Seated twist against a stack — rotation rather than flexion, so it earns
  // its place next to the crunches rather than duplicating one.
  { id: "ab_machine", name: "Rotary torso machine", patterns: ["abs"], increment: 5, cue: "Turn from the ribs, hips still. Both directions." },
  { id: "plank", name: "Plank", patterns: ["abs"], increment: 0, bodyweight: true, timed: true },
];

/**
 * The starting catalogue: what the starting program names, plus a common
 * alternative or two for each job, so every slot has something to swap to.
 * "Each job" means each slot's movement type: a slot only offers exercises of
 * its own type, so a leg curl is no alternative for a Hinge slot.
 *
 * Everything else in `EXERCISES` above is the *library* — not in your
 * catalogue, but one tap away from the + on each group. The app opens with
 * a short list rather than every variation it knows, and grows only where
 * you decide it should.
 *
 * This is a starting point, not a rule. It seeds `hidden` on first launch and
 * is never consulted again, so anything you add stays added.
 */
export const LEAN: string[] = [
  // Push — the program's presses, plus one or two to swap to for each
  "db_bench",
  "bench",
  "incline_db_press",
  "db_shoulder",
  "machine_shoulder",
  "cable_crossover",
  "cable_fly",
  "lateral_raise",
  "dips",
  "pushdown",
  "overhead_ext",
  // Pull
  "pullup",
  "lat_pulldown",
  "bb_row",
  "machine_row",
  "db_row",
  "cable_row",
  "face_pull",
  "bb_curl",
  "db_curl",
  "hammer_curl",
  // Legs
  "back_squat",
  "goblet_squat",
  "leg_press",
  "rdl",
  "db_rdl",
  "bulgarian",
  "walking_lunge",
  "leg_ext",
  "leg_curl",
  "calf_raise",
  // Core
  "hanging_leg_raise",
  "ab_machine",
  "cable_crunch",
  "plank",
];

/** Built-in lifts that start in the library — everything not in `LEAN`. */
export const leanHiddenExercises = (): string[] =>
  EXERCISES.filter((e) => !LEAN.includes(e.id)).map((e) => e.id);

/**
 * Which muscle group a pattern belongs to. The library browses by muscle —
 * you look under Shoulders for an overhead press — while slots still match on
 * the finer pattern underneath.
 */
const GROUP_BY_PATTERN: Record<Pattern, Group> = {
  horizontal_push: "chest",
  chest_iso: "chest",
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

/**
 * How the exercise list is browsed: the split you train in. Worked out from
 * movement types, so an exercise spanning two — a face pull is shoulder work
 * and a row — is listed under both.
 */
export type Category = "push" | "pull" | "legs" | "core";

const CATEGORY_BY_PATTERN: Record<Pattern, Category> = {
  horizontal_push: "push",
  vertical_push: "push",
  chest_iso: "push",
  triceps: "push",
  shoulders: "push",
  horizontal_pull: "pull",
  vertical_pull: "pull",
  biceps: "pull",
  squat: "legs",
  hinge: "legs",
  lunge: "legs",
  quads: "legs",
  hamstrings: "legs",
  calves: "legs",
  jump: "legs",
  abs: "core",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  core: "Core",
};

export const CATEGORY_ORDER: Category[] = ["push", "pull", "legs", "core"];

/** Every category an exercise belongs to, from all of its movement types. */
export const categoriesOf = (ex: Exercise): Category[] => [
  ...new Set(ex.patterns.map((p) => CATEGORY_BY_PATTERN[p])),
];

/** Movement types that make up a category, in list order. */
export const patternsIn = (category: Category): Pattern[] =>
  PATTERN_ORDER_FOR_CATEGORY.filter((p) => CATEGORY_BY_PATTERN[p] === category);

/** Whether an exercise counts as a given movement type. */
export const isPattern = (ex: Exercise, pattern: Pattern): boolean =>
  ex.patterns.includes(pattern);

/** Human-readable heading for each pattern, used by the exercise library. */
export const PATTERN_LABEL: Record<Pattern, string> = {
  horizontal_push: "Horizontal press",
  chest_iso: "Chest isolation",
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
const PATTERN_ORDER_FOR_CATEGORY: Pattern[] = [
  "horizontal_push",
  "vertical_push",
  "chest_iso",
  "shoulders",
  "triceps",
  "vertical_pull",
  "horizontal_pull",
  "biceps",
  "squat",
  "hinge",
  "lunge",
  "quads",
  "hamstrings",
  "calves",
  "jump",
  "abs",
];

export const PATTERN_ORDER: Pattern[] = [
  "horizontal_push",
  "chest_iso",
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

/**
 * Your changes to an exercise — its name, its weight step — kept apart from
 * the definition, so a built-in keeps its id and history and its original
 * values stay underneath. Kept in sync by the store, like the custom list.
 */
export type ExerciseEdit = { name?: string; increment?: number };

let exerciseEdits: Record<string, ExerciseEdit> = {};

export const setExerciseEdits = (edits: Record<string, ExerciseEdit>) => {
  exerciseEdits = edits;
};

/** An exercise as you have it: its definition with your edits on top. */
export const withEdits = (ex: Exercise): Exercise => {
  const edit = exerciseEdits[ex.id];
  return edit ? { ...ex, ...edit } : ex;
};

export const byId = (id: string): Exercise | undefined => {
  const ex = EXERCISES.find((e) => e.id === id) ?? customExercises.find((e) => e.id === id);
  return ex && withEdits(ex);
};

/** The weight steps an exercise can move by, per press of − or +. */
export const INCREMENTS = [1, 1.25, 2, 2.5, 3, 4, 5, 10];
