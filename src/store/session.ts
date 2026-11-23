/**
 * Session state.
 *
 * Everything lives in one object so it can be dropped into AsyncStorage
 * later without restructuring. Right now it's in-memory + a React context.
 */

import { createContext, useContext } from "react";

import {
  EXERCISES,
  PATTERN_LABEL,
  byId,
  isPattern,
  leanHiddenExercises,
  setCustomExercises,
  setExerciseEdits,
  withEdits,
  groupOf,
  type Exercise,
  type ExerciseEdit,
  type Group,
  type Pattern,
} from "@/data/exercises";
import {
  CARDIO_DEFAULT,
  AWAY_CARDIO,
  awayVersion,
  CARDIO_MINUTES,
  DEFAULT_MOBILITY,
  HOLD_RANGE,
  HOLD_STEP,
  MOBILITY,
  REPS_RANGE_MOVE,
  WARMUP,
  type WarmupDay,
  cardioById,
  cardioPool,
  courseLabel,
  holdOf,
  hiddenCardio,
  hiddenMobility,
  leanHiddenConditioning,
  lengthOf,
  mobilityById,
  mobilityPool,
  routineUse,
  type RoutineUse,
  routineSeconds,
  secondsFor,
  setCustomConditioning,
  setMobilityEdits,
  stretchById,
  type CardioBlock,
  type CardioEnd,
  type CardioExercise,
  type CardioLength,
  type MobilityEdit,
  type MobilityMove,
  type MobilityRoutine,
} from "@/data/conditioning";
import {
  DEFAULT_WORKOUTS,
  SHORT_WORKOUTS,
  defaultScheme,
  newId,
  setsFor,
  type Block,
  type Entry,
  type EntryPart,
  type Extra,
  type Scheme,
  type Workout,
} from "@/data/split";
import { warmupFor, weightLabel, type WarmupSet } from "@/lib/warmup";
import { feelWeight, firstWeight, type Feel, type Lifter } from "@/lib/start-weight";
import { BODYWEIGHT, GYM, fits, nearestWeight, needsOf, TWIN, TWO_BELLS, weightsFor, type Gear, type Kit } from "@/data/kit";
import { closestFirst } from "@/lib/similar";
import { FALL_BACK, fitOf, pick, STAND_IN, type Candidate } from "@/lib/fill";
import { avoidFor, EXTRAS, SHAPES, type Easy, type Shape, type Time } from "@/data/templates";
import { OLD_PPLPPL_DAYS, PLAN_NAME, PLANS, type PlanId } from "@/data/plans";
import type { Outcome, Say } from "@/data/voice";
import { familyOf, type Family } from "@/data/families";
import { chainFor, type Chain } from "@/data/chains";
import {
  GROWTH_EVERY_DAYS,
  GROWTH_SESSIONS,
  GROWTH_SLOTS,
  LIFT_CAP,
  LONGER_STRETCH,
  START_SLOTS,
  TRACK_STEPS,
  TRACKS,
  type Track,
} from "@/data/growth";
import { KIND_LIFTS, KIND_NAME, KIND_SUBTITLE, LONG_WORKOUT, familyOfLifts, kindOf, type WorkoutKind } from "@/data/kinds";
import {
  applyGoal,
  currentStep,
  type Goal,
  GOAL_HOLD_STEP,
  GOAL_SETS,
  type GoalOutcome,
  GOALS_ON,
  type GoalStep,
  isStarted,
  type Measure,
  STARTING_GOALS,
  TARGET_LIMITS,
} from "@/data/goals";
import {
  applyDecay,
  applyResult,
  daysBetween,
  decayFor,
  freshState,
  HOLD_MAX,
  hitTarget,
  ladderOf,
  markSkipped,
  ownRange,
  prescribe,
  targetOf,
  TIMED_SECONDS,
  type Decay,
  type ExerciseState,
  type Prescription,
} from "@/lib/progression";

/**
 * What kind of block an item is.
 *
 * Lifting is the default and everything about the progression engine assumes
 * it. Cardio, mobility and a goal's step are their own things — no weight, no
 * rep ladder — so they are marked rather than squeezed into the same shape.
 */
export type Kind = "lift" | "cardio" | "mobility" | "goal";

/** The two cardio blocks, by where they sit in the session. */
export const CARDIO_SLOTS: Record<CardioEnd, string> = { open: "Cardio · open", close: "Cardio · finish" };
export const MOBILITY_SLOT = "Mobility";
/** The routine that opens a session, after the cardio: the shoulder warm-up on a day that presses. */
export const WARMUP_SLOT = "Warm-up";

export type Item = Entry & {
  /** Lift unless marked otherwise — see `Kind`. */
  kind?: Kind;
  /**
   * Minutes on the clock, for a cardio block. Fixed at five so the distance
   * is comparable session to session: the only variable is how far you get.
   * Absent on a block run over a set distance — see `course`.
   */
  minutes?: number;
  /**
   * Distance covered, in the machine's own unit. `null` until entered — and
   * it stays null if you skip, which is how a skipped block is told apart
   * from a genuinely bad one.
   */
  distance?: number | null;
  /**
   * The set distance, for a block that times a run rather than measuring
   * one. When present, `seconds` is the score and `distance` is unused.
   */
  course?: number;
  /** Time taken over `course`, in seconds. `null` until entered, as `distance`. */
  seconds?: number | null;
  /**
   * For cardio on the clock alone (see `onTheClock`): the countdown, while it
   * is going — seconds `left` when paused, or when it ends while it runs.
   */
  clock?: { left: number; endAt: number | null };
  /** Cardio on the clock alone, once it ran out: the seconds done. Its "done". */
  ran?: number;
  /** Which poses of a mobility routine you have ticked off. */
  moves?: boolean[];
  /** Per-side routine progress. Skipped steps never count as performed. */
  routineSteps?: ("done" | "skipped" | null)[];
  /**
   * A routine you finished: done, whether or not every move was held to the
   * end. Leaving one out is part of stretching — see `finishRoutine`.
   */
  finished?: boolean;
  /**
   * How a lift's first time felt, answered under the circles once every set
   * is in. Moves next time's weight; see `feelWeight`.
   */
  feel?: Feel;
  /**
   * A goal block's step, by id: the one you were on when the workout was
   * built. `exerciseId` holds the goal's id; `logged` holds reps, seconds
   * held, or — for practice — the seconds practised, in one entry.
   */
  step?: string;
  /**
   * The chain this lift is a step of — "pullup" — when the workout named the
   * chain rather than one of its steps. `exerciseId` holds the step.
   */
  chain?: string;
  /** The chain's first time: the card asks where you are before anything else. */
  placing?: boolean;
  /** Practice only: you said you've got it, so the goal moves on. */
  got?: boolean;
  /** The exercise currently filling this slot. */
  exerciseId: string;
  /** Exercise id supersetted into this one, if any. */
  supersetWith?: string;
  /**
   * The folded-in partner's own item, so it keeps its exercise, scheme and
   * set count rather than inheriting this one's.
   */
  supersetEntry?: Item;
  /** The partner's own set log, tracked and progressed just like the main one. */
  supersetLogged?: (number | null)[];
  /** Skipped this session. Only written to history when the workout ends. */
  skipped?: boolean;
  /**
   * Put off once this session — the bench was taken — and come back after the
   * other lifts. It is not put off twice: skipped again, it is left out.
   */
  later?: boolean;
  /**
   * Show a warm-up ramp before this exercise — set on the first exercise of
   * each muscle group when the workout is built. Cleared once you move past
   * the warm-up screen, so Back doesn't make you sit through it again.
   */
  warmup?: boolean;
  /**
   * Weight for this session. Seeded from history when the workout is built,
   * then changed freely with +/- without touching the stored record.
   */
  weight: number;
  /** Same, for a folded-in partner. */
  supersetWeight?: number;
  /**
   * Reps logged per set. `null` means the circle is still empty.
   * Length is fixed at the set count when the workout is built.
   */
  logged: (number | null)[];
};

/**
 * The best and the last for one cardio machine, at one block length or one
 * set distance.
 *
 * Two numbers rather than a log: on the screen you want "beat 1.02" and, when
 * you do, to see that it was your furthest. A full history of every five
 * minutes you have ever run is not something anyone reads.
 */
export type CardioRecord = {
  cardioId: string;
  /** Minutes the record was set over. Kept so a changed block length is not compared against the old one. */
  minutes?: number;
  /** The set distance it was timed over, for a timed block. Then `last` and `best` are seconds. */
  course?: number;
  /** Last session's score: distance in the machine's unit, or seconds over a course. */
  last: number;
  /** Furthest ever over the same minutes — or fastest over the same course. */
  best: number;
  /** Sessions actually completed on this machine. */
  sessions: number;
};

/**
 * One exercise as it went, in a finished session's log — see `SessionLog`.
 *
 * A lift keeps what was on the bar, the reps in each circle and the target
 * they were aiming at, so History can colour each set as hit or short
 * without re-running the progression. `outcome` is null for work that is
 * not progressed (speed work, jumps).
 */
export type LogEntry =
  | {
      kind: "lift";
      exerciseId: string;
      scheme: Scheme;
      weight: number;
      reps: (number | null)[];
      /** Reps each set was aiming at. Absent where there is no ladder. */
      target?: number;
      outcome: Outcome | "skipped" | null;
    }
  | {
      /**
       * A goal's step as it went. The names are kept as they were, like a
       * workout's, so renaming a step later does not rewrite the past.
       */
      kind: "goal";
      goalId: string;
      stepId: string;
      goal: string;
      step: string;
      measure: Measure;
      target: number;
      /** Reps, seconds held, or seconds practised. */
      reps: (number | null)[];
      outcome: GoalOutcome;
    }
  | {
      kind: "cardio";
      exerciseId: string;
      /** Distance in the minutes, or seconds over `course`. */
      score: number;
      course?: number;
      minutes?: number;
      /** A new best — or the first go, which is one by definition. */
      best: boolean;
      /** On the clock alone: `score` is the seconds it ran, and never a best. */
      clock?: true;
    };

/** A finished workout, as it happened. Written once, by `finishWorkout`. */
export type SessionLog = {
  workoutId: string;
  /** The workout's name at the time, so a later rename doesn't rewrite the past. */
  name: string;
  startedAt: number;
  finishedAt: number;
  entries: LogEntry[];
  /** Trained in an easy week: lighter, and not counted for progress. */
  easy?: true;
};

/**
 * What a loop keeps while it isn't the one in use: its workouts in order,
 * what's next in it, what's waiting and what's paused — so switching back
 * carries on exactly where it left off.
 */
export type LoopBody = Pick<
  SessionState,
  "workouts" | "nextWorkout" | "workoutQueue" | "postponed" | "removedWorkouts" | "planOrder"
>;

/**
 * A plan's growth: when the last offer was answered (or the plan began), how
 * many steps each track has taken, and every slot growth has added — so one
 * you swapped is never added twice, and one you took out never comes back.
 */
export type Growth = {
  since: number;
  steps: Record<Track, number>;
  added: { workoutId: string; slot: string; at: number }[];
};

/**
 * A plan of workouts. Only the one in use has no `body`: its body is the
 * state's own. `kit` is what it is trained with — a home with a pair of
 * dumbbells, a hotel with nothing — and absent for a full gym.
 */
export type Loop = { id: string; name: string; body?: LoopBody; kit?: Kit };

export type SessionState = {
  /**
   * Your workouts, in cycle order: top to bottom, then round again. Any number
   * from one up — with one, it simply repeats.
   */
  workouts: Workout[];
  /**
   * Id of the workout that comes next. Advances only on finish, to whichever
   * workout follows it in the temporary queue or `workouts`, or when you pick one with Do next. An id
   * rather than a position, so reordering, adding or deleting other workouts
   * never changes what is next.
   */
  nextWorkout: string;
  /** One-time remaining order after postponing a workout. The Plan order stays intact. */
  workoutQueue?: string[];
  /**
   * Workouts put off with "Do it next time" and not yet done, in the order
   * they were due. Putting off another goes behind them, so asking for
   * something else today walks on through the cycle and never brings back
   * one you have just put off.
   */
  postponed?: string[];
  /**
   * Where you are on each chain — a pull-up, a push-up — by the chain's id:
   * the index of your step (see `data/chains.ts`). Absent until the first
   * time the chain comes up and you answer where you are.
   */
  steps?: Record<string, number>;
  /**
   * Paused workouts: out of the loop, kept as they were — edits and all —
   * with the place they sat, so resuming one puts it back where it was.
   * Any workout can be paused, built in or yours; only a paused one can be
   * deleted for good. (Saved under this name since before pausing covered
   * workouts you made, which used to be deleted outright.)
   */
  removedWorkouts: { workout: Workout; at: number }[];
  /** Display order in Plan, including paused workouts. */
  planOrder?: string[];
  /**
   * Your plans — loops, in the code: Push, pull, legs and the bigger one to
   * start with, and any you add in Settings. The plan in use is the one
   * without a `body` — its workouts, what's next and what's paused are the
   * fields above, so everything that runs the plan works on it as it always
   * has. The others keep theirs in `body`, waiting exactly as they were.
   * Absent only in a save from before plans. See `loopsOf` and `switchLoop`.
   */
  loops?: Loop[];
  /**
   * How far your plan has grown since it started small — see
   * `data/growth.ts`. Absent for a plan that didn't start small (one from
   * before growth), which is never offered more.
   */
  growth?: Growth;
  /**
   * Easy weeks: `from`, when the last one began; `askAfter`, when to ask
   * again after a "Not now". See `easyWeekOffer`.
   */
  recovery?: { from?: number; askAfter?: number };
  /**
   * Your chosen exercise per slot, keyed by `workoutId/entryId`. Absent means
   * the slot's first option. Set from the Plan screen or by swapping
   * mid-workout.
   */
  choices: Record<string, string>;
  /** Exercises you have added to the catalogue. */
  custom: Exercise[];
  /** Your renames, weight steps and starting weights, by exercise id — built-in or yours. */
  exerciseEdits: Record<string, ExerciseEdit>;
  /**
   * A note to yourself per exercise or machine — "speed 10.5, incline 1",
   * "seat on 4" — shown wherever it comes up until you change it. Keyed by
   * `noteKey`. Absent from saves made before notes existed, which simply
   * start with none.
   */
  notes: Record<string, string>;
  /** Shared cardio targets, used by all future workouts with that exercise. */
  cardioTargets?: Record<string, CardioLength>;
  /** One-time correction of treadmill targets saved during the time-based trial. */
  treadmillTargetRevision?: 1;
  /**
   * What you are learning, step by step — see `data/goals.ts`. Learned goals
   * stay, out of every workout, for Progress. Absent from saves made before
   * goals existed, which simply start with none.
   */
  goals: Goal[];
  /**
   * When the intro — why Klay, and how it works, a short film — was finished or skipped.
   * Absent until then. It opens by itself only on a phone that has trained
   * nothing yet (`wantsIntro`), so a save from before it existed never meets
   * it; Plan's ? opens it any time.
   */
  introSeen?: number;
  /**
   * The first-time tips already shown (see `components/tips.tsx`), by id. Each
   * tip shows once, the first time what it explains comes up, and never again.
   * Absent until the first one.
   */
  tipsSeen?: string[];
  /**
   * Where you trained, in saves before version 23: your usual place or
   * somewhere else, and what each had. Each plan has its own kit now (see
   * `Loop`); `intoLoops` gives them theirs. Never written.
   */
  place?: "usual" | "away";
  kits?: Partial<Record<"usual" | "away", Kit>>;
  /**
   * Exercises ruled out when the plan was made — the ones that load a part
   * you asked Klay to go easy on. Never used to fill a slot, anywhere.
   */
  avoid?: string[];
  /**
   * When the first-launch questions were answered and the plan made from
   * them. Absent on a phone that has never been asked — see `wantsOnboarding`.
   */
  onboarded?: number;
  /**
   * What the first questions learned about you, for starting weights only:
   * how much you have lifted, and your weight and sex if you chose to say.
   * Used for nothing else, and never leaves the phone. See lib/start-weight.
   */
  lifter?: Lifter;
  /**
   * Test mode only: every workout runs just its first two exercises, so a
   * whole session can be tried in minutes. Switched from Progress › Test
   * mode, and never shown for your real training.
   */
  shortWorkouts?: boolean;
  /** Cardio machines and mobility routines you have added. */
  customCardio: CardioExercise[];
  customMobility: MobilityRoutine[];
  /**
   * Your changes to built-in routines — their names and holds — by routine
   * id. A routine of your own is changed in place instead.
   */
  mobilityEdits: Record<string, MobilityEdit>;
  /**
   * Built-in exercises you have removed. Hidden rather than deleted, so
   * restoring one brings its training history back with it.
   */
  hidden: string[];
  /**
   * Built-in machines and routines you have removed. Hidden rather than
   * deleted, exactly like a built-in lift, so restoring a machine brings its
   * distance records back with it.
   */
  hiddenConditioning: string[];
  /**
   * One record per exercise PER SCHEME, keyed by `exerciseId:scheme`.
   *
   * An exercise done on a strength day and on a volume day is tracked
   * separately: the two sit on different rep ladders at different weights,
   * so sharing one record would make a volume session bump the strength number.
   */
  history: Record<string, ExerciseState>;
  /**
   * Cardio records, keyed by machine and length — not by slot. See `cardioKey`.
   *
   * The point of the block is to beat your own last go on *that* machine, so
   * a treadmill 1 km is the same benchmark whether it opened or closed the
   * session. Each distance keeps its own record: run 2 km on leg day and it
   * is a record of its own, while the 1 km times stay with the 1 km.
   * Mobility keeps no record: there is nothing to beat.
   */
  conditioning: Record<string, CardioRecord>;
  /**
   * Every finished workout, oldest first. `history` is where each lift
   * stands now; this is how it got there. A session is a few hundred bytes,
   * so years of them stay small. Saves from before the log existed simply
   * start with an empty one.
   */
  log: SessionLog[];
  /** The workout currently in progress, or null on the Today screen. */
  active: {
    workoutId: string;
    items: Item[];
    /** Index of the exercise on screen. */
    cursor: number;
    /**
     * When Start was pressed, as epoch milliseconds. Only used to decide
     * whether a saved session is still today's — see `storage.ts`.
     */
    startedAt: number;
    /** When a lift set was last logged; persists so rest includes time away. */
    lastSetAt?: number;
    /** A hold whose clock is running — see `startHold`. One at a time. */
    hold?: HoldClock;
    /** Started in an easy week: lighter, fewer sets, and nothing it does moves a lift's record. */
    easy?: boolean;
    /** Notes edited during this session only. */
    notes?: Record<string, string>;
  } | null;
};

const roundTo = (value: number, step: number) =>
  step <= 0 ? value : Math.round(value / step) * step;

/**
 * Weight can only go below zero on a movement that can be *assisted* — a
 * pull-up or dip machine that takes weight off you. There, −30 means
 * bodyweight minus 30, and progress is the number climbing back toward 0.
 * A holds lift counts whole seconds, from none up to `HOLD_MAX`.
 */
const clampWeight = (exercise: Exercise, weight: number): number =>
  exercise.holds
    ? Math.min(HOLD_MAX, Math.max(0, Math.round(weight)))
    : exercise.assistable
      ? weight
      : Math.max(0, weight);

/** Key into `history`. Exercise and scheme together, never exercise alone. */
export const key = (exerciseId: string, scheme: Scheme) => `${exerciseId}:${scheme}`;

/** Key into `choices`: which exercise fills a given slot of a given module. */
export const slotKey = (workoutId: string, entryId: string) => `${workoutId}/${entryId}`;

/**
 * The exercise catalogue: the built-in list plus anything you have added,
 * minus anything you have removed.
 */
export const catalogue = (state: SessionState): Exercise[] =>
  [
    ...EXERCISES.filter((e) => e.enabled !== false && !state.hidden.includes(e.id)),
    ...state.custom,
  ].map(withEdits);

/**
 * The library: built-in exercises not in your catalogue — never added, or
 * removed since. One tap from the + on a group brings one in.
 */
export const hiddenExercises = (state: SessionState): Exercise[] =>
  EXERCISES.filter((e) => e.enabled !== false && state.hidden.includes(e.id)).map(withEdits);

/**
 * Everything you could add: the catalogue and the library together, built
 * in and your own, minus the speed lifts that belong only to the slots that
 * name them. What Add exercise searches.
 */
export const everyExercise = (state: SessionState): Exercise[] =>
  [...EXERCISES.filter((e) => e.enabled !== false), ...state.custom]
    .filter((e) => !e.restricted)
    .map(withEdits);

/** Whether an exercise is one of yours, rather than built in. */
export const isCustom = (state: SessionState, id: string): boolean =>
  state.custom.some((e) => e.id === id);

/**
 * Whether an exercise can be removed.
 *
 * Anything can go — built-in or not — as long as no movement type is left
 * with nothing in it, since a slot of that type would then have nothing to
 * prescribe. So the last chest press stays, but the fourth one can go.
 */
export const canRemove = (state: SessionState, id: string): boolean => {
  const ex = lookup(state, id);
  if (!ex) return false;
  const list = catalogue(state);
  return ex.patterns.every(
    (p) => list.filter((e) => isPattern(e, p)).length > 1,
  );
};

/** Longest a note can be: a line or two under the name, not a diary. */
export const NOTE_MAX = 140;

/**
 * Where a note is kept: a lift by its id, a machine under `cardio/`, so a
 * lift and a machine you both named "Sled" keep notes of their own.
 */
const noteKey = (id: string, kind: "lift" | "cardio") =>
  kind === "cardio" ? `cardio/${id}` : id;

/** Your note on an exercise or machine, or "" if there is none. */
export const noteFor = (
  state: SessionState,
  id: string,
  kind: "lift" | "cardio" = "lift",
): string => state.notes[noteKey(id, kind)]?.trim() ?? "";

export const sessionNoteFor = (state: SessionState, id: string, kind: "lift" | "cardio" = "lift"): string =>
  (kind === "cardio" ? state.notes[noteKey(id, kind)] ?? state.active?.notes?.[noteKey(id, kind)] ?? "" : state.active?.notes?.[noteKey(id, kind)] ?? noteFor(state, id, kind)).trim();

export const setSessionNote = (state: SessionState, id: string, text: string, kind: "lift" | "cardio" = "lift"): SessionState =>
  kind === "cardio" ? setNote(state, id, text, kind) : state.active ? { ...state, active: { ...state.active, notes: { ...state.active.notes, [noteKey(id, kind)]: text.slice(0, NOTE_MAX) } } } : state;

/**
 * Write a note, as typed — it saves as you go, so spaces are kept until you
 * are done. Cleared to nothing, it is gone.
 */
export const setNote = (
  state: SessionState,
  id: string,
  text: string,
  kind: "lift" | "cardio" = "lift",
): SessionState => {
  const k = noteKey(id, kind);
  const { [k]: _old, ...rest } = state.notes;
  const note = text.slice(0, NOTE_MAX);
  let active = state.active;
  if (kind === "cardio" && active?.notes && k in active.notes) {
    const { [k]: _session, ...notes } = active.notes;
    active = { ...active, notes };
  }
  return { ...state, active, notes: note.trim() ? { ...rest, [k]: note } : rest };
};

/** Look up an exercise anywhere: built-in or one of yours. */
export const lookup = (state: SessionState, id: string): Exercise | undefined => {
  const mine = state.custom.find((e) => e.id === id);
  return mine ? withEdits(mine) : byId(id);
};

