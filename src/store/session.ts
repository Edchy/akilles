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
  groupOf,
  type Exercise,
  type Group,
  type Pattern,
} from "@/data/exercises";
import {
  CARDIO_DEFAULT,
  CARDIO_MINUTES,
  cardioById,
  cardioPool,
  hiddenCardio,
  hiddenMobility,
  leanHiddenConditioning,
  mobilityById,
  mobilityPool,
  setCustomConditioning,
  type CardioExercise,
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
import { warmupFor, type WarmupSet } from "@/lib/warmup";
import {
  applyDecay,
  applyResult,
  daysBetween,
  decayFor,
  rearmBackOff,
  freshState,
  hitTarget,
  markSkipped,
  prescribe,
  type Decay,
  type ExerciseState,
  type Feedback,
  type Prescription,
} from "@/lib/progression";

/**
 * What kind of block an item is.
 *
 * Lifting is the default and everything about the progression engine assumes
 * it. Cardio and mobility are their own things — no weight, no rep ladder, no
 * thumbs — so they are marked rather than squeezed into the same shape.
 */
export type Kind = "lift" | "cardio" | "mobility";

/** The two cardio blocks, by where they sit. Each remembers its own machine. */
export const CARDIO_SLOTS = { open: "Cardio · open", close: "Cardio · finish" } as const;
export const MOBILITY_SLOT = "Mobility";

export type Item = Entry & {
  /** Lift unless marked otherwise — see `Kind`. */
  kind?: Kind;
  /**
   * Minutes on the clock, for a cardio block. Fixed at five so the distance
   * is comparable session to session: the only variable is how far you get.
   */
  minutes?: number;
  /**
   * Distance covered, in the machine's own unit. `null` until entered — and
   * it stays null if you skip, which is how a skipped block is told apart
   * from a genuinely bad one.
   */
  distance?: number | null;
  /** Which poses of a mobility routine you have ticked off. */
  moves?: boolean[];
  /** The exercise currently filling this slot. */
  exerciseId: string;
  /** Exercise id supersetted into this one, if any. */
  supersetWith?: string;
  /**
   * The folded-in floater's own item, so it keeps its exercise, scheme and
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
  /** Feedback given for this exercise, pending until the workout ends. */
  feedback?: Feedback;
  /**
   * Reps logged per set. `null` means the circle is still empty.
   * Length is fixed at the set count when the workout is built.
   */
  logged: (number | null)[];
};

/**
 * The best and the last for one cardio machine, at the fixed block length.
 *
 * Two numbers rather than a log: on the screen you want "beat 1.02" and, when
 * you do, to see that it was your furthest. A full history of every five
 * minutes you have ever run is not something anyone reads.
 */
export type CardioRecord = {
  cardioId: string;
  /** Minutes the record was set over. Kept so a changed block length is not compared against the old one. */
  minutes: number;
  /** Last session's distance, in the machine's own unit. */
  last: number;
  /** Furthest ever over the same minutes. */
  best: number;
  /** Sessions actually completed on this machine. */
  sessions: number;
};

export type SessionState = {
  /**
   * Your workouts, in cycle order: top to bottom, then round again. Any number
   * from one up — with one, it simply repeats.
   */
  workouts: Workout[];
  /**
   * Id of the workout that comes next. Advances only on finish, to whichever
   * workout follows it in `workouts`, or when you pick one with Do next. An id
   * rather than a position, so reordering, adding or deleting other workouts
   * never changes what is next.
   */
  nextWorkout: string;
  /**
   * Built-in workouts you have removed, as they were — edits and all — with
   * the place they sat, so putting one back returns it where it was. One you
   * created yourself is deleted outright instead, like a custom exercise.
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
  /** Cardio machines and mobility routines you have added. */
  customCardio: CardioExercise[];
  customMobility: MobilityRoutine[];
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
   * so sharing one record would make a volume 👍 bump the strength number.
   */
  history: Record<string, ExerciseState>;
  /**
   * Cardio records, keyed by machine id — not by slot.
   *
   * The point of the block is to beat your own last distance on *that*
   * machine, so a treadmill 5 minutes is the same benchmark whether it opened
   * or closed the session. Mobility keeps no record: there is nothing to beat.
   */
  conditioning: Record<string, CardioRecord>;
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
  } | null;
};

