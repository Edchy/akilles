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
  CARDIO_MINUTES,
  COURSE_STEP,
  MINUTES_MAX,
  MINUTES_STEP,
  DEFAULT_MOBILITY,
  HOLD_RANGE,
  HOLD_STEP,
  MOBILITY,
  REPS_RANGE_MOVE,
  SHOULDER_WARMUP,
  TIME_STEP,
  cardioById,
  cardioPool,
  courseLabel,
  defaultCourse,
  holdOf,
  hiddenCardio,
  hiddenMobility,
  leanHiddenConditioning,
  lengthOf,
  mobilityById,
  mobilityPool,
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
  type Entry,
  type Scheme,
  type Workout,
} from "@/data/split";
import { warmupFor, weightLabel, type WarmupSet } from "@/lib/warmup";
import { BODYWEIGHT, GYM, fits, nearestWeight, TWIN, weightsFor, type Kit } from "@/data/kit";
import { pick, STAND_IN, type Candidate } from "@/lib/fill";
import { avoidFor, SHAPE_FOR, SHAPES, type Easy, type Shape, type Time } from "@/data/templates";
import type { Outcome, Say } from "@/data/voice";
import { familyOf, type Family } from "@/data/families";
import {
  GOAL_HOLD_STEP,
  GOAL_SETS,
  STARTING_GOALS,
  TARGET_LIMITS,
  applyGoal,
  currentStep,
  isStarted,
  onTarget,
  type Goal,
  type GoalOutcome,
  type GoalStep,
  type Measure,
} from "@/data/goals";
import {
  applyDecay,
  applyResult,
  daysBetween,
  decayFor,
  settleLayoff,
  freshState,
  HOLD_MAX,
  hitTarget,
  ladderOf,
  markSkipped,
  prescribe,
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
  /** Which poses of a mobility routine you have ticked off. */
  moves?: boolean[];
  /**
   * A goal block's step, by id: the one you were on when the workout was
   * built. `exerciseId` holds the goal's id; `logged` holds reps, seconds
   * held, or — for practice — the seconds practised, in one entry.
   */
  step?: string;
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
    };

/** A finished workout, as it happened. Written once, by `finishWorkout`. */
export type SessionLog = {
  workoutId: string;
  /** The workout's name at the time, so a later rename doesn't rewrite the past. */
  name: string;
  startedAt: number;
  finishedAt: number;
  entries: LogEntry[];
};

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
   * Paused workouts: out of the loop, kept as they were — edits and all —
   * with the place they sat, so resuming one puts it back where it was.
   * Any workout can be paused, built in or yours; only a paused one can be
   * deleted for good. (Saved under this name since before pausing covered
   * workouts you made, which used to be deleted outright.)
   */
  removedWorkouts: { workout: Workout; at: number }[];
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
  /**
   * What you are learning, step by step — see `data/goals.ts`. Learned goals
   * stay, out of every workout, for Progress. Absent from saves made before
   * goals existed, which simply start with none.
   */
  goals: Goal[];
  /**
   * When the intro — how Milo works, six pages — was finished or skipped.
   * Absent until then. It opens by itself only on a phone that has trained
   * nothing yet (`wantsIntro`), so a save from before it existed never meets
   * it; Plan's ? opens it any time.
   */
  introSeen?: number;
  /**
   * Where you are training: your usual place, or somewhere else for a while —
   * a week away with one kettlebell. The plan and the loop stay the same;
   * only what fills each slot changes. Absent means your usual place.
   */
  place?: Place;
  /**
   * What each place has. Your usual place is a gym unless you say otherwise;
   * somewhere else is just you until you say what is there.
   */
  kits?: Partial<Record<Place, Kit>>;
  /**
   * Exercises ruled out when the plan was made — the ones that load a part
   * you asked Milo to go easy on. Never used to fill a slot, anywhere.
   */
  avoid?: string[];
  /**
   * When the first-launch questions were answered and the plan made from
   * them. Absent on a phone that has never been asked — see `wantsOnboarding`.
   */
  onboarded?: number;
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

/** Bring a built-in in from the library. */
export const restoreExercise = (state: SessionState, id: string): SessionState => ({
  ...state,
  hidden: state.hidden.filter((h) => h !== id),
});

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
  return { ...state, notes: note.trim() ? { ...rest, [k]: note } : rest };
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
 * The weight an exercise opens at next time: where its most recently trained
 * record stands, else where it starts.
 */
export const nextWeight = (state: SessionState, id: string): number => {
  const latest = Object.values(state.history)
    .filter((r) => r.exerciseId === id)
    .sort((a, b) => (b.lastTrainedAt ?? 0) - (a.lastTrainedAt ?? 0))[0];
  const ex = lookup(state, id);
  return latest?.weight ?? (ex ? freshState(ex).weight : 0);
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
      r.exerciseId === id ? { ...r, weight: w, deloads: 0, pendingDecay: undefined } : r,
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
  new Set(
    workoutById(state, workoutId)
      ?.exercises.filter((e) => e.id !== entry.id)
      .map((e) => chosenRaw(state, workoutId, e)) ?? [],
  );

/**
 * The raw choice for a slot without the duplicate filtering, used to work out
 * what other slots have taken. Falls back to the first built-in option.
 */
const chosenRaw = (state: SessionState, workoutId: string, entry: Entry): string =>
  state.choices[slotKey(workoutId, entry.id)] ?? entry.options[0];

/** The exercise filling a slot: your choice, else the pool's first option. */
export const chosen = (
  state: SessionState,
  workoutId: string,
  entry: Entry,
): string => {
  const picked = chosenRaw(state, workoutId, entry);
  const pool = poolFor(state, workoutId, entry);
  if (pool.includes(picked)) return picked;
  // Fall back to the first option no other slot is using.
  const taken = takenElsewhere(state, workoutId, entry);
  return pool.find((id) => !taken.has(id)) ?? pool[0];
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
    const own = state.history[key(id, entry.scheme)];
    if (own) return { ex, due: own.weight, maxed: own.maxed, known: true };
    const twin = TWIN[id] && state.history[key(TWIN[id], entry.scheme)];
    if (twin) return { ex, due: twin.weight, known: true };
    return { ex, due: freshState(ex).weight };
  };
  // Your catalogue first, then the library: a gym catalogue has no push-ups
  // in it, and a hotel room needs them.
  const library = hiddenExercises(state).filter((e) => !e.restricted);
  const filled: Record<string, string | null> = {};
  for (const entry of workout.exercises) {
    // The slot's own options lead even from the library: a plan made at
    // first launch names exercises nobody has added yet.
    const pool = [
      ...new Set([
        ...entry.options.filter((id) => byId(id) && !avoid.includes(id)),
        ...poolFor(state, workout.id, entry),
        ...library.filter((e) => isPattern(e, entry.pattern)).map((e) => e.id),
      ]),
    ];
    const mine = choices[slotKey(workout.id, entry.id)];
    const standIn = STAND_IN[entry.pattern];
    const standIns = standIn
      ? [...catalogue(state).filter((e) => !e.restricted), ...library]
          .filter((e) => isPattern(e, standIn))
          .map((e) => e.id)
      : [];
    const id =
      mine && pool.includes(mine) && usable(mine)
        ? mine
        : pick(
            pool.filter(usable).map(candidate(entry)),
            standIns.filter(usable).map(candidate(entry)),
            kit,
          );
    filled[entry.id] = id;
    if (id) taken.add(id);
  }
  return filled;
};