/**
 * Add an exercise of your own. Its movement types decide which slots offer
 * it. The id comes from the name, numbered if that one is taken.
 */
export const addExercise = (
  state: SessionState,
  exercise: Exercise,
): SessionState => {
  const taken = (id: string) =>
    EXERCISES.some((e) => e.id === id) || state.custom.some((e) => e.id === id);
  let id = exercise.id;
  for (let n = 2; taken(id); n++) id = `${exercise.id}_${n}`;
  const custom = [...state.custom, { ...exercise, id }];
  setCustomExercises(custom);
  return { ...state, custom };
};

/**
 * Rename an exercise or change its weight step. Built-in or yours, the edit
 * is stored on its own, so the id — and every record keyed by it — stays
 * the same. A blank name is ignored rather than leaving a nameless row.
 */
export const editExercise = (
  state: SessionState,
  id: string,
  patch: ExerciseEdit,
): SessionState => {
  const next: ExerciseEdit = { ...state.exerciseEdits[id] };
  if (patch.name !== undefined) {
    const name = patch.name.trim();
    if (name) next.name = name;
  }
  if (patch.increment !== undefined && Number.isFinite(patch.increment) && patch.increment > 0) {
    next.increment = patch.increment;
  }
  const exerciseEdits = { ...state.exerciseEdits, [id]: next };
  setExerciseEdits(exerciseEdits);
  return { ...state, exerciseEdits };
};

/**
 * Each lift you have trained, at its latest weight: what Klay learns your
 * strength from, for lifts you have not done yet.
 */
const trainedLifts = (state: SessionState): { exercise: Exercise; weight: number }[] => {
  const latest = new Map<string, ExerciseState>();
  for (const record of Object.values(state.history)) {
    if (!record.lastTrainedAt) continue;
    const seen = latest.get(record.exerciseId);
    if (!seen || record.lastTrainedAt > (seen.lastTrainedAt ?? 0)) latest.set(record.exerciseId, record);
  }
  return [...latest.values()].flatMap((record) => {
    const exercise = byId(record.exerciseId);
    return exercise ? [{ exercise, weight: record.weight }] : [];
  });
};

/**
 * Klay's first weight for a lift you have never done: from your own lifts
 * once there are some, else from the first questions. See lib/start-weight.
 */
export const startFor = (state: SessionState, ex: Exercise): ExerciseState =>
  freshState(ex, firstWeight(ex, trainedLifts(state), state.lifter));

/**
 * The weight an exercise opens at next time: where its most recently trained
 * record stands, else where it starts.
 */
export const nextWeight = (state: SessionState, id: string): number => {
  const latest = Object.values(state.history)
    .filter((r) => r.exerciseId === id)
    .sort((a, b) => (b.lastTrainedAt ?? 0) - (a.lastTrainedAt ?? 0))[0];
  const ex = lookup(state, id);
  return latest?.weight ?? (ex ? startFor(state, ex).weight : 0);
};

/**
 * Set the weight an exercise opens at. Before any history it is the starting
 * weight; after, every record of it moves too — you know better than the
 * ladder did. A workout in progress picks it up on anything not yet started,
 * so you can step out to Plan mid-session and come back to the new number.
 */
export const setExerciseWeight = (
  state: SessionState,
  id: string,
  weight: number,
): SessionState => {
  const ex = lookup(state, id);
  if (!ex || !Number.isFinite(weight)) return state;
  const w = clampWeight(ex, weight);
  const exerciseEdits = {
    ...state.exerciseEdits,
    [id]: { ...state.exerciseEdits[id], startWeight: w },
  };
  setExerciseEdits(exerciseEdits);
  const history = Object.fromEntries(
    Object.entries(state.history).map(([k, r]) => [
      k,
      // Your number now, so a cut or deload no longer explains it.
      r.exerciseId === id ? { ...r, weight: w, deloads: 0, pendingDecay: undefined, lighterThan: undefined } : r,
    ]),
  );
  const untouched = (log?: (number | null)[]) => !log || log.every((r) => r === null);
  const active = state.active && {
    ...state.active,
    items: state.active.items.map((it) => {
      if (!isLift(it) || it.derive) return it;
      let next = it;
      if (it.exerciseId === id && untouched(it.logged)) next = { ...next, weight: w };
      if (it.supersetEntry?.exerciseId === id && untouched(it.supersetLogged)) {
        next = { ...next, supersetWeight: w };
      }
      return next;
    }),
  };
  return { ...state, exerciseEdits, history, active };
};

/**
 * Remove an exercise from the catalogue. A built-in goes back to the library;
 * one of yours is deleted. Any slot using it falls back to that slot's first
 * option; its training history is kept, so adding it back later resumes where
 * it left off. Refused if it would empty a movement type.
 */
export const removeExercise = (state: SessionState, id: string): SessionState => {
  if (!canRemove(state, id)) return state;
  const choices = { ...state.choices };
  for (const [k, v] of Object.entries(choices)) if (v === id) delete choices[k];
  const custom = state.custom.filter((e) => e.id !== id);
  setCustomExercises(custom);
  return {
    ...state,
    choices,
    custom,
    // A built-in is hidden rather than deleted, so it can be restored.
    hidden: isCustom(state, id) ? state.hidden : [...state.hidden, id],
  };
};

/**
 * The exercises a slot can hold: everything in the catalogue sharing the
 * movement pattern of the slot's built-in options.
 *
 * There is no per-slot curation — the library is the catalogue of what exists,
 * and the swap button on a workout decides what that slot uses today.
 */
export const poolFor = (
  state: SessionState,
  _workoutId: string,
  entry: Entry,
): string[] => {
  // Everything of this slot's type, built-in options first in authored order.
  const ids = catalogue(state)
    .filter(
      (e) =>
        isPattern(e, entry.pattern) &&
        // Speed lifts belong to the power day's own slots, not to every slot
        // that happens to share their movement type.
        (!e.restricted || entry.options.includes(e.id)),
    )
    .map((e) => e.id);
  const preferred = entry.options.filter((id) => ids.includes(id));
  return [...preferred, ...ids.filter((id) => !preferred.includes(id))];
};

/**
 * Exercises another slot in this module has already taken.
 *
 * An exercise counting as two types can appear in two slots of one module —
 * a hip thrust is both a hinge and hamstring work. It stays listed in both,
 * but the one another slot is using is shown unavailable rather than hidden,
 * so it is clear *why* you cannot pick it.
 */
export const takenElsewhere = (
  state: SessionState,
  workoutId: string,
  entry: Entry,
): Set<string> =>
  new Set([...settleSlots(state, workoutId)].filter(([id]) => id !== entry.id).map(([, picked]) => picked));

/**
 * What fills each slot of a workout, settled together so no exercise is in
 * two. First every slot whose own pick is still there keeps it; then each
 * slot left, in order, takes the first of its options no slot has — or, with
 * all of those taken (two slots of one kind: a pull-up chain and a pulldown),
 * one from the library. Settling a slot on its own, against what the others
 * had picked rather than what they ended up with, let two slots that both
 * lost their exercise fall back to the same one (fixed 23 November 2026).
 */
const settleSlots = (state: SessionState, workoutId: string): Map<string, string> => {
  const settled = new Map<string, string>();
  const workout = workoutById(state, workoutId);
  if (!workout) return settled;
  const taken = new Set<string>();
  const pools = new Map(workout.exercises.map((e) => [e.id, poolFor(state, workoutId, e)]));
  for (const e of workout.exercises) {
    const picked = chosenRaw(state, workoutId, e);
    if (pools.get(e.id)!.includes(picked) && !taken.has(picked)) {
      settled.set(e.id, picked);
      taken.add(picked);
    }
  }
  for (const e of workout.exercises) {
    if (settled.has(e.id)) continue;
    const pool = pools.get(e.id)!;
    const spare = () =>
      hiddenExercises(state).find(
        (x) => !x.restricted && x.autoSelect !== false && isPattern(x, e.pattern) && !taken.has(x.id),
      )?.id;
    const pick = pool.find((id) => !taken.has(id)) ?? spare() ?? pool[0];
    settled.set(e.id, pick);
    taken.add(pick);
  }
  return settled;
};

/**
 * The raw choice for a slot without the duplicate filtering, used to work out
 * what other slots have taken. Falls back to the first built-in option.
 */
const chosenRaw = (state: SessionState, workoutId: string, entry: Entry): string =>
  state.choices[slotKey(workoutId, entry.id)] ?? entry.options[0];

/**
 * The exercise filling a slot: your choice, else the first option no other
 * slot has (see `settleSlots`).
 */
export const chosen = (
  state: SessionState,
  workoutId: string,
  entry: Entry,
): string => {
  const settled = settleSlots(state, workoutId).get(entry.id);
  if (settled !== undefined) return settled;
  // A slot that isn't the workout's own: on its own, as it stands.
  const picked = chosenRaw(state, workoutId, entry);
  const pool = poolFor(state, workoutId, entry);
  return pool.includes(picked) ? picked : pool[0];
};

/**
 * Fill every slot of a workout with what this kit allows, top to bottom.
 *
 * `choices` are swaps you made for this kit — your own pick wins as long as
 * the kit has what it needs. `avoid` is what you have ruled out. A slot gets
 * null when nothing fits, and sits that workout out. Each exercise fills one
 * slot at most, so a glute bridge can't be both the hinge and the hamstrings.
 *
 * With a gym's kit and the usual choices this is exactly `chosen`, slot by
 * slot. See `lib/fill.ts` for how a lift too light or too heavy for the
 * weights on hand gives way.
 */
export const fillWorkout = (
  state: SessionState,
  workout: Workout,
  kit: Kit,
  choices: Record<string, string> = state.choices,
  avoid: readonly string[] = state.avoid ?? [],
): Record<string, string | null> => {
  const taken = new Set<string>();
  const usable = (id: string) => !avoid.includes(id) && !taken.has(id) && fits({ id }, kit);
  const candidate = (entry: Entry) => (id: string): Candidate => {
    const ex = byId(id)!;
    const due = dueRecord(state, id, entry.scheme);
    const known = Object.values(state.history).some((record) => record.exerciseId === id || record.exerciseId === TWIN[id]);
    return { ex, due: due.weight, maxed: due.maxed, lighterThan: due.lighterThan, known };
  };
  // Your catalogue first, then the library: a gym catalogue has no push-ups
  // in it, and a hotel room needs them.
  const library = hiddenExercises(state).filter((e) => !e.restricted && e.autoSelect !== false);
  const filled: Record<string, string | null> = {};
  for (const entry of workout.exercises) {
    // What the slot holds at a full gym: everything else is ranked by how
    // close it is to that (see `lib/similar.ts`), so a BB bench press gives
    // way to a DB bench press before a floor press. The slot's own options
    // come in even from the library: a plan made at first launch names
    // exercises nobody has added yet.
    const planned = byId(chosen(state, workout.id, entry));
    const closest = (ids: string[]) => closestFirst(planned, ids.map((id) => byId(id)!)).map((e) => e.id);
    const pool = closest([
      ...new Set([
        ...entry.options.filter((id) => byId(id) && !avoid.includes(id)),
        ...poolFor(state, workout.id, entry),
        ...library.filter((e) => isPattern(e, entry.pattern)).map((e) => e.id),
      ]),
    ]);
    const mine = choices[slotKey(workout.id, entry.id)];
    const standIn = STAND_IN[entry.pattern];
    const standIns = standIn
      ? closest([...catalogue(state).filter((e) => !e.restricted), ...library]
          .filter((e) => isPattern(e, standIn))
          .map((e) => e.id))
      : [];
    const ofKind = (pattern: Pattern) =>
      closest([...catalogue(state).filter((e) => !e.restricted), ...library]
        .filter((e) => isPattern(e, pattern) && usable(e.id))
        .map((e) => e.id))
        .map(candidate(entry));
    const id =
      mine && pool.includes(mine) && usable(mine) && fitOf(candidate(entry)(mine), kit) !== "heavy"
        ? mine
        : (pick(
            pool.filter(usable).map(candidate(entry)),
            standIns.filter(usable).map(candidate(entry)),
            kit,
          ) ??
          (FALL_BACK[entry.pattern] ?? []).reduce<string | null>(
            (found, pattern) => found ?? pick(ofKind(pattern), [], kit),
            null,
          ));
    filled[entry.id] = id;
    if (id) taken.add(id);
  }
  return filled;
};

/** What a plan is trained with: its own kit, or a full gym. */
export const kitOfLoop = (state: SessionState, id: string): Kit | undefined =>
  state.loops?.find((l) => l.id === id)?.kit;

/** What the plan in use is trained with. */
export const kitAt = (state: SessionState): Kit => kitOfLoop(state, loopInUse(state)) ?? GYM;

/** One exercise that changes when a plan's equipment does: null is left out. `why` in a few words. */
export type EquipmentChange = { workout: string; from: string; to: string | null; why: string };

/** What a missing thing is called, in "no bench", "needs a barbell". */
const MISSING: Partial<Record<Gear, string>> = {
  bench: "no bench",
  barbell: "needs a barbell",
  dumbbells: "needs dumbbells",
  kettlebell: "needs a kettlebell",
  pullup_bar: "needs a pull-up bar",
  machine: "needs a gym machine",
  cable: "needs a cable machine",
  resistance_band: "needs a resistance band",
  band_anchor: "needs somewhere to tie a band",
  stability_ball: "needs an exercise ball",
  medicine_ball: "needs a medicine ball",
  slam_ball: "needs a slam ball",
  rings: "needs gymnastic rings",
  suspension_trainer: "needs suspension straps",
  parallel_bars: "needs dip bars",
  ab_wheel: "needs an ab wheel",
  gym: "needs a station only a gym has",
};

/** Why an exercise gives way with this kit, in a few words. */
const whyNot = (state: SessionState, id: string, scheme: Scheme, kit: Kit): string => {
  const ex = byId(id);
  if (!ex) return "";
  if (!fits({ id }, kit)) {
    if (TWO_BELLS.has(id) && needsOf({ id }).every((g) => kit.gear.includes(g))) return "needs two kettlebells of one weight";
    const missing = needsOf({ id }).filter((g) => !kit.gear.includes(g));
    return missing.map((g) => MISSING[g]).find(Boolean) ?? "needs a station only a gym has";
  }
  const due = dueRecord(state, id, scheme);
  const weights = weightsFor(ex, kit);
  const known = Object.values(state.history).some((r) => r.exerciseId === id || r.exerciseId === TWIN[id]);
  const fit = fitOf({ ex, due: due.weight, maxed: due.maxed, lighterThan: due.lighterThan, known }, kit);
  if (fit === "heavy") return `${weightLabel(ex, nearestWeight(weights, due.weight))} is too heavy for now`;
  if (fit === "light") return "your weights are too light for it";
  if (fit === "outgrown") return "you have outgrown your heaviest weight";
  return "already in this workout";
};

/**
 * What changing a plan's equipment would do to its workouts, slot by slot,
 * before it is saved: "BB bench press → DB bench press", "Leg press, left
 * out". Only the slots that change. Paused workouts are not counted.
 */
export const equipmentChanges = (state: SessionState, planId: string, kit: Kit | undefined): EquipmentChange[] => {
  const view = viewLoop(state, planId);
  const before = kitOfLoop(state, planId);
  const runs = (w: Workout, k: Kit | undefined): Record<string, string | null> =>
    k ? fillWorkout(view, w, k) : Object.fromEntries(w.exercises.map((e) => [e.id, chosen(view, w.id, e)]));
  return planWorkouts(view).flatMap((w) => {
    const was = runs(w, before);
    const now = runs(w, kit);
    return w.exercises.flatMap((e) => {
      const from = was[e.id];
      const to = now[e.id];
      return from && from !== to
        ? [{ workout: w.name || "Untitled", from, to, why: kit ? whyNot(view, from, e.scheme, kit) : "back at the gym" }]
        : [];
    });
  });
};

/** At a full gym, where every slot simply holds what Plan says. */
export const atGym = (state: SessionState): boolean => !kitOfLoop(state, loopInUse(state));

/** Whether the cardio machines are here — a gym, or somewhere with machines. */
const hasMachines = (state: SessionState): boolean => kitAt(state).gear.includes("machine");

/**
 * Say what a plan is trained with — undefined for a full gym. Klay fills
 * each of its slots with what is there. The plan in use keeps its kit while
 * a workout is running.
 */
export const setLoopKit = (state: SessionState, id: string, kit: Kit | undefined): SessionState => {
  const loops = withLoops(state);
  if (!loops.some((l) => l.id === id) || (state.active && id === loopInUse(state))) return state;
  return {
    ...state,
    loops: loops.map((l) => {
      if (l.id !== id) return l;
      const { kit: _old, ...rest } = l;
      return kit ? { ...rest, kit } : rest;
    }),
  };
};

/**
 * The lifts a workout runs here, each with the exercise filling it. A slot
 * with nothing here to do it with is left out.
 */
export const liftsToRun = (
  state: SessionState,
  workout: Workout,
): { entry: Entry; exerciseId: string }[] => {
  const entries = exercisesToRun(state, workout);
  if (atGym(state)) {
    return entries.map((entry) => ({ entry, exerciseId: chosen(state, workout.id, entry) }));
  }
  const filled = fillWorkout(state, workout, kitAt(state));
  return entries.flatMap((entry) => {
    const exerciseId = filled[entry.id];
    return exerciseId ? [{ entry, exerciseId }] : [];
  });
};

/** The slots a workout leaves out here, for want of anything to do them with. */
export const sittingOut = (state: SessionState, workout: Workout): Entry[] => {
  const running = new Set(liftsToRun(state, workout).map((l) => l.entry.id));
  return exercisesToRun(state, workout).filter((e) => !running.has(e.id));
};

/**
 * The weight you are due on a lift: its own record, else the dumbbell lift
 * it matches weight for weight (see `TWIN`), else the opening guess.
 */
const dueRecord = (state: SessionState, exerciseId: string, scheme: Scheme) => {
  const own = state.history[key(exerciseId, scheme)];
  const ex = byId(exerciseId)!;
  const latest = Object.values(state.history).filter((record) => record.exerciseId === exerciseId)
    .reduce<ExerciseState | undefined>((best, record) => !best || (record.lastTrainedAt ?? 0) > (best.lastTrainedAt ?? 0) ? record : best, undefined);
  const twin = TWIN[exerciseId] && state.history[key(TWIN[exerciseId], scheme)];
  const start = own ?? startFor(state, ex);
  if (latest) {
    // Rep ladders belong to a rep range; the weight belongs to the exercise.
    // A different range must not revive a stale weight or a near-complete climb.
    return { ...start, weight: latest.weight,
      ...(latest.weight !== start.weight ? { rung: 0, downStreak: 0, reloading: false, maxed: latest.maxed, lighterThan: latest.lighterThan } : {}),
      lastPerformed: latest.lastPerformed ?? start.lastPerformed,
    };
  }
  return twin ? { ...start, weight: roundTo(twin.weight, ex.increment || 1) } : start;
};

/**
 * A weight served this much over the one you are due — the only dumbbell
 * here is heavier — starts at the bottom of the reps rather than wherever
 * the ladder had got to: 20 kg for a goblet squat due at 12.5 is 6 reps,
 * not 10. Only where the place has some weights and not others.
 */
export const HEAVIER_START = 1.15;

/** A record met at the weight actually served: see `HEAVIER_START`. */
const servedAt = (state: SessionState, st: ExerciseState, weight: number): ExerciseState => {
  const ex = byId(st.exerciseId);
  const sparse = ex && weightsFor(ex, kitAt(state));
  if (!sparse || st.weight <= 0 || weight <= st.weight * HEAVIER_START) return { ...st, weight };
  const { extra: _extra, ...rest } = st;
  return { ...rest, weight, rung: 0, reloading: false };
};

/** The weight to use here: the one you are due, or the nearest the place has. */
const weightHere = (state: SessionState, ex: Exercise, due: number): number =>
  nearestWeight(weightsFor(ex, kitAt(state)), due);

// ---- the workouts ----

export const workoutById = (state: SessionState, id: string): Workout | undefined =>
  state.workouts.find((w) => w.id === id);

/**
 * What a workout will ask of you if you start it now, in the order it runs:
 * the opening cardio, its goals, each lift with the sets, reps and weight it
 * would prescribe, the closing cardio, then mobility. For the Today screen,
 * before anything is built.
 */
export type PreviewRow = {
  id: string;
  name: string;
  /** "3 × 6", "1 km", "5 min", "about 4 min", "step 2 of 6". */
  amount: string;
  /** The weight, for a loaded lift. */
  weight?: string;
  /**
   * For a lift, what changed since you last did it: the weight went up or
   * came down, it reloads today — same weight, back two rungs — or you never
   * have done it ("new": its weight is still the app's opening guess unless
   * you set one).
   */
  change?: "up" | "down" | "reload" | "new";
  /** The weight is the opening guess for a lift you have never touched. */
  guess?: boolean;
  /** A plain explanation of this exercise's change since its last session. */
  adjustment?: string;
  /** Compact visible label; the full explanation remains available to screen readers. */
  adjustmentLabel?: string;
  /** Which shape and colour it gets. */
  family: Family;
};

/** Compare today's actual prescription with the last target, including rep-only changes. */
const previewAdjustment = (state: ExerciseState, prescription: Prescription): { label: string; detail: string } | undefined => {
  const note = (label: string, detail: string) => ({ label, detail });
  const last = state.lastPerformed;
  if (!last) return undefined;
  const ex = prescription.exercise;
  const before = weightLabel(ex, last.weight);
  if (state.weight !== last.weight) {
    if (ex.holds) {
      return note(state.weight > last.weight ? "Longer hold" : "Shorter hold", `${state.weight > last.weight ? "Longer" : "Shorter"} hold this time — previously ${before}.`);
    }
    if (ex.assistable && (state.weight < 0 || last.weight < 0)) {
      return note(state.weight < last.weight ? "More help" : "Less help", `${state.weight < last.weight ? "More" : "Less"} assistance this time — previously ${before}.`);
    }
    return note(state.weight > last.weight ? "Heavier" : "Lighter", `${state.weight > last.weight ? "Heavier" : "Lighter"} this time — ${state.weight > last.weight ? "up" : "down"} from ${before}.`);
  }
  const target = `${prescription.reps}${ex.timed ? " seconds" : " reps"}`;
  const durationName = ex.movements?.includes("carry") ? "set" : "hold";
  const load = ex.timed ? "" : ex.holds ? "Same hold, " : "Same weight, ";
  if (prescription.reload === "start") {
    return note("Practise", `${load}back to ${target} to practise control before ${ex.holds ? "lengthening the hold" : "adding weight"}.`);
  }
  if (prescription.reps < last.target) {
    return ex.timed
      ? note(`Shorter ${durationName}`, `Shorter ${durationName} this time: ${target}. Build back up.`)
      : note("Fewer reps", `${load}fewer reps this time: ${prescription.reps}. Build back up.`);
  }
  if (prescription.reps > last.target) {
    return ex.timed
      ? note(`Longer ${durationName}`, `Longer ${durationName} this time: ${target}.`)
      : note("More reps", `${load}up to ${target} this time.`);
  }
  return undefined;
};

/**
 * The exercises a workout runs: all of them, or the first two when workouts
 * are short — test mode's switch, or the `EXPO_PUBLIC_SHORT_WORKOUTS` build.
 */