const roundTo = (value: number, step: number) =>
  step <= 0 ? value : Math.round(value / step) * step;

/**
 * Weight can only go below zero on a movement that can be *assisted* — a
 * pull-up or dip machine that takes weight off you. There, −30 means
 * bodyweight minus 30, and progress is the number climbing back toward 0.
 */
const clampWeight = (exercise: Exercise, weight: number): number =>
  exercise.assistable ? weight : Math.max(0, weight);

/** Key into `history`. Exercise and scheme together, never exercise alone. */
export const key = (exerciseId: string, scheme: Scheme) => `${exerciseId}:${scheme}`;

/** Key into `choices`: which exercise fills a given slot of a given module. */
export const slotKey = (workoutId: string, entryId: string) => `${workoutId}/${entryId}`;

/**
 * The exercise catalogue: the built-in list plus anything you have added,
 * minus anything you have removed.
 */
export const catalogue = (state: SessionState): Exercise[] => [
  ...EXERCISES.filter((e) => e.enabled !== false && !state.hidden.includes(e.id)),
  ...state.custom,
];

/** Built-in exercises you have removed, so they can be put back. */
export const hiddenExercises = (state: SessionState): Exercise[] =>
  EXERCISES.filter((e) => state.hidden.includes(e.id));

/** Put a removed built-in back into the catalogue. */
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

/** Look up an exercise anywhere: built-in or one of yours. */
export const lookup = (state: SessionState, id: string): Exercise | undefined =>
  state.custom.find((e) => e.id === id) ?? byId(id);

/** Add an exercise to the catalogue. Its pattern decides which slots offer it. */
export const addExercise = (
  state: SessionState,
  exercise: Exercise,
): SessionState => {
  const custom = [...state.custom, exercise];
  setCustomExercises(custom);
  return { ...state, custom };
};

/**
 * Remove an exercise from the catalogue. Any slot using it falls back to that
 * slot's first option; its training history is kept, so adding it back later
 * resumes where it left off. Refused if it would empty a movement type.
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

// ---- the workouts ----

export const workoutById = (state: SessionState, id: string): Workout | undefined =>
  state.workouts.find((w) => w.id === id);

/** The workout Start will run. Falls back to the first if the id has gone. */
export const upNext = (state: SessionState): Workout =>
  workoutById(state, state.nextWorkout) ?? state.workouts[0];

/**
 * The id of the workout after this one, wrapping at the bottom. A workout
 * that no longer exists — deleted mid-session — hands over to whatever is
 * already queued as next, which the delete moved on for it.
 */
const following = (state: SessionState, id: string): string => {
  const i = state.workouts.findIndex((w) => w.id === id);
  if (i === -1) return upNext(state).id;
  return state.workouts[(i + 1) % state.workouts.length].id;
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
  workouts: [...state.workouts, { id, name, subtitle: "", exercises: [] }],
});

export const renameWorkout = (
  state: SessionState,
  id: string,
  patch: { name?: string; subtitle?: string },
): SessionState => patchWorkout(state, id, (w) => ({ ...w, ...patch }));

/** Whether a workout can be deleted. The last one stays: a cycle needs something in it. */
export const canRemoveWorkout = (state: SessionState): boolean => state.workouts.length > 1;

/** Whether a workout is one of the starting program's, rather than one you created. */
export const isBuiltInWorkout = (id: string): boolean =>
  DEFAULT_WORKOUTS.some((w) => w.id === id);

/**
 * Remove a workout. If it was next, the one after it becomes next, so the
 * cycle carries on from the same place. Training history is per exercise, not
 * per workout, so nothing you lifted is lost.
 *
 * A built-in goes to the Removed list with its exercise choices kept, so it
 * comes back exactly as it was. One you created is deleted for good.
 */
