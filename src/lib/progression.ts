/**
 * Progression engine.
 *
 * A set is logged by tapping its circle: the first tap fills it at the target
 * reps, each further tap counts down, and tapping past 1 empties it again.
 *
 * The reps decide everything; nothing is asked:
 *
 *   every set on target        climb the rep ladder       6 → 8 → 10 → 12
 *   on target, top of ladder   weight += increment, back to the bottom rung
 *     ...after two steps up    RELOAD instead: same weight, back two rungs
 *                              (10 reps), climbed again before the next step
 *   short of target            repeat the exact same prescription
 *   short twice in a row       same weight, one rung down (10 → 8 reps)
 *     ...on the bottom rung    the weight down a step, about 10%
 *
 * A set left empty is not a miss. Running out of time says nothing about the
 * weight, so an unfinished exercise repeats without counting against it.
 *
 * Reloads are the app's philosophy in one rule: own the weight before you add
 * to it. Progress, not the calendar, calls them — see `RELOAD_AFTER`.
 */

import { byId, highReps, type Exercise, type Pattern } from "@/data/exercises";
import { nextWeightUp } from "@/data/kit";
import {
  HIGH_REPS_RANGE,
  HIGH_REPS_SCHEME,
  ladderFor,
  REPS_RANGE,
  type RepBounds,
  type Scheme,
} from "@/data/split";

/** How a session felt. No longer asked — kept so older saved records still read. */
export type Feedback = "up" | "down";

/** What we remember about one exercise. One record per exercise, not per session. */
export type ExerciseState = {
  exerciseId: string;
  weight: number;
  /** Index into the scheme's rep ladder. */
  rung: number;
  /**
   * Consecutive sessions finished short of target. Reset on a hit and on
   * deload. (Named for the 👎 it used to count; older records may carry one.)
   */
  downStreak: number;
  /** Deloads since the last climb. Only used to explain the number on screen. */
  deloads: number;
  /** The last deload kept the weight and took the reps down a rung instead. */
  deloadHeld?: boolean;
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
   * When a layoff was last settled — a cut taken or turned down — so the same
   * gap is never charged twice. Separate from `lastTrainedAt`, since settling
   * is not training. (Named for the monthly back-off it also used to time.)
   */
  lastBackOffAt?: number;
  /**
   * Steps up in weight since the last reload. Absent on records from before
   * reloads, which reads as none, so no lift is sent back the day they ship.
   */
  climbs?: number;
  /**
   * Partway through a reload: climbing the top of the ladder again at a
   * weight already topped out. Finishing that climb earns the next step up.
   */
  reloading?: boolean;
  /**
   * Topped out with nowhere further to go: the top of the ladder done at the
   * heaviest weight on hand — one 10 kg kettlebell — or the longest hold.
   * Away from the gym, a lift in this state gives its slot to a harder one;
   * see `lib/fill.ts`.
   */
  maxed?: boolean;
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
  /** That deload kept the weight and took the reps down a rung instead. */
  deloadHeld?: boolean;
  /**
   * On a reload: "start" for its first session, back two rungs — the one
   * that needs explaining — and "climb" for the rest of the way up.
   */
  reload?: "start" | "climb";
  /**
   * A weight cut applied for time rather than performance — a layoff.
   * Carries what happened so the screen can say so in words rather than the
   * number just being mysteriously smaller.
   */
  decay?: Decay;
  /** Set when this exercise was skipped last time it came up. */
  skippedLast?: boolean;
};

/**
 * A weight cut that happens with time rather than performance: a LAYOFF.
 *
 * You have not done this exercise for a while, so the weight you left it at
 * is no longer the weight you can lift. The longer the gap, the bigger the
 * cut — capped, because three months off does not put you back at zero.
 *
 * It is the one rule here that looks at the calendar, and it is about time
 * away, not pace. How fast a lift climbs is held back by reloads, which count
 * progress instead — see `applyResult`. A routine monthly trim used to live
 * here too; reloads replaced it, and `backoff` survives only on records saved
 * before.
 *
 * Offered on Today and applied only if you say yes, so the number you see on
 * the lift screen is already the adjusted one. It never touches an exercise
 * you have never trained.
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

/** Whole days between two moments, floored. Negative clocks read as zero. */
export const daysBetween = (from: number, to: number): number =>
  Math.max(0, Math.floor((to - from) / DAY));

