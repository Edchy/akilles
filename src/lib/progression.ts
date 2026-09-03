/**
 * Progression engine.
 *
 * A set is logged by tapping its circle: the first tap fills it at the target
 * reps, each further tap counts down, and tapping past 1 empties it again.
 *
 * When every set hit its target you're asked how it felt:
 *
 *   👍  climb the rep ladder     8 → 10 → 12
 *   👍  at the top of the ladder  weight += increment, back to the bottom rung
 *   👎  hold everything, repeat the exact same prescription
 *   👎  twice in a row            deload 10%, back to the bottom rung
 *
 * When a set came in UNDER target there is no thumbs question — missing reps
 * already says the weight was too much, so the prescription simply repeats.
 */

import { byId, type Exercise, type Pattern } from "@/data/exercises";
import { LADDERS, type Scheme } from "@/data/split";

export type Feedback = "up" | "down";

/** What we remember about one exercise. One record per exercise, not per session. */
export type ExerciseState = {
  exerciseId: string;
  weight: number;
  /** Index into the scheme's rep ladder. */
  rung: number;
  /** Consecutive 👎 since the last 👍. Reset to 0 on 👍 and on deload. */
  downStreak: number;
  /** Deloads since the last 👍. Only used to explain the number on screen. */
  deloads: number;
  lastFeedback?: Feedback;
  /**
   * Skipped the last time it came up. Progression is untouched, but the
   * screen and History say so — a lift you keep avoiding should be visible
   * rather than silently stalling.
   */
  skippedLast?: boolean;
  /** Previous session, for the "last time" line on screen. */
  lastPerformed?: {
    weight: number;
    /** Reps actually logged, one per set. */
    reps: number[];
    target: number;
    feedback?: Feedback;
  };
};

/** What to show on screen right now. */
export type Prescription = {
  exercise: Exercise;
  weight: number;
  sets: number;
  reps: number;
  scheme: Scheme;
  /** Populated once there's history. Explains where the number came from. */
  last?: ExerciseState["lastPerformed"];
  /** Set when the previous session triggered a deload. */
  deloaded?: boolean;
  /** Set when this exercise was skipped last time it came up. */
  skippedLast?: boolean;
};

const roundTo = (value: number, step: number) =>
  step <= 0 ? value : Math.max(step, Math.round(value / step) * step);

/** Reasonable opening weight when there's no history. You'll correct it once. */
const STARTING_WEIGHT: Partial<Record<Pattern, number>> = {
  horizontal_push: 40,
  vertical_push: 30,
  horizontal_pull: 40,
  vertical_pull: 30,
  squat: 50,
  hinge: 60,
  lunge: 10,
  quads: 30,
  hamstrings: 30,
  shoulders: 8,
  biceps: 10,
  triceps: 15,
  calves: 40,
  abs: 0,
};

export const freshState = (ex: Exercise): ExerciseState => ({
  exerciseId: ex.id,
  // A per-hand exercise stores the weight of one dumbbell, so the opening
  // guess is halved — 40kg of bench is a pair of 20s.
  weight: ex.bodyweight
    ? 0
    : roundTo(
        (STARTING_WEIGHT[ex.patterns[0]] ?? 20) / (ex.perHand ? 2 : 1),
        ex.increment,
      ),
  rung: 0,
  downStreak: 0,
  deloads: 0,
});

/** Turn stored state into the numbers on the screen. */
export const prescribe = (
  state: ExerciseState,
  scheme: Scheme,
  sets: number,
): Prescription => ({
  exercise: byId(state.exerciseId)!,
  weight: state.weight,
  reps: LADDERS[scheme][Math.min(state.rung, LADDERS[scheme].length - 1)],
  sets,
  scheme,
  last: state.lastPerformed,
  deloaded: state.deloads > 0 && state.downStreak === 0 && state.rung === 0,
  skippedLast: state.skippedLast,
});

/**
 * Every set logged at or above target. Only then is the thumbs question asked
 * — and only then can the weight go up.
 */
export const hitTarget = (reps: (number | null)[], target: number): boolean =>
  reps.length > 0 && reps.every((r) => r !== null && r >= target);

/**
 * Apply a session's outcome. Returns the state to use next time.
 *
 * `feedback` is undefined when the session fell short of target — the
 * prescription then repeats unchanged.
 *
 * Pure: same inputs, same output — which makes it testable.
 */
export const applyResult = (
  state: ExerciseState,
  scheme: Scheme,
  reps: (number | null)[],
  feedback?: Feedback,
): ExerciseState => {
  const exercise = byId(state.exerciseId)!;
  const ladder = LADDERS[scheme];
  const target = ladder[Math.min(state.rung, ladder.length - 1)];
  const performed = {
    weight: state.weight,
    reps: reps.map((r) => r ?? 0),
    target,
    feedback,
  };

  // Missed the target: repeat exactly. A short session is not a 👎 — it's
  // already told us the weight was too much.
  if (!hitTarget(reps, target)) {
    return { ...state, skippedLast: false, lastPerformed: performed };
  }

  if (feedback === "up") {
    const atTop = state.rung >= ladder.length - 1;
    return {
      ...state,
      // Top of the ladder: add weight and drop back to the bottom rung.
      // Otherwise just climb one rung at the same weight.
      weight: atTop ? state.weight + exercise.increment : state.weight,
      rung: atTop ? 0 : state.rung + 1,
      downStreak: 0,
      deloads: 0,
      skippedLast: false,
      lastFeedback: "up",
      lastPerformed: performed,
    };
  }

  const downStreak = state.downStreak + 1;

  // First 👎: hold everything and repeat it exactly.
  if (downStreak < 2) {
    return {
      ...state,
      downStreak,
      skippedLast: false,
      lastFeedback: "down",
      lastPerformed: performed,
    };
  }

  // Second 👎 in a row: deload 10% and restart the ladder.
  return {
    ...state,
    weight: roundTo(state.weight * 0.9, exercise.increment),
    rung: 0,
    downStreak: 0,
    deloads: state.deloads + 1,
    skippedLast: false,
    lastFeedback: "down",
    lastPerformed: performed,
  };
};

/**
 * Skipping records nothing about performance: the weight, the rung and the
 * deload counters are all left exactly as they were, so the exercise comes
 * back next time unchanged. Only the flag moves.
 */
export const markSkipped = (state: ExerciseState): ExerciseState => ({
  ...state,
  skippedLast: true,
});