export const exercisesToRun = (state: SessionState, workout: Workout): Entry[] =>
  SHORT_WORKOUTS || state.shortWorkouts ? workout.exercises.slice(0, 2) : workout.exercises;

export const workoutPreview = (state: SessionState, workout: Workout, now = Date.now()): PreviewRow[] => {
  const easy = !!easyWeek(state, now);
  const lifts = liftsToRun(state, workout).map(({ entry, exerciseId }): PreviewRow => {
    const ex = byId(exerciseId)!;
    const known = Object.values(state.history).some((record) => record.exerciseId === ex.id);
    const due = dueRecord(state, ex.id, entry.scheme);
    const here = weightHere(state, ex, due.weight);
    // What Start will give, an easy week's lighter load included.
    const load = easy ? easyLoad(state, ex, entry, here) : { weight: here, sets: setsFor(entry) };
    const st = servedAt(state, due, load.weight);
    const p = prescribe(st, entry.scheme, load.sets);
    // Speed work takes its weight from another lift on the day; jumps have none.
    const loaded = !entry.derive && !ex.unloaded;
    const last = st.lastPerformed;
    const change = !last
      ? "new"
      : !loaded || easy
        ? undefined
        : st.weight > last.weight
          ? "up"
          : st.weight < last.weight
            ? "down"
            : p.reload === "start"
              ? "reload"
              : undefined;
    const adjustment = loaded && !easy ? previewAdjustment(st, p) : undefined;
    return {
      id: entry.id,
      name: ex.name,
      amount: `${p.sets} × ${p.reps}${ex.timed ? " s" : ""}`,
      weight: loaded ? weightLabel(ex, st.weight) : undefined,
      change,
      guess: !known,
      adjustment: adjustment?.detail,
      adjustmentLabel: adjustment?.label,
      family: familyOf(ex),
    };
  });
  const block = (where: CardioWhere, id: string): PreviewRow[] => {
    const plan = cardioHere(state, workout, where);
    return plan ? [{ id, name: plan.machine.name, amount: cardioAmount(plan), family: "cardio" }] : [];
  };
  const routine = (r: MobilityRoutine | null, id: string): PreviewRow[] =>
    r ? [{ id, name: r.name, amount: `about ${routineMinutes(r)} min`, family: "mobility" }] : [];
  const goals = goalsIn(state, workout.id).map(
    (g): PreviewRow => ({
      id: `goal/${g.id}`,
      name: g.name,
      amount: `step ${Math.min(g.at, g.steps.length - 1) + 1} of ${g.steps.length}`,
      family: "goal",
    }),
  );
  // As the session runs them: see `buildWorkout`.
  const lift = new Map(lifts.map((l) => [l.id, l]));
  const rows = (part: Block): PreviewRow[] =>
    partContents(state, workout, part).flatMap((p): PreviewRow[] =>
      "entry" in p ? (lift.has(p.id) ? [lift.get(p.id)!] : [])
      : "cardio" in p ? block(p.cardio, p.id)
      : routine(p.routine === "warmup" ? warmupHere(state, workout) : routinePlan(state, workout, p.routine), p.id),
    );
  return [...rows("start"), ...goals, ...rows("main"), ...rows("finish")];
};

/**
 * The workout's own family, its shape and colour: from its kind, else from
 * what is in it — see `familyOfLifts`. Today shows it as the big shape over
 * the name. A workout with no lifts is its cardio or stretch.
 */
export const workoutFamily = (state: SessionState, workout: Workout): Family => {
  const rows = workoutPreview(state, workout);
  const lifts = rows.filter(
    (r) => r.family !== "cardio" && r.family !== "mobility" && r.family !== "goal",
  );
  return familyOfLifts(kindOf(workout), lifts.map((r) => r.family)) ?? rows[0]?.family ?? "push";
};

/** The family of the item on screen, for the lift screen's colour. */
export const itemFamily = (item: Item): Family =>
  item.kind === "cardio" || item.kind === "mobility" || item.kind === "goal"
    ? item.kind
    : familyOf(byId(item.exerciseId));

/**
 * The workout Start will run. Falls back to the first if the id has gone;
 * none only in a new plan that has no workouts yet.
 */
export const upNext = (state: SessionState): Workout | undefined =>
  workoutById(state, state.nextWorkout) ?? state.workouts[0];

/**
 * The id of the workout after this one, wrapping at the bottom. A workout
 * that no longer exists — deleted mid-session — hands over to whatever is
 * already queued as next, which the delete moved on for it.
 */
/** The workout that comes after this session's, once it is finished. */
export const nextAfterSession = (state: SessionState): Workout | undefined => {
  if (!state.active) return undefined;
  const id = following(state, state.active.workoutId);
  return state.workouts.find((w) => w.id === id);
};

const following = (state: SessionState, id: string): string => {
  const queue = state.workoutQueue?.filter((id) => workoutById(state, id));
  const queuedAt = queue?.indexOf(id) ?? -1;
  if (queue && queuedAt >= 0 && queuedAt + 1 < queue.length) return queue[queuedAt + 1];
  const i = state.workouts.findIndex((w) => w.id === id);
  if (i === -1) return upNext(state)?.id ?? id;
  return state.workouts[(i + 1) % state.workouts.length].id;
};

/** Consume a one-time queue only when a workout is finished or explicitly skipped. */
const advanceWorkout = (
  state: SessionState,
  id: string,
): Pick<SessionState, "nextWorkout" | "workoutQueue" | "postponed"> => {
  const queue = state.workoutQueue?.filter((id) => workoutById(state, id));
  const at = queue?.indexOf(id) ?? -1;
  const remaining = at >= 0 ? queue!.slice(at + 1) : [];
  // Done or skipped, it is no longer waiting.
  const waiting = state.postponed?.filter((p) => p !== id && workoutById(state, p));
  return {
    nextWorkout: following(state, id),
    workoutQueue: remaining.length > 0 ? remaining : undefined,
    postponed: waiting && waiting.length > 0 ? waiting : undefined,
  };
};

/**
 * The next few workouts in the order Start will run them, today's first —
 * the waiting line, then the cycle. For showing what a choice leads to.
 */
export const upcomingWorkouts = (state: SessionState, count: number): Workout[] => {
  const out: Workout[] = [];
  let s = state;
  for (let i = 0; i < count; i++) {
    const w = upNext(s);
    if (!w) break;
    out.push(w);
    s = { ...s, ...advanceWorkout(s, w.id) };
  }
  return out;
};

/** Move one element of a list to another index. */
const move = <T,>(list: T[], from: number, to: number): T[] => {
  if (from === to || from < 0 || from >= list.length) return list;
  const next = [...list];
  const [picked] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, picked);
  return next;
};

/** Change one workout, leaving the rest as they are. */
const patchWorkout = (
  state: SessionState,
  id: string,
  fn: (w: Workout) => Workout,
): SessionState => ({
  ...state,
  workouts: state.workouts.map((w) => (w.id === id ? fn(w) : w)),
});

/**
 * Add a copy of a workout — running or paused — at the bottom of the cycle:
 * the same exercises, the same choice in every slot, the same cardio and
 * stretch, named "Legs 2". The template is a workout you already have.
 */
export const copyWorkout = (state: SessionState, fromId: string, id: string): SessionState => {
  const paused = state.removedWorkouts.map((r) => r.workout);
  const from = [...state.workouts, ...paused].find((w) => w.id === fromId);
  if (!from) return state;
  const taken = new Set([...state.workouts, ...paused].map((w) => w.name));
  const base = from.name || "Workout";
  let n = 2;
  while (taken.has(`${base} ${n}`)) n++;
  // Slot choices are keyed by workout, so the copy gets its own set.
  const choices = { ...state.choices };
  for (const [key, exerciseId] of Object.entries(state.choices)) {
    if (key.startsWith(`${fromId}/`)) choices[`${id}/${key.slice(fromId.length + 1)}`] = exerciseId;
  }
  return {
    ...state,
    choices,
    // Its goals come along: the copy is everything the workout had.
    goals: state.goals.map((g) =>
      g.workouts.includes(fromId) ? { ...g, workouts: [...g.workouts, id] } : g,
    ),
    // A copy is the same kind of workout, including Klay's own that predate kinds.
    workouts: [...state.workouts, { ...from, id, name: `${base} ${n}`, kind: kindOf(from) }],
  };
};

/**
 * Add a new workout of a kind at the bottom of the cycle, ready to train:
 * the kind's own balanced lifts, the cardio, warm-up and stretch that every
 * day gets, named for the kind — "Pull", or "Pull 2" when you have one.
 * Empty has the same frame and no lifts. See `KIND_LIFTS`.
 */
export const addWorkoutOfKind = (state: SessionState, id: string, kind: WorkoutKind): SessionState => {
  const paused = state.removedWorkouts.map((r) => r.workout);
  const taken = new Set([...state.workouts, ...paused].map((w) => w.name));
  const base = KIND_NAME[kind];
  let name = base;
  for (let n = 2; taken.has(name); n++) name = `${base} ${n}`;
  const exercises = KIND_LIFTS[kind]();
  const used = new Set(exercises.flatMap((e) => e.options));
  return {
    ...state,
    workouts: [...state.workouts, {
      id, name, kind, subtitle: kind === "free" ? "" : KIND_SUBTITLE[kind], exercises,
      // Ready anywhere, even while the saved place is still the gym.
      ...(kind === "bodyweight" ? { cardio: { open: null, close: null } } : {}),
    }],
    // What it uses joins your catalogue, as Add exercise would do.
    hidden: state.hidden.filter((h) => !used.has(h)),
  };
};

/**
 * Gentle words about a workout's balance, for its sheet. Never a rule:
 * nothing stops you training it. A full body workout missing a whole part
 * of the body says which; any workout past eight lifts says six is plenty.
 */
export const balanceNotes = (state: SessionState, workout: Workout): string[] => {
  const notes: string[] = [];
  const lifts = workout.exercises
    .map((e) => lookup(state, chosen(state, workout.id, e)))
    .filter((e): e is Exercise => e !== undefined);
  if (kindOf(workout) === "full" && lifts.length > 0) {
    const has = new Set(lifts.map((e) => familyOf(e)));
    const missing = (["legs", "push", "pull"] as const).filter((f) => !has.has(f));
    const words = { legs: "legs", push: "pressing", pull: "pulling" };
    if (missing.length > 0) {
      const list = missing.map((f) => words[f]);
      const said = list.length === 1 ? list[0] : `${list.slice(0, -1).join(", ")} or ${list.at(-1)}`;
      notes.push(`No ${said} exercise yet. A full body day has one of each.`);
    }
  }
  if (lifts.length > LONG_WORKOUT) notes.push(`That's a long one: ${lifts.length} exercises. Six is plenty.`);
  return notes;
};

export const renameWorkout = (
  state: SessionState,
  id: string,
  patch: { name?: string; subtitle?: string },
): SessionState => patchWorkout(state, id, (w) => ({ ...w, ...patch }));

/** All workouts in their Plan positions, including paused ones. Older saves are reconstructed. */
export const planWorkouts = (state: SessionState): Workout[] => {
  const rows = [...state.workouts];
  for (const r of [...state.removedWorkouts].reverse()) rows.splice(Math.min(r.at, rows.length), 0, r.workout);
  const order = state.planOrder ?? rows.map((w) => w.id);
  return [...rows].sort((a, b) => {
    const rank = (id: string) => order.includes(id) ? order.indexOf(id) : order.length + rows.findIndex((w) => w.id === id);
    return rank(a.id) - rank(b.id);
  });
};

/**
 * Plan after a drag that may cross from Active to Paused or back: `active`
 * and `paused` are every workout's id, in their new order. A workout dragged
 * down is paused, one dragged up is resumed, and the order is as dropped.
 *
 * Refused — the state comes back unchanged — if nothing would be left
 * active, or the workout you are training would be paused. If what was next
 * is paused, the next active one after it in the old order is next instead.
 */
export const arrangePlan = (state: SessionState, active: string[], paused: string[]): SessionState => {
  const all = new Map([...state.workouts, ...state.removedWorkouts.map((r) => r.workout)].map((w) => [w.id, w]));
  if (active.length === 0 || active.length + paused.length !== all.size) return state;
  if (state.active && paused.includes(state.active.workoutId)) return state;
  if (![...active, ...paused].every((id) => all.has(id))) return state;
  const old = [...state.workouts.map((w) => w.id), ...state.removedWorkouts.map((r) => r.workout.id)];
  let next = state.nextWorkout;
  if (!active.includes(next)) {
    const from = old.indexOf(next);
    const after = [...old.slice(from + 1), ...old.slice(0, from)];
    next = after.find((id) => active.includes(id)) ?? active[0];
  }
  return {
    ...state,
    workouts: active.map((id) => all.get(id)!),
    removedWorkouts: paused.map((id, at) => ({ workout: all.get(id)!, at: active.length + at })),
    nextWorkout: next,
    workoutQueue: state.workoutQueue?.filter((id) => active.includes(id)),
    postponed: state.postponed?.filter((id) => active.includes(id)),
    planOrder: [...active, ...paused],
  };
};

/**
 * For a save from the time loops were gone (before version 23): the loops of
 * an older one fold into one list, every workout in them kept, paused under
 * the running ones. `intoLoops` then sorts them into plans.
 */
export const foldLoops = (state: SessionState): SessionState => {
  if (!state.loops) return state;
  const { loops, ...rest } = state;
  const have = new Set([...state.workouts, ...state.removedWorkouts.map((r) => r.workout)].map((w) => w.id));
  const removed = [...state.removedWorkouts];
  for (const loop of loops) {
    if (!loop.body) continue;
    const theirs = [...loop.body.workouts, ...loop.body.removedWorkouts.map((r) => r.workout)];
    for (const workout of theirs) {
      if (have.has(workout.id)) continue;
      have.add(workout.id);
      removed.push({ workout, at: state.workouts.length + removed.length });
    }
  }
  return { ...rest, removedWorkouts: removed };
};

/** Whether a workout can be paused. The last one stays: the loop needs something in it. */
export const canPauseWorkout = (state: SessionState): boolean => state.workouts.length > 1;

/**
 * Pause a workout: it leaves the loop and waits, exactly as it was — its
 * exercises, its choices, its place. If it was next, the one after it becomes
 * next, so the loop carries on from the same place. Training history is per
 * exercise, not per workout, so nothing you lifted is touched either way.
 */
export const pauseWorkout = (state: SessionState, id: string): SessionState => {
  if (!canPauseWorkout(state) || state.active?.workoutId === id) return state;
  const at = state.workouts.findIndex((w) => w.id === id);
  if (at === -1) return state;
  return {
    ...state,
    planOrder: planWorkouts(state).map((w) => w.id),
    workouts: state.workouts.filter((w) => w.id !== id),
    nextWorkout: state.nextWorkout === id ? following(state, id) : state.nextWorkout,
    workoutQueue: state.workoutQueue?.filter((queued) => queued !== id),
    postponed: state.postponed?.filter((waiting) => waiting !== id),
    removedWorkouts: [
      ...state.removedWorkouts.filter((r) => r.workout.id !== id),
      { workout: state.workouts[at], at },
    ],
  };
};

/**
 * Delete a workout directly, with its slot choices and queue references.
 * Keep at least one workout and protect the session currently in progress.
 * Logged training and exercise records belong to the past and stay intact.
 */
export const deleteWorkout = (state: SessionState, id: string): SessionState => {
  const running = state.workouts.some((w) => w.id === id);
  const paused = state.removedWorkouts.some((r) => r.workout.id === id);
  if ((!running && !paused) || state.active?.workoutId === id || (running && state.workouts.length === 1)) return state;
  const choices = { ...state.choices };
  for (const k of Object.keys(choices)) if (k.startsWith(`${id}/`)) delete choices[k];
  return {
    ...state,
    choices,
    workouts: state.workouts.filter((w) => w.id !== id),
    planOrder: planWorkouts(state).map((w) => w.id).filter((workoutId) => workoutId !== id),
    nextWorkout: state.nextWorkout === id ? following(state, id) : state.nextWorkout,
    workoutQueue: state.workoutQueue?.filter((workoutId) => workoutId !== id),
    postponed: state.postponed?.filter((workoutId) => workoutId !== id),
    goals: state.goals.map((goal) => ({ ...goal, workouts: goal.workouts.filter((workoutId) => workoutId !== id) })),
    removedWorkouts: state.removedWorkouts.filter((r) => r.workout.id !== id),
  };
};

/**
 * Put a paused workout back where it sat, or at the bottom if the loop has
 * since got shorter. What is next does not change.
 */
export const resumeWorkout = (state: SessionState, id: string): SessionState => {
  const entry = state.removedWorkouts.find((r) => r.workout.id === id);
  if (!entry || workoutById(state, id)) return state;
  const workouts = [...state.workouts];
  const order = planWorkouts(state);
  const position = order.filter((w) => state.workouts.some((active) => active.id === w.id) || w.id === id).findIndex((w) => w.id === id);
  workouts.splice(position, 0, entry.workout);
  return {
    ...state,
    workouts,
    planOrder: order.map((w) => w.id),
    removedWorkouts: state.removedWorkouts.filter((r) => r.workout.id !== id),
  };
};

/** Make a workout the next one Start runs. */
export const setNextWorkout = (state: SessionState, id: string): SessionState =>
  workoutById(state, id)
    ? { ...state, nextWorkout: id, workoutQueue: undefined, postponed: undefined }
    : state;

// ---- plans ----
//
// In the code a plan is a loop: a set of workouts taking turns. Settings
// calls them plans. Only one is in use; the others wait exactly as they
// were. History, notes and the log belong to no plan, so a lift's weight is
// the same whichever plan it is trained in.

/** The id of the plan in use when there is no list of plans (a save from before plans). */
export const FIRST_LOOP = "ppl";

/** A plan's own fields, taken from the state while it is the one in use. */
const bodyOf = (state: SessionState): LoopBody => ({
  workouts: state.workouts,
  nextWorkout: state.nextWorkout,
  workoutQueue: state.workoutQueue,
  postponed: state.postponed,
  removedWorkouts: state.removedWorkouts,
  planOrder: state.planOrder,
});

/** A plan waiting with these workouts, the first of them next. */
const waitingBody = (workouts: Workout[]): LoopBody => ({
  workouts,
  nextWorkout: workouts[0]?.id ?? "",
  removedWorkouts: [],
});

/** The plans everyone starts with: Push, pull, legs in use, the others waiting. */
export const startingLoops = (): Loop[] => [
  { id: "ppl", name: PLAN_NAME.ppl },
  { id: "pplppl", name: PLAN_NAME.pplppl, body: waitingBody(PLANS.pplppl) },
  { id: "kettlebell_flow", name: PLAN_NAME.kettlebell_flow, body: waitingBody(PLANS.kettlebell_flow) },
];

/** The id of the plan in use. */
export const loopInUse = (state: SessionState): string =>
  state.loops?.find((l) => !l.body)?.id ?? FIRST_LOOP;

/**
 * The state with this plan in place of the one in use: every function that
 * works on the plan then works on it. A workout in progress is untouched.
 * The same state for the plan already in use, or one that isn't there.
 */
export const viewLoop = (state: SessionState, id: string): SessionState => {
  const target = state.loops?.find((l) => l.id === id);
  if (!state.loops || !target?.body) return state;
  const current = loopInUse(state);
  const b = target.body;
  return {
    ...state,
    // Each one set, so nothing of the plan being put away is left behind.
    workouts: b.workouts,
    nextWorkout: b.nextWorkout,
    workoutQueue: b.workoutQueue,
    postponed: b.postponed,
    removedWorkouts: b.removedWorkouts ?? [],
    planOrder: b.planOrder,
    // The plan coming in leaves its body behind and keeps its kit.
    loops: state.loops.map((l) => {
      if (l.id === current) return { ...l, body: bodyOf(state) };
      if (l.id !== id) return l;
      const { body: _body, ...rest } = l;
      return rest;
    }),
  };
};

/** Do something to one plan, in use or not; the plan in use stays the one in use. */
export const inLoop = (
  state: SessionState,
  id: string,
  fn: (loop: SessionState) => SessionState,
): SessionState => {
  const current = loopInUse(state);
  if (id === current) return fn(state);
  if (!state.loops?.some((l) => l.id === id)) return state;
  const view = viewLoop(state, id);
  const done = fn(view);
  return done === view ? state : viewLoop(done, current);
};

/**
 * Train from another plan: Today's next comes from it from now on, where it
 * left off, and the one it replaces waits exactly where it was. Its lifts
 * and routines join your lists, so nothing it names is missing. Not while a
 * workout is running.
 */
export const switchLoop = (state: SessionState, id: string): SessionState => {
  if (state.active || id === loopInUse(state)) return state;
  const s = viewLoop(state, id);
  if (s === state) return state;
  const workouts = planWorkouts(s);
  const lifts = new Set(workouts.flatMap((w) => w.exercises.flatMap((e) => e.options)));
  const routines = new Set(
    workouts.flatMap((w) =>
      [w.warmup, w.mobility, ...(w.extras ?? []).map((x) => x.routine)].filter((r): r is string => !!r),
    ),
  );
  return {
    ...s,
    hidden: s.hidden.filter((x) => !lifts.has(x)),
    hiddenConditioning: s.hiddenConditioning.filter((x) => !routines.has(x)),
  };
};

export type LoopSummary = { id: string; name: string; inUse: boolean; workouts: Workout[] };

/** Every plan with its workouts as Plan lists them, paused ones too. */
export const loopsOf = (state: SessionState): LoopSummary[] =>
  state.loops
    ? state.loops.map((l) => ({
        id: l.id,
        name: l.name,
        inUse: !l.body,
        workouts: planWorkouts(viewLoop(state, l.id)),
      }))
    : [{ id: FIRST_LOOP, name: PLAN_NAME.ppl, inUse: true, workouts: planWorkouts(state) }];

/** The plan's name. */
export const loopName = (state: SessionState, id: string): string =>
  loopsOf(state).find((l) => l.id === id)?.name ?? "";

/** A name no other plan has: "Travel", else "Travel 2". */
const freeLoopName = (state: SessionState, name: string, except?: string): string => {
  const base = name.trim() || "New plan";
  const taken = new Set(loopsOf(state).filter((l) => l.id !== except).map((l) => l.name));
  let free = base;
  for (let n = 2; taken.has(free); n++) free = `${base} ${n}`;
  return free;
};

/** The list of plans, made explicit for a save that only has the one in use. */
const withLoops = (state: SessionState): Loop[] =>
  state.loops ?? [{ id: FIRST_LOOP, name: PLAN_NAME.ppl }];

/** A new, empty plan, waiting until you use it. Its workouts are added on Plan. */
export const newLoop = (state: SessionState, id: string, name: string): SessionState => {
  const loops = withLoops(state);
  if (loops.some((l) => l.id === id)) return state;
  const named = freeLoopName({ ...state, loops }, name);
  return { ...state, loops: [...loops, { id, name: named, body: waitingBody([]) }] };
};

/** Rename a plan. A blank name is ignored; one another plan has gets a number. */
export const renameLoop = (state: SessionState, id: string, name: string): SessionState => {
  const loops = withLoops(state);
  if (!name.trim() || !loops.some((l) => l.id === id)) return state;
  const free = freeLoopName({ ...state, loops }, name, id);
  return { ...state, loops: loops.map((l) => (l.id === id ? { ...l, name: free } : l)) };
};

