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
import { ladderFor, type Scheme } from "@/data/split";

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
  /**
   * When this exercise was last actually trained, as epoch milliseconds.
   * Absent on a record written before time was tracked, which reads as
   * "unknown" and never triggers a cut — see `decayFor`.
   */
  lastTrainedAt?: number;
  /**
   * When the routine back-off clock was last reckoned. Separate from
   * `lastTrainedAt` so the monthly check lands every 30 days of *calendar*
   * time rather than every 30 days of training.
   */
  lastBackOffAt?: number;
  /**
   * Where the lift stood at that moment, as a single comparable number — see
   * `progressScore`. The next check asks whether it has moved at all; a lift
   * that is climbing is left alone, and only a stalled one is eased back.
   */
  backOffScore?: number;
  /**
   * The heaviest this lift has ever been. The routine back-off will not take
   * it below a share of this, so repeated trims cannot grind it down.
   */
  bestWeight?: number;
  /**
   * A time-based cut applied but not yet trained through. Kept so the screen
   * can explain today's number, and cleared the moment the exercise is
   * performed — by then the explanation belongs to the past.
   */
  pendingDecay?: Decay;
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
  /**
   * A weight cut applied for time rather than performance — a layoff or the
   * routine monthly back-off. Carries what happened so the screen can say so
   * in words rather than the number just being mysteriously smaller.
   */
  decay?: Decay;
  /** Set when this exercise was skipped last time it came up. */
  skippedLast?: boolean;
};

/**
 * Weight cuts that happen with time rather than performance.
 *
 * Two of them, and they are different things:
 *
 *   LAYOFF     you have not done this exercise for a while, so the weight
 *              you left it at is no longer the weight you can lift. The
 *              longer the gap, the bigger the cut — capped, because three
 *              months off does not put you back at zero.
 *
 *   BACK-OFF   a routine 10% trim every 30 days, whether or not you have
 *              been training. Nothing is wrong; it is there to stop the
 *              ladder climbing faster than the tissue behind it, and you
 *              earn the weight back in a couple of sessions.
 *
 * Both are applied when a workout is BUILT, not when it is finished, so the
 * number you see on the screen is already the adjusted one. Neither ever
 * touches an exercise you have never trained.
 */
export type DecayKind = "layoff" | "backoff";