/**
 * Work out whether an exercise has been away long enough to ease back.
 * `null` means nothing is owed.
 *
 * A record with no `lastTrainedAt` — written before time was tracked, or
 * never trained — is left alone. Guessing an age would silently cut weights
 * that were set only yesterday.
 */
export const decayFor = (state: ExerciseState, now: number): Decay | null => {
  if (typeof state.lastTrainedAt !== "number") return null;
  // A pure bodyweight lift with no assist machine has no number to move: a
  // press-up is a press-up. An ASSISTABLE one always has somewhere to go,
  // even from bodyweight — that is what the machine is for — so it is never
  // skipped, and an unloaded jump has nothing to cut either way.
  const ex = byId(state.exerciseId);
  if (!ex || ex.unloaded) return null;
  if (state.weight === 0 && !ex.assistable) return null;

  // Idle time runs from the last settled layoff as well as the last session:
  // a gap already paid for, or turned down, stays settled. Otherwise every
  // reopen of the app would charge it again.
  const lastReckoned = Math.max(
    state.lastTrainedAt,
    state.lastBackOffAt ?? state.lastTrainedAt,
  );
  const idle = daysBetween(lastReckoned, now);
  const layoff = LAYOFF.find((t) => idle >= t.days);
  return layoff ? { kind: "layoff", fraction: layoff.fraction, days: idle } : null;
};

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

/**
 * Apply a cut. The rep ladder restarts too — coming back at the bottom rung
 * of a lighter weight is the point, and it is what the failure deload does.
 */
export const applyDecay = (state: ExerciseState, decay: Decay, now: number): ExerciseState => {
  const exercise = byId(state.exerciseId)!;
  return {
    ...state,
    weight: cutWeight(state.weight, decay.fraction, exercise.increment, !!exercise.assistable),
    rung: 0,
    downStreak: 0,
    // A step back of its own, so the count toward the next reload starts
    // again, and a reload under way is over.
    climbs: 0,
    reloading: false,
    // Settles the gap: `decayFor` reads this as the last time it was
    // reckoned, so a cut already taken is never charged again.
    lastBackOffAt: now,
    // Remembered so the screen can explain the number until it is trained
    // again, at which point the explanation is stale and is cleared.
    pendingDecay: decay,
  };
};

/**
 * A layoff turned down: the weight stays, and the gap counts as settled, so
 * the question is not asked again until there is a new one. The training
 * clock is left alone — declining is not a workout.
 */
export const settleLayoff = (state: ExerciseState, now: number): ExerciseState => ({
  ...state,
  lastBackOffAt: now,
});

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

  // The nearest weight there is to the cut, and at least a step down — 60 kg
  // less 10% is 54, so 55. A loaded lift floors at a single increment: there
  // is no such thing as negative weight on a bar.
  const nearest = Math.min(weight - step, Math.round((weight * (1 - fraction)) / step) * step);
  return Math.min(weight, Math.max(step, nearest));
};

const roundTo = (value: number, step: number) =>
  step <= 0 ? value : Math.max(step, Math.round(value / step) * step);

/**
 * Reasonable opening weight when there's no history and you have not set one
 * — see `startWeight`. You'll correct it once.
 */
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
  // guess is halved — 40kg of bench is a pair of 20s. A holds lift starts
  // with no hold unless told otherwise, and never past the longest.
  weight: ex.holds
    ? Math.min(HOLD_MAX, Math.max(0, Math.round(ex.startWeight ?? 0)))
    : (ex.startWeight ??
      (ex.bodyweight
        ? 0
        : roundTo(
            (STARTING_WEIGHT[ex.patterns[0]] ?? 20) / (ex.perHand ? 2 : 1),
            ex.increment,
          ))),
  rung: 0,
  downStreak: 0,
  deloads: 0,
});

/**
 * The longest hold a holds lift climbs to, in seconds. Twelve reps with five
 * seconds at the hardest point of each is as owned as a movement gets; past
 * it the lift stays at the top rather than asking for more.
 */