/**
 * Delete a plan that isn't in use, and its workouts. What you lifted in them
 * stays: history and the log belong to no plan.
 */
export const deleteLoop = (state: SessionState, id: string): SessionState => {
  const loop = state.loops?.find((l) => l.id === id);
  if (!loop?.body) return state;
  const gone = new Set(planWorkouts(viewLoop(state, id)).map((w) => w.id));
  return {
    ...state,
    loops: state.loops!.filter((l) => l.id !== id),
    choices: Object.fromEntries(Object.entries(state.choices).filter(([k]) => !gone.has(k.split("/")[0]))),
    goals: state.goals.map((g) => ({ ...g, workouts: g.workouts.filter((w) => !gone.has(w)) })),
  };
};

// ---- restoring a built-in plan ----

/** Push, pull, legs, advanced and Kettlebell Flow: the plans Klay ships. */
export const isBuiltInPlan = (id: string): id is PlanId => (["ppl", "pplppl", "kettlebell_flow"] as string[]).includes(id);

/**
 * Push, pull, legs as Klay made it for you — filled as the first questions
 * filled it, for this plan's equipment and what you ruled out — grown as far
 * as yours has: the small start, every slot growth has added, and the cardio
 * and stretch it has given. Restoring undoes your edits, never the growth
 * you earned. A plan from before growth started whole, so it comes back whole.
 */
const grownPpl = (state: SessionState): Workout[] => {
  const growth = state.growth;
  const made = shapePlan(state, DEFAULT_WORKOUTS, kitOfLoop(state, "ppl") ?? GYM, state.avoid ?? []);
  if (!growth) return made;
  return made.map(startSmall).map((w) => {
    const added = (growth?.added ?? [])
      .filter((a) => a.workoutId === w.id)
      .flatMap((a) => {
        const entry = GROWTH_SLOTS[w.id]?.find((e) => e.id === a.slot);
        return entry && !w.exercises.some((e) => e.id === entry.id) ? [{ ...entry }] : [];
      });
    let out: Workout = { ...w, exercises: [...w.exercises, ...added] };
    if ((growth?.steps.cardio ?? 0) > 0 && out.cardio?.close === null) {
      const { close: _none, ...rest } = out.cardio;
      out = { ...out, cardio: rest };
    }
    if ((growth?.steps.stretch ?? 0) > 0 && out.mobility === undefined) out = { ...out, mobility: LONGER_STRETCH };
    return out;
  });
};

/** A built-in plan's workouts as Klay made them. */
const originalWorkouts = (state: SessionState, id: PlanId): Workout[] =>
  id === "ppl" ? grownPpl(state) : PLANS[id];

/**
 * A built-in plan back as Klay made it: its workouts, their order and what
 * is in them, with your swaps, paused and added workouts gone, and its own
 * name. Weights, history, its equipment and which plan you are on stay.
 * Not the plan in use while a workout is running.
 */
export const restoreLoop = (state: SessionState, id: string): SessionState => {
  if (!isBuiltInPlan(id) || !state.loops?.some((l) => l.id === id)) return state;
  if (state.active && id === loopInUse(state)) return state;
  const workouts = originalWorkouts(state, id).map((w) => ({ ...w, exercises: w.exercises.map((e) => ({ ...e })) }));
  const old = new Set(planWorkouts(viewLoop(state, id)).map((w) => w.id));
  const mine = new Set([...old, ...workouts.map((w) => w.id)]);
  let next = inLoop(state, id, (s) => ({
    ...s,
    workouts,
    nextWorkout: workouts[0]?.id ?? "",
    workoutQueue: undefined,
    postponed: undefined,
    removedWorkouts: [],
    planOrder: undefined,
  }));
  next = {
    ...next,
    loops: next.loops!.map((l) => (l.id === id ? { ...l, name: PLAN_NAME[id] } : l)),
    // Swaps in its workouts go; swaps in other plans' stay.
    choices: Object.fromEntries(Object.entries(next.choices).filter(([k]) => !mine.has(k.split("/")[0]))),
  };
  // What it names is in your lists again, as when you first switch to it.
  const lifts = new Set(workouts.flatMap((w) => w.exercises.flatMap((e) => e.options)));
  return { ...next, hidden: next.hidden.filter((x) => !lifts.has(x)) };
};

/**
 * Whether a built-in plan has been changed from how Klay made it, in ways
 * you would see: its name, its workouts and their order, or what is in them.
 */
export const canRestore = (state: SessionState, id: string): boolean => {
  if (!isBuiltInPlan(id) || !state.loops?.some((l) => l.id === id)) return false;
  if (loopName(state, id) !== PLAN_NAME[id]) return true;
  const order = (s: SessionState) => planWorkouts(viewLoop(s, id)).map((w) => w.id).join();
  return order(state) !== order(restoreLoop(state, id)) || restoreChanges(state, id).length > 0;
};

/** What restoring would do, workout by workout, in a few words each. */
export const restoreChanges = (state: SessionState, id: string): { workout: string; what: string }[] => {
  if (!isBuiltInPlan(id)) return [];
  const now = viewLoop(state, id);
  const after = viewLoop(restoreLoop(state, id), id);
  // What each slot names — your swap, else the plan's own — so a lift kept
  // out of your lists until the plan is used still counts as there.
  const list = (s: SessionState, w: Workout) =>
    w.exercises.map((e) => lookup(s, s.choices[slotKey(w.id, e.id)] ?? e.options[0])?.name ?? "");
  const and = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`);
  /** "Back: DB shoulder press. Goes: Lateral raise." — or the order, when only that moved. */
  const diff = (was: string[], is: string[]): string => {
    const back = is.filter((n) => !was.includes(n));
    const goes = was.filter((n) => !is.includes(n));
    const parts = [back.length ? `Back: ${and(back)}.` : "", goes.length ? `Goes: ${and(goes)}.` : ""].filter(Boolean);
    return parts.length ? parts.join(" ") : was.join() !== is.join() ? "Back in its original order." : "";
  };
  const out: { workout: string; what: string }[] = [];
  for (const w of planWorkouts(now)) {
    const back = after.workouts.find((x) => x.id === w.id);
    const paused = (now.removedWorkouts ?? []).some((r) => r.workout.id === w.id);
    if (!back) {
      out.push({ workout: w.name || "Untitled", what: "Goes: it is not part of this plan." });
      continue;
    }
    const what = [
      paused ? "Back in the plan, no longer paused." : "",
      w.name !== back.name ? `Named ${back.name} again.` : "",
      diff(list(now, w), list(after, back)),
    ].filter(Boolean).join(" ");
    if (what) out.push({ workout: back.name, what });
  }
  for (const w of after.workouts) {
    if (!planWorkouts(now).some((x) => x.id === w.id)) out.push({ workout: w.name, what: `Back in the plan: ${and(list(after, w))}.` });
  }
  return out;
};

/** The plan a workout is in, running or paused. */
export const loopOfWorkout = (state: SessionState, workoutId: string): string | undefined =>
  loopsOf(state).find((l) => l.workouts.some((w) => w.id === workoutId))?.id;

/** Every running workout in every plan: for what reaches across them all. */
export const everyLoopWorkout = (state: SessionState): Workout[] =>
  state.loops ? state.loops.flatMap((l) => viewLoop(state, l.id).workouts) : state.workouts;

/**
 * Plans came back on 2026-11-19, after a time with one list of workouts
 * that switching between the built-in plans paused and resumed. Such a save
 * becomes two plans: the built-in one its running workouts are, and the
 * other, made from that plan's paused workouts — or fresh, if it had none.
 * Workouts of your own stay with the plan in use, running or paused. Where
 * you trained becomes each plan's kit: the one in use gets where you are
 * now, the other your usual place.
 */
export const intoLoops = (state: SessionState): SessionState => {
  if (state.loops) return state;
  // The advanced plan as it was then: six days, not today's three.
  const of = (plan: PlanId) => new Set(plan === "pplppl" ? OLD_PPLPPL_DAYS : PLANS[plan].map((w) => w.id));
  const running = state.workouts.map((w) => w.id);
  const current: PlanId = running.length > 0 && running.every((id) => of("pplppl").has(id)) ? "pplppl" : "ppl";
  const other: PlanId = current === "ppl" ? "pplppl" : "ppl";
  const theirs = of(other);
  const waiting = state.removedWorkouts.map((r) => r.workout).filter((w) => theirs.has(w.id));
  const order = planWorkouts(state).map((w) => w.id);
  waiting.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
  const fresh = other === "ppl" ? DEFAULT_WORKOUTS.map(startSmall) : PLANS.pplppl;
  const body = waitingBody(waiting.length > 0 ? waiting : fresh);
  // Each plan where you trained it: the one in use where you are now, the
  // other at your usual place.
  const usual = state.kits?.usual;
  const here = state.place === "away" ? (state.kits?.away ?? BODYWEIGHT) : usual;
  const kitted = (loop: Loop, kit: Kit | undefined): Loop => (kit ? { ...loop, kit } : loop);
  const loops: Loop[] = [
    kitted({ id: current, name: PLAN_NAME[current] }, here),
    kitted({ id: other, name: PLAN_NAME[other], body }, usual),
  ];
  const { place: _place, kits: _kits, ...rest } = state;
  return {
    ...rest,
    removedWorkouts: state.removedWorkouts.filter((r) => !theirs.has(r.workout.id)),
    planOrder: state.planOrder?.filter((id) => !theirs.has(id)),
    // The two plans there were then; Kettlebell Flow comes with version 27.
    loops: (["ppl", "pplppl"] as const).map((id) => loops.find((l) => l.id === id)!),
  };
};

/**
 * Add a chosen exercise to the bottom of a workout. Its slot takes the
 * exercise's own movement type, so Swap offers its alternatives as for any
 * other; one from the library joins your catalogue on the way in. An
 * exercise the workout already has is refused — the same lift twice in one
 * session.
 */
export const addExerciseToWorkout = (
  state: SessionState,
  workoutId: string,
  exerciseId: string,
  entryId: string = newId("s"),
  part?: EntryPart,
): SessionState => {
  const w = workoutById(state, workoutId);
  const ex = lookup(state, exerciseId);
  if (!w || !ex) return state;
  if (w.exercises.some((e) => chosen(state, workoutId, e) === exerciseId)) return state;
  const pattern = ex.patterns[0];
  const entry: Entry = {
    id: entryId,
    slot: PATTERN_LABEL[pattern],
    pattern,
    options: [exerciseId],
    scheme: defaultScheme(pattern),
    ...(part ? { part } : {}),
  };
  return {
    ...patchWorkout(state, workoutId, (wk) => ({ ...wk, exercises: [...wk.exercises, entry] })),
    hidden: state.hidden.filter((h) => h !== exerciseId),
  };
};

/**
 * Make an exercise of your own and put it straight into a workout — Add
 * exercise's "Create" when the search finds nothing.
 */
export const createExerciseInWorkout = (
  state: SessionState,
  workoutId: string,
  exercise: Exercise,
  entryId: string = newId("s"),
  part?: EntryPart,
): SessionState => {
  const made = addExercise(state, exercise);
  const id = made.custom[made.custom.length - 1].id;
  return addExerciseToWorkout(made, workoutId, id, entryId, part);
};

/** Fewest and most sets a slot can be given. */
export const SETS_RANGE = { min: 1, max: 10 } as const;

/** Change how a slot is trained: its rep range, set count or superset flag. */
export const updateEntry = (
  state: SessionState,
  workoutId: string,
  entryId: string,
  patch: Partial<Pick<Entry, "scheme" | "sets">>,
): SessionState =>
  patchWorkout(state, workoutId, (w) => ({
    ...w,
    exercises: w.exercises.map((e) => {
      if (e.id !== entryId) return e;
      const next = { ...e, ...patch };
      if (patch.sets !== undefined) {
        next.sets = Math.max(SETS_RANGE.min, Math.min(SETS_RANGE.max, patch.sets));
      }
      return next;
    }),
  }));

/** Take a slot out of a workout. The exercise and its history stay in the catalogue. */
export const removeEntry = (
  state: SessionState,
  workoutId: string,
  entryId: string,
): SessionState => {
  const choices = { ...state.choices };
  delete choices[slotKey(workoutId, entryId)];
  return {
    ...patchWorkout(state, workoutId, (w) => ({
      ...w,
      exercises: w.exercises.filter((e) => e.id !== entryId),
    })),
    choices,
  };
};

/**
 * A fresh install.
 *
 * The catalogue opens *lean*: one exercise for each job the five modules
 * actually name, and three machines and routines for the conditioning blocks.
 * Everything else the app knows about starts in `hidden` — it is not gone,
 * it is listed under "Removed" in the library and comes back with one tap.
 *
 * The effect is that the app asks nothing of you on day one, and grows only
 * where you decide it should: to swap an exercise out, you first put one in.
 */
export const initialState: SessionState = {
  treadmillTargetRevision: 1,
  workouts: DEFAULT_WORKOUTS,
  nextWorkout: DEFAULT_WORKOUTS[0].id,
  removedWorkouts: [],
  loops: startingLoops(),
  choices: {},
  custom: [],
  exerciseEdits: {},
  notes: {},
  goals: STARTING_GOALS,
  customCardio: [],
  customMobility: [],
  mobilityEdits: {},
  hidden: leanHiddenExercises(),
  hiddenConditioning: leanHiddenConditioning(),
  history: {},
  conditioning: {},
  log: [],
  active: null,
};

/**
 * Back to a fresh install: the starting program, the starting catalogue, no
 * edits, no history. For testing — and for starting over. The module-level
 * lists that resolve custom exercises and edits are cleared with it.
 */
export const resetToDefault = (): SessionState => {
  setCustomExercises([]);
  setExerciseEdits({});
  setCustomConditioning([], []);
  setMobilityEdits({});
  return initialState;
};

/** Correct saved and in-memory trial settings, without reinterpreting old records. */
export const correctTreadmillTarget = (state: SessionState): SessionState => {
  if (state.treadmillTargetRevision === 1) return state;
  const correct = (workout: Workout): Workout => {
    let changed = false;
    const cardio = { ...workout.cardio };
    for (const where of ["open", "close"] as const) {
      const block = cardio[where];
      if (block?.machine === "treadmill" && block.course === undefined && block.minutes !== undefined) {
        cardio[where] = { machine: "treadmill", course: 1 };
        changed = true;
      }
    }
    return changed ? { ...workout, cardio } : workout;
  };
  const saved = state.cardioTargets?.treadmill;
  return {
    ...state,
    treadmillTargetRevision: 1,
    cardioTargets: saved?.course === undefined && saved?.minutes !== undefined
      ? { ...state.cardioTargets, treadmill: { course: 1 } }
      : state.cardioTargets,
    workouts: state.workouts.map(correct),
    removedWorkouts: state.removedWorkouts.map((entry) => ({ ...entry, workout: correct(entry.workout) })),
    active: state.active ? { ...state.active, items: state.active.items.map((item) =>
      isCardio(item) && item.exerciseId === "treadmill" && item.course === undefined
        ? { ...item, ...lengthFields({ course: 1 }) }
        : item,
    ) } : null,
  };
};

/**
 * What time has cost you, as an offer rather than a fact.
 *
 * Nothing here writes anything. It reports what a layoff WOULD take off, and
 * the change only happens if you accept it on the Today screen. Your weights
 * are yours: the app can notice you have been away, but it should not quietly
 * rewrite what you lift while you were gone.
 */
export type DecayOffer = {
  /** History key, so accepting can find the record again. */
  key: string;
  exerciseId: string;
  scheme: Scheme;
  decay: Decay;
  /** What it is now, and what it would become. */
  from: number;
  to: number;
};

/**
 * Everything a layoff would cut, across the catalogue.
 *
 * Read-only and cheap, so the Today screen can call it on every render
 * without a stale copy to keep in sync.
 */
export const decayOffers = (
  state: SessionState,
  now: number = Date.now(),
): DecayOffer[] => {
  const offers: DecayOffer[] = [];
  for (const [k, record] of Object.entries(state.history)) {
    const scheme = k.split(":")[1] as Scheme;
    const decay = decayFor(record, now);
    if (!decay) continue;
    offers.push({
      key: k,
      exerciseId: record.exerciseId,
      scheme,
      decay,
      from: record.weight,
      to: applyDecay(record, decay, now).weight,
    });
  }
  return offers;
};

/**
 * The longest time any lift has been idle, in days. Used for the prompt's
 * headline — "3 weeks since your last workout" is the fact you recognise,
 * not a per-exercise breakdown.
 */

export const daysSinceTrained = (
  state: SessionState,
  now: number = Date.now(),
): number | null => {
  let newest: number | null = null;
  for (const record of Object.values(state.history)) {
    if (typeof record.lastTrainedAt !== "number") continue;
    newest = newest === null ? record.lastTrainedAt : Math.max(newest, record.lastTrainedAt);
  }
  return newest === null ? null : daysBetween(newest, now);
};

/**
 * Accept the offer: write the cuts to history.
 *
 * Called only from the Today screen's prompt, never on a timer and never as
 * a side effect of opening the app.
 */
export const acceptDecay = (
  state: SessionState,
  now: number = Date.now(),
): SessionState => {
  const history = { ...state.history };
  for (const offer of decayOffers(state, now)) {
    history[offer.key] = applyDecay(history[offer.key], offer.decay, now);
  }
  return { ...state, history };
};

export const buildWorkout = (
  state: SessionState,
  _now: number = Date.now(),
): SessionState => {
  const workout = upNext(state);
  if (!workout) return state;
  const easy = !!easyWeek(state, _now);
  // Weight cuts are NOT applied here. They are offered on the Today screen
  // and written only if accepted — see `decayOffers` and `acceptDecay`.
  return {
    ...state,
    active: {
      workoutId: workout.id,
      items: (() => {
        // The first exercise of each muscle group gets a warm-up; by the time
        // the second push or pull comes round you are already warm.
        const warmed = new Set<Group>();
        // In the order they run, so the first lift of a group is the one warmed up.
        const runOrder = (["start", "main", "finish"] as const).flatMap((part) => partIds(workout, part));
        // A chain is done at your step; its first time, at its start, and
        // the card asks where you are.
        const stepOf = (named: string) => {
          const chain = chainFor(named);
          const at = chain ? state.steps?.[chain.id] : undefined;
          return { chain, at, exerciseId: chain ? chain.steps[Math.min(at ?? chain.start, chain.steps.length - 1)].exerciseId : named };
        };
        // Never the same exercise twice in one session. A chain's step can be
        // another slot's exercise (push-ups at the incline step, beside an
        // incline push-up slot): the first in run order stays, the other sits
        // this session out.
        const inSession = new Set<string>();
        const lifts = [...liftsToRun(state, workout)]
          .sort((a, b) => runOrder.indexOf(a.entry.id) - runOrder.indexOf(b.entry.id))
          .filter(({ exerciseId: named }) => {
            const { exerciseId } = stepOf(named);
            if (inSession.has(exerciseId)) return false;
            inSession.add(exerciseId);
            return true;
          })
          .map(({ entry: e, exerciseId: named }) => {
          const { chain, at, exerciseId } = stepOf(named);
          const ex = byId(exerciseId)!;
          const group = groupOf(ex);
          // Start and finish exercises are light by nature: no ramp, and
          // they don't count as warming a group for the main lifts.
          const main = !e.part;
          const first = main && !warmed.has(group);
          if (main) warmed.add(group);
          // A derived lift takes a fraction of another exercise's current
          // working weight, so it keeps up on its own.
          const own = dueRecord(state, exerciseId, e.scheme);
          const weight = e.derive
            ? roundTo(
                (
                  state.history[key(e.derive.from, e.derive.scheme)] ??
                  startFor(state, byId(e.derive.from)!)
                ).weight * e.derive.fraction,
                ex.increment || 2.5,
              )
            : weightHere(state, ex, own.weight);
          const { weight: easyWeight, sets } = easy ? easyLoad(state, ex, e, weight) : { weight, sets: setsFor(e) };

          return {
            ...e,
            exerciseId,
            ...(chain ? { chain: chain.id, ...(at === undefined ? { placing: true } : {}) } : {}),
            ...(easy ? { sets } : {}),
            weight: easy ? easyWeight : weight,
            logged: Array<number | null>(sets).fill(null),
            // Arms and core are small and already warm by the time they
            // come round — a ramp there is just more to tap through.
            warmup: first && group !== "arms" && group !== "core",
          };
        });

        // Each block in its order: usually cardio and a warm-up to start,
        // the lifts, then cardio and a stretch to finish — but what is in a
        // block and its order are the workout's own (see `partIds`). Every
        // block is skippable like any other, and can be left out altogether.
        const lift = new Map(lifts.map((l) => [l.id, l]));
        const run = (part: Block): Item[] =>
          partContents(state, workout, part).flatMap((p): Item[] => {
            const item =
              "entry" in p ? lift.get(p.id)
              : "cardio" in p ? cardioBlock(state, workout, p.cardio)
              // On a day that presses, the shoulders are readied before
              // anything loads them; away from a gym, band moves become
              // ones that need nothing.
              : p.routine === "warmup" ? warmupBlock(state, workout)
              : p.routine === "end" ? mobilityBlock(state, workout)
              : routineBlock(routinePlan(state, workout, p.routine), p.id);
            return item ? [item] : [];
          });
        // Skills straight after the start, while you are fresh: a handstand
        // is no place for tired shoulders.
        const goals = goalsIn(state, workout.id).map(goalBlock);
        return [...run("start"), ...goals, ...run("main"), ...run("finish")];
      })(),
      cursor: 0,
      startedAt: Date.now(),
      ...(easy ? { easy: true } : {}),
    },
  };
};

/** The same values, whatever order their keys are in; an `undefined` key is no key. */
const same = (a: unknown, b: unknown): boolean => {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    const bs = b as unknown[];
    return a.length === bs.length && a.every((v, i) => same(v, bs[i]));
  }
  const ao = a as Record<string, unknown>;
  const bo = b as Record<string, unknown>;
  const keys = new Set([...Object.keys(ao), ...Object.keys(bo)]);
  for (const k of keys) if (!same(ao[k], bo[k])) return false;
  return true;
};

/**
 * A change made to the plan while its workout is under way reaches the
 * session too, wherever that is safe: an exercise, cardio or routine added
 * comes in where the plan puts it; one taken out goes; new sets, reps or
 * order apply to the cards still ahead.
 *
 * Only cards you have not touched follow. A card is untouched when it is
 * still exactly as Start built it — the plan before the change, built again,
 * gives the same card. Anything logged, weighed, swapped, put off or ticked
 * stays as it is, and so does every card up to the one on screen: nothing
 * you are looking at, or did, moves under you. Something new lands after the
 * card on screen at the earliest — on the Finish card, it is the next thing.
 *
 * Runs on every change the session itself didn't make (see `use-saved.ts`).
 */
export const followPlan = (prev: SessionState, next: SessionState): SessionState => {
  const active = next.active;
  if (!active || prev === next || prev.active !== active) return next;
  if (!workoutById(prev, active.workoutId) || !workoutById(next, active.workoutId)) return next;
  const now = Date.now();
  const fresh = (s: SessionState): Item[] =>
    buildWorkout({ ...s, nextWorkout: active.workoutId, active: null }, now).active?.items ?? [];
  const before = new Map(fresh(prev).map((it) => [it.id, it]));
  const after = fresh(next);
  const afterById = new Map(after.map((it) => [it.id, it]));
  const order = new Map(after.map((it, i) => [it.id, i]));

  const { items, cursor } = active;
  const head = items.slice(0, cursor + 1);
  const holding = active.hold ? items[active.hold.item] : undefined;
  const untouched = (it: Item) => it !== holding && before.has(it.id) && same(it, before.get(it.id));

  // The cards still ahead: touched ones stay put; untouched ones become the
  // plan's version, or go.
  type Spot = { keep: Item } | { follow: string };
  const ahead: Spot[] = items.slice(cursor + 1).flatMap((it): Spot[] =>
    !untouched(it) ? [{ keep: it }] : afterById.has(it.id) ? [{ follow: it.id }] : [],
  );
  // The untouched ones in the plan's new order, in the places they had.
  const following = ahead
    .flatMap((x) => ("follow" in x ? [x.follow] : []))
    .sort((a, b) => order.get(a)! - order.get(b)!);
  let k = 0;
  const was = new Map(items.map((it) => [it.id, it]));
  const tail: Item[] = ahead.map((x) => {
    if ("keep" in x) return x.keep;
    const id = following[k++];
    const card = afterById.get(id)!;
    // Nothing changed for it: the very same card, so nothing redraws.
    return same(card, was.get(id)) ? was.get(id)! : card;
  });

  // What the plan has that the session doesn't — not a partner folded into
  // a superset — comes in after what comes before it in the plan.
  const present = new Set([...head, ...tail].flatMap((it) => [it.id, ...(it.supersetEntry ? [it.supersetEntry.id] : [])]));
  after.forEach((it, i) => {
    if (present.has(it.id)) return;
    let at = 0;
    for (let j = i - 1; j >= 0; j--) {
      const t = tail.findIndex((x) => x.id === after[j].id);
      if (t >= 0) {
        at = t + 1;
        break;
      }
    }
    tail.splice(at, 0, it);
    present.add(it.id);
  });

  const merged = [...head, ...tail];
  if (merged.length === items.length && merged.every((it, i) => it === items[i])) return next;
  const held = holding ? merged.indexOf(holding) : -1;
  const { hold, ...rest } = active;
  return {
    ...next,
    active: { ...rest, items: merged, ...(hold && held >= 0 ? { hold: { ...hold, item: held } } : {}) },
  };
};

/** The workout being trained, or next. Only asked for with a workout to give. */
export const currentWorkout = (state: SessionState): Workout =>
  ((state.active && workoutById(state, state.active.workoutId)) || upNext(state))!;

/**
 * Rest between sets, in seconds: long enough to do the next set as well as
 * the last. The first lift of the day — the biggest — gets two and a half
 * minutes; small muscles and the core a minute; the rest a minute and a half.
 */
export const REST = { first: 150, main: 90, small: 60 } as const;

/** The rest before the next set of the lift on screen, or null off a lift. */
export const restSeconds = (state: SessionState): number | null => {
  const active = state.active;
  const item = active?.items[active.cursor];
  if (!active || !item || !isLift(item)) return null;
  if (active.items.findIndex(isLift) === active.cursor) return REST.first;
  const ex = lookup(state, item.exerciseId);
  const own = ownRange(ex);
  return (own && own.min >= 10) || ex?.patterns[0] === "abs" ? REST.small : REST.main;
};

/** The prescription for the exercise currently on screen. */
export const currentPrescription = (state: SessionState): Prescription | null => {
  if (!state.active) return null;
  const item = state.active.items[state.active.cursor];
  // Conditioning has no weight, no reps and no ladder — nothing to prescribe.
  if (!item || !isLift(item)) return null;
  const st =
    dueRecord(state, item.exerciseId, item.scheme);
  // The session's own weight, which +/- edits without touching history.
  return prescribe(servedAt(state, st, item.weight), item.scheme, setsFor(item));
};

/** The partner's prescription, when one has been folded in. */
export const partnerPrescription = (state: SessionState): Prescription | null => {
  const item = state.active?.items[state.active.cursor];
  if (!item?.supersetEntry) return null;
  const e = item.supersetEntry;
  const st = dueRecord(state, e.exerciseId, e.scheme);
  return prescribe(
    { ...st, weight: item.supersetWeight ?? e.weight },
    e.scheme,
    setsFor(e),
  );
};


/** Write a change to the on-screen exercise's session values. */
const patchItem = (
  state: SessionState,
  fn: (item: Item) => Item,
): SessionState => {
  if (!state.active) return state;
  const { items, cursor } = state.active;
  return {
    ...state,
    active: {
      ...state.active,
      items: items.map((it, i) => (i === cursor ? fn(it) : it)),
    },
  };
};

/**
 * Tap a set's circle.
 *
 *   empty → target reps → target-1 → ... → 1 → 0 → empty
 *
 * The first tap logs a clean set, further taps count down if you fell short,
 * 0 is a set not done, and tapping past it clears the circle in case of a
 * mis-tap. A timed hold counts
 * down five seconds a tap, so a 40-second plank that gave out early is a few
 * taps, not thirty.
 */
export const tapSet = (
  state: SessionState,
  setIndex: number,
  which: "main" | "partner" = "main",
): SessionState =>
  writeSet(state, setIndex, which, (current, target, step) =>
    current === null ? target : current === 0 ? null : Math.max(0, current - step),
  );

/**
 * Long press: a set not done, in one move — 0. It counts
 * as a missed set, so the weight doesn't go up on a set you skipped.
 */
export const skipSet = (
  state: SessionState,
  setIndex: number,
  which: "main" | "partner" = "main",
): SessionState => writeSet(state, setIndex, which, () => 0);

const writeSet = (
  state: SessionState,
  setIndex: number,
  which: "main" | "partner",
  next: (current: number | null, target: number, step: number) => number | null,
): SessionState => {
  if (!state.active) return state;
  const p = which === "main" ? currentPrescription(state) : partnerPrescription(state);
  if (!p) return state;
  const { items, cursor } = state.active;
  const log = which === "main" ? items[cursor].logged : items[cursor].supersetLogged;
  if (!log) return state;

  const step = p.exercise.timed ? TIMED_SECONDS : 1;
  const updated = log.map((r, j) => (j === setIndex ? next(r, p.reps, step) : r));
  // Rep corrections and clearing a circle are edits, not another finished set;
  // nor is a set not done, which needs no rest after it.
  const newlyLogged = log[setIndex] === null && updated[setIndex] != null && updated[setIndex] !== 0;

  return {
    ...state,
    active: {
      ...state.active,
      ...(newlyLogged ? { lastSetAt: Date.now() } : {}),
      items: items.map((it, i) =>
        i === cursor
          ? which === "main"
            ? { ...it, logged: updated }
            : { ...it, supersetLogged: updated }
          : it,
      ),
    },
  };
};

/**
 * A timed hold's clock: tap an empty circle and, after a moment to get into
 * position, it counts up; tap it again to stop, and what it read is logged.
 * Kept in the workout as the moment counting starts, so a locked phone or a
 * swipe to another card can't lose or stretch it.
 */
export type HoldClock = {
  /** The card it's on. */
  item: number;
  which: "main" | "partner";
  set: number;
  /** When counting starts: the tap, plus `GET_READY`. */
  startAt: number;
};

/** Seconds to get into position — hands on the bar, down on the floor — before a hold counts. */
export const GET_READY = 3;

/** The running hold on the card on screen, for these circles, if there is one. */
export const holdOn = (state: SessionState, which: HoldClock["which"]): HoldClock | null => {
  const hold = state.active?.hold;
  return hold && hold.item === state.active!.cursor && hold.which === which ? hold : null;
};

/** Whole seconds a hold has counted at `now`; below zero while getting ready. */
export const heldFor = (hold: Pick<HoldClock, "startAt">, now: number): number =>
  Math.floor((now - hold.startAt) / 1000);

/**
 * Start a hold's clock on this card. A clock left running on another card
 * gives way — it's this one you're doing now.
 */
export const startHold = (state: SessionState, which: HoldClock["which"], set: number, now: number): SessionState =>
  state.active
    ? { ...state, active: { ...state.active, hold: { item: state.active.cursor, which, set, startAt: now + GET_READY * 1000 } } }
    : state;

/** Put the clock away, logging nothing: tapped while still getting ready, or the set marked not done. */
export const cancelHold = (state: SessionState): SessionState => {
  if (!state.active?.hold) return state;
  const { hold: _, ...active } = state.active;
  return { ...state, active };
};

/** Stop the clock and log what it read — on a lift, or on a goal's hold step. */
export const stopHold = (state: SessionState, now: number): SessionState => {
  const hold = state.active?.hold;
  if (!hold) return state;
  const cleared = cancelHold(state);
  const held = heldFor(hold, now);
  if (held < 1 || cleared.active!.cursor !== hold.item) return cleared;
  const item = cleared.active!.items[hold.item];
  return isGoal(item)
    ? logGoalSet(cleared, hold.set, held)
    : writeSet(cleared, hold.set, hold.which, () => held);
};

/** Every circle filled — including the partner's? Then it's logged, hit or miss. */
export const allSetsLogged = (state: SessionState): boolean => {
  const item = state.active?.items[state.active.cursor];
  if (!item || !isLift(item)) return false;
  const filled = (log?: (number | null)[]) => !log || log.every((r) => r !== null);
  return filled(item.logged) && filled(item.supersetLogged);
};

/**
 * What today's logged sets mean for next time, worked out by running the
 * real progression on them — so the line on screen can never disagree with
 * what actually happens. Null until every set is logged, and for work that
 * does not progress.
 */
export type Verdict = {
  outcome: Outcome;
  /** Which of Klay's lists answers it — a hit that starts or ends a reload has its own. */
  say: Say;
  fact: string;
};

/**
 * Next time's record after a first time that felt too light or too heavy:
 * the weight moved (see `feelWeight`), and the reps back to the bottom of
 * the ladder to start the new weight properly.
 */
const withFeel = (
  exercise: Exercise,
  after: ExerciseState,
  feel: Feel | undefined,
  weights: number[] | null,
): ExerciseState =>
  feel === "light" || feel === "heavy"
    ? { ...after, weight: feelWeight(exercise, after.weight, feel, weights), rung: 0, downStreak: 0, reloading: false }
    : after;

/**
 * Whether the lift on screen is one Klay is still learning — never trained,
 * and a weight to move — so it asks how it felt once every set is in.
 */
export const asksFeel = (state: SessionState): boolean =>
  willAskFeel(state) && !state.active!.items[state.active!.cursor].logged.some((r) => r === null);

/**
 * Whether this lift asks how it felt once its sets are in — known from the
 * start, so the card can make room for the question before it comes rather
 * than change its whole layout under you when it does.
 */
export const willAskFeel = (state: SessionState): boolean => {
  const item = state.active?.items[state.active.cursor];
  if (!item || !isLift(item) || item.derive || item.skipped || item.supersetWith) return false;
  const ex = byId(item.exerciseId);
  if (!ex || ex.bodyweight || ex.holds || ex.timed || ex.unloaded) return false;
  return !Object.values(state.history).some((r) => r.exerciseId === item.exerciseId && r.lastTrainedAt);
};

/** Say how the first time felt; the same answer again takes it back. */
export const setFeel = (state: SessionState, feel: Feel): SessionState =>
  patchItem(state, (it) => ({ ...it, feel: it.feel === feel ? undefined : feel }));

export const nextTime = (state: SessionState): Verdict | null => {
  const item = state.active?.items[state.active.cursor];
  return item ? verdictFor(state, item) : null;
};

/**
 * Hit, miss or drop, read from the reps rather than from what moved: a hit
 * that starts a reload leaves the weight where it was, and on a one-rung
 * ladder the rung does not move either.
 */
const readOutcome = (
  before: ExerciseState,
  after: ExerciseState,
  logged: (number | null)[],
  scheme: Scheme,
): Outcome => {
  const ladder = ladderOf(byId(before.exerciseId), scheme);
  return after.deloads > before.deloads
    ? "drop"
    : hitTarget(logged, targetOf(ladder, before))
      ? "hit"
      : "miss";
};

const verdictFor = (state: SessionState, item: Item): Verdict | null => {
  if (item.skipped || !isLift(item) || item.derive) return null;
  const exercise = byId(item.exerciseId)!;
  if (exercise.unloaded || item.logged.some((r) => r === null)) return null;

  const st = dueRecord(state, item.exerciseId, item.scheme);
  const before = servedAt(state, st, item.weight);
  const weights = weightsFor(exercise, kitAt(state));
  const after = withFeel(exercise, applyResult(before, item.scheme, item.logged, Date.now(), weights), item.feel, weights);
  const ladder = ladderOf(exercise, item.scheme);
  const outcome = readOutcome(before, after, item.logged, item.scheme);
  // A first time that felt off says so, before anything the reps would say.
  if (item.feel === "light" || item.feel === "heavy") {
    const weight = weightLabel(exercise, after.weight);
    return item.feel === "light"
      ? { outcome, say: "hit", fact: `Heavier next time: ${weight}.` }
      : { outcome, say: "drop", fact: `Lighter next time: ${weight}.` };
  }
  const weight = weightLabel(exercise, after.weight);
  // "10 reps", or "40 s" on a timed hold.
  const target = `${targetOf(ladder, after)}${exercise.timed ? " s" : " reps"}`;

  if (outcome === "drop") {
    const lighterThan = after.lighterThan;
    if (lighterThan !== undefined && weights && !weights.some((w) => w < lighterThan)) {
      return { outcome, say: "drop", fact: "A lighter weight is needed. None here, so use another exercise next time." };
    }
    const fact =
      after.weight >= before.weight
        ? // Nothing to say about the weight on a bodyweight lift.
          `${after.weight <= 0 ? "Back" : exercise.holds ? "Same hold, back" : "Same weight, back"} to ${target} next time.`
        : exercise.holds
          ? `Back to a ${weight} next time.`
          : exercise.assistable && after.weight < 0
            ? `More assistance next time: ${weight}.`
            : `Lighter next time: ${weight}.`;
    return { outcome, say: "drop", fact };
  }
  if (outcome === "miss") {
    const fact = exercise.timed
      ? "The same again next time."
      : exercise.holds
        ? "Same hold and reps next time."
        : "Same weight and reps next time.";
    return { outcome, say: "miss", fact };
  }
  if (after.reloading && !before.reloading) {
    return {
      outcome,
      say: "reload",
      fact: `Reload next time: ${weight} again, from ${target}.`,
    };
  }
  if (after.weight !== before.weight) {
    return { outcome, say: before.reloading ? "owned" : "hit", fact: `Up to ${weight} next time.` };
  }
  if ((after.extra ?? 0) > (before.extra ?? 0)) {
    return { outcome, say: "hit", fact: `${target} next time, on the same ${weight}. Then the next weight.` };
  }
  if (after.rung === before.rung) {
    // At the top with nowhere further to go: the same again, which is the point.
    const again = exercise.holds && after.weight > 0 ? `${target} with a ${weight}` : target;
    return { outcome, say: "hit", fact: `${again} again next time. That's the top.` };
  }
  return { outcome, say: "hit", fact: `${target} next time.` };
};