export type Decay = {
  kind: DecayKind;
  /** Fraction taken off, e.g. 0.15 for 15%. */
  fraction: number;
  /** Whole days since the exercise was last trained. Only set for a layoff. */
  days?: number;
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * How much a layoff costs, by how long it has been.
 *
 * Ordered longest-first and read top-down, so the first match wins. The last
 * tier is the cap: three months off and a year off are treated the same,
 * because past a point you are rebuilding either way and a bigger number
 * would just be discouraging.
 *
 * The first tier has to clear the app's OWN cadence. Most exercises come
 * round once per five-workout cycle, so training three times a week already
 * means a 10–20 day gap on any given lift. Anything under three weeks would
 * fire on someone training perfectly, which is the opposite of the point.
 */
const LAYOFF: { days: number; fraction: number }[] = [
  { days: 90, fraction: 0.3 },
  { days: 45, fraction: 0.15 },
  { days: 21, fraction: 0.05 },
];

/** The routine trim: 10% once this many days have passed since the last one. */
const BACKOFF_DAYS = 30;
const BACKOFF_FRACTION = 0.1;

/**
 * A routine back-off never takes a lift below this share of its best.
 *
 * Without a floor the trims stack: a lifter progressing slowly gets cut
 * faster than they climb and is dragged to the bar in a year. Backing off to
 * 80% of your best is a real deload — it is not a reason to start again.
 *
 * A LAYOFF is exempt. Three months away genuinely does cost you more than
 * 20%, and pretending otherwise would hand you a weight you cannot lift.
 */
const BACKOFF_FLOOR = 0.8;

/** Whole days between two moments, floored. Negative clocks read as zero. */
export const daysBetween = (from: number, to: number): number =>
  Math.max(0, Math.floor((to - from) / DAY));

/**
 * Work out what cut, if any, an exercise has earned by now.
 *
 * Returns the LARGER of the two rather than both: a layoff and a scheduled
 * back-off landing in the same session should not compound into a 25% drop.
 * `null` means nothing is owed.
 *
 * A record with no `lastTrainedAt` — written before time was tracked, or
 * never trained — is left alone. Guessing an age would silently cut weights
 * that were set only yesterday.
 */
export const decayFor = (
  state: ExerciseState,
  scheme: Scheme,
  now: number,
): Decay | null => {
  if (typeof state.lastTrainedAt !== "number") return null;
  // A pure bodyweight lift with no assist machine has no number to move: a
  // press-up is a press-up. An ASSISTABLE one always has somewhere to go,
  // even from bodyweight — that is what the machine is for — so it is never
  // skipped, and an unloaded jump has nothing to cut either way.
  const ex = byId(state.exerciseId);
  if (!ex || ex.unloaded) return null;
  if (state.weight === 0 && !ex.assistable) return null;

  // Idle time runs from the last cut as well as the last session: a layoff
  // already paid for stays paid for, otherwise every reopen of the app would
  // charge it again.
  const lastReckoned = Math.max(
    state.lastTrainedAt,
    state.lastBackOffAt ?? state.lastTrainedAt,
  );
  const idle = daysBetween(lastReckoned, now);
  const layoff = LAYOFF.find((t) => idle >= t.days);

  // The back-off clock is deliberately NOT reset by training — it runs on
  // calendar time, so a lift trained twice a week is still checked every 30
  // days. It is seeded on the first session (see `applyResult`) and moved
  // whenever a check happens.
  //
  // The check only BITES if the weight has not gone up since last time. A
  // lift that is progressing has nothing to back off from.
  const stalled =
    typeof state.backOffScore !== "number" ||
    progressScore(state, scheme) <= state.backOffScore;
  // Already at or below the floor: the trim has done its job and repeating it
  // would only grind the lift down.
  const best = state.bestWeight ?? state.weight;
  const atFloor = state.weight <= best * BACKOFF_FLOOR;
  const dueBackOff =
    typeof state.lastBackOffAt === "number" &&
    daysBetween(state.lastBackOffAt, now) >= BACKOFF_DAYS &&
    stalled &&
    !atFloor;

  if (layoff && (!dueBackOff || layoff.fraction >= BACKOFF_FRACTION)) {
    return { kind: "layoff", fraction: layoff.fraction, days: idle };
  }
  if (dueBackOff) return { kind: "backoff", fraction: BACKOFF_FRACTION };
  return layoff ? { kind: "layoff", fraction: layoff.fraction, days: idle } : null;
};

/**
 * How far along a lift is, as one number that only ever goes up while you
 * are progressing.
 *
 * Weight alone is not enough: climbing the rep ladder from 5 to 6 to 8 reps
 * IS progress, and takes three sessions during which the weight does not
 * move at all. Judging a stall on weight alone would punish exactly the
 * lifter who is doing it right.
 *
 * Rungs are worth a fraction of an increment each, so finishing the ladder
 * and adding weight scores the same as the weight jump it earns.
 */
export const progressScore = (state: ExerciseState, scheme: Scheme): number => {
  const exercise = byId(state.exerciseId);
  const step = exercise?.increment || 2.5;
  const rungs = ladderFor(scheme).length;
  return state.weight + (state.rung / rungs) * step;
};

/**
 * A routine check fell due but the lift had moved up, so nothing is cut.
 * The window still re-arms against today's weight — otherwise the baseline
 * goes stale and the next check compares against a months-old number.
 */
export const rearmBackOff = (
  state: ExerciseState,
  scheme: Scheme,
  now: number,
): ExerciseState => ({
  ...state,
  lastBackOffAt: now,
  backOffScore: progressScore(state, scheme),
});

/**
 * The cut, in words. One sentence, said plainly — the weight on the screen
 * changed without being asked, so the app owes an explanation.
 */
export const decayLabel = (decay: Decay): string => {
  const pct = Math.round(decay.fraction * 100);
  if (decay.kind === "backoff") {
    return `Eased back ${pct}% after a month without progress. Build it up again.`;
  }
  const d = decay.days ?? 0;
  const gap =
    d >= 60 ? `${Math.round(d / 30)} months` : d >= 21 ? `${Math.round(d / 7)} weeks` : `${d} days`;
  return `Backed off ${pct}% after ${gap} away. Build it up again.`;
};

/** Whether a routine check is due, regardless of whether it would bite. */
export const backOffDue = (state: ExerciseState, now: number): boolean =>
  typeof state.lastBackOffAt === "number" &&
  daysBetween(state.lastBackOffAt, now) >= BACKOFF_DAYS;

/**
 * Apply a cut. The rep ladder restarts too — coming back at the bottom rung
 * of a lighter weight is the point, and it is what the failure deload does.
 */
export const applyDecay = (
  state: ExerciseState,
  scheme: Scheme,
  decay: Decay,
  now: number,
): ExerciseState => {
  const exercise = byId(state.exerciseId)!;
  const cut = cutWeight(
    state.weight,
    decay.fraction,
    exercise.increment,
    !!exercise.assistable,
  );
  // A routine trim stops at the floor. A layoff does not — time off is a real
  // loss, and handing back a weight you cannot lift helps nobody.
  // The routine trim stops at a share of your best — but only where that
  // means something. Across zero, "80% of -30" is nonsense, so an assistable
  // lift is floored by the layoff cap alone.
  const best = state.bestWeight ?? state.weight;
  const weight =
    decay.kind === "backoff" && best > 0 && !exercise.assistable
      ? Math.max(cut, roundTo(best * BACKOFF_FLOOR, exercise.increment))
      : cut;
  return {
    ...state,
    weight,
    rung: 0,
    downStreak: 0,
    // Stamps BOTH clocks: `decayFor` reads this as the last time anything was
    // reckoned, so a cut already taken is never charged again on the next
    // build, and a layoff also postpones the next routine check.
    lastBackOffAt: now,
    backOffScore: weight,
    // Remembered so the screen can explain the number until it is trained
    // again, at which point the explanation is stale and is cleared.
    pendingDecay: decay,
  };
};

/**
 * Make a lift easier by a fraction, snapped to the equipment's increment.
 *
 * The weight is ONE continuous axis, not two regimes either side of zero:
 *
 *     +40 kg added  ...  +2.5  bodyweight  -2.5  ...  -60 kg assist
 *     <------------------ harder    easier ------------------>
 *
 * Easing a lift always means stepping DOWN that axis. For a loaded lift that
 * is less weight on the bar; past bodyweight it becomes more help from the
 * machine. An assistable movement therefore flows from +5, through
 * bodyweight, into -2.5 of assistance without stalling at the boundary —
 * which is exactly where someone coming back from three months off needs it
 * to work.
 *
 * The amount taken off is a fraction of the effort, and the effort at
 * bodyweight is not zero: cutting a percentage of the *number* would stall
 * at 0 and creep meaninglessly slowly near it. So an assistable lift steps by
 * a fraction of its own bodyweight-ish scale instead, which keeps the cut
 * meaningful right across the crossing.
 */
const cutWeight = (
  weight: number,
  fraction: number,
  step: number,
  /** Assistable lifts cross zero; a loaded lift stops at one increment. */
  assistable: boolean,
): number => {
  if (step <= 0) return weight;

  if (assistable) {
    // The effort in an assisted lift is your bodyweight plus whatever is
    // added, or minus whatever the machine takes. Cutting a percentage of
    // THAT — rather than of the displayed number — keeps the step honest all
    // the way across zero: 15% off a near-bodyweight pull-up is a real but
    // sane amount of help, not a leap into heavy assistance.
    //
    // The nominal bodyweight is deliberately rough. It only sets the scale of
    // the step, and being wrong by 15kg changes a cut by a couple of
    // kilograms — far less than the error in guessing how much someone lost.
    const NOMINAL_BODYWEIGHT = 75;
    const effort = NOMINAL_BODYWEIGHT + weight;
    const drop = Math.max(step, Math.round((effort * fraction) / step) * step);
    // Snapped WITHOUT `roundTo`, which floors at one increment and so could
    // never return bodyweight or an assisted weight.
    const eased = Math.round((weight - drop) / step) * step;
    // Never so much help that the machine is doing essentially all of it.
    return Math.max(eased, -NOMINAL_BODYWEIGHT + step);
  }

  // A loaded lift floors at a single increment — there is no such thing as
  // negative weight on a bar.
  const floored = Math.floor((weight * (1 - fraction)) / step) * step;
  return Math.min(weight, Math.max(step, floored));
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
  reps: ladderFor(scheme)[Math.min(state.rung, ladderFor(scheme).length - 1)],
  sets,
  scheme,
  last: state.lastPerformed,
  deloaded: state.deloads > 0 && state.downStreak === 0 && state.rung === 0,
  skippedLast: state.skippedLast,
  decay: state.pendingDecay,
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
  /** When the session happened. Defaults to now; passed in so it is testable. */
  now: number = Date.now(),
): ExerciseState => {
  const exercise = byId(state.exerciseId)!;
  const ladder = ladderFor(scheme);
  const target = ladder[Math.min(state.rung, ladder.length - 1)];
  const performed = {
    weight: state.weight,
    reps: reps.map((r) => r ?? 0),
    target,
    feedback,
  };

  // Missed the target: repeat exactly. A short session is not a 👎 — it's
  // already told us the weight was too much.
  // Trained, whatever the outcome: the idle clock restarts and any cut we
  // were explaining is now history. The back-off clock is seeded here on the
  // first session only — after that it belongs to `applyDecay`, so training
  // regularly cannot postpone the routine trim indefinitely.
  const trained = {
    ...state,
    lastTrainedAt: now,
    lastBackOffAt: state.lastBackOffAt ?? now,
    backOffScore: state.backOffScore ?? progressScore(state, scheme),
    bestWeight: Math.max(state.bestWeight ?? state.weight, state.weight),
    pendingDecay: undefined,
  };

  if (!hitTarget(reps, target)) {
    return { ...trained, skippedLast: false, lastPerformed: performed };
  }

  if (feedback === "up") {
    const atTop = state.rung >= ladder.length - 1;
    return {
      ...trained,
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
      ...trained,
      downStreak,
      skippedLast: false,
      lastFeedback: "down",
      lastPerformed: performed,
    };
  }

  // Second 👎 in a row: deload 10% and restart the ladder.
  return {
    ...trained,
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