export const removeWorkout = (state: SessionState, id: string): SessionState => {
  if (!canRemoveWorkout(state)) return state;
  const at = state.workouts.findIndex((w) => w.id === id);
  if (at === -1) return state;
  const builtIn = isBuiltInWorkout(id);
  const choices = { ...state.choices };
  if (!builtIn) {
    for (const k of Object.keys(choices)) if (k.startsWith(`${id}/`)) delete choices[k];
  }
  return {
    ...state,
    choices,
    workouts: state.workouts.filter((w) => w.id !== id),
    nextWorkout: state.nextWorkout === id ? following(state, id) : state.nextWorkout,
    removedWorkouts: builtIn
      ? [
          ...state.removedWorkouts.filter((r) => r.workout.id !== id),
          { workout: state.workouts[at], at },
        ]
      : state.removedWorkouts,
  };
};

/**
 * Put a removed built-in back where it sat, or at the bottom if the cycle has
 * since got shorter. What is next does not change.
 */
export const restoreWorkout = (state: SessionState, id: string): SessionState => {
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
 * none was ever offered. Undone with `setNextWorkout`.
 */
export const skipWorkout = (state: SessionState): SessionState =>
  state.active ? state : { ...state, nextWorkout: following(state, upNext(state).id) };

/** Make a workout the next one Start runs. */
export const setNextWorkout = (state: SessionState, id: string): SessionState =>
  workoutById(state, id) ? { ...state, nextWorkout: id } : state;

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
 * the middle rep range; everything about it can be changed afterwards.
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

/** Fewest and most sets a slot can be given. */
export const SETS_RANGE = { min: 1, max: 10 } as const;

/** Change how a slot is trained: its rep range, set count or superset flag. */
export const updateEntry = (
  state: SessionState,
  workoutId: string,
  entryId: string,
  patch: Partial<Pick<Entry, "scheme" | "sets" | "floater">>,
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
  customCardio: [],
  customMobility: [],
  hidden: leanHiddenExercises(),
  hiddenConditioning: leanHiddenConditioning(),
  history: {},
  conditioning: {},
  active: null,
};

/**
 * What time has cost you, as an offer rather than a fact.
 *
 * Nothing here writes anything. It reports what a layoff or a stalled month
 * WOULD take off, and the change only happens if you accept it on the Today
 * screen. Your weights are yours: the app can notice you have been away, but
 * it should not quietly rewrite what you lift while you were gone.
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
 * Everything a layoff or a stalled month would cut, across the catalogue.
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
    const decay = decayFor(record, scheme, now);
    if (!decay) continue;
    offers.push({
      key: k,
      exerciseId: record.exerciseId,
      scheme,
      decay,
      from: record.weight,
      to: applyDecay(record, scheme, decay, now).weight,
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
    history[offer.key] = applyDecay(history[offer.key], offer.scheme, offer.decay, now);
  }
  return { ...state, history };
};

/**
 * Decline it: keep every weight where it is, and do not ask again until the
 * situation changes.
 *
 * The clocks are re-armed exactly as if the cut had been applied, so
 * declining is a real answer rather than a snooze — you are not asked the
 * same question every time you open the app.
 */
export const declineDecay = (
  state: SessionState,
  now: number = Date.now(),
): SessionState => {
  const history = { ...state.history };
  for (const offer of decayOffers(state, now)) {
    const record = history[offer.key];
    history[offer.key] = {
      ...rearmBackOff(record, offer.scheme, now),
      // The idle clock moves too, so a declined layoff is not re-offered
      // tomorrow. Training itself will reset this properly.
      lastTrainedAt: now,
    };
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
        const entries = SHORT_WORKOUTS ? workout.exercises.slice(0, 2) : workout.exercises;
        const lifts = entries.map((e) => {
          const exerciseId = chosen(state, workout.id, e);
          const ex = byId(exerciseId)!;
          const group = groupOf(ex);
          const first = !warmed.has(group);
          warmed.add(group);
          // A derived lift takes a fraction of another exercise's current
          // working weight, so it keeps up on its own.
          const own = state.history[key(exerciseId, e.scheme)] ?? freshState(ex);
          const weight = e.derive
            ? roundTo(
                (
                  state.history[key(e.derive.from, e.derive.scheme)] ??
                  freshState(byId(e.derive.from)!)
                ).weight * e.derive.fraction,
                ex.increment || 2.5,
              )
            : own.weight;

          return {
            ...e,
            exerciseId,
            weight,
            logged: Array<number | null>(setsFor(e)).fill(null),
            warmup: first && !e.floater,
          };
        });

        // Cardio opens the session and closes it, with mobility last of all:
        // warm before you lift, flushed after, and stretched once everything
        // is done. All three are skippable like any other block.
        return [
          cardioBlock(state, "open"),
          ...lifts,
          cardioBlock(state, "close"),
          mobilityBlock(state),
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
  if (!item || isConditioning(item)) return null;
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
    { ...st, weight: item.supersetWeight ?? st.weight },
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
 * and tapping past 1 clears it in case of a mis-tap.
 */
export const tapSet = (
  state: SessionState,
  setIndex: number,
  which: "main" | "partner" = "main",
): SessionState => {
  if (!state.active) return state;
  const p = which === "main" ? currentPrescription(state) : partnerPrescription(state);
  if (!p) return state;
  const { items, cursor } = state.active;
  const log = which === "main" ? items[cursor].logged : items[cursor].supersetLogged;
  if (!log) return state;

  const current = log[setIndex];
  const next = current === null ? p.reps : current <= 1 ? null : current - 1;
  const updated = log.map((r, j) => (j === setIndex ? next : r));

  return {
    ...state,
    active: {
      ...state.active,
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
  if (!item || isConditioning(item)) return false;
  const filled = (log?: (number | null)[]) => !log || log.every((r) => r !== null);
  return filled(item.logged) && filled(item.supersetLogged);
};

/**
 * Every set at or above target — the only case where the thumbs question is
 * asked, and the only route to more weight.
 */
export const madeTarget = (state: SessionState): boolean => {
  const item = state.active?.items[state.active.cursor];
  const p = currentPrescription(state);
  if (!item || !p) return false;
  // Speed and jump work never asks how it felt: nothing progresses from it.
  if (item.derive || p.exercise.unloaded) return false;
  if (!hitTarget(item.logged, p.reps)) return false;

  const pp = partnerPrescription(state);
  if (pp && item.supersetLogged) return hitTarget(item.supersetLogged, pp.reps);
  return true;
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
 * `feedback` is undefined when the sets fell short of target.
 */
export const completeExercise = (
  state: SessionState,
  feedback?: Feedback,
): SessionState => {
  if (!state.active) return state;
  // Patch first, then advance off the patched state — spreading the original
  // `active` here would throw the patch away.
  const patched = patchItem(state, (it) => ({ ...it, feedback, skipped: false }));
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
  if (!item || isConditioning(item) || item.logged.some((r) => r !== null)) return state;
  if (currentTaken(state).has(exerciseId)) return state;
  const ex = byId(exerciseId);
  if (!ex) return state;
  // Seeded from that exercise's own history, so it opens at the right weight.
  return patchItem(state, (it) => ({
    ...it,
    exerciseId,
    weight: (state.history[key(exerciseId, it.scheme)] ?? freshState(ex)).weight,
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
  return poolFor(state, state.active.workoutId, item);
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
      .filter((it, i) => i !== cursor && !isConditioning(it))
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
          weight:
            item.supersetWeight ??
            (
              state.history[
                key(item.supersetEntry.exerciseId, item.supersetEntry.scheme)
              ] ?? freshState(byId(item.supersetEntry.exerciseId)!)
            ).weight,
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

/** Floaters still ahead of the cursor — the valid superset partners. */
export const supersetOptions = (state: SessionState): Exercise[] => {
  if (!state.active) return [];
  const { items, cursor } = state.active;
  return items
    .filter((it, i) => i > cursor && it.floater && !isConditioning(it))
    .map((it) => byId(it.exerciseId)!);
};

/**
 * Pair a floater into the current exercise. The floater is removed from the
 * tail of the workout so it isn't prescribed twice.
 */
export const addSuperset = (state: SessionState, exerciseId: string): SessionState => {
  if (!state.active) return state;
  const { items, cursor } = state.active;
  const floater = items.find(
    (f, j) => j > cursor && f.floater && f.exerciseId === exerciseId,
  );
  if (!floater) return state;
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
                supersetEntry: floater,
                supersetLogged: Array<number | null>(setsFor(floater!)).fill(null),
              }
            : it,
        )
        .filter((it, i) => !(i > cursor && it.floater && it.exerciseId === exerciseId)),
    },
  };
};

/**
 * Undo a superset: the partner goes back to its own place in the workout,
 * keeping anything already logged against it.
 *
 * "Its own place" is the slot order of the module, not wherever it happened
 * to sit — so a floater released after one was already re-queued still lands
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
    if (isCardio(item)) return item.distance !== null && item.distance !== undefined;
    return [...item.logged, ...(item.supersetLogged ?? [])].some((r) => r !== null);
  });

/**
 * Finish the workout and advance the cycle. Nothing is owed if it was short.
 *
 * **This is the only place history is written.** Everything during a session —
 * circle taps, weight edits, thumbs, skips — lives on the session's items, so
 * you can go Back and change any of it. The commit happens once, here, whether
 * you finished every exercise or left partway through.
 *
 * Anything neither logged nor given feedback counts as skipped: its weight and
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

  const commit = (
    exerciseId: string,
    scheme: Scheme,
    weight: number,
    logged: (number | null)[],
    feedback: Feedback | undefined,
    performed: boolean,
  ) => {
    const k = key(exerciseId, scheme);
    const prior = history[k] ?? freshState(byId(exerciseId)!);
    // The session's weight is what you actually lifted, so it carries over
    // either way — a skipped exercise simply keeps the number it opened with.
    const base = { ...prior, weight };
    history[k] = performed
      ? applyResult(base, scheme, logged, feedback, now)
      : markSkipped(base);
  };

  for (const item of state.active?.items ?? []) {
    // Cardio keeps its own record: last and furthest over the block length.
    // A block with no distance entered — skipped, or left before the number
    // went in — writes nothing, so the mark to beat stays where it was.
    if (isCardio(item)) {
      if (item.skipped || item.distance === null || item.distance === undefined) continue;
      const minutes = item.minutes ?? CARDIO_MINUTES;
      const k = cardioKey(item.exerciseId, minutes);
      const prior = conditioning[k];
      conditioning[k] = {
        cardioId: item.exerciseId,
        minutes,
        last: item.distance,
        best: Math.max(item.distance, prior?.best ?? 0),
        sessions: (prior?.sessions ?? 0) + 1,
      };
      continue;
    }
    // Mobility is a checklist and nothing more — there is nothing to record.
    if (isMobility(item)) continue;

    const touched = item.logged.some((r) => r !== null);
    const performed = touched && !item.skipped;

    // Speed work takes its weight from the heavy day and jumps have no weight
    // at all, so neither has a ladder to climb or a number worth storing.
    if (item.derive || byId(item.exerciseId)!.unloaded) continue;

    commit(item.exerciseId, item.scheme, item.weight, item.logged, item.feedback, performed);

    const e = item.supersetEntry;
    if (e) {
      commit(
        e.exerciseId,
        e.scheme,
        item.supersetWeight ?? history[key(e.exerciseId, e.scheme)]?.weight ?? 0,
        item.supersetLogged ?? [],
        item.feedback,
        performed && !!item.supersetLogged?.some((r) => r !== null),
      );
    }
  }

  return {
    ...state,
    history,
    conditioning,
    nextWorkout: following(state, state.active!.workoutId),
    active: null,
  };
};

export const isComplete = (state: SessionState): boolean =>
  !!state.active && state.active.cursor >= state.active.items.length;

// ---- cardio & mobility ----

/**
 * Key into `conditioning`. Machine and block length together: five minutes on
 * the treadmill is not comparable with ten, so they never share a record.
 */
export const cardioKey = (cardioId: string, minutes: number) =>
  `${cardioId}:${minutes}m`;

/** The record for a machine at a block length, if you have ever done one. */
export const cardioRecord = (
  state: SessionState,
  cardioId: string,
  minutes: number,
): CardioRecord | undefined => state.conditioning[cardioKey(cardioId, minutes)];

/**
 * Conditioning choices belong to no single workout — the same treadmill
 * opener runs on every one — so they are keyed under one shared id rather
 * than per module.
 */
export const CONDITIONING_ID = "conditioning";

/** Whether an item is one of the conditioning blocks rather than a lift. */
export const isCardio = (item: Item): boolean => item.kind === "cardio";
export const isMobility = (item: Item): boolean => item.kind === "mobility";
export const isConditioning = (item: Item): boolean =>
  item.kind === "cardio" || item.kind === "mobility";

/**
 * A cardio block for one end of the session.
 *
 * `slot` is what makes the two remember separately: swapping the opener to
 * the rower leaves the ski-erg finisher alone, and vice versa.
 */
const cardioBlock = (state: SessionState, where: "open" | "close"): Item => {
  const slot = CARDIO_SLOTS[where];
  const pool = cardioPool(state.hiddenConditioning);
  const picked = state.choices[slotKey(CONDITIONING_ID, slot)];
  // Fall back through the default to whatever is left: the machine you chose
  // may have been removed from the catalogue since.
  const usable = (id: string | undefined) => !!id && pool.some((c) => c.id === id);
  const cardioId = usable(picked)
    ? picked!
    : usable(CARDIO_DEFAULT[where])
      ? CARDIO_DEFAULT[where]
      : pool[0].id;
  return {
    kind: "cardio",
    id: slot,
    slot,
    // The pattern and scheme are never read for a conditioning block — they
    // exist only because `Item` extends the lifting `Entry`.
    pattern: "abs",
    options: [],
    scheme: "volume",
    exerciseId: cardioId,
    minutes: CARDIO_MINUTES,
    distance: null,
    weight: 0,
    logged: [],
  };
};

/** The closing mobility block. */
const mobilityBlock = (state: SessionState): Item => {
  const pool = mobilityPool(state.hiddenConditioning);
  const picked = state.choices[slotKey(CONDITIONING_ID, MOBILITY_SLOT)];
  const routineId =
    picked && pool.some((m) => m.id === picked) ? picked : pool[0].id;
  const routine = mobilityById(routineId)!;
  return {
    kind: "mobility",
    id: MOBILITY_SLOT,
    slot: MOBILITY_SLOT,
    pattern: "abs",
    options: [],
    scheme: "volume",
    exerciseId: routineId,
    moves: routine.moves.map(() => false),
    weight: 0,
    logged: [],
  };
};

/** The cardio machine or mobility routine on screen, if this is one. */
export const currentCardio = (state: SessionState): CardioExercise | undefined => {
  const item = state.active?.items[state.active.cursor];
  return item && isCardio(item) ? cardioById(item.exerciseId) : undefined;
};

export const currentRoutine = (state: SessionState): MobilityRoutine | undefined => {
  const item = state.active?.items[state.active.cursor];
  return item && isMobility(item) ? mobilityById(item.exerciseId) : undefined;
};

/** Enter the distance covered. Null clears it back to unentered. */
export const setDistance = (
  state: SessionState,
  distance: number | null,
): SessionState =>
  patchItem(state, (it) =>
    isCardio(it)
      ? { ...it, distance: distance === null ? null : Math.max(0, distance) }
      : it,
  );

/**
 * Last session's distance on this block's machine and minutes, if there is
 * one. It is what an unentered block starts from: shown in the box, stepped
 * from by −/+, and taken as the answer if you press Done without touching it.
 * The item's own `distance` stays null until then, so leaving or skipping a
 * block you never did still records nothing.
 */
export const lastDistance = (state: SessionState, item: Item): number | null =>
  isCardio(item)
    ? (cardioRecord(state, item.exerciseId, item.minutes ?? CARDIO_MINUTES)?.last ?? null)
    : null;

/** Step the distance by the machine's own increment — from last time's, if unentered. */
export const nudgeDistance = (state: SessionState, direction: 1 | -1): SessionState =>
  patchItem(state, (it) => {
    if (!isCardio(it)) return it;
    const step = cardioById(it.exerciseId)?.metric.step ?? 0.05;
    const next = (it.distance ?? lastDistance(state, it) ?? 0) + step * direction;
    // Round back onto the step grid, so a nudge after a typed 1.03 gives 1.05.
    const snapped = Math.round(next / step) * step;
    return { ...it, distance: Math.max(0, Number(snapped.toFixed(4))) };
  });

/**
 * Done on a cardio block. Left unentered with a record to go on, it means
 * "same as last time" — the distance you were shown is what gets logged.
 */
export const completeCardio = (state: SessionState): SessionState => {
  const item = state.active?.items[state.active.cursor];
  if (!item || !isCardio(item)) return completeExercise(state);
  const last = lastDistance(state, item);
  const entered =
    item.distance === null || item.distance === undefined
      ? last === null
        ? state
        : setDistance(state, last)
      : state;
  return completeExercise(entered);
};

/** Tick a pose off the mobility checklist. */
export const toggleMove = (state: SessionState, index: number): SessionState =>
  patchItem(state, (it) =>
    it.moves ? { ...it, moves: it.moves.map((d, i) => (i === index ? !d : d)) } : it,
  );

/** Swap the machine or routine filling a conditioning block. Sticks for next time. */
export const chooseConditioning = (
  state: SessionState,
  slot: string,
  id: string,
): SessionState => {
  const choices = { ...state.choices, [slotKey(CONDITIONING_ID, slot)]: id };
  if (!state.active) return { ...state, choices };
  return {
    ...state,
    choices,
    active: {
      ...state.active,
      items: state.active.items.map((it) => {
        if (it.slot !== slot || !isConditioning(it)) return it;
        return isCardio(it)
          ? { ...it, exerciseId: id, distance: null }
          : {
              ...it,
              exerciseId: id,
              moves: (mobilityById(id)?.moves ?? []).map(() => false),
            };
      }),
    },
  };
};

/** The machines or routines this block could use, minus anything removed. */
export const conditioningPool = (
  state: SessionState,
  item: Item,
): { id: string; name: string }[] =>
  isCardio(item)
    ? cardioPool(state.hiddenConditioning).map((c) => ({ id: c.id, name: c.name }))
    : mobilityPool(state.hiddenConditioning).map((m) => ({ id: m.id, name: m.name }));

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
 * Remove a machine or routine. Any block using it falls back to the pool's
 * default; a built-in is hidden rather than deleted, so its distance records
 * survive and come back if you restore it. Refused if it would empty a pool.
 */
export const removeConditioning = (state: SessionState, id: string): SessionState => {
  if (!canRemoveConditioning(state, id)) return state;
  const mine = isCustomConditioning(state, id);
  // Drop any slot pointing at it, so the block falls back to its default.
  const choices = { ...state.choices };
  for (const [k, v] of Object.entries(choices)) {
    if (v === id && k.startsWith(`${CONDITIONING_ID}/`)) delete choices[k];
  }
  return syncConditioning({
    ...state,
    choices,
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