/** Your usual place, or somewhere else. */
export type Place = "usual" | "away";

export const placeOf = (state: SessionState): Place => state.place ?? "usual";

/** What a place has to train with. */
export const kitAt = (state: SessionState, place: Place = placeOf(state)): Kit =>
  state.kits?.[place] ?? (place === "away" ? BODYWEIGHT : GYM);

/** At a full gym, where every slot simply holds what Plan says. */
const atGym = (state: SessionState): boolean => placeOf(state) === "usual" && !state.kits?.usual;

/** Whether the cardio machines are here — a gym, or somewhere with machines. */
const hasMachines = (state: SessionState): boolean => kitAt(state).gear.includes("machine");

/**
 * Move to a place, and say what it has. Only on Today: a workout in progress
 * keeps the place it started in.
 */
export const setPlace = (state: SessionState, place: Place, kit?: Kit): SessionState =>
  state.active
    ? state
    : {
        ...state,
        place,
        kits: kit ? { ...state.kits, [place]: kit } : state.kits,
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
  if (own) return own;
  const ex = byId(exerciseId)!;
  const twin = TWIN[exerciseId] && state.history[key(TWIN[exerciseId], scheme)];
  const start = freshState(ex);
  return twin ? { ...start, weight: roundTo(twin.weight, ex.increment || 1) } : start;
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
  /** Which shape and colour it gets. */
  family: Family;
};

/**
 * The exercises a workout runs: all of them, or the first two when workouts
 * are short — test mode's switch, or the `EXPO_PUBLIC_SHORT_WORKOUTS` build.
 */
export const exercisesToRun = (state: SessionState, workout: Workout): Entry[] =>
  SHORT_WORKOUTS || state.shortWorkouts ? workout.exercises.slice(0, 2) : workout.exercises;

export const workoutPreview = (state: SessionState, workout: Workout): PreviewRow[] => {
  const lifts = liftsToRun(state, workout).map(({ entry, exerciseId }): PreviewRow => {
    const ex = byId(exerciseId)!;
    const known = state.history[key(ex.id, entry.scheme)];
    const due = dueRecord(state, ex.id, entry.scheme);
    const st = { ...due, weight: weightHere(state, ex, due.weight) };
    const p = prescribe(st, entry.scheme, setsFor(entry));
    // Speed work takes its weight from another lift on the day; jumps have none.
    const loaded = !entry.derive && !ex.unloaded;
    const last = st.lastPerformed;
    // A cut you accepted after a break is the banner's to explain, not a drop.
    const change = !last
      ? "new"
      : !loaded || st.pendingDecay
        ? undefined
        : st.weight > last.weight
          ? "up"
          : st.weight < last.weight
            ? "down"
            : p.reload === "start"
              ? "reload"
              : undefined;
    return {
      id: entry.id,
      name: ex.name,
      amount: `${p.sets} × ${p.reps}${ex.timed ? " s" : ""}`,
      weight: loaded ? weightLabel(ex, st.weight) : undefined,
      change,
      guess: !known,
      family: familyOf(ex),
    };
  });
  const block = (where: CardioEnd): PreviewRow[] => {
    const plan = hasMachines(state) ? cardioPlan(state, workout, where) : null;
    if (!plan) return [];
    return [
      { id: CARDIO_SLOTS[where], name: plan.machine.name, amount: cardioAmount(plan), family: "cardio" },
    ];
  };
  const routine = mobilityPlan(state, workout);
  const warmup = warmupHere(state, workout);
  const goals = goalsIn(state, workout.id).map(
    (g): PreviewRow => ({
      id: `goal/${g.id}`,
      name: g.name,
      amount: `step ${Math.min(g.at, g.steps.length - 1) + 1} of ${g.steps.length}`,
      family: "goal",
    }),
  );
  return [
    ...block("open"),
    ...(warmup
      ? [
          {
            id: WARMUP_SLOT,
            name: warmup.name,
            amount: `about ${routineMinutes(warmup)} min`,
            family: "mobility" as const,
          },
        ]
      : []),
    ...goals,
    ...lifts,
    ...block("close"),
    ...(routine
      ? [
          {
            id: MOBILITY_SLOT,
            name: routine.name,
            amount: `about ${routineMinutes(routine)} min`,
            family: "mobility" as const,
          },
        ]
      : []),
  ];
};

/**
 * The workout's own family: the one most of its lifts belong to — push for
 * Push A, legs for Legs — and, on a tie, whichever comes first. Today shows
 * it as the big shape over the name. A workout with no lifts is its cardio
 * or stretch.
 */
