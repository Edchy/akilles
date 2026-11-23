import type { Exercise, Pattern } from "@/data/exercises";
import { TWIN } from "@/data/kit";
import { START_RATIO } from "@/data/start-ratios";
import { similarity, SAME_LIFT } from "@/lib/similar";

/**
 * Starting weights: where a lift opens the very first time.
 *
 * Two things set it, in this order of trust:
 *
 * 1. What you have actually lifted. Once a few lifts have history, a lift you
 *    have never done is guessed from how your real weights compare with what
 *    Klay would have guessed for them (`personalFactor`). After a workout or
 *    two this is what counts.
 * 2. Before that, the first questions: how much you have lifted, and — if you
 *    chose to say — your weight, your sex and how many push-ups you can do.
 *    Those are used for this and nothing else, and stay on the phone.
 *
 * Every guess leans light. Owning a light weight is the point; a guess that
 * is too low costs a session, one that is too high costs your form.
 */

export type Experience = "new" | "some" | "lots";
export type Sex = "woman" | "man";
/** How many push-ups in a row: none yet, 1 to 10, 11 to 25, more. */
export type PushUps = "none" | "few" | "some" | "many";

/**
 * What the first questions learned about you. `bodyweight`, `sex` and
 * `pushUps` are absent when you would rather not say, or weren't sure;
 * `experience` is always answered.
 */
export type Lifter = { experience: Experience; bodyweight?: number; sex?: Sex; pushUps?: PushUps };

/**
 * Push-ups in a row, as a measure of your pressing strength next to your
 * body weight — a push-up lifts about two thirds of it. It speaks for the
 * upper body in place of sex, which only guesses at it. "Some", 11 to 25,
 * is a man who has lifted a bit, and a little more.
 */
export const PUSH_UPS: Record<PushUps, number> = { none: 0.55, few: 0.8, some: 1.15, many: 1.4 };

/** How far each answer to "Have you lifted weights before?" moves a guess. */
export const EXPERIENCE: Record<Experience, number> = { new: 0.6, some: 1, lots: 1.3 };

/**
 * Women's working weights as a share of men's at the same body weight, from
 * the same strength tables: further apart for the upper body than the legs.
 * Unsaid sits between the two.
 */
const SEX: Record<Sex | "unsaid", { upper: number; lower: number }> = {
  man: { upper: 1, lower: 1 },
  woman: { upper: 0.6, lower: 0.75 },
  unsaid: { upper: 0.8, lower: 0.87 },
};

/** The weight assumed when you chose not to say it: on the light side, for a man if you said so. */
export const UNSAID_BODYWEIGHT = 60;
const UNSAID_MAN = 75;
/** The weight assumed before the questions existed — a phone set up earlier. */
const EARLIER_BODYWEIGHT = 75;

/** A body weight Klay will take, in kg. */
export const BODYWEIGHT_RANGE = { min: 30, max: 250 } as const;

const LOWER = new Set<Pattern>(["squat", "hinge", "lunge", "quads", "hamstrings", "calves"]);

/** Whether a lift is mostly legs and hips, which the sex adjustment treats apart. */
export const isLower = (ex: Exercise): boolean => LOWER.has(ex.patterns[0]);

/**
 * Klay's first guess for a lift from the answers alone, or undefined for one
 * without a ratio — a bodyweight exercise, or one of your own.
 */
export const startGuess = (ex: Exercise, lifter?: Lifter): number | undefined => {
  const entry = START_RATIO[ex.id];
  if (!entry) return ex.startWeight;
  const bodyweight =
    lifter?.bodyweight ?? (!lifter ? EARLIER_BODYWEIGHT : lifter.sex === "man" ? UNSAID_MAN : UNSAID_BODYWEIGHT);
  const experience = EXPERIENCE[lifter?.experience ?? "some"];
  // A phone set up before the questions: as a man who has lifted a bit, so
  // nothing it already shows moves down.
  const sex = SEX[lifter ? (lifter.sex ?? "unsaid") : "man"];
  // Push-ups measure the upper body where sex can only guess at it. They
  // already carry most of what experience says, so it counts for less with them.
  const upper = lifter?.pushUps ? PUSH_UPS[lifter.pushUps] * Math.sqrt(experience) : sex.upper * experience;
  const raw = entry.ratio * bodyweight * (isLower(ex) ? sex.lower * experience : upper);
  return settle(raw, ex.increment || 2.5, entry.bar ?? 0);
};

/** To the nearest weight there is, and never under the smallest one or the bar. */
const settle = (raw: number, step: number, bar: number): number =>
  Math.max(bar, step, Math.round(raw / step) * step);

/**
 * How you compare with Klay's guesses, from lifts you have trained: your
 * weight over the guess, for each, and the middle of those. Lifts of the same
 * half of the body — legs, or the rest — count first; the other half only
 * when there are none.
 *
 * Kept between a half and two and a half, and a step on the light side of
 * what it says when it is above one, so a single heavy lift never makes every
 * new one heavy. Undefined when there is nothing to go on.
 */
