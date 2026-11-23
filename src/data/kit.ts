import { byId, type Exercise } from "@/data/exercises";

/**
 * What you have to train with, and what each exercise needs.
 *
 * A gym has everything. Anywhere else has a few things: a pair of dumbbells,
 * one kettlebell, a pull-up bar in a doorway, or nothing but you. A chair, a
 * step, a wall and a floor count as everywhere — a Bulgarian split squat off
 * a chair or a bench dip off a sofa needs nothing on this list.
 *
 * Dumbbells and kettlebells may come with only some weights: a hotel rack
 * that stops at 20, one 10 kg bell in a cabin. See `Kit.weights`.
 */
export type Gear =
  | "barbell"
  | "dumbbells"
  | "kettlebell"
  | "cable"
  | "machine"
  | "pullup_bar"
  | "bench"
  | "resistance_band"
  | "band_anchor"
  | "stability_ball"
  | "medicine_ball"
  | "slam_ball"
  | "rings"
  | "suspension_trainer"
  | "parallel_bars"
  | "ab_wheel"
  /** A station only a gym has: a dip station, a preacher bench, a T-bar. */
  | "gym";

/** The gear that carries the weight, where only some weights may be there. */
export type Load = "dumbbells" | "kettlebell";

export type Kit = {
  gear: Gear[];
  /**
   * The weights on hand, in kg, for dumbbells (one dumbbell — the number on
   * it) and kettlebells. Absent means any weight: a full rack, adjustable
   * dumbbells, a gym.
   */
  weights?: Partial<Record<Load, number[]>>;
  /**
   * The kettlebell weights you have two of, for the lifts that take a bell in
   * each hand. Only read when `weights.kettlebell` lists your bells: absent
   * there means any bells, two of each.
   */
  pairs?: number[];
};

/** Lifts with a kettlebell in each hand: they need two of one weight. */
export const TWO_BELLS = new Set(["kb_floor_press", "double_kb_press", "double_kb_front_squat"]);

/** Whether a kit's bells are listed one by one, so pairs have to be said. */
const bellsListed = (kit: Kit): boolean => !!kit.weights?.kettlebell?.length;

export const ALL_GEAR: Gear[] = [
  "barbell",
  "dumbbells",
  "kettlebell",
  "cable",
  "machine",
  "pullup_bar",
  "bench",
  "resistance_band",
  "band_anchor",
  "stability_ball",
  "medicine_ball",
  "slam_ball",
  "rings",
  "suspension_trainer",
  "parallel_bars",
  "ab_wheel",
  "gym",
];

/** A gym: everything, at every weight. */
export const GYM: Kit = { gear: ALL_GEAR };

/** Nothing but you. */
export const BODYWEIGHT: Kit = { gear: [] };

/**
 * What each built-in exercise needs. Every item must be on hand. Empty means
 * nothing at all — bodyweight, or a chair, a step or a wall.
 *
 * An exercise missing from this list is one of yours: it is taken to need a
 * gym, since there is no telling what it uses. `tests/kit.cjs` checks that
 * every built-in is listed.
 */
