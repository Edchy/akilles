import type { Exercise, Pattern } from "@/data/exercises";

/**
 * The six kinds of exercise the app tells apart by colour and shape: the
 * three lifting families, core, cardio and stretching. Every exercise has
 * one — a lift you create yourself gets it from the movement type you pick —
 * so the shapes never run out.
 */
export type Family = "push" | "pull" | "legs" | "core" | "cardio" | "mobility";

const BY_PATTERN: Record<Pattern, Family> = {
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

/** A lift's family, from the first movement type it counts as. */
export const familyOf = (exercise: Exercise | undefined): Family =>
  (exercise && BY_PATTERN[exercise.patterns[0]]) || "push";

/** What each shape means, for screen readers. */
export const FAMILY_LABEL: Record<Family, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  core: "Core",
  cardio: "Cardio",
  mobility: "Stretch",
};