export const workoutFamily = (state: SessionState, workout: Workout): Family => {
  const rows = workoutPreview(state, workout);
  const lifts = rows.filter(
    (r) => r.family !== "cardio" && r.family !== "mobility" && r.family !== "goal",
  );
  const pool = lifts.length > 0 ? lifts : rows;
  const count = new Map<Family, number>();
  for (const r of pool) count.set(r.family, (count.get(r.family) ?? 0) + 1);
  let best: Family = pool[0]?.family ?? "push";
  for (const [f, n] of count) if (n > (count.get(best) ?? 0)) best = f;
  return best;
};

/** The family of the item on screen, for the lift screen's colour. */
export const itemFamily = (item: Item): Family =>
  item.kind === "cardio" || item.kind === "mobility" || item.kind === "goal"
    ? item.kind
    : familyOf(byId(item.exerciseId));

/** The workout Start will run. Falls back to the first if the id has gone. */
export const upNext = (state: SessionState): Workout =>
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
  if (i === -1) return upNext(state).id;
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

/** Add an empty workout at the bottom of the cycle. */
export const addWorkout = (state: SessionState, id: string, name: string): SessionState => ({
  ...state,
  // Cardio and mobility are left to their defaults, so a new workout runs
  // the same blocks as the rest and its mobility follows what you put in it.
  workouts: [...state.workouts, { id, name, subtitle: "", exercises: [] }],
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
    workouts: [...state.workouts, { ...from, id, name: `${base} ${n}` }],
  };
};

export const renameWorkout = (
  state: SessionState,
  id: string,
  patch: { name?: string; subtitle?: string },
): SessionState => patchWorkout(state, id, (w) => ({ ...w, ...patch }));

/** Whether a workout can be paused. The last one stays: the loop needs something in it. */
export const canPauseWorkout = (state: SessionState): boolean => state.workouts.length > 1;

/** Whether a workout is one of the starting program's, rather than one you created. */
export const isBuiltInWorkout = (id: string): boolean =>
  DEFAULT_WORKOUTS.some((w) => w.id === id);

/**
 * Pause a workout: it leaves the loop and waits, exactly as it was — its
 * exercises, its choices, its place. If it was next, the one after it becomes
 * next, so the loop carries on from the same place. Training history is per
 * exercise, not per workout, so nothing you lifted is touched either way.
 */
