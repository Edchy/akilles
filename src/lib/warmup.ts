/**
 * Warm-up ramps.
 *
 * A few ascending sets on the first exercise of each muscle group: light and
 * high-rep, climbing toward the working weight. They are never logged and
 * never affect progression — their only job is to get you ready to lift.
 */

import type { Exercise } from "@/data/exercises";

export type WarmupSet = { weight: number; reps: number };

/**
 * How a weight reads on screen. A dumbbell exercise shows the weight of one
 * dumbbell with a ×2, because that is the number on the thing you pick up.
 */
export const weightLabel = (exercise: Exercise, weight: number): string => {
  if (exercise.bodyweight) {
    if (weight === 0) return "Bodyweight";
    // Negative is assistance from a machine; positive is added load.
    return weight < 0 ? `−${Math.abs(weight)} kg assist` : `+${weight} kg`;
  }
  return exercise.perHand ? `${weight} kg ×2` : `${weight} kg`;
};

/** Fractions of the working weight, with the reps that suit each. */
const RAMP: { fraction: number; reps: number }[] = [
  { fraction: 0.4, reps: 10 },
  { fraction: 0.6, reps: 6 },
  { fraction: 0.8, reps: 3 },
];

/** Round to something you can actually load on the bar or the stack. */
const roundTo = (value: number, step: number) =>
  step <= 0 ? value : Math.round(value / step) * step;

/**
 * The ramp for an exercise at a given working weight.
 *
 * Returns nothing when there is no point: bodyweight movements, and weights
 * light enough that 40% is below the smallest jump you can make.
 */
export const warmupFor = (
  exercise: Exercise,
  workingWeight: number,
): WarmupSet[] => {
  // Bodyweight movements have nothing to ramp: you either can do the movement
  // or you cannot, and an assisted one is already the easier version.
  if (exercise.bodyweight || exercise.timed) return [];
  const step = exercise.increment || 2.5;
  if (workingWeight < step * 4) return [];

  const sets: WarmupSet[] = [];
  for (const { fraction, reps } of RAMP) {
    const weight = roundTo(workingWeight * fraction, step);
    // Skip a rung that lands on the same weight as the one before it.
    if (weight <= 0 || sets.at(-1)?.weight === weight) continue;
    sets.push({ weight, reps });
  }
  return sets;
};