/**
 * How the whole session went, lift by lift, for the finished screen. Only
 * lifts that progress are counted; cardio, mobility and speed work are not
 * scored. `unfinished` is lifts skipped or left with sets empty.
 */
export const sessionTally = (
  state: SessionState,
): {
  hit: number;
  miss: number;
  drop: number;
  unfinished: number;
  lifts: number;
  /** Hits that reload next time — counted among the hits as well. */
  reload: number;
} => {
  const tally = { hit: 0, miss: 0, drop: 0, unfinished: 0, lifts: 0, reload: 0 };
  for (const item of state.active?.items ?? []) {
    if (!isLift(item) || item.derive || byId(item.exerciseId)?.unloaded) continue;
    tally.lifts++;
    const v = verdictFor(state, item);
    if (v) tally[v.outcome]++;
    else tally.unfinished++;
    if (v?.say === "reload") tally.reload++;
  }
  return tally;
};

/**
 * Change the working weight for this session. Nothing is written to history
 * until the workout ends, so leaving mid-session discards the edit.
 */
export const nudgeWeight = (state: SessionState, direction: 1 | -1): SessionState =>
  patchItem(state, (it) => {
    const ex = byId(it.exerciseId)!;
    const step = ex.increment || 2.5;
    return { ...it, weight: clampWeight(ex, it.weight + step * direction) };
  });

/**
 * Go to a step of the chain on screen — your answer the first time, Easier
 * or Harder, or one picked from the list. It is where you are from now on,
 * in every workout with this chain. The sets start again: they were the
 * other step's.
 */
export const goToStep = (state: SessionState, step: number): SessionState => {
  const item = state.active?.items[state.active.cursor];
  const chain = item?.chain ? chainFor(item.chain) : undefined;
  if (!item || !chain) return state;
  const at = Math.max(0, Math.min(step, chain.steps.length - 1));
  const ex = byId(chain.steps[at].exerciseId);
  if (!ex) return state;
  const moved = patchItem(state, (it) => ({
    ...it,
    exerciseId: ex.id,
    placing: undefined,
    weight: weightHere(state, ex, dueRecord(state, ex.id, it.scheme).weight),
    logged: Array<number | null>(setsFor(it)).fill(null),
  }));
  return { ...moved, steps: { ...state.steps, [chain.id]: at } };
};

/** The chain on screen and your step on it, or null for an ordinary lift. */
export const stepHere = (state: SessionState): { chain: Chain; at: number; owned: boolean } | null => {
  const item = state.active?.items[state.active.cursor];
  const chain = item?.chain ? chainFor(item.chain) : undefined;
  if (!item || !chain) return null;
  const at = chain.steps.findIndex((s) => s.exerciseId === item.exerciseId);
  // Not one of its steps — never "step 1" for something that isn't.
  if (at < 0) return null;
  return { chain, at, owned: ownsStep(state, item) };
};

/**
 * A step is owned the way a lift's weight is: the top of its ladder, every
 * set on target, the last time it was done. Then the next step is offered.
 */
const ownsStep = (state: SessionState, item: Item): boolean => {
  const ex = byId(item.exerciseId);
  const record = state.history[key(item.exerciseId, item.scheme)];
  if (!ex || !record?.lastPerformed) return false;
  if (record.maxed) return true;
  const ladder = ladderOf(ex, item.scheme);
  return record.rung >= ladder.length - 1 && hitTarget(record.lastPerformed.reps, record.lastPerformed.target ?? ladder[ladder.length - 1]);
};

export const editWeight = (state: SessionState, weight: number): SessionState =>
  patchItem(state, (it) => ({
    ...it,
    weight: clampWeight(byId(it.exerciseId)!, weight),
  }));

/**
 * Finish the on-screen exercise and move to the next.
 *
 * The result is held on the item, not written to history — the whole session
 * is committed at the end, so Back can revisit and change anything.
 */
export const completeExercise = (state: SessionState): SessionState => {
  if (!state.active) return state;
  // Patch first, then advance off the patched state — spreading the original
  // `active` here would throw the patch away.
  const patched = patchItem(state, (it) => ({ ...it, skipped: false }));
  return {
    ...patched,
    active: { ...patched.active!, cursor: patched.active!.cursor + 1 },
  };
};

/**
 * Change which exercise fills a slot in the program. Plan only: it changes
 * what the workout uses from its next run, never a session in progress —
 * that session keeps the shape it started with. See `swapForSession`.
 */
export const chooseExercise = (
  state: SessionState,
  workoutId: string,
  entryId: string,
  exerciseId: string,
): SessionState => {
  // Refuse an exercise another slot in this module is already using: it would
  // mean doing the same movement twice in one session.
  const entry = workoutById(state, workoutId)?.exercises.find((e) => e.id === entryId);
  if (entry && takenElsewhere(state, workoutId, entry).has(exerciseId)) return state;
  return {
    ...state,
    choices: { ...state.choices, [slotKey(workoutId, entryId)]: exerciseId },
  };
};

/**
 * Swap the exercise on screen for this session only — the machine is taken,
 * the dumbbells are gone. The program is untouched; the next run of this
 * workout offers the usual exercise again. Changing it for good is Plan's
 * job.
 *
 * Refused once a set is logged (that work would be thrown away), and for an
 * exercise the rest of the session is already using.
 */
export const swapForSession = (state: SessionState, exerciseId: string): SessionState => {
  if (!state.active) return state;
  const { items, cursor } = state.active;
  const item = items[cursor];
  // Allowed after sets are logged too — the sheet says first that they go.
  if (!item || !isLift(item) || item.exerciseId === exerciseId) return state;
  if (currentTaken(state).has(exerciseId)) return state;
  const ex = lookup(state, exerciseId);
  if (!ex || (ex.restricted && !item.options.includes(exerciseId))) return state;
  // Seeded from that exercise's own history, so it opens at the right weight.
  return patchItem(state, (it) => ({
    ...it,
    exerciseId,
    // A chain's card keeps its chain, but shows it only for one of its steps
    // (see `stepHere`): swapped for anything else, it's just that exercise —
    // and swapped back today, the steps return.
    weight: weightHere(state, ex, dueRecord(state, exerciseId, it.scheme).weight),
    logged: Array<number | null>(setsFor(it)).fill(null),
  }));
};

/**
 * The pool for the exercise on screen, read live rather than from the copy
 * taken when the workout was built — so an edit made in the library while a
 * session is running shows up immediately.
 */
export const currentPool = (state: SessionState): string[] => {
  if (!state.active) return [];
  const item = state.active.items[state.active.cursor];
  if (!item) return [];
  if (isConditioning(item)) return conditioningPool(state, item).map((o) => o.id);
  const pool = poolFor(state, state.active.workoutId, item);
  // Your own exercises of this movement first, then the library's, so there
  // is always something to swap to; away, only what this place has.
  const library = hiddenExercises(state)
    .filter((e) => !e.restricted && isPattern(e, item.pattern))
    .map((e) => e.id);
  const all = [...pool, ...library.filter((id) => !pool.includes(id))];
  return atGym(state) ? all : all.filter((id) => fits({ id }, kitAt(state)));
};

/**
 * Exercises the rest of the running workout is using — read from the live
 * items rather than the plan, since a swap mid-session changes them.
 */
export const currentTaken = (state: SessionState): Set<string> => {
  if (!state.active) return new Set();
  const { items, cursor } = state.active;
  return new Set(
    items
      .filter((it, i) => i !== cursor && isLift(it))
      .flatMap((it) => [it.exerciseId, ...(it.supersetWith ? [it.supersetWith] : [])]),
  );
};

/**
 * How many exercises are in the session, and how many are behind you.
 *
 * Counted as *exercises*, not screens: a paired screen holds two, so
 * supersetting never changes the total — the work did not go anywhere, it
 * just moved onto one screen.
 */
export const exerciseCount = (
  state: SessionState,
  which: "total" | "done",
): number => {
  if (!state.active) return 0;
  const { items, cursor } = state.active;
  const weigh = (it: Item) => (it.supersetWith ? 2 : 1);
  const upTo = which === "done" ? cursor : items.length;
  return items.slice(0, upTo).reduce((n, it) => n + weigh(it), 0);
};

/** The ramp to show before the current exercise, if it still needs one. */
export const currentWarmup = (state: SessionState): WarmupSet[] => {
  const item = state.active?.items[state.active.cursor];
  const p = currentPrescription(state);
  if (!item?.warmup || !p) return [];
  return warmupFor(p.exercise, p.weight);
};

