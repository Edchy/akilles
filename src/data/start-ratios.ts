/**
 * Where a lift starts the first time, as a share of your body weight.
 *
 * Each number is a working weight — lifted 6 to 12 times slowly, with two to
 * spare — for a man who has lifted a bit, as a share of what he weighs. They
 * come from published strength tables (one-rep maxes for a "beginner", taken
 * down to about two thirds for a working weight) and are rounded towards
 * light: Klay would rather you start low and climb than start high and swing.
 *
 * Experience, sex and your weight scale them; see `startGuess`. A dumbbell
 * or per-hand lift is the weight of one dumbbell. `bar` is the least the lift
 * can be done with — an empty Olympic bar.
 *
 * Bodyweight, timed and explosive exercises have no ratio entry. Loaded timed
 * carries and new lifts without a researched ratio use explicit starting
 * placeholders in exercises.ts; those are not strength-table prescriptions.
 */
export type StartRatio = { ratio: number; bar?: number };

const BAR = 20;
const r = (ratio: number): StartRatio => ({ ratio });
const barbell = (ratio: number): StartRatio => ({ ratio, bar: BAR });

export const START_RATIO: Record<string, StartRatio> = {
  // ---------- horizontal push ----------
  bench: barbell(0.45),
  db_bench: r(0.16),
  db_floor_press: r(0.15),
  kb_floor_press: r(0.15),
  incline_bench: barbell(0.4),
  machine_chest: r(0.45),
  incline_db_press: r(0.14),
  decline_bench: barbell(0.45),
  close_grip_bench: barbell(0.4),
  smith_bench: r(0.4),
  smith_incline_press: r(0.35),
  incline_machine_press: r(0.4),
  // ---------- chest isolation ----------
  cable_fly: r(0.08),
  cable_crossover: r(0.1),
  pec_deck: r(0.35),
  db_fly: r(0.08),
  incline_db_fly: r(0.07),
  // ---------- vertical push ----------
  ohp: barbell(0.3),
  db_shoulder: r(0.12),
  machine_shoulder: r(0.3),
  kb_press: r(0.12),
  arnold_press: r(0.1),
  smith_shoulder_press: r(0.28),
  // ---------- vertical pull ----------
  lat_pulldown: r(0.5),
  close_grip_pulldown: r(0.5),
  machine_pulldown: r(0.5),
  straight_arm_pulldown: r(0.2),
  db_pullover: r(0.15),
  // ---------- horizontal pull ----------
  bb_row: barbell(0.45),
  cable_row: r(0.5),
  chest_supported_row: r(0.35),
  machine_row: r(0.5),
  db_row: r(0.2),
  kb_row: r(0.2),
  tbar_row: r(0.4),
  // ---------- squat ----------
  back_squat: barbell(0.55),
  front_squat: barbell(0.45),
  goblet_squat: r(0.16),
  kb_goblet_squat: r(0.16),
  hack_squat: r(0.6),
  leg_press: r(1.0),
  smith_squat: r(0.5),
  speed_squat: barbell(0.35),
  // ---------- hinge ----------
  deadlift: barbell(0.7),
  rdl: barbell(0.5),
  good_morning: barbell(0.3),
  hip_thrust: barbell(0.6),
  db_rdl: r(0.18),
  kb_rdl: r(0.25),
  kb_swing: r(0.2),
  sumo_deadlift: barbell(0.65),
  trap_bar_deadlift: barbell(0.75),
  cable_pull_through: r(0.25),
  single_leg_rdl: r(0.1),
  speed_deadlift: barbell(0.45),
  // ---------- lunge ----------
  bulgarian: r(0.08),
  walking_lunge: r(0.1),
  step_up: r(0.08),
  reverse_lunge: r(0.1),
  split_squat: r(0.1),
  // ---------- quads and hamstrings ----------
  leg_ext: r(0.4),
  leg_curl: r(0.35),
  seated_leg_curl: r(0.4),
  hip_abduction: r(0.5),
  hip_adduction: r(0.5),
  cable_kickback: r(0.1),
  // ---------- shoulders ----------
  lateral_raise: r(0.06),
  rear_delt_fly: r(0.06),
  face_pull: r(0.2),
  cable_lateral_raise: r(0.06),
  machine_lateral_raise: r(0.25),
  front_raise: r(0.06),
  upright_row: r(0.3),
  reverse_fly_machine: r(0.25),
  cable_rear_delt_fly: r(0.06),
  db_shrug: r(0.25),
  bb_shrug: barbell(0.6),
  // ---------- biceps ----------
  db_curl: r(0.1),
  kb_curl: r(0.1),
  bb_curl: r(0.25),
  hammer_curl: r(0.1),
  cable_curl: r(0.2),
  spider_curl: r(0.07),
  preacher_curl: r(0.2),
  ez_bar_curl: r(0.25),
  incline_db_curl: r(0.08),
  concentration_curl: r(0.08),
  machine_curl: r(0.25),
  cable_hammer_curl: r(0.2),
  reverse_curl: r(0.18),
  // ---------- triceps ----------
  pushdown: r(0.25),
  overhead_ext: r(0.08),
  skullcrusher: r(0.2),
  kickback: r(0.06),
  rope_pushdown: r(0.22),
  cable_overhead_ext: r(0.2),
  seated_dip: r(0.5),
  // ---------- calves ----------
  calf_raise: r(0.6),
  seated_calf: r(0.4),
  leg_press_calf: r(0.8),
  // ---------- core ----------
  rotation_machine: r(0.3),
  cable_crunch: r(0.35),
  ab_machine: r(0.3),
  machine_crunch: r(0.3),
  pallof_press: r(0.1),
  woodchop: r(0.12),
};