export const HOLD_MAX = 5;

/**
 * Seconds per rep on a timed hold. A plank on the 6–12 ladder holds for 30 →
 * 40 → 50 → 60 seconds, not six to twelve.
 */
export const TIMED_SECONDS = 5;

/** The fewest and most reps an exercise's range can be set to. */
export const repBounds = (exercise: Exercise | undefined): RepBounds =>
  exercise && highReps(exercise) ? HIGH_REPS_RANGE : REPS_RANGE;

/**
 * The range an exercise actually climbs in a slot. The slot's own, unless
 * that reaches outside what the exercise allows: a pushdown in a 6–12 slot
 * climbs 10–14. The slot keeps its range — and the lift its record under it —
 * so swapping dips back in gives dips their 6 again.
 */
export const schemeOf = (exercise: Exercise | undefined, scheme: Scheme): Scheme => {
  if (!exercise || !highReps(exercise)) return scheme;
  const ladder = ladderFor(scheme);
  const fits = ladder[0] >= HIGH_REPS_RANGE.min && ladder[ladder.length - 1] <= HIGH_REPS_RANGE.max;
  return fits ? scheme : HIGH_REPS_SCHEME;
};

/** The ladder an exercise actually climbs: the scheme's, in seconds for a timed hold. */
export const ladderOf = (exercise: Exercise | undefined, scheme: Scheme): number[] => {
  const ladder = ladderFor(schemeOf(exercise, scheme));
  return exercise?.timed ? ladder.map((reps) => reps * TIMED_SECONDS) : ladder;
};

/**
 * Whether topping out can take the lift any further: a weight to add, or a
 * second more to hold. A plank has neither, and a holds lift at `HOLD_MAX`
 * has gone as far as it goes.
 */
export const canStepUp = (exercise: Exercise, weight: number): boolean =>
  exercise.increment > 0 && !(exercise.holds && weight + exercise.increment > HOLD_MAX);

/** Turn stored state into the numbers on the screen. */
export const prescribe = (
  state: ExerciseState,
  scheme: Scheme,
  sets: number,
): Prescription => {
  const exercise = byId(state.exerciseId)!;
  const ladder = ladderOf(exercise, scheme);
  return {
    exercise,
    weight: state.weight,
    reps: ladder[Math.min(state.rung, ladder.length - 1)],
    sets,
    scheme,
    last: state.lastPerformed,
    deloaded: state.deloads > 0 && state.downStreak === 0,
    deloadHeld: !!state.deloadHeld,
    reload: state.reloading
      ? state.rung === reloadRung(ladder)
        ? "start"
        : "climb"
      : undefined,
    skippedLast: state.skippedLast,
    decay: state.pendingDecay,
  };
};

/**
 * Steps up in weight before a lift reloads.
 *
 * Counted in steps, not kilograms or a percentage: a step is whatever the
 * equipment moves by, so two of them mean the same thing on a dumbbell bench
 * (5 kg), a machine stack (10 kg) and a kettlebell (8 kg). On 20 kg
 * dumbbells that is 20 → 22.5 → 25, then a reload at 25.
 *
 * The reload adds two sessions to every two steps — see `reloadRung` — so a
 * 20 kg dumbbell bench takes 10 sessions to gain 5 kg instead of 8. Waiting
 * for three or four steps would barely be quicker, 9 sessions at most, since
 * the ladder is what takes the time. But it would leave a light lift 40–50%
 * heavier before it ever stops to consolidate.
 */
export const RELOAD_AFTER = 2;

/**
 * Where a reload starts: two rungs below the top, so 10 reps on 6–12 and on
 * 8–12, then 12 again. Not the bottom. Six reps at a weight just done for
 * twelve is a wasted session, and a whole second climb would keep one weight
 * for eight. Ten is a lighter day that is still work, and twelve again proves
 * it. On a ladder of two rungs or fewer, that is the whole ladder.
 */
export const reloadRung = (ladder: readonly number[]): number => Math.max(0, ladder.length - 2);