/**
 * Whether skipping the lift on screen only puts it off: it is a lift, it has
 * not been put off already, and another lift is still to come. It then comes
 * back after the last of them (see `skipExercise`) — so a taken bench never
 * means waiting, or losing the lift. Cardio, a warm-up and the stretch are
 * simply skipped.
 */
export const comesBack = (state: SessionState): boolean => {
  if (!state.active) return false;
  const { items, cursor } = state.active;
  const item = items[cursor];
  if (!item || !isLift(item) || item.later) return false;
  return items.slice(cursor + 1).some(isLift);
};

/**
 * Skip the exercise on screen and move to the next.
 *
 * A lift is put off rather than dropped, the first time (see `comesBack`):
 * it moves to after the last lift, with any superset partner it carries, and
 * the next one takes its place on screen. Skipped again when it comes back,
 * it is left out like anything else.
 *
 * A folded-in superset partner is NOT skipped with its host — it goes back to
 * the end of the workout as its own exercise, so skipping bench doesn't also
 * drop the curls you had paired with it.
 *
 * Nothing is written to history here — the weight and rep ladder must come
 * back untouched, and a skip you undo with Back should leave no trace. The
 * flag is applied at the end of the workout, to whatever was still unlogged.
 */
export const skipExercise = (state: SessionState): SessionState => {
  if (!state.active) return state;
  const { items, cursor } = state.active;
  const item = items[cursor];

  if (comesBack(state)) {
    // The cursor stays: the next lift slides in under it.
    const rest = items.filter((_, i) => i !== cursor);
    const after = rest.findLastIndex(isLift) + 1;
    return {
      ...state,
      active: {
        ...state.active,
        items: [...rest.slice(0, after), { ...item, later: true }, ...rest.slice(after)],
      },
    };
  }

  // Unpair the partner and re-queue it at the end, keeping anything already
  // logged against it.
  const released: Item[] = item.supersetEntry
    ? [
        {
          ...item.supersetEntry,
          weight: item.supersetWeight ?? item.supersetEntry.weight,
          logged:
            item.supersetLogged ??
            Array<number | null>(setsFor(item.supersetEntry)).fill(null),
        },
      ]
    : [];

  const next = items.map((it, i) =>
    i === cursor
      ? {
          ...it,
          skipped: true,
          supersetWith: undefined,
          supersetEntry: undefined,
          supersetLogged: undefined,
          supersetWeight: undefined,
        }
      : it,
  );

  return {
    ...state,
    active: { ...state.active, items: [...next, ...released], cursor: cursor + 1 },
  };
};

/**
 * Undo a superset: the partner goes back to its own place in the workout,
 * keeping anything already logged against it.
 *
 * "Its own place" is the slot order of the module, not wherever it happened
 * to sit — so a partner released after one was already re-queued still lands
 * in the right order.
 */
export const removeSuperset = (state: SessionState): SessionState => {
  if (!state.active) return state;
  const { items, cursor, workoutId } = state.active;
  const item = items[cursor];
  if (!item.supersetEntry) return state;

  const released: Item = {
    ...item.supersetEntry,
    weight: item.supersetWeight ?? item.supersetEntry.weight,
    logged:
      item.supersetLogged ??
      Array<number | null>(setsFor(item.supersetEntry)).fill(null),
  };

  const order = workoutById(state, workoutId)?.exercises.map((e) => e.id) ?? [];
  const rank = (it: Item) => {
    const i = order.indexOf(it.id);
    return i === -1 ? order.length : i;
  };

  const unpaired = items.map((it, i) =>
    i === cursor
      ? {
          ...it,
          supersetWith: undefined,
          supersetEntry: undefined,
          supersetLogged: undefined,
          supersetWeight: undefined,
        }
      : it,
  );

  // Insert after the last item that comes before it in slot order, and never
  // before the cursor — you have already passed those.
  let at = unpaired.length;
  for (let i = cursor + 1; i < unpaired.length; i++) {
    if (rank(unpaired[i]) > rank(released)) {
      at = i;
      break;
    }
  }

  return {
    ...state,
    active: {
      ...state.active,
      items: [...unpaired.slice(0, at), released, ...unpaired.slice(at)],
    },
  };
};

/**
 * Whether any training actually happened in a session: a set logged on
 * something not skipped, or a cardio distance entered. Ticking mobility poses
 * does not count — it records nothing, so there is nothing to commit.
 */
export const didTrain = (active: SessionState["active"]): boolean =>
  (active?.items ?? []).some((item) => {
    if (item.skipped || isMobility(item)) return false;
    if (isCardio(item)) return cardioDone(item);
    return [...item.logged, ...(item.supersetLogged ?? [])].some((r) => r !== null);
  });

/**
 * Finish the workout and advance the cycle. Nothing is owed if it was short.
 *
 * **This is the only place history is written.** Everything during a session —
 * circle taps, weight edits, skips — lives on the session's items, so
 * you can go Back and change any of it. The commit happens once, here, whether
 * you finished every exercise or left partway through.
 *
 * Anything with no set logged counts as skipped: its weight and
 * rep ladder are left untouched and it is flagged for next time.
 *
 * A session where nothing was trained at all is cancelled rather than
 * committed: the same workout stays next and nothing is flagged as skipped.
 * Starting and immediately leaving should not quietly drop a workout from the
 * rotation or fill History with skips for a session that never happened.
 */
export const finishWorkout = (
  state: SessionState,
  now: number = Date.now(),
): SessionState => {
  // Fast refresh can leave a pre-update session in memory. Keep its cardio
  // notes even if it finishes before the saved-data migration next runs.
  const legacy = Object.entries(state.active?.notes ?? {}).filter(([key]) => key.startsWith("cardio/"));
  if (legacy.length) {
    const notes = { ...state.notes };
    for (const [key, value] of legacy) {
      if (value.trim()) notes[key] = value;
      else delete notes[key];
    }
    state = { ...state, notes };
  }
  if (!didTrain(state.active)) return { ...state, active: null };

  const history = { ...state.history };
  const conditioning = { ...state.conditioning };
  const entries: LogEntry[] = [];

  const commit = (
    exerciseId: string,
    scheme: Scheme,
    weight: number,
    logged: (number | null)[],
    performed: boolean,
    feel?: Feel,
  ) => {
    const k = key(exerciseId, scheme);
    const prior = dueRecord({ ...state, history }, exerciseId, scheme);
    // An easy week moves no record, up or down, and a skip isn't held
    // against you either: only the log says what you did — and the record
    // that you trained, so the week never reads as time away.
    if (state.active?.easy) {
      if (!performed) return;
      if (history[k]) history[k] = { ...history[k], lastTrainedAt: now };
      entries.push({ kind: "lift", exerciseId, scheme, weight, reps: logged, outcome: null });
      return;
    }
    // Trained: the session's weight is what you actually lifted, so it carries
    // over. Skipped: nothing was lifted, so the record keeps the weight it
    // already had — a weight nudged up and then skipped was never trained at.
    const base = performed ? servedAt(state, prior, weight) : prior;
    // Only some weights here — one kettlebell — and a step up goes to the
    // next one there is, or nowhere.
    const weights = weightsFor(byId(exerciseId)!, kitAt(state));
    const after = performed
      ? withFeel(byId(exerciseId)!, applyResult(base, scheme, logged, now, weights), feel, weights)
      : markSkipped(base);
    history[k] = after;

    const ladder = ladderOf(byId(exerciseId), scheme);
    entries.push({
      kind: "lift",
      exerciseId,
      scheme,
      weight: base.weight,
      reps: logged,
      target: targetOf(ladder, performed ? base : prior),
      // The same reading as the verdict on the workout screen.
      outcome: performed ? readOutcome(base, after, logged, scheme) : "skipped",
    });
  };

  let goals = state.goals ?? [];

  for (const item of state.active?.items ?? []) {
    // A goal moves up its ladder — or doesn't — by `applyGoal`. One deleted
    // since, or a step taken out of it, has nothing left to move.
    if (isGoal(item)) {
      const goal = goals.find((g) => g.id === item.exerciseId);
      const step = goal?.steps.find((st) => st.id === item.step);
      const touched = item.logged.some((r) => r !== null);
      if (!goal || !step || item.skipped || (!touched && !item.got)) continue;
      const applied = applyGoal(goal, step.id, item.logged, !!item.got, now);
      goals = goals.map((g) => (g.id === goal.id ? applied.goal : g));
      entries.push({
        kind: "goal",
        goalId: goal.id,
        stepId: step.id,
        goal: goal.name,
        step: step.name,
        measure: step.measure,
        target: step.target,
        reps: item.logged,
        outcome: applied.outcome,
      });
      continue;
    }
    // Cardio keeps its own record: last and best over the block length or
    // the course. A block with no score entered — skipped, or left before the
    // number went in — writes nothing, so the mark to beat stays where it was.
    if (isCardio(item)) {
      // On the clock alone: the minutes are logged as done, with no record —
      // there is no number to beat.
      if (item.ran) {
        if (!item.skipped) {
          entries.push({ kind: "cardio", exerciseId: item.exerciseId, score: item.ran, minutes: item.minutes ?? CARDIO_MINUTES, best: false, clock: true });
        }
        continue;
      }
      const score = scoreOf(item);
      if (item.skipped || score === null) continue;
      const k = itemKey(item);
      const prior = conditioning[k];
      entries.push({
        kind: "cardio",
        exerciseId: item.exerciseId,
        score,
        ...(item.course !== undefined
          ? { course: item.course }
          : { minutes: item.minutes ?? CARDIO_MINUTES }),
        best: !prior || isBetter(item, score, prior.best),
      });
      conditioning[k] = {
        cardioId: item.exerciseId,
        ...(item.course !== undefined
          ? { course: item.course }
          : { minutes: item.minutes ?? CARDIO_MINUTES }),
        last: score,
        best: prior ? (isBetter(item, score, prior.best) ? score : prior.best) : score,
        sessions: (prior?.sessions ?? 0) + 1,
      };
      continue;
    }
    // Mobility is a checklist and nothing more — there is nothing to record.
    if (isMobility(item)) continue;

    const touched = item.logged.some((r) => r !== null);
    const performed = touched && !item.skipped;

    // Speed work takes its weight from the heavy day and jumps have no weight
    // at all, so neither has a ladder to climb or a number worth storing —
    // but the log still says you did them.
    if (item.derive || byId(item.exerciseId)!.unloaded) {
      if (performed) {
        entries.push({
          kind: "lift",
          exerciseId: item.exerciseId,
          scheme: item.scheme,
          weight: item.weight,
          reps: item.logged,
          outcome: null,
        });
      }
      continue;
    }

    commit(item.exerciseId, item.scheme, item.weight, item.logged, performed, item.feel);

    const e = item.supersetEntry;
    if (e) {
      commit(
        e.exerciseId,
        e.scheme,
        item.supersetWeight ?? e.weight,
        item.supersetLogged ?? [],
        performed && !!item.supersetLogged?.some((r) => r !== null),
      );
    }
  }

  const active = state.active!;
  const session: SessionLog = {
    workoutId: active.workoutId,
    name: workoutById(state, active.workoutId)?.name ?? "Workout",
    // Very old saves carried no start time.
    startedAt: typeof active.startedAt === "number" ? active.startedAt : now,
    finishedAt: now,
    entries,
    ...(active.easy ? { easy: true as const } : {}),
  };

  return {
    ...state,
    history,
    conditioning,
    goals,
    log: [...(state.log ?? []), session],
    ...advanceWorkout(state, active.workoutId),
    active: null,
  };
};

export const isComplete = (state: SessionState): boolean =>
  !!state.active && state.active.cursor >= state.active.items.length;

// ---- the row of cards ----

/**
 * The session as it is for one card of its row: the same state with that
 * card on screen. Everything that reads "the exercise on screen" then reads
 * this card, so each card of the row can be drawn — and logged on — in full.
 */
export const atCard = (state: SessionState, index: number): SessionState =>
  state.active ? { ...state, active: { ...state.active, cursor: index } } : state;

/** Go to a card of the row: any of them, done or not; one past the last is the end. */
export const goToCard = (state: SessionState, index: number): SessionState => {
  if (!state.active) return state;
  const cursor = Math.min(Math.max(index, 0), state.active.items.length);
  return cursor === state.active.cursor ? state : atCard(state, cursor);
};

/**
 * How a card stands: done or not. A lift is done once every set is in —
 * short of the reps or not: the reps you did were done, and next time's
 * weight already takes care of the rest.
 */
export type CardMark = "todo" | "done";

export const cardMark = (state: SessionState, index: number): CardMark => {
  const item = state.active?.items[index];
  if (!item) return "todo";
  if (isCardio(item)) return cardioDone(item) ? "done" : "todo";
  if (isMobility(item)) return item.finished || (item.moves?.length && item.moves.every(Boolean)) ? "done" : "todo";
  if (isGoal(item)) return item.logged.every((r) => r !== null) || !!item.got ? "done" : "todo";
  return allSetsLogged(atCard(state, index)) ? "done" : "todo";
};

/** A card's name: the lift, the machine, the routine. */
export const cardName = (state: SessionState, index: number): string =>
  nextItemName(atCard(state, index - 1)) ?? "";

// ---- cardio & mobility ----

/**
 * Key into `conditioning`. Machine and block length together: five minutes on
 * the treadmill is not comparable with ten, so they never share a record.
 * A timed block is keyed by its course the same way — `treadmill:1km` and
 * `treadmill:2km` are two records, and neither is `treadmill:5m`.
 */
export const cardioKey = (cardioId: string, minutes: number) =>
  `${cardioId}:time:${Number(minutes.toFixed(3))}min`;

export const courseKey = (cardioId: string, course: number) => {
  const unit = cardioById(cardioId)?.metric.unit ?? "km";
  // Rounded so 1, 1.0 and 0.1 + 0.9 all land on the same record.
  return `${cardioId}:distance:${Number(course.toFixed(3))}${unit}`;
};

const itemKey = (item: Item) =>
  item.course !== undefined
    ? courseKey(item.exerciseId, item.course)
    : cardioKey(item.exerciseId, item.minutes ?? CARDIO_MINUTES);

/** The record for a cardio block's machine and length, if you have ever done one. */
export const cardioRecord = (state: SessionState, item: Item): CardioRecord | undefined =>
  isCardio(item) ? state.conditioning[itemKey(item)] : undefined;

/** Whether a block is timed over a set distance rather than a set time. */
export const isTimed = (item: Item): boolean => isCardio(item) && item.course !== undefined;

/** The block's score: seconds over a course, or distance in the minutes. */
export const scoreOf = (item: Item): number | null =>
  (isTimed(item) ? item.seconds : item.distance) ?? null;

/** Whether a cardio block is done: its score entered, or its clock run out. */
export const cardioDone = (item: Item): boolean => scoreOf(item) !== null || !!item.ran;

/** Better means further in the minutes, but faster over a course. */
export const isBetter = (item: Item, score: number, than: number): boolean =>
  isTimed(item) ? score < than : score > than;

/** The fields an item carries for a block of this length, score still to enter. */
const lengthFields = (length: CardioLength) =>
  length.course !== undefined
    ? { course: length.course, seconds: null, minutes: undefined, distance: undefined, clock: undefined, ran: undefined }
    : { minutes: length.minutes, distance: null, course: undefined, seconds: undefined, clock: undefined, ran: undefined };

/**
 * The key old saves filed cardio and mobility choices under, when one choice
 * served every workout. Read only by the migration that moved them into each
 * workout — see `storage.ts`.
 */
export const CONDITIONING_ID = "conditioning";

/** Whether an item is one of the conditioning blocks rather than a lift. */
export const isCardio = (item: Item): boolean => item.kind === "cardio";
export const isMobility = (item: Item): boolean => item.kind === "mobility";
export const isConditioning = (item: Item): boolean =>
  item.kind === "cardio" || item.kind === "mobility";
/** A goal's step, done as its own block — see `data/goals.ts`. */
export const isGoal = (item: Item): boolean => item.kind === "goal";
/** Anything with a weight and a rep ladder: not cardio, mobility or a goal. */
export const isLift = (item: Item): boolean => !item.kind || item.kind === "lift";

/** A workout's cardio block at one end, worked out: the machine and how long. */
export type CardioPlan = { machine: CardioExercise } & CardioLength;

/**
 * What a workout runs at one end of the session, or null if it has no cardio
 * there.
 *
 * A machine removed from the catalogue since falls back to the default for
 * that end — or whatever is left — at that machine's own length, since a
 * distance set in another machine's unit means nothing on it. The workout
 * keeps pointing at the one you chose, so putting it back restores the block.
 */
export const cardioPlan = (
  state: SessionState,
  workout: Workout,
  where: CardioWhere,
): CardioPlan | null => {
  const block = isEnd(where) ? workout.cardio?.[where] : extraOf(workout, where)?.cardio ?? null;
  if (block === null) return null;
  const pool = cardioPool(state.hiddenConditioning);
  const own = block && pool.find((c) => c.id === block.machine);
  // This workout's own length if it has one; else the machine's usual one, from the Library.
  const ownLength = block && (block.course !== undefined || block.minutes !== undefined);
  if (own) return { machine: own, ...lengthOf(own, ownLength ? block : (state.cardioTargets?.[own.id] ?? block)) };
  const fallback = pool.find((c) => c.id === CARDIO_DEFAULT[isEnd(where) ? where : "open"]) ?? pool[0];
  return fallback ? { machine: fallback, ...lengthOf(fallback, state.cardioTargets?.[fallback.id]) } : null;
};

/**
 * Where a cardio block is in a workout: one of the two it has always had —
 * the one that opens it and the one that closes it — or one of its extras,
 * by id.
 */
export type CardioWhere = CardioEnd | (string & {});
/** Where a routine is: the warm-up, the stretch it ends on, or an extra by id. */
export type RoutineWhere = RoutineEnd | (string & {});

const isEnd = (where: string): where is CardioEnd => where === "open" || where === "close";
const extraOf = (workout: Workout, id: string): Extra | undefined => workout.extras?.find((x) => x.id === id);

/** The usual target, including an existing planned target before shared settings were added. */
export const cardioTarget = (state: SessionState, id: string): CardioLength => {
  const saved = state.cardioTargets?.[id];
  const machine = cardioById(id);
  if (saved) return machine ? lengthOf(machine, saved) : saved;
  for (const workout of state.workouts) {
    for (const where of ["open", "close"] as const) {
      const plan = cardioPlan(state, workout, where);
      if (plan?.machine.id === id) return plan.course !== undefined ? { course: plan.course } : { minutes: plan.minutes };
    }
  }
  return lengthOf(cardioById(id)!);
};

/**
 * The cardio as it runs here. At the gym, the workout's machine. Without
 * machines, the opening block becomes a walk or jog outside — skipping rope
 * one swap away — for as many minutes as the workout's own block runs, and
 * the closing block is left out.
 */
export const cardioHere = (
  state: SessionState,
  workout: Workout,
  where: CardioWhere,
): CardioPlan | null => {
  if (hasMachines(state)) return cardioPlan(state, workout, where);
  const block = isEnd(where) ? workout.cardio?.[where] : extraOf(workout, where)?.cardio ?? null;
  if (block === null) return null;
  const plan = cardioPlan(state, workout, where);
  if (plan && AWAY_CARDIO.some((exercise) => exercise.id === plan.machine.id)) return plan;
  // Away, only the opening block becomes a walk; the rest are left out.
  if (where !== "open") return null;
  const outdoor = AWAY_CARDIO[0];
  return { machine: outdoor, ...lengthOf(outdoor, state.cardioTargets?.[outdoor.id] ?? { minutes: block?.minutes ?? CARDIO_MINUTES }) };
};

/** "1 km" or "5 min". */
export const cardioAmount = (plan: CardioPlan): string =>
  plan.course !== undefined ? courseLabel(plan.machine, plan.course) : `${plan.minutes} min`;

/**
 * Swap the exercise a workout's slot uses, for good: any exercise of the
 * slot's movement, from your catalogue or the library — one from the library
 * joins your catalogue on the way in. Refused for one another slot is using.
 */
export const swapInPlan = (
  state: SessionState,
  workoutId: string,
  entryId: string,
  exerciseId: string,
): SessionState => {
  const entry = workoutById(state, workoutId)?.exercises.find((e) => e.id === entryId);
  const ex = lookup(state, exerciseId);
  if (!entry || !ex || ex.restricted) return state;
  if (takenElsewhere(state, workoutId, entry).has(exerciseId)) return state;
  let shown: SessionState = { ...state, hidden: state.hidden.filter((h) => h !== exerciseId) };
  // From "Any exercise": the slot becomes the new exercise's kind, so the
  // next swap offers its relatives. Its sets and reps stay as you set them.
  if (!isPattern(ex, entry.pattern)) {
    const pattern = ex.patterns[0];
    shown = patchWorkout(shown, workoutId, (w) => ({
      ...w,
      exercises: w.exercises.map((e) =>
        e.id === entryId ? { ...e, pattern, slot: PATTERN_LABEL[pattern], options: [exerciseId] } : e,
      ),
    }));
  }
  const next = chooseExercise(shown, workoutId, entryId, exerciseId);
  return next === shown ? state : next;
};

/**
 * Only the exercises the plan in use can do with its equipment: everything
 * at a full gym. What the Library and Add exercise show.
 */
export const doableHere = (state: SessionState, list: Exercise[]): Exercise[] =>
  atGym(state) ? list : list.filter((e) => fits({ id: e.id }, kitAt(state)));

/**
 * Everything a swap for today could reach from "Any exercise": the whole
 * library, or away from a full gym only what this place has.
 */
export const swapAnywhere = (state: SessionState): Exercise[] => {
  const all = everyExercise(state);
  return atGym(state) ? all : all.filter((e) => fits({ id: e.id }, kitAt(state)));
};

/** A routine's length, to the nearest minute. */
export const routineMinutes = (routine: MobilityRoutine): number =>
  Math.max(1, Math.round(routineSeconds(routine) / 60));

/**
 * The routine a workout ends on, or null if it has none. Yours if you chose
 * one and it is still in the catalogue; otherwise the everyday stretch, or
 * whatever is left.
 */
export const mobilityPlan = (state: SessionState, workout: Workout): MobilityRoutine | null => {
  if (workout.mobility === null) return null;
  const pool = mobilityPool(state.hiddenConditioning);
  const usable = (id: string | undefined) => (id ? pool.find((m) => m.id === id) : undefined);
  return usable(workout.mobility) ?? usable(DEFAULT_MOBILITY) ?? pool[0] ?? null;
};

/**
 * What kind of day a workout is, for its warm-up: push, pull or legs, by
 * which its lifts are mostly; on a tie, whichever comes first in it. Null for
 * a day with no lifts of those kinds.
 */
export const warmupDay = (state: SessionState, workout: Workout): WarmupDay | null => {
  const count: Record<WarmupDay, number> = { push: 0, pull: 0, legs: 0 };
  const order: WarmupDay[] = [];
  for (const { exerciseId } of liftsToRun(state, workout)) {
    const family = familyOf(byId(exerciseId));
    if (family !== "push" && family !== "pull" && family !== "legs") continue;
    count[family] += 1;
    if (!order.includes(family)) order.push(family);
  }
  return order.reduce<WarmupDay | null>((best, day) => (best === null || count[day] > count[best] ? day : best), null);
};

/**
 * The routine a workout opens with, or null. Yours if you chose one and it
 * is still in the catalogue; otherwise the warm-up for its kind of day.
 */
