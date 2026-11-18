/**
 * The clay figure's pictures of each stretch (see art/clay.mjs), and the breath
 * that goes with moving between them, from art/clay/stretches.json by
 * art/clay-export.mjs. Don't edit by hand: change stretches.json and run that.
 *
 * A stretch shown in two pictures flips from the first to the second on
 * `breath.to1` and back on `breath.to0`; a hold shown in one picture, or a
 * movement with no set breath, is "steady".
 */

import type { ImageSourcePropType } from "react-native";

export type Breath = "inhale" | "exhale";

export type ClayStretch = {
  frames: ImageSourcePropType[];
  breath: { to1: Breath; to0: Breath } | "steady";
};

export const CLAY: Record<string, ClayStretch> = {
  figure_four: { frames: [require("../../assets/clay/figure_four-0.jpg"), require("../../assets/clay/figure_four-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  seated_hamstring: { frames: [require("../../assets/clay/seated_hamstring-0.jpg"), require("../../assets/clay/seated_hamstring-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  forward_fold: { frames: [require("../../assets/clay/forward_fold-0.jpg"), require("../../assets/clay/forward_fold-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  supine_twist: { frames: [require("../../assets/clay/supine_twist-1.jpg")], breath: "steady" },
  knees_to_chest: { frames: [require("../../assets/clay/knees_to_chest-1.jpg")], breath: "steady" },
  cat_cow: { frames: [require("../../assets/clay/cat_cow-0.jpg"), require("../../assets/clay/cat_cow-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  childs_pose: { frames: [require("../../assets/clay/childs_pose-0.jpg"), require("../../assets/clay/childs_pose-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  chest_opener: { frames: [require("../../assets/clay/chest_opener-0.jpg"), require("../../assets/clay/chest_opener-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  band_external_rotation: { frames: [require("../../assets/clay/band_external_rotation-0.jpg"), require("../../assets/clay/band_external_rotation-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  wide_stance: { frames: [require("../../assets/clay/wide_stance-0.jpg"), require("../../assets/clay/wide_stance-1.jpg")], breath: { to1: "inhale", to0: "exhale" } },
  side_stance: { frames: [require("../../assets/clay/side_stance-0.jpg"), require("../../assets/clay/side_stance-1.jpg")], breath: { to1: "inhale", to0: "exhale" } },
  leg_swing: { frames: [require("../../assets/clay/leg_swing-0.jpg"), require("../../assets/clay/leg_swing-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  bodyweight_squat: { frames: [require("../../assets/clay/bodyweight_squat-0.jpg"), require("../../assets/clay/bodyweight_squat-1.jpg")], breath: { to1: "inhale", to0: "exhale" } },
  scapular_pushup: { frames: [require("../../assets/clay/scapular_pushup-0.jpg"), require("../../assets/clay/scapular_pushup-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  thread_needle: { frames: [require("../../assets/clay/thread_needle-0.jpg"), require("../../assets/clay/thread_needle-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  downward_dog: { frames: [require("../../assets/clay/downward_dog-0.jpg"), require("../../assets/clay/downward_dog-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  low_lunge: { frames: [require("../../assets/clay/low_lunge-1.jpg")], breath: "steady" },
  pigeon: { frames: [require("../../assets/clay/pigeon-0.jpg"), require("../../assets/clay/pigeon-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  cobra: { frames: [require("../../assets/clay/cobra-0.jpg"), require("../../assets/clay/cobra-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  knee_circles: { frames: [require("../../assets/clay/knee_circles-0.jpg"), require("../../assets/clay/knee_circles-1.jpg")], breath: "steady" },
  hamstring_bounce: { frames: [require("../../assets/clay/hamstring_bounce-0.jpg")], breath: "steady" },
  front_kick_swing: { frames: [require("../../assets/clay/front_kick_swing-0.jpg"), require("../../assets/clay/front_kick_swing-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  couch: { frames: [require("../../assets/clay/couch-0.jpg")], breath: "steady" },
  standing_hip_flexor: { frames: [require("../../assets/clay/standing_hip_flexor-0.jpg")], breath: "steady" },
  calf_wall: { frames: [require("../../assets/clay/calf_wall-0.jpg")], breath: "steady" },
  lat_wall: { frames: [require("../../assets/clay/lat_wall-0.jpg")], breath: "steady" },
  cross_body: { frames: [require("../../assets/clay/cross_body-0.jpg")], breath: "steady" },
  ball_shoulder: { frames: [require("../../assets/clay/ball_shoulder-0.jpg")], breath: "steady" },
  arm_circles: { frames: [require("../../assets/clay/arm_circles-0.jpg")], breath: "steady" },
  worlds_greatest: { frames: [require("../../assets/clay/worlds_greatest-0.jpg"), require("../../assets/clay/worlds_greatest-1.jpg")], breath: { to1: "inhale", to0: "exhale" } },
  band_pull_apart: { frames: [require("../../assets/clay/band_pull_apart-0.jpg"), require("../../assets/clay/band_pull_apart-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  wall_slide: { frames: [require("../../assets/clay/wall_slide-0.jpg"), require("../../assets/clay/wall_slide-1.jpg")], breath: { to1: "exhale", to0: "inhale" } },
  prone_y_raise: { frames: [require("../../assets/clay/prone_y_raise-1.jpg")], breath: "steady" },
};