export const pauseWorkout = (state: SessionState, id: string): SessionState => {
  if (!canPauseWorkout(state)) return state;
  const at = state.workouts.findIndex((w) => w.id === id);
  if (at === -1) return state;
  return {
    ...state,
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
 * Delete a paused workout for good, with its slot choices. Only a paused one:
 * pausing first means nothing in the loop vanishes in one move. The lifts'
 * history stays — it belongs to the exercises.
 */
export const deleteWorkout = (state: SessionState, id: string): SessionState => {
  if (!state.removedWorkouts.some((r) => r.workout.id === id)) return state;
  const choices = { ...state.choices };
  for (const k of Object.keys(choices)) if (k.startsWith(`${id}/`)) delete choices[k];
  return {
    ...state,
    choices,
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
  workouts.splice(Math.min(entry.at, workouts.length), 0, entry.workout);
  return {
    ...state,
    workouts,
    removedWorkouts: state.removedWorkouts.filter((r) => r.workout.id !== id),
  };
};

/**
 * Move a workout to a new position in the cycle. Only the order changes: what
 * is next stays next, and the cycle carries on from wherever it now sits.
 * Changing what is next is `setNextWorkout`'s job — Do next — never a drag's.
 */
export const moveWorkout = (state: SessionState, from: number, to: number): SessionState => ({
  ...state,
  workouts: move(state.workouts, from, to),
});

/**
 * Skip the next workout without starting it: the cycle moves on to the one
 * after, and nothing is recorded — no exercise is flagged as skipped, since
 * none was ever offered. Undo restores the previous next id and temporary queue.
 */
export const skipWorkout = (state: SessionState): SessionState => {
  if (state.active) return state;
  const skipped = { ...state, ...advanceWorkout(state, upNext(state).id) };
  // A workout put off for next time stays put off: skipping the one that
  // came up instead walks on to the next that isn't waiting, as "Do it next
  // time" does, rather than bringing back one you have already said no to.
  const waiting = skipped.postponed ?? [];
  if (waiting.length === 0) return skipped;
  const rest = (skipped.workoutQueue ?? []).filter((id) => !waiting.includes(id));
  if (rest.length === 0) return skipped;
  return {
    ...skipped,
    nextWorkout: rest[0],
    workoutQueue: [rest[0], ...waiting, ...rest.slice(1)],
  };
};

/**
 * Do it next time: the next workout that is not already waiting comes up
 * now, and this one waits straight after it — behind any you put off before
 * it, in the order they were due — before the cycle resumes. Put off the one
 * that came up instead and the one after that comes up, never one you have
 * just put off, so doing it twice walks on rather than swapping back and
 * forth. With everything else already waiting there is nothing to bring
 * forward, and the state comes back unchanged.
 */
export const postponeWorkout = (state: SessionState): SessionState => {
  if (state.active || state.workouts.length < 2) return state;
  const current = upNext(state).id;
  const exists = (id: string) => !!workoutById(state, id);
  const waiting = (state.postponed ?? []).filter((id) => id !== current && exists(id));
  const savedQueue = state.workoutQueue?.filter(exists);
  const at = state.workouts.findIndex((w) => w.id === current);
  const cycle = [...state.workouts.slice(at), ...state.workouts.slice(0, at)].map((w) => w.id);
  // A final queued workout can still borrow the next workout from the normal cycle.
  const queue =
    savedQueue && savedQueue.length > 1 && savedQueue[0] === current ? savedQueue : cycle;
  const rest = queue.slice(1).filter((id) => !waiting.includes(id));
  if (rest.length === 0) return state;
  const line = [...waiting, current];
  return {
    ...state,
    nextWorkout: rest[0],
    workoutQueue: [rest[0], ...line, ...rest.slice(1)],
    postponed: line,
  };
};

/** Make a workout the next one Start runs. */
export const setNextWorkout = (state: SessionState, id: string): SessionState =>
  workoutById(state, id)
    ? { ...state, nextWorkout: id, workoutQueue: undefined, postponed: undefined }
    : state;

/**
 * Movement types a workout could add a slot for: anything with an exercise
 * in the catalogue that the workout is not already using.
 */
export const addablePatterns = (state: SessionState, workoutId: string): Pattern[] => {
  const w = workoutById(state, workoutId);
  if (!w) return [];
  const taken = new Set(w.exercises.map((e) => chosen(state, workoutId, e)));
  const list = catalogue(state).filter((e) => !e.restricted && !taken.has(e.id));
  return [...new Set(list.flatMap((e) => e.patterns))];
};

/**
 * Add a slot for a movement type at the bottom of a workout, filled with the
 * first exercise of that type the workout is not already using. It opens on
 * 6–12; everything about it can be changed afterwards.
 */
export const addEntry = (
  state: SessionState,
  workoutId: string,
  pattern: Pattern,
  entryId: string = newId("s"),
): SessionState => {
  const w = workoutById(state, workoutId);
  if (!w) return state;
  const taken = new Set(w.exercises.map((e) => chosen(state, workoutId, e)));
  const pick = catalogue(state).find(
    (e) => isPattern(e, pattern) && !e.restricted && !taken.has(e.id),
  );
  if (!pick) return state;
  const entry: Entry = {
    id: entryId,
    slot: PATTERN_LABEL[pattern],
    pattern,
    options: [pick.id],
    scheme: defaultScheme(pattern),
  };
  return patchWorkout(state, workoutId, (wk) => ({
    ...wk,
    exercises: [...wk.exercises, entry],
  }));
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
): SessionState => {
  const made = addExercise(state, exercise);
  const id = made.custom[made.custom.length - 1].id;
  return addExerciseToWorkout(made, workoutId, id, entryId);
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

/** Move a slot to a new position within its workout. */
export const moveEntry = (
  state: SessionState,
  workoutId: string,
  from: number,
  to: number,
): SessionState =>
  patchWorkout(state, workoutId, (w) => ({ ...w, exercises: move(w.exercises, from, to) }));

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
  workouts: DEFAULT_WORKOUTS,
  nextWorkout: DEFAULT_WORKOUTS[0].id,
  removedWorkouts: [],
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
/**
 * Whether anything was trained on today's calendar date, in the phone's own
 * timezone. Not `daysSinceTrained(...) === 0`: that counts whole 24-hour
 * spans, so last night's session would still read as "today" this morning.
 */
export const trainedToday = (state: SessionState, now: number = Date.now()): boolean => {
  const today = new Date(now).toDateString();
  return Object.values(state.history).some(
    (r) => typeof r.lastTrainedAt === "number" && new Date(r.lastTrainedAt).toDateString() === today,
  );
};

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

/**
 * Decline it: keep every weight where it is, and do not ask again until the
 * situation changes.
 *
 * The gap is settled exactly as if the cut had been applied, so declining is
 * a real answer rather than a snooze — you are not asked the same question
 * every time you open the app. The training clock is left alone: declining
 * is not a workout, and Today should not greet you as if you had just done one.
 */
export const declineDecay = (
  state: SessionState,
  now: number = Date.now(),
): SessionState => {
  const history = { ...state.history };
  for (const offer of decayOffers(state, now)) {
    history[offer.key] = settleLayoff(history[offer.key], now);
  }
  return { ...state, history };
};

/**
 * Cuts already applied and not yet trained through, for the line under each
 * exercise. Only ever populated by `acceptDecay`.
 */
export const pendingDecays = (
  state: SessionState,
): { exerciseId: string; decay: Decay }[] => {
  const seen = new Set<string>();
  const out: { exerciseId: string; decay: Decay }[] = [];
  for (const record of Object.values(state.history)) {
    if (!record.pendingDecay || seen.has(record.exerciseId)) continue;
    seen.add(record.exerciseId);
    out.push({ exerciseId: record.exerciseId, decay: record.pendingDecay });
  }
  return out;
};

export const buildWorkout = (
  state: SessionState,
  _now: number = Date.now(),
): SessionState => {
  const workout = upNext(state);
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
        const lifts = liftsToRun(state, workout).map(({ entry: e, exerciseId }) => {
          const ex = byId(exerciseId)!;
          const group = groupOf(ex);
          const first = !warmed.has(group);
          warmed.add(group);
          // A derived lift takes a fraction of another exercise's current
          // working weight, so it keeps up on its own.
          const own = dueRecord(state, exerciseId, e.scheme);
          const weight = e.derive
            ? roundTo(
                (
                  state.history[key(e.derive.from, e.derive.scheme)] ??
                  freshState(byId(e.derive.from)!)
                ).weight * e.derive.fraction,
                ex.increment || 2.5,
              )
            : weightHere(state, ex, own.weight);

          return {
            ...e,
            exerciseId,
            weight,
            logged: Array<number | null>(setsFor(e)).fill(null),
            // Arms and core are small and already warm by the time they
            // come round — a ramp there is just more to tap through.
            warmup: first && group !== "arms" && group !== "core",
          };
        });

        // Cardio opens the session and closes it, with mobility last of all:
        // warm before you lift, flushed after, and stretched once everything
        // is done. All three are skippable like any other block, and a
        // workout can leave any of them out altogether.
        const open = cardioBlock(state, workout, "open");
        const close = cardioBlock(state, workout, "close");
        const mobility = mobilityBlock(state, workout);
        // On a day that presses, the shoulders are readied before anything
        // loads them — a handstand included.
        const warmup = warmupBlock(state, workout);
        // Skills straight after the warm-up, while you are fresh: a
        // handstand is no place for tired shoulders.
        const goals = goalsIn(state, workout.id).map(goalBlock);
        return [
          ...(open ? [open] : []),
          ...(warmup ? [warmup] : []),
          ...goals,
          ...lifts,
          ...(close ? [close] : []),
          ...(mobility ? [mobility] : []),
        ];
      })(),
      cursor: 0,
      startedAt: Date.now(),
    },
  };
};

export const currentWorkout = (state: SessionState): Workout =>
  (state.active && workoutById(state, state.active.workoutId)) || upNext(state);