export const warmupPlan = (state: SessionState, workout: Workout): MobilityRoutine | null => {
  if (workout.warmup === null) return null;
  const pool = mobilityPool(state.hiddenConditioning);
  const usable = (id: string | undefined) => (id ? pool.find((m) => m.id === id) : undefined);
  const own = usable(workout.warmup);
  if (own) return own;
  const day = warmupDay(state, workout);
  return day ? (usable(WARMUP[day]) ?? null) : null;
};

/** The warm-up as it runs here: away from a gym, its band moves become ones that need nothing. */
const warmupHere = (state: SessionState, workout: Workout): MobilityRoutine | null => {
  const plan = warmupPlan(state, workout);
  return plan && (kindOf(workout) === "bodyweight" || !hasMachines(state)) ? awayVersion(plan) : plan;
};

/**
 * The workouts that open or end on a routine, so an edit can say who else it
 * reaches: in the plan in use, as they run; in the others, the ones that
 * name it. (A waiting plan's own routines may still be in the library, and
 * only come out of it when you switch to that plan.)
 */
export const workoutsUsing = (state: SessionState, routineId: string): Workout[] => {
  const here = new Set(state.workouts.map((w) => w.id));
  return everyLoopWorkout(state).filter(
    (w) =>
      (here.has(w.id)
        ? mobilityPlan(state, w)?.id === routineId || warmupPlan(state, w)?.id === routineId
        : w.mobility === routineId || w.warmup === routineId) ||
      !!w.extras?.some((x) => x.routine === routineId),
  );
};

/** A cardio block for one end of the session, or null if the workout has none there. */
const cardioBlock = (state: SessionState, workout: Workout, where: CardioWhere): Item | null => {
  const plan = cardioHere(state, workout, where);
  if (!plan) return null;
  const slot = isEnd(where) ? CARDIO_SLOTS[where] : where;
  return {
    kind: "cardio",
    id: slot,
    slot,
    // The pattern and scheme are never read for a conditioning block — they
    // exist only because `Item` extends the lifting `Entry`.
    pattern: "abs",
    options: [],
    scheme: "volume",
    exerciseId: plan.machine.id,
    ...lengthFields(plan),
    weight: 0,
    logged: [],
  };
};

/** The closing mobility block, or null if the workout has none. */
const mobilityBlock = (state: SessionState, workout: Workout): Item | null =>
  routineBlock(mobilityPlan(state, workout), MOBILITY_SLOT);

/** The warm-up block after the opening cardio, or null if the workout has none. */
const warmupBlock = (state: SessionState, workout: Workout): Item | null =>
  routineBlock(warmupHere(state, workout), WARMUP_SLOT);

/** A routine as a block in the session, under its slot. */
const routineBlock = (routine: MobilityRoutine | null, slot: string): Item | null => {
  if (!routine) return null;
  return {
    kind: "mobility",
    id: slot,
    slot,
    pattern: "abs",
    options: [],
    scheme: "volume",
    exerciseId: routine.id,
    moves: routine.moves.map(() => false),
    weight: 0,
    logged: [],
  };
};

// ---- a workout's cardio and mobility, from Plan ----

/**
 * Set a workout's cardio at one end. A block changes the machine or its
 * length; undefined puts back the default; null takes the cardio out. Like
 * every Plan change it applies from the next session, not the one running.
 */
export const setCardio = (
  state: SessionState,
  workoutId: string,
  where: CardioWhere,
  block: CardioBlock | null | undefined,
): SessionState =>
  patchWorkout(state, workoutId, (w) => {
    // An extra: changed, or — null — taken out. It has no default to go back to.
    if (!isEnd(where)) {
      if (block === undefined) return w;
      return block === null
        ? { ...w, extras: w.extras?.filter((x) => x.id !== where) }
        : { ...w, extras: w.extras?.map((x) => (x.id === where ? { ...x, cardio: block } : x)) };
    }
    const cardio = { ...w.cardio };
    if (block === undefined) delete cardio[where];
    else cardio[where] = block;
    return { ...w, cardio };
  });

/** Put a different machine at one end, at that machine's default length. */
export const chooseCardio = (
  state: SessionState,
  workoutId: string,
  where: CardioWhere,
  machine: string,
): SessionState => setCardio(state, workoutId, where, { machine });

/** Which of the workout's cardio a running block is: the opening one, the closing one, or an extra. */
export const cardioEnd = (item: Item): CardioWhere =>
  item.id === CARDIO_SLOTS.close ? "close" : item.id === CARDIO_SLOTS.open ? "open" : item.id;

/**
 * Set the routine a workout opens with. Undefined goes back to the shoulder
 * warm-up on a day that presses; null takes it out.
 */
export const setWarmup = (
  state: SessionState,
  workoutId: string,
  routine: string | null | undefined,
): SessionState =>
  patchWorkout(state, workoutId, (w) => {
    const { warmup: _old, ...rest } = w;
    return routine === undefined ? rest : { ...rest, warmup: routine };
  });

/**
 * Set the routine a workout ends on. Undefined goes back to the one that
 * suits its exercises; null takes mobility out.
 */
export const setMobility = (
  state: SessionState,
  workoutId: string,
  routine: string | null | undefined,
): SessionState =>
  patchWorkout(state, workoutId, (w) => {
    const { mobility: _old, ...rest } = w;
    return routine === undefined ? rest : { ...rest, mobility: routine };
  });

/** The routine at a place in a workout: its warm-up, its stretch, or an extra. */
export const routinePlan = (state: SessionState, workout: Workout, where: RoutineWhere): MobilityRoutine | null => {
  if (where === "warmup") return warmupPlan(state, workout);
  if (where === "end") return mobilityPlan(state, workout);
  const id = extraOf(workout, where)?.routine;
  return (id && mobilityPool(state.hiddenConditioning).find((m) => m.id === id)) || null;
};

/** Put a routine at a place in a workout, or — null — take it out. */
export const chooseRoutine = (
  state: SessionState,
  workoutId: string,
  where: RoutineWhere,
  routine: string | null,
): SessionState => {
  if (where === "warmup") return setWarmup(state, workoutId, routine);
  if (where === "end") return setMobility(state, workoutId, routine);
  return patchWorkout(state, workoutId, (w) => ({
    ...w,
    extras: routine === null
      ? w.extras?.filter((x) => x.id !== where)
      : w.extras?.map((x) => (x.id === where ? { ...x, routine } : x)),
  }));
};

/**
 * Add cardio or a routine to a block of a workout, at its end — never in
 * place of what is there. As many as you like.
 */
export const addExtra = (
  state: SessionState,
  workoutId: string,
  part: Block,
  what: { cardio: CardioBlock } | { routine: string },
  id: string = newId("x"),
): SessionState =>
  patchWorkout(state, workoutId, (w) => ({
    ...w,
    extras: [...(w.extras ?? []), { id, ...(part === "main" ? {} : { part }), ...what }],
  }));

/** One thing in a block of a workout: an exercise, cardio, or a routine. */
export type Placed =
  | { id: string; entry: Entry }
  | { id: string; cardio: CardioWhere }
  | { id: string; routine: RoutineWhere };

/**
 * Every id in one block of a workout, in the order they run — whether or
 * not there is anything there now (a workout with no warm-up still has its
 * place). Without an order of your own: cardio, then the warm-up, then the
 * rest at the start; the stretch last of all at the finish; what was added
 * after what was there. With one, yours, and anything it doesn't name after.
 */
export const partIds = (workout: Workout, part: Block): string[] => {
  const entries = workout.exercises.filter((e) => (e.part ?? "main") === part).map((e) => e.id);
  const extras = (workout.extras ?? []).filter((x) => (x.part ?? "main") === part).map((x) => x.id);
  const usual =
    part === "start" ? [CARDIO_SLOTS.open, WARMUP_SLOT, ...entries, ...extras]
    : part === "finish" ? [...entries, CARDIO_SLOTS.close, MOBILITY_SLOT, ...extras]
    : [...entries, ...extras];
  const order = workout.order?.[part]?.filter((id) => usual.includes(id));
  return order ? [...order, ...usual.filter((id) => !order.includes(id))] : usual;
};

/** What is at each id of a block, leaving out the places with nothing in them. */
export const partContents = (state: SessionState, workout: Workout, part: Block): Placed[] =>
  partIds(workout, part).flatMap((id): Placed[] => {
    if (id === CARDIO_SLOTS.open || id === CARDIO_SLOTS.close) {
      const where = id === CARDIO_SLOTS.open ? "open" : "close";
      return cardioPlan(state, workout, where) ? [{ id, cardio: where }] : [];
    }
    if (id === WARMUP_SLOT) return warmupPlan(state, workout) ? [{ id, routine: "warmup" }] : [];
    if (id === MOBILITY_SLOT) return mobilityPlan(state, workout) ? [{ id, routine: "end" }] : [];
    const entry = workout.exercises.find((e) => e.id === id);
    if (entry) return [{ id, entry }];
    const extra = extraOf(workout, id);
    if (extra?.cardio) return cardioPlan(state, workout, id) ? [{ id, cardio: id }] : [];
    if (extra?.routine) return routinePlan(state, workout, id) ? [{ id, routine: id }] : [];
    return [];
  });

/**
 * A block put in a new order, as dragged: `ids` is what it shows, in the
 * order it should run. Its exercises take the same order in the workout's
 * list, so everything that reads them in order agrees.
 */
export const arrangePart = (state: SessionState, workoutId: string, part: Block, ids: string[]): SessionState =>
  patchWorkout(state, workoutId, (w) => {
    const mine = (e: Entry) => (e.part ?? "main") === part;
    const lifts = ids.flatMap((id) => w.exercises.filter((e) => e.id === id && mine(e)));
    let next = 0;
    const exercises = w.exercises.map((e) => (mine(e) ? (lifts[next++] ?? e) : e));
    return { ...w, exercises, order: { ...w.order, [part]: ids } };
  });

/** The cardio machine or mobility routine on screen, if this is one. */
export const currentCardio = (state: SessionState): CardioExercise | undefined => {
  const item = state.active?.items[state.active.cursor];
  return item && isCardio(item) ? cardioById(item.exerciseId) : undefined;
};

export const currentRoutine = (state: SessionState): MobilityRoutine | undefined => {
  const item = state.active?.items[state.active.cursor];
  return item && isMobility(item) ? mobilityById(item.exerciseId) : undefined;
};

/**
 * The name of what comes after the one on screen — a lift, a machine or a
 * routine — for the button that moves on. Null when this is the last.
 */
export const nextItemName = (state: SessionState): string | null => {
  const item = state.active?.items[state.active.cursor + 1];
  if (!item) return null;
  const name = isCardio(item)
    ? cardioById(item.exerciseId)?.name
    : isMobility(item)
      ? mobilityById(item.exerciseId)?.name
      : isGoal(item)
        ? goalStepOf(state, item)?.step.name
        : byId(item.exerciseId)?.name;
  return name || "Next";
};

/**
 * Enter the block's score — distance covered, or time over the course. Null
 * clears it back to unentered.
 */
export const setScore = (state: SessionState, score: number | null): SessionState =>
  patchItem(state, (it) => {
    if (!isCardio(it)) return it;
    const value = score === null || !Number.isFinite(score) || score <= 0 ? null : score;
    return isTimed(it) ? { ...it, seconds: value } : { ...it, distance: value };
  });

/**
 * Done on a cardio block. Left unentered with a record to go on, it means
 * "same as last time" — the number you were shown is what gets logged.
 */
export const completeCardio = (state: SessionState): SessionState => {
  const item = state.active?.items[state.active.cursor];
  if (!item || !isCardio(item)) return completeExercise(state);
  return cardioDone(item) ? completeExercise(state) : state;
};

/**
 * The clock of a block on the clock alone (see `onTheClock`): start it, or
 * carry on from a pause. It keeps an end time, so a locked phone or a slow
 * frame can't stretch it.
 */
export const startClock = (state: SessionState, now: number): SessionState =>
  patchItem(state, (it) => {
    if (!isCardio(it) || it.ran || it.clock?.endAt) return it;
    const left = it.clock?.left ?? (it.minutes ?? CARDIO_MINUTES) * 60;
    return { ...it, clock: { left, endAt: now + left * 1000 } };
  });

/** Pause the clock: what is left is kept for carrying on. */
export const pauseClock = (state: SessionState, now: number): SessionState =>
  patchItem(state, (it) =>
    isCardio(it) && it.clock?.endAt ? { ...it, clock: { left: Math.max(0, Math.ceil((it.clock.endAt - now) / 1000)), endAt: null } } : it,
  );

/** The clock ran out: the block is done, all its minutes in. */
export const finishClock = (state: SessionState): SessionState =>
  patchItem(state, (it) =>
    isCardio(it) && !it.ran ? { ...it, clock: undefined, ran: (it.minutes ?? CARDIO_MINUTES) * 60 } : it,
  );

/** Save one warm-up/stretch side independently, including a deliberate skip. */
export const resolveRoutineStep = (state: SessionState, step: number, status: "done" | "skipped"): SessionState =>
  patchItem(state, (it) => {
    if (!isMobility(it)) return it;
    const routine = mobilityById(it.exerciseId);
    if (!routine) return it;
    const indices = routine.moves.flatMap((move, index) => move.perSide ? [index, index] : [index]);
    if (!Number.isInteger(step) || step < 0 || step >= indices.length) return it;
    const routineSteps = indices.map((index, i) => i === step ? status : it.routineSteps?.[i] ?? (it.moves?.[index] ? "done" : null));
    const moves = routine.moves.map((_, index) => indices.every((pose, i) => pose !== index || routineSteps[i] === "done"));
    return { ...it, routineSteps, moves };
  });

/**
 * Finish the routine on screen and move on. It counts as done however much
 * of it you held: stretching is not scored, and a move left out is still a
 * routine done. The moves you did stay recorded as they were.
 */
export const finishRoutine = (state: SessionState): SessionState =>
  completeExercise(patchItem(state, (it) => (isMobility(it) ? { ...it, finished: true } : it)));

/**
 * Swap the machine or routine on screen for this session only — the
 * treadmills are all taken. Like a lift's swap, the workout is untouched and
 * offers its usual block next time; changing that for good is Plan's job.
 * A machine swapped in runs its own default length.
 */
export const swapConditioning = (state: SessionState, id: string): SessionState =>
  patchItem(state, (it) => {
    if (isCardio(it)) {
      const machine = cardioById(id);
      return machine ? { ...it, exerciseId: id, ...lengthFields(cardioTarget(state, id)) } : it;
    }
    if (isMobility(it)) {
      const routine = mobilityById(id);
      return routine ? { ...it, exerciseId: id, moves: routine.moves.map(() => false), routineSteps: undefined } : it;
    }
    return it;
  });

/** The machines or routines this block could use, minus anything removed. */
export const conditioningPool = (
  state: SessionState,
  item: Item,
): { id: string; name: string }[] =>
  isCardio(item)
    ? (hasMachines(state) ? cardioPool(state.hiddenConditioning) : AWAY_CARDIO.filter((c) => !state.hiddenConditioning.includes(c.id))).map((c) => ({
        id: c.id,
        name: c.name,
      }))
    : mobilityPool(state.hiddenConditioning).map((m) => ({ id: m.id, name: m.name }));

// ---- mobility routines: their holds ----

/** Keep the module-level edit list in step with the state. */
const syncMobilityEdits = (state: SessionState): SessionState => {
  setMobilityEdits(state.mobilityEdits);
  return state;
};

/**
 * Change a routine's name or holds. One of yours is changed in place; a
 * built-in keeps your changes beside it, so it can be put back as it shipped.
 * A routine always keeps at least one hold.
 */
export const editRoutine = (
  state: SessionState,
  routineId: string,
  patch: MobilityEdit,
): SessionState => {
  if (patch.moves && patch.moves.length === 0) return state;
  if (state.customMobility.some((m) => m.id === routineId)) {
    return syncConditioning({
      ...state,
      customMobility: state.customMobility.map((m) => (m.id === routineId ? { ...m, ...patch } : m)),
    });
  }
  if (!MOBILITY.some((m) => m.id === routineId)) return state;
  return syncMobilityEdits({
    ...state,
    mobilityEdits: {
      ...state.mobilityEdits,
      [routineId]: { ...state.mobilityEdits[routineId], ...patch },
    },
  });
};

/** Change a routine's holds with a function of the current ones. */
const editHolds = (
  state: SessionState,
  routineId: string,
  fn: (moves: MobilityMove[]) => MobilityMove[],
): SessionState => {
  const routine = mobilityById(routineId);
  return routine ? editRoutine(state, routineId, { moves: fn(routine.moves) }) : state;
};

/**
 * Add a hold at the end of a routine: a stretch from the library, with its
 * photo, guide and usual time — or, given a name, one of your own.
 */
export const addHold = (
  state: SessionState,
  routineId: string,
  add: { stretch: string } | { name: string },
  holdId: string = newId("h"),
): SessionState => {
  if ("stretch" in add) {
    const stretch = stretchById(add.stretch);
    if (!stretch) return state;
    return editHolds(state, routineId, (moves) => [...moves, holdOf(stretch, holdId)]);
  }
  const name = add.name.trim();
  if (!name) return state;
  return editHolds(state, routineId, (moves) => [...moves, { id: holdId, name, seconds: 45 }]);
};

/** Take a hold out. The last one stays: a routine with nothing in it is not a routine. */
export const removeHold = (state: SessionState, routineId: string, holdId: string): SessionState =>
  editHolds(state, routineId, (moves) => moves.filter((m) => m.id !== holdId));

/**
 * Change how long a hold runs, by one `HOLD_STEP` — or, for a move done for
 * reps, by one rep — or whether it is held on each side.
 */
export const nudgeHold = (
  state: SessionState,
  routineId: string,
  holdId: string,
  direction: 1 | -1,
): SessionState =>
  editHolds(state, routineId, (moves) =>
    moves.map((m) => {
      if (m.id !== holdId) return m;
      if (m.reps) {
        const reps = Math.max(REPS_RANGE_MOVE.min, Math.min(REPS_RANGE_MOVE.max, m.reps + direction));
        return { ...m, reps, seconds: secondsFor(reps) };
      }
      return {
        ...m,
        seconds: Math.max(
          HOLD_RANGE.min,
          Math.min(HOLD_RANGE.max, Math.round(m.seconds / HOLD_STEP) * HOLD_STEP + HOLD_STEP * direction),
        ),
      };
    }),
  );

export const setHoldSides = (
  state: SessionState,
  routineId: string,
  holdId: string,
  perSide: boolean,
): SessionState =>
  editHolds(state, routineId, (moves) =>
    moves.map((m) => {
      if (m.id !== holdId) return m;
      const { perSide: _old, ...rest } = m;
      return perSide ? { ...rest, perSide: true } : rest;
    }),
  );

/** Move a hold to a new place in its routine. */
export const moveHold = (
  state: SessionState,
  routineId: string,
  from: number,
  to: number,
): SessionState => editHolds(state, routineId, (moves) => move(moves, from, to));

/** Whether a built-in routine has been changed from how it shipped. */
export const isRoutineEdited = (state: SessionState, routineId: string): boolean =>
  !!state.mobilityEdits[routineId];

/** Put a built-in routine back as it shipped: its name and its holds. */
export const resetRoutine = (state: SessionState, routineId: string): SessionState => {
  const { [routineId]: _gone, ...mobilityEdits } = state.mobilityEdits;
  return syncMobilityEdits({ ...state, mobilityEdits });
};

/** Which routine of a workout: the warm-up it opens with, or the stretch it ends on. */
export type RoutineEnd = "warmup" | "end";

/**
 * A routine you create from scratch starts as a copy of the everyday stretch,
 * so it works from the first tap; change it from there.
 */
export const createRoutine = (
  state: SessionState,
  id: string,
  name: string,
  use: RoutineUse = "end",
): SessionState => {
  const from =
    mobilityPool(state.hiddenConditioning).find((m) => routineUse(m) === use) ??
    mobilityById(DEFAULT_MOBILITY) ??
    mobilityPool(state.hiddenConditioning)[0];
  const trimmed = name.trim();
  if (!from || !trimmed) return state;
  return addMobility(state, {
    id,
    name: trimmed,
    subtitle: "your routine",
    moves: from.moves.map((m) => ({ ...m })),
    ...(use === "warmup" ? { use } : {}),
  });
};

// ---- the conditioning catalogue ----

/**
 * Whether a machine or routine is one of yours rather than built in.
 * A built-in is hidden on removal; one of yours is genuinely deleted.
 */
export const isCustomConditioning = (state: SessionState, id: string): boolean =>
  state.customCardio.some((c) => c.id === id) ||
  state.customMobility.some((m) => m.id === id);

/**
 * Whether a machine or routine can be removed.
 *
 * The last one of its kind stays: a cardio block with an empty pool would
 * have nothing to prescribe. Same rule the lifting catalogue applies to the
 * last exercise of a movement type.
 */
export const canRemoveConditioning = (state: SessionState, id: string): boolean => {
  if (cardioById(id) && !mobilityById(id)) {
    return cardioPool(state.hiddenConditioning).length > 1;
  }
  if (mobilityById(id)) {
    return mobilityPool(state.hiddenConditioning).length > 1;
  }
  return false;
};

/** Keep the module-level lookup lists in step with the state. */
const syncConditioning = (state: SessionState): SessionState => {
  setCustomConditioning(state.customCardio, state.customMobility);
  return state;
};

/** Add a cardio machine to the pool. It is offered by both cardio blocks. */
export const addCardio = (
  state: SessionState,
  cardio: CardioExercise,
): SessionState =>
  syncConditioning({ ...state, customCardio: [...state.customCardio, cardio] });

/** Add a mobility routine to the pool. */
export const addMobility = (
  state: SessionState,
  routine: MobilityRoutine,
): SessionState =>
  syncConditioning({
    ...state,
    customMobility: [...state.customMobility, routine],
  });

/**
 * Remove a machine or routine. Any workout using it falls back to the
 * default — see `cardioPlan` and `mobilityPlan` — but keeps pointing at it,
 * so restoring it puts it back where it was. A built-in is hidden rather than
 * deleted, so its distance records survive too. Refused if it would empty a
 * pool.
 */
export const removeConditioning = (state: SessionState, id: string): SessionState => {
  if (!canRemoveConditioning(state, id)) return state;
  const mine = isCustomConditioning(state, id);
  return syncConditioning({
    ...state,
    customCardio: state.customCardio.filter((c) => c.id !== id),
    customMobility: state.customMobility.filter((m) => m.id !== id),
    hiddenConditioning: mine
      ? state.hiddenConditioning
      : [...state.hiddenConditioning, id],
  });
};

/** Put a removed built-in back, records and all. */
export const restoreConditioning = (state: SessionState, id: string): SessionState => ({
  ...state,
  hiddenConditioning: state.hiddenConditioning.filter((h) => h !== id),
});

/** Built-in machines and routines you have removed, so they can be put back. */
export const hiddenConditioningList = (
  state: SessionState,
): { id: string; name: string; kind: "cardio" | "mobility" }[] => [
  ...hiddenCardio(state.hiddenConditioning).map((c) => ({
    id: c.id,
    name: c.name,
    kind: "cardio" as const,
  })),
  ...hiddenMobility(state.hiddenConditioning).map((m) => ({
    id: m.id,
    name: m.name,
    kind: "mobility" as const,
  })),
];

// ---- goals ----