const NEEDS: Record<string, Gear[]> = {
  // horizontal push
  bench: ["barbell", "bench"],
  db_bench: ["dumbbells", "bench"],
  db_floor_press: ["dumbbells"],
  kb_floor_press: ["kettlebell"],
  db_pullover: ["dumbbells", "bench"],
  incline_bench: ["barbell", "bench"],
  machine_chest: ["machine"],
  incline_db_press: ["dumbbells", "bench"],
  dips: ["gym"],
  push_up: [],
  decline_bench: ["barbell", "bench"],
  close_grip_bench: ["barbell", "bench"],
  smith_bench: ["machine", "bench"],
  smith_incline_press: ["machine", "bench"],
  incline_machine_press: ["machine"],
  // chest isolation
  cable_fly: ["cable"],
  cable_crossover: ["cable"],
  pec_deck: ["machine"],
  db_fly: ["dumbbells", "bench"],
  incline_db_fly: ["dumbbells", "bench"],
  // vertical push
  ohp: ["barbell"],
  db_shoulder: ["dumbbells"],
  machine_shoulder: ["machine"],
  kb_press: ["kettlebell"],
  pike_push_up: [],
  tripod_knees_elbows: [],
  tripod_headstand: [],
  wall_walk: [],
  wall_handstand: [],
  handstand: [],
  arnold_press: ["dumbbells"],
  smith_shoulder_press: ["machine"],
  // vertical pull
  pullup: ["pullup_bar"],
  lat_pulldown: ["cable"],
  chinup: ["pullup_bar"],
  close_grip_pulldown: ["cable"],
  machine_pulldown: ["machine"],
  straight_arm_pulldown: ["cable"],
  // horizontal pull
  bb_row: ["barbell"],
  cable_row: ["cable"],
  chest_supported_row: ["machine"],
  machine_row: ["machine"],
  db_row: ["dumbbells"],
  kb_row: ["kettlebell"],
  tbar_row: ["gym"],
  // A low bar in a gym; at home, the edge of a sturdy table.
  inverted_row: [],
  // squat
  back_squat: ["barbell"],
  front_squat: ["barbell"],
  goblet_squat: ["dumbbells"],
  kb_goblet_squat: ["kettlebell"],
  bw_squat: [],
  hack_squat: ["machine"],
  leg_press: ["machine"],
  smith_squat: ["machine"],
  // hinge
  deadlift: ["barbell"],
  rdl: ["barbell"],
  good_morning: ["barbell"],
  hip_thrust: ["barbell", "bench"],
  back_ext: ["gym"],
  db_rdl: ["dumbbells"],
  kb_rdl: ["kettlebell"],
  nordic_curl: ["gym"],
  kb_swing: ["kettlebell"],
  kb_single_leg_rdl: ["kettlebell"],
  sumo_deadlift: ["barbell"],
  trap_bar_deadlift: ["gym"],
  glute_bridge: [],
  cable_pull_through: ["cable"],
  single_leg_rdl: ["dumbbells"],
  // lunge / single leg — a chair stands in for the bench
  bulgarian: ["dumbbells"],
  walking_lunge: ["dumbbells"],
  step_up: ["dumbbells"],
  reverse_lunge: ["dumbbells"],
  split_squat: ["dumbbells"],
  bw_split_squat: [],
  // quads / hamstrings isolation
  leg_ext: ["machine"],
  leg_curl: ["machine"],
  seated_leg_curl: ["machine"],
  hip_abduction: ["machine"],
  hip_adduction: ["machine"],
  cable_kickback: ["cable"],
  // shoulders
  lateral_raise: ["dumbbells"],
  rear_delt_fly: ["dumbbells"],
  face_pull: ["cable"],
  cable_lateral_raise: ["cable"],
  machine_lateral_raise: ["machine"],
  front_raise: ["dumbbells"],
  upright_row: ["barbell"],
  reverse_fly_machine: ["machine"],
  cable_rear_delt_fly: ["cable"],
  db_shrug: ["dumbbells"],
  bb_shrug: ["barbell"],
  // biceps
  db_curl: ["dumbbells"],
  kb_curl: ["kettlebell"],
  bb_curl: ["barbell"],
  hammer_curl: ["dumbbells"],
  cable_curl: ["cable"],
  spider_curl: ["dumbbells", "bench"],
  preacher_curl: ["gym"],
  ez_bar_curl: ["barbell"],
  incline_db_curl: ["dumbbells", "bench"],
  concentration_curl: ["dumbbells"],
  machine_curl: ["machine"],
  cable_hammer_curl: ["cable"],
  reverse_curl: ["barbell"],
  // triceps
  pushdown: ["cable"],
  overhead_ext: ["dumbbells"],
  skullcrusher: ["barbell", "bench"],
  kickback: ["dumbbells"],
  rope_pushdown: ["cable"],
  cable_overhead_ext: ["cable"],
  seated_dip: ["machine"],
  bench_dip: [],
  // calves
  calf_raise: ["machine"],
  seated_calf: ["machine"],
  leg_press_calf: ["machine"],
  single_leg_calf_raise: [],
  // jumps
  box_jump: ["gym"],
  broad_jump: [],
  depth_jump: ["gym"],
  jump_squat: [],
  med_ball_slam: ["slam_ball"],
  // speed work
  speed_squat: ["barbell"],
  speed_deadlift: ["barbell"],
  // abs
  dead_hang: ["pullup_bar"],
  scap_pullup: ["pullup_bar"],
  pullup_negative: ["pullup_bar"],
  hanging_leg_raise: ["pullup_bar"],
  rotation_machine: ["machine"],
  cable_crunch: ["cable"],
  ab_machine: ["machine"],
  hollow_hold: [],
  plank: [],
  crunch: [],
  machine_crunch: ["machine"],
  decline_situp: ["gym"],
  ab_wheel: ["ab_wheel"],
  lying_leg_raise: [],
  captains_chair: ["gym"],
  russian_twist: [],
  side_plank: [],
  pallof_press: ["cable"],
  woodchop: ["cable"],
  wall_push_up: [],
  incline_push_up: ["bench"],
  knee_push_up: [],
  decline_push_up: ["bench"],
  sit_to_stand: [],
  supported_squat: [],
  dead_bug: [],
  bird_dog: [],
  db_front_squat: ["dumbbells"],
  kb_deadlift: ["kettlebell"],
  ball_hamstring_curl: ["stability_ball"],
  suspension_row: ["suspension_trainer"],
  farmer_carry: ["dumbbells"],
  suitcase_carry: ["dumbbells"],
  kb_suitcase_carry: ["kettlebell"],
  double_kb_press: ["kettlebell"],
  deficit_push_up: ["dumbbells"],
  turkish_get_up: ["kettlebell"],
  db_bent_over_row: ["dumbbells"],
  kb_high_pull: ["kettlebell"],
  twisting_knee_raise: ["pullup_bar"],
  single_leg_ext: ["machine"],
  double_kb_front_squat: ["kettlebell"],
};

