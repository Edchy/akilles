import type { Exercise, Pattern } from "@/data/exercises";
import { nearestWeight, weightsFor, type Kit } from "@/data/kit";

/**
 * Which exercise fills a slot with the kit on hand.
 *
 * At a gym every weight is there, so this is simply the slot's first
 * option — nothing changes. It matters away, where you may have one 10 kg
 * kettlebell or a hotel rack that stops at 20:
 *
 *   ok        the weight you are due is there, or near enough
 *   light     the nearest weight is far lighter than you are due
 *   heavy     even the lightest weight is far heavier than you are due
 *   outgrown  you have topped out the ladder at the heaviest weight there is
 *
 * A light or outgrown lift still trains you, just not much; a heavy one
 * can't be done properly at all. So the order of preference is: an ok lift
 * from the slot, then an ok single-leg lift standing in for it (one leg
 * does the work of two, so a 10 kg bell is suddenly enough), then a light
 * or outgrown lift, and only then nothing — the slot sits this one out.
 */
export type Fit = "ok" | "light" | "heavy" | "outgrown";

/** Below this share of the weight you are due, a lift is too light to be worth much. */
export const LIGHT = 0.6;
/** Above this multiple of the weight you are due, a lift is too heavy to do well. */
export const HEAVY = 1.3;

/** One exercise that could fill a slot, with what you are due on it. */
export type Candidate = {
  ex: Exercise;
  /** The weight its record says you are due. */
  due: number;
  /**
   * Whether `due` comes from your own training — this lift's record or its
   * twin's — rather than a guess from nothing. A guess can't call a weight
   * too light or too heavy: you will find out in one set.
   */
  known?: boolean;
  /** Topped out with nowhere further to go — see `ExerciseState.maxed`. */
  maxed?: boolean;
};

/** How an exercise sits with the weights on hand. */
export const fitOf = ({ ex, due, maxed, known }: Candidate, kit: Kit): Fit => {
  const weights = weightsFor(ex, kit);
  if (!weights || due <= 0 || !known) return "ok";
  const heaviest = weights[weights.length - 1];
  if (maxed && due >= heaviest) return "outgrown";
  const w = nearestWeight(weights, due);
  if (w > due * HEAVY) return "heavy";
  if (w < due * LIGHT) return "light";
  return "ok";
};

/**
 * When the weight on hand is too light for a two-legged lift, the single-leg
 * lift that can stand in for it.
 */
export const STAND_IN: Partial<Record<Pattern, Pattern>> = {
  squat: "lunge",
  quads: "lunge",
};

/**
 * Pick the exercise for a slot. `candidates` are the slot's own, in order of
 * preference, already limited to what the kit has and you have not ruled
 * out; `standIns` are single-leg lifts that may take the place of a lift too
 * light to bother with. Null when nothing will do.
 *
 * Usually that is simply the first that fits. But once the weight on hand is
 * known to be too light for you — a 10 kg bell and a 24 kg goblet squat — an
 * easy bodyweight lift is no answer either: a loaded lift that fits comes
 * first, then a single-leg stand-in, and only then the bodyweight one.
 */
export const pick = (candidates: Candidate[], standIns: Candidate[], kit: Kit): string | null => {
  const fit = (c: Candidate) => fitOf(c, kit);
  const ok = (c: Candidate) => fit(c) === "ok";
  const usable = (c: Candidate) => fit(c) === "light" || fit(c) === "outgrown";
  const tooLight = candidates.some(usable);
  const found = tooLight
    ? (candidates.find((c) => ok(c) && !c.ex.bodyweight) ??
      standIns.find((c) => ok(c) && !c.ex.bodyweight) ??
      standIns.find(ok) ??
      candidates.find(ok))
    : (candidates.find(ok) ?? standIns.find(ok));
  return (found ?? candidates.find(usable) ?? standIns.find(usable))?.ex.id ?? null;
};