/** A goal by id. */
export const goalById = (state: SessionState, id: string): Goal | undefined =>
  state.goals.find((g) => g.id === id);

/**
 * The goals a workout practises, in the order they sit in Plan. Not one
 * already learned, and not one with no steps yet — there would be nothing
 * to do.
 */
export const goalsIn = (state: SessionState, workoutId: string): Goal[] =>
  GOALS_ON
    ? state.goals.filter((g) => !g.learned && g.steps.length > 0 && g.workouts.includes(workoutId))
    : [];

/** The workouts a goal is practised in, by name, in loop order. */
export const goalWorkouts = (state: SessionState, goal: Goal): Workout[] =>
  state.workouts.filter((w) => goal.workouts.includes(w.id));

/** A goal's block in a session: the step you are on, its circles empty. */
const goalBlock = (goal: Goal): Item => {
  const step = currentStep(goal)!;
  const slot = `goal/${goal.id}`;
  return {
    kind: "goal",
    id: slot,
    slot,
    pattern: "abs",
    options: [],
    scheme: "volume",
    exerciseId: goal.id,
    step: step.id,
    weight: 0,
    // Practice keeps one entry — the seconds practised — not a circle a set.
    logged: Array<number | null>(step.measure === "practice" ? 1 : step.sets).fill(null),
  };
};

/**
 * A goal block's goal and step, read live, so an edit in Plan — a note, a
 * name — shows straight away. Null once either has been deleted.
 */
export const goalStepOf = (
  state: SessionState,
  item: Item,
): { goal: Goal; step: GoalStep; index: number } | null => {
  const goal = goalById(state, item.exerciseId);
  const index = goal ? goal.steps.findIndex((st) => st.id === item.step) : -1;
  return goal && index >= 0 ? { goal, step: goal.steps[index], index } : null;
};

/**
 * What today's work on a step means, worked out by `applyGoal` itself, so
 * the screen can never disagree with what happens. Null until every circle
 * is in — or, for practice, until you say you've got it.
 */
export type GoalVerdict = {
  outcome: GoalOutcome;
  /** That was the last step: the goal is learned. */
  learned: boolean;
};

export const goalVerdict = (state: SessionState, item: Item): GoalVerdict | null => {
  const found = goalStepOf(state, item);
  if (!found || item.skipped) return null;
  const { goal, step } = found;
  const done = step.measure === "practice" ? !!item.got : item.logged.every((r) => r !== null);
  if (!done) return null;
  const after = applyGoal(goal, step.id, item.logged, !!item.got, Date.now());
  return { outcome: after.outcome, learned: !!after.goal.learned && !goal.learned };
};

/** Write one circle of the goal block on screen. Filling an empty one starts the rest. */
const writeGoalSet = (
  state: SessionState,
  index: number,
  next: (current: number | null, step: GoalStep) => number | null,
): SessionState => {
  const item = state.active?.items[state.active.cursor];
  const found = item && isGoal(item) ? goalStepOf(state, item) : null;
  if (!state.active || !item || !found) return state;
  const logged = item.logged.map((r, i) => (i === index ? next(r, found.step) : r));
  // Corrections and clearing a circle are edits, not another finished set.
  const newlyLogged = item.logged[index] === null && logged[index] !== null;
  const patched = patchItem(state, (it) => ({ ...it, logged }));
  return newlyLogged
    ? { ...patched, active: { ...patched.active!, lastSetAt: Date.now() } }
    : patched;
};

/**
 * Tap a circle of a goal step: reps go empty → target → one fewer a tap →
 * empty, like a lift's. A hold already in comes down five seconds a tap; an
 * empty one is started by its own clock on screen instead — see `logGoalSet`.
 */
export const tapGoalSet = (state: SessionState, index: number): SessionState =>
  writeGoalSet(state, index, (current, step) => {
    const by = step.measure === "hold" ? GOAL_HOLD_STEP : 1;
    return current === null ? step.target : current === 0 ? null : Math.max(0, current - by);
  });

/** Long press: a set not done, as for a lift's (see `skipSet`). */
export const skipGoalSet = (state: SessionState, index: number): SessionState =>
  writeGoalSet(state, index, () => 0);

/** A hold's clock stopped or ran out: what it read, in whole seconds. */
export const logGoalSet = (state: SessionState, index: number, seconds: number): SessionState =>
  writeGoalSet(state, index, () => Math.max(1, Math.round(seconds)));

/** Practice: you've got it — or, tapped again, not yet. */
export const setGot = (state: SessionState, got: boolean): SessionState =>
  patchItem(state, (it) => (isGoal(it) ? { ...it, got } : it));

/**
 * Next on a goal block. Practice counts as done when you move on — the clock
 * is a guide, not a gate — at what it ran, or the whole time if you never
 * started it. Skipping is how you say you didn't.
 */
export const completeGoal = (state: SessionState, practised?: number): SessionState => {
  const item = state.active?.items[state.active.cursor];
  const found = item && isGoal(item) ? goalStepOf(state, item) : null;
  if (!found || found.step.measure !== "practice") return completeExercise(state);
  const seconds = Math.round(practised ?? found.step.target * 60);
  return completeExercise(patchItem(state, (it) => ({ ...it, logged: [Math.max(1, seconds)] })));
};

/** Change one goal. */
const patchGoal = (state: SessionState, id: string, fn: (goal: Goal) => Goal): SessionState => ({
  ...state,
  goals: state.goals.map((g) => {
    if (g.id !== id) return g;
    const next = fn(g);
    // A starting goal begins the day you take it up, not the day it came.
    return next.since === 0 && isStarted(next) ? { ...next, since: Date.now() } : next;
  }),
});

/** A new goal: a name, no steps yet, in no workout yet. */
export const addGoal = (
  state: SessionState,
  id: string,
  name: string,
  now: number = Date.now(),
): SessionState => ({
  ...state,
  goals: [
    ...state.goals,
    { id, name, steps: [], at: 0, streak: 0, owned: {}, workouts: [], since: now },
  ],
});

export const updateGoal = (
  state: SessionState,
  id: string,
  patch: { name?: string; link?: string },
): SessionState => patchGoal(state, id, (g) => ({ ...g, ...patch }));

/**
 * Delete a goal and everything it learned. A session running it keeps the
 * block on screen — it was already under way — but drops it from further on.
 */
export const deleteGoal = (state: SessionState, id: string): SessionState => {
  const active = state.active && {
    ...state.active,
    items: state.active.items.filter(
      (it, i) => i <= state.active!.cursor || !(isGoal(it) && it.exerciseId === id),
    ),
  };
  return { ...state, active, goals: state.goals.filter((g) => g.id !== id) };
};

/** Put a goal in a workout, or take it out. From the next time it runs. */
export const practiseIn = (
  state: SessionState,
  goalId: string,
  workoutId: string,
  on: boolean,
): SessionState =>
  patchGoal(state, goalId, (g) => ({
    ...g,
    workouts: on
      ? [...g.workouts.filter((w) => w !== workoutId), workoutId]
      : g.workouts.filter((w) => w !== workoutId),
  }));

/** A step as the step sheet opens it: three sets, at a measure's starting number. */
export const newStep = (id: string, measure: Measure = "reps"): GoalStep => ({
  id,
  name: "",
  measure,
  sets: GOAL_SETS.start,
  target: TARGET_LIMITS[measure].start,
});

/**
 * Add a step at the top of the ladder. A goal already learned has somewhere
 * to go again: the new step becomes the one you are on.
 */
export const addStep = (state: SessionState, goalId: string, step: GoalStep): SessionState =>
  patchGoal(state, goalId, (g) => ({
    ...g,
    steps: [...g.steps, step],
    ...(g.learned ? { learned: undefined, at: g.steps.length, streak: 0 } : {}),
  }));

export const updateStep = (
  state: SessionState,
  goalId: string,
  stepId: string,
  patch: Partial<Omit<GoalStep, "id">>,
): SessionState =>
  patchGoal(state, goalId, (g) => ({
    ...g,
    steps: g.steps.map((st) => (st.id === stepId ? { ...st, ...patch } : st)),
  }));

/**
 * Take a step out. You stay on the same step if it was another; take out
 * the one you are on and the next one up is yours to work on — at the top,
 * the one below.
 */
export const removeStep = (state: SessionState, goalId: string, stepId: string): SessionState =>
  patchGoal(state, goalId, (g) => {
    const index = g.steps.findIndex((st) => st.id === stepId);
    if (index < 0) return g;
    const steps = g.steps.filter((st) => st.id !== stepId);
    const at = Math.max(0, Math.min(index < g.at ? g.at - 1 : g.at, steps.length - 1));
    return { ...g, steps, at, streak: index === g.at ? 0 : g.streak };
  });

/** Reorder the ladder. The step you are on stays the one you are on. */
export const moveStep = (
  state: SessionState,
  goalId: string,
  from: number,
  to: number,
): SessionState =>
  patchGoal(state, goalId, (g) => {
    const current = currentStep(g)?.id;
    const steps = [...g.steps];
    const [moved] = steps.splice(from, 1);
    steps.splice(to, 0, moved);
    return { ...g, steps, at: Math.max(0, steps.findIndex((st) => st.id === current)) };
  });

/**
 * Work on a goal from a step — further up because it's already easy, or
 * back down because it isn't. The count of sessions on target starts again.
 */
export const startFrom = (state: SessionState, goalId: string, index: number): SessionState =>
  patchGoal(state, goalId, (g) =>
    index < 0 || index >= g.steps.length
      ? g
      : { ...g, at: index, streak: 0, learned: undefined },
  );

// ---- the intro ----

/**
 * Whether the intro should open by itself: never finished or skipped, and
 * nothing trained yet. A phone with training on it belongs to someone who
 * already knows their way round — from before the intro, or a backup put
 * back — so it waits behind Plan's ? instead.
 */
/**
 * The answers a plan is made from: where you usually train (null for a gym,
 * else what home has), how long a visit is, what to go easy on, and a shape
 * of your own if you would rather not have the one your time gets.
 */
export type Answers = {
  home: Kit | null;
  time: Time;
  easy: Easy[];
  shape?: Shape;
  /** For starting weights only; see `SessionState.lifter`. */
  lifter?: Lifter;
};

/**
 * The shape a set of answers gets: Push, Pull, Legs for everyone, unless a
 * shape is asked for. Klay is opinionated so nobody has to set anything up;
 * another shape is a workout of another kind, added in Plan.
 */
export const shapeFor = (answers: Answers): Shape => answers.shape ?? "ppl";

/**
 * The plan for a set of answers: the shape your time gets, each slot filled
 * from what your usual place has and nothing you ruled out. A slot with
 * nothing to fill it is left out, and a workout left with nothing goes too.
 */
export const makePlan = (state: SessionState, answers: Answers): Workout[] =>
  shapePlan(state, SHAPES[shapeFor(answers)], answers.home ?? GYM, avoidFor(answers.easy));

/** A shape's workouts filled for a kit, minus what is ruled out: see `makePlan`. */
const shapePlan = (state: SessionState, shape: Workout[], kit: Kit, avoid: string[]): Workout[] => {
  const blank: SessionState = { ...state, workouts: shape, choices: {}, avoid };
  return shape.flatMap((w) => {
    // The template's slots, then extras to top it up where the place falls
    // short; only as many extras as the slots left empty.
    const extras = (EXTRAS[w.id] ?? []).map((pattern, i) => ({
      id: `extra_${i}`,
      slot: PATTERN_LABEL[pattern],
      pattern,
      options: [] as string[],
      scheme: defaultScheme(pattern),
    }));
    const all = { ...w, exercises: [...w.exercises, ...extras] };
    const filled = fillWorkout({ ...blank, workouts: [all] }, all, kit, {}, avoid);
    const own = w.exercises.flatMap((e) => (filled[e.id] ? [settle(e, filled[e.id]!)] : []));
    const more = extras
      .flatMap((e) => (filled[e.id] ? [settle(e, filled[e.id]!)] : []))
      .slice(0, w.exercises.length - own.length);
    const exercises = [...own, ...more];
    return exercises.length > 0 ? [{ ...w, exercises }] : [];
  });
};

/**
 * A slot holding the exercise it was filled with. One filled from a nearer
 * kind — a row where the bar to pull down on is missing — becomes a slot of
 * that kind, so Plan, swaps and Today all agree on what it is.
 */
const settle = (entry: Entry, id: string): Entry => {
  const ex = byId(id)!;
  if (isPattern(ex, entry.pattern)) return { ...entry, options: [id] };
  const pattern = ex.patterns[0];
  return { ...entry, slot: PATTERN_LABEL[pattern], pattern, options: [id] };
};

/** Start training on the plan these answers make. */
export const applyPlan = (
  state: SessionState,
  answers: Answers,
  now = Date.now(),
): SessionState => {
  const workouts = makePlan(state, answers).map(startSmall);
  if (workouts.length === 0) return state;
  const used = new Set(workouts.flatMap((w) => w.exercises.flatMap((e) => e.options)));
  return {
    ...state,
    workouts,
    nextWorkout: workouts[0].id,
    workoutQueue: undefined,
    postponed: undefined,
    removedWorkouts: [],
    choices: {},
    // What the plan uses is in your catalogue, so Plan shows it as yours.
    hidden: state.hidden.filter((id) => !used.has(id)),
    loops: setLoopKit(state, loopInUse(state), answers.home ?? undefined).loops,
    avoid: avoidFor(answers.easy),
    lifter: answers.lifter,
    onboarded: now,
    growth: { since: now, steps: { lift: 0, cardio: 0, stretch: 0 }, added: [] },
  };
};

/**
 * A starting workout as a new plan has it: its first three lifts, easy
 * cardio to open and nothing to close on. The rest comes with growth.
 */
const startSmall = (workout: Workout): Workout => {
  const keep = START_SLOTS[workout.id];
  if (!keep) return workout;
  return {
    ...workout,
    exercises: workout.exercises.filter((e) => keep.includes(e.id)),
    cardio: { ...workout.cardio, close: null },
  };
};

// ---- growth ----

const DAY_MS = 24 * 60 * 60 * 1000;

/** One change an offer would make: what goes into which workout. */
export type GrowthChange = { workoutId: string; workout: string; what: string };

/** One choice in an offer: a track, and exactly what saying yes changes. */
export type GrowthChoice = { track: Track; changes: GrowthChange[] };

/** The workouts growth may change: Klay's own, running in the loop in use. */
const growable = (state: SessionState): Workout[] =>
  state.workouts.filter((w) => START_SLOTS[w.id] !== undefined);

/** The next slot "one more exercise" gives a workout, or none. */
const nextSlot = (state: SessionState, workout: Workout): Entry | undefined => {
  if (workout.exercises.length >= LIFT_CAP) return undefined;
  const added = new Set((state.growth?.added ?? []).filter((a) => a.workoutId === workout.id).map((a) => a.slot));
  const has = new Set(workout.exercises.map((e) => e.id));
  const taken = new Set(workout.exercises.map((e) => chosen(state, workout.id, e)));
  return GROWTH_SLOTS[workout.id]?.find(
    // Never twice: not while it's there, swapped or not, and not once taken out.
    (e) => !has.has(e.id) && !added.has(e.id) && !taken.has(e.options[0]) && !!lookup(state, e.options[0]),
  );
};

/** What saying yes to a track would change right now. */
export const growthChanges = (state: SessionState, track: Track): GrowthChange[] =>
  growable(state).flatMap((w): GrowthChange[] => {
    if (track === "lift") {
      const entry = nextSlot(state, w);
      const ex = entry && lookup(state, entry.options[0]);
      return ex ? [{ workoutId: w.id, workout: w.name, what: ex.name }] : [];
    }
    if (track === "cardio") {
      return w.cardio?.close === null ? [{ workoutId: w.id, workout: w.name, what: "5 easy minutes of cardio to finish" }] : [];
    }
    const routine = mobilityPlan(state, w);
    const longer = mobilityById(LONGER_STRETCH);
    return longer && routine && routine.id === DEFAULT_MOBILITY && w.mobility === undefined
      ? [{ workoutId: w.id, workout: w.name, what: `${longer.name} to finish` }]
      : [];
  });

/**
 * The offer due at the end of a workout, or null: three weeks since the plan
 * began or the last answer, at least twelve workouts in them — any loop
 * counts — and something left to grow. Each choice says what it changes.
 */
export const growthOffer = (state: SessionState, now = Date.now()): GrowthChoice[] | null => {
  const g = state.growth;
  if (!g || now - g.since < GROWTH_EVERY_DAYS * DAY_MS) return null;
  const sessions = (state.log ?? []).filter((l) => l.finishedAt > g.since).length;
  if (sessions < GROWTH_SESSIONS) return null;
  const choices = TRACKS.filter((t) => g.steps[t] < TRACK_STEPS[t])
    .map((track) => ({ track, changes: growthChanges(state, track) }))
    .filter((c) => c.changes.length > 0);
  return choices.length > 0 ? choices : null;
};

/** Yes: make the changes the offer said, and start counting to the next one. */
export const acceptGrowth = (state: SessionState, track: Track, now = Date.now()): SessionState => {
  const g = state.growth;
  if (!g) return state;
  const changes = growthChanges(state, track);
  if (changes.length === 0) return state;
  let s = state;
  const added: Growth["added"] = [];
  for (const { workoutId } of changes) {
    if (track === "lift") {
      const w = workoutById(s, workoutId)!;
      const entry = nextSlot(s, w)!;
      s = {
        ...patchWorkout(s, workoutId, (wk) => ({ ...wk, exercises: [...wk.exercises, { ...entry }] })),
        hidden: s.hidden.filter((h) => h !== entry.options[0]),
      };
      added.push({ workoutId, slot: entry.id, at: now });
    } else if (track === "cardio") {
      s = patchWorkout(s, workoutId, (wk) => {
        const { close: _none, ...rest } = wk.cardio ?? {};
        return { ...wk, cardio: rest };
      });
    } else {
      s = { ...setMobility(s, workoutId, LONGER_STRETCH), hiddenConditioning: s.hiddenConditioning.filter((h) => h !== LONGER_STRETCH) };
    }
  }
  return {
    ...s,
    growth: { since: now, steps: { ...g.steps, [track]: g.steps[track] + 1 }, added: [...g.added, ...added] },
  };
};

/** Not now: ask again after another three weeks of showing up. */
export const declineGrowth = (state: SessionState, now = Date.now()): SessionState =>
  state.growth ? { ...state, growth: { ...state.growth, since: now } } : state;

// ---- easy weeks ----

/**
 * Every three months or so of steady training, a week to recover: the same
 * workouts at about 60% of your weights and a set fewer, offered on Today
 * and only taken with a yes. Counted by training, not the calendar — at
 * least twelve weeks, and three dozen workouts, since the last one began
 * (or since you started). Nothing in it moves a record, so the week after,
 * every lift is where you left it.
 */
const EASY_EVERY_DAYS = 84;
const EASY_SESSIONS = 36;
const EASY_DAYS = 7;
const EASY_ASK_AGAIN_DAYS = 21;
export const EASY_WEIGHT = 0.6;

/** Where the count to the next easy week starts: the end of the last, or your start. */
const easyBase = (state: SessionState): number | undefined => {
  const from = state.recovery?.from;
  return from !== undefined ? from + EASY_DAYS * DAY_MS : (state.onboarded ?? state.log[0]?.startedAt);
};

/** The easy week you are in, as its day — 1 to 7 — or null. */
export const easyWeek = (state: SessionState, now = Date.now()): { day: number } | null => {
  const from = state.recovery?.from;
  if (from === undefined || now < from || now - from >= EASY_DAYS * DAY_MS) return null;
  return { day: Math.floor((now - from) / DAY_MS) + 1 };
};

/**
 * A lift in an easy week: about 60% of the weight and a set fewer. Seconds
 * held and assistance stay as they are; the reps are the same.
 */
export const easyLoad = (state: SessionState, ex: Exercise, entry: Entry, weight: number): { weight: number; sets: number } => {
  const sets = Math.max(1, setsFor(entry) - 1);
  const loaded = !ex.holds && !ex.assistable && !entry.derive && weight > 0;
  const step = ex.increment || 2.5;
  return { weight: loaded ? weightHere(state, ex, Math.max(step, roundTo(weight * EASY_WEIGHT, step))) : weight, sets };
};

/** Whether Today should offer an easy week. */
export const easyWeekOffer = (state: SessionState, now = Date.now()): boolean => {
  if (state.active || easyWeek(state, now)) return false;
  const base = easyBase(state);
  if (base === undefined || now - base < EASY_EVERY_DAYS * DAY_MS) return false;
  if (now < (state.recovery?.askAfter ?? 0)) return false;
  return state.log.filter((l) => l.finishedAt > base).length >= EASY_SESSIONS;
};

/** Yes: the week starts today. */
export const startEasyWeek = (state: SessionState, now = Date.now()): SessionState =>
  state.active ? state : { ...state, recovery: { from: now } };

/** Not now: ask again in three weeks. */
export const declineEasyWeek = (state: SessionState, now = Date.now()): SessionState => ({
  ...state,
  recovery: { ...state.recovery, askAfter: now + EASY_ASK_AGAIN_DAYS * DAY_MS },
});

/** Back to full weights before the week is out; the count to the next starts now. */
export const endEasyWeek = (state: SessionState, now = Date.now()): SessionState =>
  easyWeek(state, now) && !state.active ? { ...state, recovery: { from: now - EASY_DAYS * DAY_MS } } : state;

/**
 * Forget your weight, sex and push-ups, keeping how much you have lifted: guesses for
 * lifts you have not done fall back to the light, unsaid ones.
 */
export const forgetBody = (state: SessionState): SessionState =>
  state.lifter ? { ...state, lifter: { experience: state.lifter.experience } } : state;

/** The first-launch questions: only on a phone that has never trained. */
export const wantsOnboarding = (state: SessionState): boolean =>
  !state.onboarded && wantsIntro(state);

export const wantsIntro = (state: SessionState): boolean =>
  !state.introSeen &&
  !state.active &&
  state.log.length === 0 &&
  Object.keys(state.history).length === 0;

/** Whether a first-time tip has been shown already. */
export const seenTip = (state: SessionState, id: string): boolean => !!state.tipsSeen?.includes(id);

/** A first-time tip shown: it won't show again. */
export const seeTip = (state: SessionState, id: string): SessionState =>
  seenTip(state, id) ? state : { ...state, tipsSeen: [...(state.tipsSeen ?? []), id] };

/** The intro finished or skipped: it doesn't open by itself again. */
export const seeIntro = (state: SessionState, now = Date.now()): SessionState =>
  state.introSeen ? state : { ...state, introSeen: now };

// ---- context ----

export type SessionContextValue = {
  state: SessionState;
  setState: React.Dispatch<React.SetStateAction<SessionState>>;
};

/**
 * Put what the copy changed onto the plan as it is now: only the parts the
 * editor touched, so anything that changed elsewhere meanwhile is kept.
 */
export const mergeDraft = (base: SessionState, current: SessionState, draft: SessionState): SessionState => {
  const changed: Partial<SessionState> = {};
  const keys = new Set([...Object.keys(base), ...Object.keys(draft)]) as Set<keyof SessionState>;
  for (const key of keys) {
    if (draft[key] !== base[key]) (changed as Record<string, unknown>)[key] = draft[key];
  }
  return { ...current, ...changed };
};

export const SessionContext = createContext<SessionContextValue | null>(null);

export const useSession = (): SessionContextValue => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
};