/**
 * A kettlebell lift and the dumbbell lift it matches weight for weight: one
 * bell in one hand moves like one dumbbell in one hand. The first time you
 * pick up a kettlebell, the dumbbell number is a far better guess at what
 * you can do than a guess from nothing.
 */
export const TWIN: Record<string, string> = {
  kb_goblet_squat: "goblet_squat",
  kb_press: "db_shoulder",
  kb_row: "db_row",
  kb_floor_press: "db_bench",
  double_kb_press: "db_shoulder",
  double_kb_front_squat: "db_front_squat",
  kb_single_leg_rdl: "single_leg_rdl",
  kb_suitcase_carry: "suitcase_carry",
};

/** What an exercise needs. One of yours, unlisted, needs a gym. */
export const needsOf = (ex: Pick<Exercise, "id"> & Partial<Pick<Exercise, "equipment" | "bodyweight">>): Gear[] => {
  const saved = byId(ex.id);
  return NEEDS[ex.id] ?? ex.equipment ?? saved?.equipment ??
    ((ex.bodyweight ?? saved?.bodyweight) ? [] : ["gym"]);
};

/** Whether everything an exercise needs is in the kit. */
export const fits = (ex: Pick<Exercise, "id">, kit: Kit): boolean =>
  needsOf(ex).every((g) => kit.gear.includes(g)) &&
  !(TWO_BELLS.has(ex.id) && bellsListed(kit) && !kit.pairs?.length);

/** The gear that carries an exercise's weight, if it is one that may come in only some weights. */
export const loadOf = (ex: Pick<Exercise, "id">): Load | null => {
  const needs = needsOf(ex);
  return needs.includes("dumbbells") ? "dumbbells" : needs.includes("kettlebell") ? "kettlebell" : null;
};

/**
 * The weights an exercise can be done with in this kit, lightest first. Null
 * means any weight — a gym, a full rack, or an exercise whose weight is not
 * dumbbells or kettlebells.
 */
export const weightsFor = (ex: Pick<Exercise, "id">, kit: Kit): number[] | null => {
  const load = loadOf(ex);
  // A bell in each hand: only the weights you have two of.
  const list = load === "kettlebell" && TWO_BELLS.has(ex.id) && bellsListed(kit)
    ? kit.pairs
    : load ? kit.weights?.[load] : undefined;
  return list && list.length > 0 ? [...list].sort((a, b) => a - b) : null;
};

/**
 * The weight to use when only some are on hand: the heaviest at or below the
 * one you are due, else the lightest there is. Any weight on hand returns the
 * one you are due.
 */
export const nearestWeight = (weights: number[] | null, due: number): number => {
  if (!weights || weights.length === 0) return due;
  const under = weights.filter((w) => w <= due);
  return under.length > 0 ? under[under.length - 1] : weights[0];
};

/**
 * The next weight up from `weight`, or null when there is none. With any
 * weight on hand that is simply one increment more.
 */
export const nextWeightUp = (
  weights: number[] | null,
  weight: number,
  increment: number,
): number | null => {
  if (!weights) return weight + increment;
  return weights.find((w) => w > weight) ?? null;
};

/** A lighter weight that is actually here, closest to the intended reduction. */
export const nextWeightDown = (
  weights: number[] | null,
  weight: number,
  intended: number,
): number | null => {
  if (!weights) return intended;
  const lighter = weights.filter((w) => w < weight).sort((a, b) => a - b);
  return lighter.length ? nearestWeight(lighter, intended) : null;
};