/** The prescription for the exercise currently on screen. */
export const currentPrescription = (state: SessionState): Prescription | null => {
  if (!state.active) return null;
  const item = state.active.items[state.active.cursor];
  // Conditioning has no weight, no reps and no ladder — nothing to prescribe.
  if (!item || !isLift(item)) return null;
  const st =
    state.history[key(item.exerciseId, item.scheme)] ??
    freshState(byId(item.exerciseId)!);
  // The session's own weight, which +/- edits without touching history.
  return prescribe({ ...st, weight: item.weight }, item.scheme, setsFor(item));
};

/** The partner's prescription, when one has been folded in. */
export const partnerPrescription = (state: SessionState): Prescription | null => {
  const item = state.active?.items[state.active.cursor];
  if (!item?.supersetEntry) return null;
  const e = item.supersetEntry;
  const st = state.history[key(e.exerciseId, e.scheme)] ?? freshState(byId(e.exerciseId)!);
  return prescribe(
    { ...st, weight: item.supersetWeight ?? e.weight },
    e.scheme,
    setsFor(e),
  );
};

/** State for the exercise on screen, falling back to a fresh record. */
const currentState = (state: SessionState): ExerciseState | null => {
  if (!state.active) return null;
  const item = state.active.items[state.active.cursor];
  if (!item) return null;
  return (
    state.history[key(item.exerciseId, item.scheme)] ?? freshState(byId(item.exerciseId)!)
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
 *   empty → target reps → target-1 → ... → 1 → empty
 *
 * The first tap logs a clean set, further taps count down if you fell short,
 * and tapping past 1 clears it in case of a mis-tap. A timed hold counts
 * down five seconds a tap, so a 40-second plank that gave out early is a few
 * taps, not thirty.
 */
export const tapSet = (
  state: SessionState,
  setIndex: number,
  which: "main" | "partner" = "main",
): SessionState =>
  writeSet(state, setIndex, which, (current, target, step) =>
    current === null ? target : current <= step ? null : current - step,
  );

/**
 * Long press: straight back to the target. Counting down is one rep per tap,
 * so a stray double tap on a 15-rep set would otherwise take fourteen more
 * taps to undo.
 */
export const resetSet = (
  state: SessionState,
  setIndex: number,
  which: "main" | "partner" = "main",
): SessionState => writeSet(state, setIndex, which, (_current, target) => target);

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
  // Rep corrections and clearing a circle are edits, not another finished set.
  const newlyLogged = log[setIndex] === null && updated[setIndex] != null;

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

/** Every circle filled — including the partner's? Then it's logged, hit or miss. */
export const allSetsLogged = (state: SessionState): boolean => {
  const item = state.active?.items[state.active.cursor];
  if (!item || !isLift(item)) return false;
  const filled = (log?: (number | null)[]) => !log || log.every((r) => r !== null);
  return filled(item.logged) && filled(item.supersetLogged);
};

/** Every set at or above target — the only route to more reps or weight. */
export const madeTarget = (state: SessionState): boolean => {
  const item = state.active?.items[state.active.cursor];
  const p = currentPrescription(state);
  if (!item || !p) return false;
  // Speed and jump work has no ladder: nothing progresses from it.
  if (item.derive || p.exercise.unloaded) return false;
  if (!hitTarget(item.logged, p.reps)) return false;

  const pp = partnerPrescription(state);
  if (pp && item.supersetLogged) return hitTarget(item.supersetLogged, pp.reps);
  return true;
};

/**
 * What today's logged sets mean for next time, worked out by running the
 * real progression on them — so the line on screen can never disagree with
 * what actually happens. Null until every set is logged, and for work that
 * does not progress.
 */
export type Verdict = {
  outcome: Outcome;
  /** Which of Milo's lists answers it — a hit that starts or ends a reload has its own. */
  say: Say;
  fact: string;
};

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
    : hitTarget(logged, ladder[Math.min(before.rung, ladder.length - 1)])
      ? "hit"
      : "miss";
};

const verdictFor = (state: SessionState, item: Item): Verdict | null => {
  if (item.skipped || !isLift(item) || item.derive) return null;
  const exercise = byId(item.exerciseId)!;
  if (exercise.unloaded || item.logged.some((r) => r === null)) return null;

  const st = state.history[key(item.exerciseId, item.scheme)] ?? freshState(exercise);
  const before = { ...st, weight: item.weight };
  const after = applyResult(before, item.scheme, item.logged);
  const ladder = ladderOf(exercise, item.scheme);
  const outcome = readOutcome(before, after, item.logged, item.scheme);
  const weight = weightLabel(exercise, after.weight);
  // "10 reps", or "40 s" on a timed hold.
  const target = `${ladder[after.rung]}${exercise.timed ? " s" : " reps"}`;

  if (outcome === "drop") {
    const fact =
      after.weight >= before.weight
        ? `Back to ${target} next time.`
        : exercise.holds
          ? `Back to a ${weight} next time.`
          : `10% lighter next time: ${weight}.`;
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
  if (!item || !isLift(item) || item.logged.some((r) => r !== null)) return state;
  if (currentTaken(state).has(exerciseId)) return state;
  const ex = byId(exerciseId);
  if (!ex) return state;
  // Seeded from that exercise's own history, so it opens at the right weight.
  return patchItem(state, (it) => ({
    ...it,
    exerciseId,
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
  if (atGym(state)) return pool;
  // Away: only what this place has, from the library too.
  const kit = kitAt(state);
  const library = hiddenExercises(state)
    .filter((e) => !e.restricted && isPattern(e, item.pattern))
    .map((e) => e.id);
  return [...pool, ...library].filter((id) => fits({ id }, kit));
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

/** Move past the warm-up screen to the working sets. */
export const dismissWarmup = (state: SessionState): SessionState =>
  patchItem(state, (it) => ({ ...it, warmup: false }));

/**
 * Step back to the previous exercise. Its circles are still filled in, so you
 * can correct a mis-tap; whatever it wrote to history is rewritten when you
 * move forward again.
 */
export const previousExercise = (state: SessionState): SessionState => {
  if (!state.active || state.active.cursor === 0) return state;
  return { ...state, active: { ...state.active, cursor: state.active.cursor - 1 } };
};

/**
 * Skip the exercise on screen and move to the next.
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
 * Whether a later item can be folded into the one on screen. Any lift can:
 * what to pair is your call, not the program's. Not conditioning, not one
 * already carrying a partner, not speed work (its weight comes from
 * elsewhere), and not one you have already started.
 */
const canPair = (it: Item): boolean =>
  isLift(it) &&
  !it.supersetWith &&
  !it.derive &&
  !it.logged.some((r) => r !== null);

/** Lifts still ahead of the cursor — the valid superset partners. */
export const supersetOptions = (state: SessionState): Exercise[] => {
  if (!state.active) return [];
  const { items, cursor } = state.active;
  return items
    .filter((it, i) => i > cursor && canPair(it))
    .map((it) => byId(it.exerciseId)!);
};

/**
 * Pair a later lift into the current exercise. It is removed from further
 * down the workout so it isn't prescribed twice.
 */
export const addSuperset = (state: SessionState, exerciseId: string): SessionState => {
  if (!state.active) return state;
  const { items, cursor } = state.active;
  const at = items.findIndex(
    (f, j) => j > cursor && canPair(f) && f.exerciseId === exerciseId,
  );
  if (at === -1) return state;
  const partner = items[at];
  return {
    ...state,
    active: {
      ...state.active,
      items: items
        .map((it, i) =>
          i === cursor
            ? {
                ...it,
                supersetWith: exerciseId,
                supersetEntry: partner,
                supersetWeight: partner.weight,
                supersetLogged: Array<number | null>(setsFor(partner)).fill(null),
              }
            : it,
        )
        .filter((_, i) => i !== at),
    },
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
    if (isCardio(item)) return scoreOf(item) !== null;
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
  ) => {
    const k = key(exerciseId, scheme);
    const prior = history[k] ?? freshState(byId(exerciseId)!);
    // Trained: the session's weight is what you actually lifted, so it carries
    // over. Skipped: nothing was lifted, so the record keeps the weight it
    // already had — a weight nudged up and then skipped was never trained at.
    const base = performed ? { ...prior, weight } : prior;
    // Only some weights here — one kettlebell — and a step up goes to the
    // next one there is, or nowhere.
    const weights = weightsFor(byId(exerciseId)!, kitAt(state));
    const after = performed
      ? applyResult(base, scheme, logged, now, weights)
      : markSkipped(base);
    history[k] = after;

    const ladder = ladderOf(byId(exerciseId), scheme);
    entries.push({
      kind: "lift",
      exerciseId,
      scheme,
      weight: base.weight,
      reps: logged,
      target: ladder[Math.min(prior.rung, ladder.length - 1)],
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

    commit(item.exerciseId, item.scheme, item.weight, item.logged, performed);

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

// ---- cardio & mobility ----

/**
 * Key into `conditioning`. Machine and block length together: five minutes on
 * the treadmill is not comparable with ten, so they never share a record.
 * A timed block is keyed by its course the same way — `treadmill:1km` and
 * `treadmill:2km` are two records, and neither is `treadmill:5m`.
 */
export const cardioKey = (cardioId: string, minutes: number) =>
  `${cardioId}:${minutes}m`;

export const courseKey = (cardioId: string, course: number) => {
  const unit = cardioById(cardioId)?.metric.unit ?? "km";
  // Rounded so 1, 1.0 and 0.1 + 0.9 all land on the same record.
  return `${cardioId}:${Number(course.toFixed(3))}${unit}`;
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

/** Better means further in the minutes, but faster over a course. */
export const isBetter = (item: Item, score: number, than: number): boolean =>
  isTimed(item) ? score < than : score > than;

/** The fields an item carries for a block of this length, score still to enter. */
const lengthFields = (length: CardioLength) =>
  length.course !== undefined
    ? { course: length.course, seconds: null, minutes: undefined, distance: undefined }
    : { minutes: length.minutes, distance: null, course: undefined, seconds: undefined };

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
  where: CardioEnd,
): CardioPlan | null => {
  const block = workout.cardio?.[where];
  if (block === null) return null;
  const pool = cardioPool(state.hiddenConditioning);
  const own = block && pool.find((c) => c.id === block.machine);
  if (own) return { machine: own, ...lengthOf(own, block) };
  const fallback = pool.find((c) => c.id === CARDIO_DEFAULT[where]) ?? pool[0];
  return { machine: fallback, ...lengthOf(fallback) };
};

/** "1 km" or "5 min". */
export const cardioAmount = (plan: CardioPlan): string =>
  plan.course !== undefined ? courseLabel(plan.machine, plan.course) : `${plan.minutes} min`;

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

/** Movement types that load the shoulders overhead or in front: a day with one presses. */
const PRESSING: Pattern[] = ["horizontal_push", "vertical_push", "chest_iso"];

/** Whether any lift in a workout presses — the days the shoulder warm-up is for. */
export const presses = (state: SessionState, workout: Workout): boolean =>
  liftsToRun(state, workout).some(({ exerciseId }) => {
    const ex = byId(exerciseId);
    return !!ex && PRESSING.some((p) => isPattern(ex, p));
  });

/**
 * The routine a workout opens with, or null. Yours if you chose one and it
 * is still in the catalogue; otherwise the shoulder warm-up on a day that
 * presses, and nothing on one that does not.
 */
export const warmupPlan = (state: SessionState, workout: Workout): MobilityRoutine | null => {
  if (workout.warmup === null) return null;
  const pool = mobilityPool(state.hiddenConditioning);
  const usable = (id: string | undefined) => (id ? pool.find((m) => m.id === id) : undefined);
  const own = usable(workout.warmup);
  if (own) return own;
  return presses(state, workout) ? (usable(SHOULDER_WARMUP) ?? null) : null;
};

/**
 * The warm-up as it runs here. The shoulder warm-up needs a ball and a band,
 * so away from a gym it is left out — the lifts still ramp up.
 */
const warmupHere = (state: SessionState, workout: Workout): MobilityRoutine | null => {
  const plan = warmupPlan(state, workout);
  return plan?.id === SHOULDER_WARMUP && !hasMachines(state) ? null : plan;
};

/** The workouts that open or end on a routine, so an edit can say who else it reaches. */
export const workoutsUsing = (state: SessionState, routineId: string): Workout[] =>
  state.workouts.filter(
    (w) => mobilityPlan(state, w)?.id === routineId || warmupPlan(state, w)?.id === routineId,
  );

/** A cardio block for one end of the session, or null if the workout has none there. */
const cardioBlock = (state: SessionState, workout: Workout, where: CardioEnd): Item | null => {
  // The machines are in the gym. Away, the session starts with the lifts.
  const plan = hasMachines(state) ? cardioPlan(state, workout, where) : null;
  if (!plan) return null;
  const slot = CARDIO_SLOTS[where];
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
  where: CardioEnd,
  block: CardioBlock | null | undefined,
): SessionState =>
  patchWorkout(state, workoutId, (w) => {
    const cardio = { ...w.cardio };
    if (block === undefined) delete cardio[where];
    else cardio[where] = block;
    return { ...w, cardio };
  });

/** Put a different machine at one end, at that machine's default length. */
export const chooseCardio = (
  state: SessionState,
  workoutId: string,
  where: CardioEnd,
  machine: string,
): SessionState => setCardio(state, workoutId, where, { machine });

/**
 * Switch a block between a set distance, timed, and a set time, measured.
 * It starts on the machine's own default for whichever it becomes.
 */
export const setCardioMode = (
  state: SessionState,
  workoutId: string,
  where: CardioEnd,
  mode: "distance" | "time",
): SessionState => {
  const w = workoutById(state, workoutId);
  const plan = w && cardioPlan(state, w, where);
  if (!plan) return state;
  const machine = plan.machine.id;
  return setCardio(
    state,
    workoutId,
    where,
    mode === "distance"
      ? { machine, course: defaultCourse(plan.machine) }
      : { machine, minutes: CARDIO_MINUTES },
  );
};

/**
 * Step a block's length: a distance by one `COURSE_STEP`, never below one
 * step; minutes by one, between one and `MINUTES_MAX`. Each length keeps its
 * own record, so only whole steps are offered.
 */
export const nudgeCardio = (
  state: SessionState,
  workoutId: string,
  where: CardioEnd,
  direction: 1 | -1,
): SessionState => {
  const w = workoutById(state, workoutId);
  const plan = w && cardioPlan(state, w, where);
  if (!plan) return state;
  return setCardio(state, workoutId, where, {
    machine: plan.machine.id,
    ...stepLength(plan.machine, plan, direction),
  });
};

/** One step longer or shorter, on the grid every length keeps its records on. */
const stepLength = (
  machine: CardioExercise,
  length: CardioLength,
  direction: 1 | -1,
): CardioLength => {
  if (length.course !== undefined) {
    const step = COURSE_STEP[machine.metric.unit];
    // Snapped onto the grid, so the records only ever land on whole steps.
    return { course: Math.max(step, Math.round(length.course / step) * step + step * direction) };
  }
  return {
    minutes: Math.max(
      MINUTES_STEP,
      Math.min(
        MINUTES_MAX,
        Math.round(length.minutes / MINUTES_STEP) * MINUTES_STEP + MINUTES_STEP * direction,
      ),
    ),
  };
};

/** Which end of the session a cardio block sits at: the warm-up, or the finish. */
export const cardioEnd = (item: Item): CardioEnd =>
  item.id === CARDIO_SLOTS.close ? "close" : "open";

/** How far or how long a running cardio block is. */
export const itemLength = (item: Item): CardioLength =>
  item.course !== undefined ? { course: item.course } : { minutes: item.minutes ?? CARDIO_MINUTES };

/**
 * Make the cardio on screen longer or shorter, for today only: you feel like
 * 2 km instead of 1. The workout is untouched — `keepTodayLength` is the way
 * to make it stick. The score goes back to unentered, since a time over 1 km
 * says nothing about 2; each length keeps its own records.
 */
export const nudgeTodayLength = (state: SessionState, direction: 1 | -1): SessionState =>
  patchItem(state, (it) => {
    const machine = isCardio(it) ? cardioById(it.exerciseId) : undefined;
    return machine ? { ...it, ...lengthFields(stepLength(machine, itemLength(it), direction)) } : it;
  });

/**
 * What the running workout's plan has at this block's end, if it differs
 * from today — the length to go back to, or to replace with today's.
 */
export const plannedLength = (state: SessionState, item: Item): CardioLength | null => {
  const workout = state.active && workoutById(state, state.active.workoutId);
  const plan = workout && cardioPlan(state, workout, cardioEnd(item));
  return plan ? (plan.course !== undefined ? { course: plan.course } : { minutes: plan.minutes }) : null;
};

/**
 * Today's length on the cardio on screen, kept in the workout from now on —
 * the same as changing it in Plan, without leaving the session.
 */
export const keepTodayLength = (state: SessionState): SessionState => {
  const item = state.active?.items[state.active.cursor];
  if (!state.active || !item || !isCardio(item)) return state;
  return setCardio(state, state.active.workoutId, cardioEnd(item), {
    machine: item.exerciseId,
    ...itemLength(item),
  });
};

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
    const value = score === null ? null : Math.max(0, score);
    return isTimed(it) ? { ...it, seconds: value } : { ...it, distance: value };
  });

/**
 * Last session's score on this block's machine and length, if there is one.
 * It is what an unentered block starts from: shown in the box, stepped from
 * by −/+, and taken as the answer if you press Done without touching it.
 * The item's own score stays null until then, so leaving or skipping a
 * block you never did still records nothing.
 */
export const lastScore = (state: SessionState, item: Item): number | null =>
  cardioRecord(state, item)?.last ?? null;

/**
 * Step the score — by the machine's own increment, or by a few seconds —
 * from last time's, if unentered.
 */
export const nudgeScore = (state: SessionState, direction: 1 | -1): SessionState =>
  patchItem(state, (it) => {
    if (!isCardio(it)) return it;
    const step = isTimed(it) ? TIME_STEP : (cardioById(it.exerciseId)?.metric.step ?? 0.05);
    const next = (scoreOf(it) ?? lastScore(state, it) ?? 0) + step * direction;
    // Round back onto the step grid, so a nudge after a typed 1.03 gives 1.05.
    const snapped = Math.max(0, Number((Math.round(next / step) * step).toFixed(4)));
    return isTimed(it) ? { ...it, seconds: snapped } : { ...it, distance: snapped };
  });

/**
 * Done on a cardio block. Left unentered with a record to go on, it means
 * "same as last time" — the number you were shown is what gets logged.
 */
export const completeCardio = (state: SessionState): SessionState => {
  const item = state.active?.items[state.active.cursor];
  if (!item || !isCardio(item)) return completeExercise(state);
  const last = lastScore(state, item);
  const entered = scoreOf(item) === null && last !== null ? setScore(state, last) : state;
  return completeExercise(entered);
};

/** Mark a pose of the mobility routine done — its timer has run out on every side. */
export const completeMove = (state: SessionState, index: number): SessionState =>
  patchItem(state, (it) =>
    it.moves ? { ...it, moves: it.moves.map((d, i) => (i === index ? true : d)) } : it,
  );

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
      return machine ? { ...it, exerciseId: id, ...lengthFields(lengthOf(machine)) } : it;
    }
    if (isMobility(it)) {
      const routine = mobilityById(id);
      return routine ? { ...it, exerciseId: id, moves: routine.moves.map(() => false) } : it;
    }
    return it;
  });

/** The machines or routines this block could use, minus anything removed. */
export const conditioningPool = (
  state: SessionState,
  item: Item,
): { id: string; name: string }[] =>
  isCardio(item)
    ? cardioPool(state.hiddenConditioning).map((c) => ({ id: c.id, name: c.name }))
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

/**
 * Give a workout a routine of its own: a copy of the one it ends on, named
 * after it, so changing it leaves every other workout alone.
 */
export const copyRoutineFor = (
  state: SessionState,
  workoutId: string,
  routineId: string = newId("m"),
  where: RoutineEnd = "end",
): SessionState => {
  const workout = workoutById(state, workoutId);
  const from = workout && (where === "warmup" ? warmupPlan : mobilityPlan)(state, workout);
  if (!workout || !from) return state;
  const copy: MobilityRoutine = {
    id: routineId,
    name: `${workout.name || "Workout"} ${where === "warmup" ? "warm-up" : "stretch"}`,
    subtitle: `for ${workout.name || "one workout"}`,
    moves: from.moves.map((m) => ({ ...m })),
  };
  const added = addMobility(state, copy);
  return where === "warmup"
    ? setWarmup(added, workoutId, copy.id)
    : setMobility(added, workoutId, copy.id);
};

/** Which routine of a workout: the warm-up it opens with, or the stretch it ends on. */
export type RoutineEnd = "warmup" | "end";

/**
 * A routine you create from scratch starts as a copy of the everyday stretch,
 * so it works from the first tap; change it from there.
 */
export const createRoutine = (state: SessionState, id: string, name: string): SessionState => {
  const from = mobilityById(DEFAULT_MOBILITY) ?? mobilityPool(state.hiddenConditioning)[0];
  const trimmed = name.trim();
  if (!from || !trimmed) return state;
  return addMobility(state, {
    id,
    name: trimmed,
    subtitle: "your routine",
    moves: from.moves.map((m) => ({ ...m })),
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
  state.goals.filter((g) => !g.learned && g.steps.length > 0 && g.workouts.includes(workoutId));

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
    return current === null ? step.target : current <= by ? null : current - by;
  });

/** Long press: straight back to the target. */
export const resetGoalSet = (state: SessionState, index: number): SessionState =>
  writeGoalSet(state, index, (_current, step) => step.target);

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
export type Answers = { home: Kit | null; time: Time; easy: Easy[]; shape?: Shape };

/**
 * The plan for a set of answers: the shape your time gets, each slot filled
 * from what your usual place has and nothing you ruled out. A slot with
 * nothing to fill it is left out, and a workout left with nothing goes too.
 */
export const makePlan = (state: SessionState, answers: Answers): Workout[] => {
  const kit = answers.home ?? GYM;
  const avoid = avoidFor(answers.easy);
  const shape = SHAPES[answers.shape ?? SHAPE_FOR[answers.time]];
  const blank: SessionState = { ...state, workouts: shape, choices: {}, avoid };
  return shape.flatMap((w) => {
    const filled = fillWorkout(blank, w, kit, {}, avoid);
    const exercises = w.exercises.flatMap((e) => {
      const id = filled[e.id];
      return id ? [{ ...e, options: [id] }] : [];
    });
    return exercises.length > 0 ? [{ ...w, exercises }] : [];
  });
};

/** Start training on the plan these answers make. */
export const applyPlan = (
  state: SessionState,
  answers: Answers,
  now = Date.now(),
): SessionState => {
  const workouts = makePlan(state, answers);
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
    place: "usual",
    kits: { ...state.kits, usual: answers.home ?? undefined },
    avoid: avoidFor(answers.easy),
    onboarded: now,
  };
};

/** The first-launch questions: only on a phone that has never trained. */
export const wantsOnboarding = (state: SessionState): boolean =>
  !state.onboarded && wantsIntro(state);

export const wantsIntro = (state: SessionState): boolean =>
  !state.introSeen &&
  !state.active &&
  state.log.length === 0 &&
  Object.keys(state.history).length === 0;

/** The intro finished or skipped: it doesn't open by itself again. */
export const seeIntro = (state: SessionState, now = Date.now()): SessionState =>
  state.introSeen ? state : { ...state, introSeen: now };

// ---- context ----

export type SessionContextValue = {
  state: SessionState;
  setState: React.Dispatch<React.SetStateAction<SessionState>>;
};

export const SessionContext = createContext<SessionContextValue | null>(null);

export const useSession = (): SessionContextValue => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside SessionProvider");
  return ctx;
};
