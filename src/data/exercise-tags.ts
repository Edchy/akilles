import type { Exercise, Pattern } from "@/data/exercises";

/** Discovery vocabulary. These tags never decide workout substitutions or rep ranges. */
export const MOVEMENT_LABEL = {
  horizontal_press: "Horizontal press", vertical_press: "Vertical press",
  horizontal_pull: "Horizontal pull", vertical_pull: "Vertical pull",
  squat: "Squat", hinge: "Hip hinge", lunge: "Lunge",
  chest_fly: "Chest fly", shoulder_raise: "Shoulder raise", rear_delt_fly: "Rear delt fly",
  shrug: "Shoulder shrug", elbow_flexion: "Elbow flexion", elbow_extension: "Elbow extension",
  knee_extension: "Knee extension", knee_flexion: "Knee flexion", calf_raise: "Calf raise",
  hip_extension: "Hip extension", hip_abduction: "Hip abduction", hip_adduction: "Hip adduction",
  hip_flexion: "Hip flexion", trunk_flexion: "Trunk flexion", rotation: "Rotation",
  anti_rotation: "Resisting rotation", anti_extension: "Resisting back arching",
  lateral_stability: "Side stability", jump: "Jump", throw: "Throw", carry: "Carry",
} as const;
export type Movement = keyof typeof MOVEMENT_LABEL;

export const MUSCLE_LABEL = {
  chest: "Chest", lats: "Lats", upper_back: "Upper back", shoulders: "Shoulders",
  biceps: "Biceps", triceps: "Triceps", forearms: "Forearms", quads: "Quadriceps",
  hamstrings: "Hamstrings", glutes: "Glutes", adductors: "Inner thighs",
  calves: "Calves", abs: "Abdominals", obliques: "Obliques", lower_back: "Lower back",
  hip_flexors: "Hip flexors",
} as const;
export type Muscle = keyof typeof MUSCLE_LABEL;

// Conservative family defaults for older and custom entries. Add explicit
// exercise-level tags when a movement differs; never infer anatomy from its name.
const MOVEMENTS: Record<Pattern, Movement[]> = {
  horizontal_push: ["horizontal_press"], vertical_push: ["vertical_press"],
  horizontal_pull: ["horizontal_pull"], vertical_pull: ["vertical_pull"],
  squat: ["squat"], hinge: ["hinge"], lunge: ["lunge"], biceps: ["elbow_flexion"],
  triceps: ["elbow_extension"], shoulders: ["shoulder_raise"], quads: ["knee_extension"],
  hamstrings: ["knee_flexion"], calves: ["calf_raise"], chest_iso: ["chest_fly"],
  abs: ["trunk_flexion"], jump: ["jump"],
};
const MUSCLES: Record<Pattern, Muscle[]> = {
  horizontal_push: ["chest", "triceps", "shoulders"], vertical_push: ["shoulders", "triceps"],
  horizontal_pull: ["upper_back", "lats", "biceps"], vertical_pull: ["lats", "biceps"],
  squat: ["quads", "glutes"], hinge: ["glutes", "hamstrings"], lunge: ["quads", "glutes"],
  biceps: ["biceps"], triceps: ["triceps"], shoulders: ["shoulders"], quads: ["quads"],
  hamstrings: ["hamstrings"], calves: ["calves"], chest_iso: ["chest"],
  abs: ["abs"], jump: ["quads", "glutes", "calves"],
};

type Tags = { movements?: Movement[]; muscles?: Muscle[] };
const SPECIFIC: Record<string, Tags> = {
  hip_thrust: { movements: ["hip_extension"], muscles: ["glutes"] },
  glute_bridge: { movements: ["hip_extension"], muscles: ["glutes"] },
  cable_kickback: { movements: ["hip_extension"], muscles: ["glutes"] },
  hip_abduction: { movements: ["hip_abduction"], muscles: ["glutes"] },
  hip_adduction: { movements: ["hip_adduction"], muscles: ["adductors"] },
  back_ext: { movements: ["hinge"], muscles: ["glutes", "hamstrings", "lower_back"] },
  db_rdl: { movements: ["hinge"] }, kb_rdl: { movements: ["hinge"] },
  single_leg_rdl: { movements: ["hinge"] },
  hack_squat: { movements: ["squat"] }, leg_press: { movements: ["squat"] },
  smith_squat: { movements: ["squat"] },
  bulgarian: { movements: ["lunge"] }, walking_lunge: { movements: ["lunge"] },
  step_up: { movements: ["lunge"] }, reverse_lunge: { movements: ["lunge"] },
  split_squat: { movements: ["lunge"] }, bw_split_squat: { movements: ["lunge"] },
  rear_delt_fly: { movements: ["rear_delt_fly"], muscles: ["shoulders", "upper_back"] },
  cable_rear_delt_fly: { movements: ["rear_delt_fly"], muscles: ["shoulders", "upper_back"] },
  reverse_fly_machine: { movements: ["rear_delt_fly"], muscles: ["shoulders", "upper_back"] },
  face_pull: { movements: ["horizontal_pull"], muscles: ["shoulders", "upper_back"] },
  db_shrug: { movements: ["shrug"], muscles: ["upper_back"] },
  bb_shrug: { movements: ["shrug"], muscles: ["upper_back"] },
  upright_row: { movements: ["shoulder_raise"], muscles: ["shoulders", "upper_back"] },
  straight_arm_pulldown: { muscles: ["lats"] }, db_pullover: { muscles: ["lats", "chest"] },
  dead_hang: { muscles: ["forearms", "lats", "shoulders"] },
  scap_pullup: { muscles: ["lats", "upper_back", "shoulders"] },
  pullup_negative: { muscles: ["lats", "biceps", "upper_back"] },
  hanging_leg_raise: { movements: ["hip_flexion"], muscles: ["abs", "hip_flexors"] },
  lying_leg_raise: { movements: ["hip_flexion"], muscles: ["abs", "hip_flexors"] },
  captains_chair: { movements: ["hip_flexion"], muscles: ["abs", "hip_flexors"] },
  plank: { movements: ["anti_extension"] }, hollow_hold: { movements: ["anti_extension"] },
  ab_wheel: { movements: ["anti_extension"] },
  side_plank: { movements: ["lateral_stability"], muscles: ["obliques"] },
  pallof_press: { movements: ["anti_rotation"], muscles: ["abs", "obliques"] },
  woodchop: { movements: ["rotation"], muscles: ["abs", "obliques"] },
  russian_twist: { movements: ["rotation"], muscles: ["abs", "obliques"] },
  ab_machine: { movements: ["rotation"], muscles: ["obliques"] },
  rotation_machine: { movements: ["rotation"], muscles: ["obliques"] },
  med_ball_slam: { movements: ["throw"], muscles: ["lats", "abs", "shoulders"] },
};

export const movementsOf = (ex: Exercise): Movement[] => [...new Set(
  ex.movements ?? SPECIFIC[ex.id]?.movements ?? ex.patterns.flatMap((p) => MOVEMENTS[p]),
)];
export const musclesOf = (ex: Exercise): Muscle[] => [...new Set(
  ex.muscles ?? SPECIFIC[ex.id]?.muscles ?? ex.patterns.flatMap((p) => MUSCLES[p]),
)];
