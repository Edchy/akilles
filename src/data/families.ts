import type { Exercise, Pattern } from "@/data/exercises";

/**
 * The six kinds of exercise the app tells apart by colour and shape: the
 * three lifting families, core, cardio and stretching. Every exercise has
 * one — a lift you create yourself gets it from the movement type you pick —
 * so the shapes never run out. A seventh, the goal, is not an exercise but
 * something you are learning — see `data/goals.ts` — with a star of its own.
 */
/**
 * `full` is a workout's family only, never an exercise's: a full body day,
 * a bit of everything.
 */
export type Family = "push" | "pull" | "legs" | "core" | "cardio" | "mobility" | "goal" | "full";

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
  carry: "core",
};

/** The family a movement type belongs to. */
export const familyOfPattern = (pattern: Pattern): Family => BY_PATTERN[pattern] ?? "push";

/** A lift's family, from the first movement type it counts as. */
export const familyOf = (exercise: Exercise | undefined): Family =>
  (exercise && BY_PATTERN[exercise.patterns[0]]) || "push";