export const personalFactor = (
  ex: Exercise,
  trained: { exercise: Exercise; weight: number }[],
  lifter?: Lifter,
): number | undefined => {
  const ratios = (lower: boolean) =>
    trained
      .filter((t) => t.exercise.id !== ex.id && isLower(t.exercise) === lower)
      .map((t) => {
        const guess = startGuess(t.exercise, lifter);
        return guess && t.weight > 0 ? t.weight / guess : undefined;
      })
      .filter((x): x is number => x !== undefined);
  const near = ratios(isLower(ex));
  const pool = near.length > 0 ? near : ratios(!isLower(ex));
  if (pool.length === 0) return undefined;
  const sorted = [...pool].sort((a, b) => a - b);
  const mid = sorted.length % 2 ? sorted[(sorted.length - 1) / 2] : (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2;
  const kept = Math.min(2.5, Math.max(0.5, mid));
  return kept > 1 ? 1 + (kept - 1) * 0.8 : kept;
};

/**
 * A new lift starts at this share of what the same lift on other gear says:
 * the movement is yours, the new gear is not yet. 80 kg dumbbells on the
 * bench say about 225 kg on a bar; 85% of that is about 190 — close to the
 * usual rule that a bar takes a fifth more than both dumbbells together.
 */
export const NEW_GEAR_SHARE = 0.85;

/**
 * The weight a new lift takes from the same lift on other gear you have
 * trained — BB bench from DB bench, DB row from KB row — converted through
 * the two lifts' ratios and taken down to `NEW_GEAR_SHARE`. A twin moves
 * weight for weight. Undefined with no such lift trained.
 */
export const fromSameLift = (
  ex: Exercise,
  trained: { exercise: Exercise; weight: number }[],
): number | undefined => {
  const mine = START_RATIO[ex.id];
  if (!mine || ex.unloaded) return undefined;
  const best = trained
    .filter((t) => t.exercise.id !== ex.id && t.weight > 0 && START_RATIO[t.exercise.id] &&
      t.exercise.patterns[0] === ex.patterns[0] && similarity(ex, t.exercise) >= SAME_LIFT)
    .sort((a, b) => similarity(ex, b.exercise) - similarity(ex, a.exercise))[0];
  if (!best) return undefined;
  const twin = TWIN[ex.id] === best.exercise.id || TWIN[best.exercise.id] === ex.id;
  const raw = best.weight * (mine.ratio / START_RATIO[best.exercise.id].ratio) * (twin ? 1 : NEW_GEAR_SHARE);
  // Rounded down, a step light rather than a step heavy.
  const step = ex.increment || 2.5;
  return Math.max(mine.bar ?? 0, step, Math.floor(raw / step) * step);
};

/**
 * The first weight for a lift: the same lift on other gear if you have
 * trained it, else your own weights' word on the rest, else the answers'
 * guess. Undefined when the lift has no ratio.
 */
export const firstWeight = (
  ex: Exercise,
  trained: { exercise: Exercise; weight: number }[],
  lifter?: Lifter,
): number | undefined => {
  const same = fromSameLift(ex, trained);
  if (same !== undefined) return same;
  const guess = startGuess(ex, lifter);
  if (guess === undefined) return undefined;
  const factor = personalFactor(ex, trained, lifter);
  if (factor === undefined) return guess;
  const entry = START_RATIO[ex.id];
  return settle(guess * factor, ex.increment || 2.5, entry?.bar ?? 0);
};

/**
 * How the first time on a lift felt, said in one tap under the circles. Reps
 * alone can't say a weight was too light — you log up to the target and no
 * further — so Klay asks, once, while it is still learning the lift.
 */
export type Feel = "light" | "right" | "heavy";

/** How far each answer moves next time's weight. */
export const FEEL_STEP = { light: 1.2, heavy: 0.85 } as const;

/**
 * Next time's weight after a first time that felt too light or too heavy:
 * about a fifth more, or 15% less — at least one step either way, never
 * under the smallest weight or the bar. Where the place has only some
 * weights, the one nearest that, past today's.
 * "About right" leaves it as the ladder had it.
 */
export const feelWeight = (
  ex: Exercise,
  weight: number,
  feel: Feel,
  weights: number[] | null,
): number => {
  if (feel === "right") return weight;
  const step = ex.increment || 2.5;
  const floor = Math.max(step, START_RATIO[ex.id]?.bar ?? 0);
  // Only some weights here — a rack of kettlebells: the one nearest the aim,
  // on the right side of today's.
  const nearest = (aim: number, side: number[], fallback: number) =>
    side.length ? side.reduce((best, w) => (Math.abs(w - aim) < Math.abs(best - aim) ? w : best)) : fallback;
  if (feel === "light") {
    if (weights) return nearest(weight * FEEL_STEP.light, weights.filter((w) => w > weight), weights[weights.length - 1]);
    return Math.max(weight + step, Math.ceil((weight * FEEL_STEP.light) / step) * step);
  }
  if (weights) return nearest(weight * FEEL_STEP.heavy, weights.filter((w) => w < weight), weights[0]);
  return Math.max(floor, Math.min(weight - step, Math.floor((weight * FEEL_STEP.heavy) / step) * step));
};
