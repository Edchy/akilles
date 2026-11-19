/**
 * The clay figure's pictures of each stretch and lift (see art/clay.mjs), from
 * art/clay/stretches.json and lifts.json by art/clay-export.mjs. Don't edit by
 * hand: change the JSON and run that.
 *
 * A stretch shown in two pictures flips from the first to the second on
 * `breath.to1` and back on `breath.to0`; a hold shown in one picture, or a
 * movement with no set breath, is "steady".
 *
 * A lift is two pictures, start and other end, moving at lifting pace: the
 * way to `effort` (to the second picture, or back to the first) is the lift.
 */

import type { ImageSourcePropType } from "react-native";

export type Breath = "inhale" | "exhale";

export type ClayStretch = {
  frames: ImageSourcePropType[];
  breath: { to1: Breath; to0: Breath } | "steady";
  /** A lift: which way between the pictures is the effort. */
  effort?: "to0" | "to1";
};

export const CLAY: Record<string, ClayStretch> = {
  figure_four: { frames: [require("../../assets/clay/figure_four-0.jpg"), require("../../assets/clay/figure_four-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  seated_hamstring: { frames: [require("../../assets/clay/seated_hamstring-0-in.jpg"), require("../../assets/clay/seated_hamstring-1-out.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  forward_fold: { frames: [require("../../assets/clay/forward_fold-0.jpg"), require("../../assets/clay/forward_fold-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  supine_twist: { frames: [require("../../assets/clay/supine_twist-1.jpg")], breath: "steady" },
  knees_to_chest: { frames: [require("../../assets/clay/knees_to_chest-1.jpg")], breath: "steady" },
  cat_cow: { frames: [require("../../assets/clay/cat_cow-0-in.jpg"), require("../../assets/clay/cat_cow-1-out.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  childs_pose: { frames: [require("../../assets/clay/childs_pose-0.jpg"), require("../../assets/clay/childs_pose-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  chest_opener: { frames: [require("../../assets/clay/chest_opener-0.jpg"), require("../../assets/clay/chest_opener-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  band_external_rotation: { frames: [require("../../assets/clay/band_external_rotation-0.jpg"), require("../../assets/clay/band_external_rotation-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  wide_stance: { frames: [require("../../assets/clay/wide_stance-0-out.jpg"), require("../../assets/clay/wide_stance-1-in.jpg")], breath: { to1: "inhale", to0: "exhale" } },
  side_stance: { frames: [require("../../assets/clay/side_stance-0-out.jpg"), require("../../assets/clay/side_stance-1-in.jpg")], breath: { to1: "inhale", to0: "exhale" } },
  leg_swing: { frames: [require("../../assets/clay/leg_swing-0-in.jpg"), require("../../assets/clay/leg_swing-1-out.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  bodyweight_squat: { frames: [require("../../assets/clay/bodyweight_squat-0-out.jpg"), require("../../assets/clay/bodyweight_squat-1-in.jpg")], breath: { to1: "inhale", to0: "exhale" } },
  scapular_pushup: { frames: [require("../../assets/clay/scapular_pushup-0-in.jpg"), require("../../assets/clay/scapular_pushup-1-out.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  thread_needle: { frames: [require("../../assets/clay/thread_needle-0.jpg"), require("../../assets/clay/thread_needle-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  downward_dog: { frames: [require("../../assets/clay/downward_dog-0-in.jpg"), require("../../assets/clay/downward_dog-1-out.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  low_lunge: { frames: [require("../../assets/clay/low_lunge-1-in.jpg"), require("../../assets/clay/low_lunge-1-out.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  pigeon: { frames: [require("../../assets/clay/pigeon-0-in.jpg"), require("../../assets/clay/pigeon-1-out.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  cobra: { frames: [require("../../assets/clay/cobra-0-in.jpg"), require("../../assets/clay/cobra-1-out.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  knee_circles: { frames: [require("../../assets/clay/knee_circles-0.jpg"), require("../../assets/clay/knee_circles-1.jpg")], breath: "steady" },
  hamstring_bounce: { frames: [require("../../assets/clay/hamstring_bounce-0.jpg")], breath: "steady" },
  front_kick_swing: { frames: [require("../../assets/clay/front_kick_swing-0-in.jpg"), require("../../assets/clay/front_kick_swing-1-out.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  couch: { frames: [require("../../assets/clay/couch-0-in.jpg"), require("../../assets/clay/couch-0-out.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  standing_hip_flexor: { frames: [require("../../assets/clay/standing_hip_flexor-0-in.jpg"), require("../../assets/clay/standing_hip_flexor-0-out.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  calf_wall: { frames: [require("../../assets/clay/calf_wall-0-in.jpg"), require("../../assets/clay/calf_wall-0-out.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  lat_wall: { frames: [require("../../assets/clay/lat_wall-0-in.jpg"), require("../../assets/clay/lat_wall-0-out.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  cross_body: { frames: [require("../../assets/clay/cross_body-0-in.jpg"), require("../../assets/clay/cross_body-0-out.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  ball_shoulder: { frames: [require("../../assets/clay/ball_shoulder-0-in.jpg"), require("../../assets/clay/ball_shoulder-0-out.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  arm_circles: { frames: [require("../../assets/clay/arm_circles-0.jpg")], breath: "steady" },
  worlds_greatest: { frames: [require("../../assets/clay/worlds_greatest-0.jpg"), require("../../assets/clay/worlds_greatest-1.jpg")], breath: { to1: "inhale", to0: "exhale" } },
  band_pull_apart: { frames: [require("../../assets/clay/band_pull_apart-0.jpg"), require("../../assets/clay/band_pull_apart-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  wall_slide: { frames: [require("../../assets/clay/wall_slide-0.jpg"), require("../../assets/clay/wall_slide-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  prone_y_raise: { frames: [require("../../assets/clay/prone_y_raise-1.jpg")], breath: "steady" },
  bench: { frames: [require("../../assets/clay/bench-0.jpg"), require("../../assets/clay/bench-1.jpg")], breath: "steady", effort: "to0" },
  lat_pulldown: { frames: [require("../../assets/clay/lat_pulldown-0.jpg"), require("../../assets/clay/lat_pulldown-1.jpg")], breath: "steady", effort: "to1" },
  goblet_squat: { frames: [require("../../assets/clay/goblet_squat-0.jpg"), require("../../assets/clay/goblet_squat-1.jpg")], breath: "steady", effort: "to0" },
  db_bench: { frames: [require("../../assets/clay/db_bench-0.jpg"), require("../../assets/clay/db_bench-1.jpg")], breath: "steady", effort: "to0" },
  db_shoulder: { frames: [require("../../assets/clay/db_shoulder-0.jpg"), require("../../assets/clay/db_shoulder-1.jpg")], breath: "steady", effort: "to1" },
  pushdown: { frames: [require("../../assets/clay/pushdown-0.jpg"), require("../../assets/clay/pushdown-1.jpg")], breath: "steady", effort: "to1" },
  dead_bug: { frames: [require("../../assets/clay/dead_bug-0.jpg"), require("../../assets/clay/dead_bug-1.jpg")], breath: "steady", effort: "to0" },
  dead_hang: { frames: [require("../../assets/clay/dead_hang-0.jpg")], breath: "steady" },
  scap_pullup: { frames: [require("../../assets/clay/scap_pullup-0.jpg"), require("../../assets/clay/scap_pullup-1.jpg")], breath: "steady", effort: "to1" },
  pullup: { frames: [require("../../assets/clay/pullup-0.jpg"), require("../../assets/clay/pullup-1.jpg")], breath: "steady", effort: "to1" },
  wall_push_up: { frames: [require("../../assets/clay/wall_push_up-0.jpg"), require("../../assets/clay/wall_push_up-1.jpg")], breath: "steady", effort: "to0" },
  incline_push_up: { frames: [require("../../assets/clay/incline_push_up-0.jpg"), require("../../assets/clay/incline_push_up-1.jpg")], breath: "steady", effort: "to0" },
  knee_push_up: { frames: [require("../../assets/clay/knee_push_up-0.jpg"), require("../../assets/clay/knee_push_up-1.jpg")], breath: "steady", effort: "to0" },
  push_up: { frames: [require("../../assets/clay/push_up-0.jpg"), require("../../assets/clay/push_up-1.jpg")], breath: "steady", effort: "to0" },
  cable_row: { frames: [require("../../assets/clay/cable_row-0.jpg"), require("../../assets/clay/cable_row-1.jpg")], breath: "steady", effort: "to1" },
  face_pull: { frames: [require("../../assets/clay/face_pull-0.jpg"), require("../../assets/clay/face_pull-1.jpg")], breath: "steady", effort: "to1" },
  db_curl: { frames: [require("../../assets/clay/db_curl-0.jpg"), require("../../assets/clay/db_curl-1.jpg")], breath: "steady", effort: "to1" },
  plank: { frames: [require("../../assets/clay/plank-0.jpg")], breath: "steady" },
};