/** Every set logged at or above target. Only then does the lift move up. */
export const hitTarget = (reps: (number | null)[], target: number): boolean =>
  reps.length > 0 && reps.every((r) => r !== null && r >= target);

/**
 * Apply a session's outcome. Returns the state to use next time.
 *
 * The reps alone decide it — see the table at the top of this file.
 *
 * Pure: same inputs, same output — which makes it testable.
 */
export const applyResult = (
  state: ExerciseState,
  scheme: Scheme,
  reps: (number | null)[],
  /** When the session happened. Defaults to now; passed in so it is testable. */
  now: number = Date.now(),
  /**
   * The weights on hand, when only some are — see `Kit.weights`. A step up
   * then goes to the next weight there is, however far, and with none
   * heavier the lift stays at the top. Absent means any weight.
   */
  weights: number[] | null = null,
): ExerciseState => {
  const exercise = byId(state.exerciseId)!;
  const ladder = ladderOf(exercise, scheme);
  const target = ladder[Math.min(state.rung, ladder.length - 1)];
  const performed = {
    weight: state.weight,
    reps: reps.map((r) => r ?? 0),
    target,
  };

  // Trained, whatever the outcome: the idle clock restarts and any cut we
  // were explaining is now history.
  const trained = { ...state, lastTrainedAt: now, pendingDecay: undefined };

  // Left unfinished: repeat exactly, and count nothing against the weight.
  if (reps.some((r) => r === null)) {
    return { ...trained, skippedLast: false, lastPerformed: performed };
  }

  if (hitTarget(reps, target)) {
    const hit = {
      ...trained,
      maxed: undefined,
      downStreak: 0,
      deloads: 0,
      skippedLast: false,
      lastPerformed: performed,
    };
    // Partway up the ladder: one rung, same weight.
    if (state.rung < ladder.length - 1) return { ...hit, rung: state.rung + 1 };

    // The top, with nowhere further to go — a plank at a minute, a hold at
    // its longest: it stays at the top. Starting the ladder again would only
    // make the same lift easier for no reason. Jumps are the exception: they
    // have no top to stay at, and simply go round again.
    const next = nextWeightUp(weights, state.weight, exercise.increment);
    if (!exercise.unloaded && (!canStepUp(exercise, state.weight) || next === null)) {
      return { ...hit, reloading: false, maxed: true };
    }

    // The top, after two steps up since the last reload: the weight stays and
    // the top of the ladder is climbed again, so the new weight is owned
    // before the next.
    // A reload just climbed is never followed by another — its own top is
    // what earns the step. Nothing to reload where there is no step to hold.
    const climbs = state.climbs ?? 0;
    if (
      !state.reloading &&
      climbs >= RELOAD_AFTER &&
      canStepUp(exercise, state.weight) &&
      next !== null
    ) {
      return { ...hit, rung: reloadRung(ladder), climbs: 0, reloading: true };
    }
    // The top: add weight and drop back to the bottom rung.
    return {
      ...hit,
      weight: next ?? state.weight + exercise.increment,
      rung: 0,
      climbs: climbs + 1,
      reloading: false,
    };
  }

  const downStreak = state.downStreak + 1;

  // Short of target once: hold everything and repeat it exactly.
  if (downStreak < 2) {
    return {
      ...trained,
      downStreak,
      skippedLast: false,
      lastPerformed: performed,
    };
  }

  // Short twice in a row: a step back, so the count toward the next reload
  // starts again. The reps come down first — one rung, same weight: own the
  // weight you have rather than lose it. Only on the bottom rung, with no
  // reps left to drop, does the weight come down: about 10%, to the nearest
  // weight there is. Eased along the same axis as a layoff, so an assisted
  // pull-up gets more help rather than being rounded up to added weight.
  const held = state.rung > 0;
  const cut = held ? state.weight : cutWeight(state.weight, 0.1, exercise.increment, !!exercise.assistable);
  return {
    ...trained,
    weight: cut,
    deloadHeld: held,
    maxed: undefined,
    rung: held ? state.rung - 1 : 0,
    downStreak: 0,
    deloads: state.deloads + 1,
    climbs: 0,
    reloading: false,
    skippedLast: false,
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
