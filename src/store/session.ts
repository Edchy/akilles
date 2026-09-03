/**
 * Session state.
 *
 * Everything lives in one object so it can be dropped into AsyncStorage
 * later without restructuring. Right now it's in-memory + a React context.
 */

import { createContext, useContext } from "react";

import {
  EXERCISES,
  byId,
  isPattern,
  setCustomExercises,
  groupOf,
  type Exercise,
  type Group,
} from "@/data/exercises";
import {
  CYCLE,
  setsFor,
  workoutAt,
  type Entry,
  type Scheme,
  type Workout,
} from "@/data/split";
import { warmupFor, type WarmupSet } from "@/lib/warmup";
import {
  applyResult,
  freshState,
  hitTarget,
  markSkipped,
  prescribe,
  type ExerciseState,
  type Feedback,
  type Prescription,
} from "@/lib/progression";

export type Item = Entry & {
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

export type SessionState = {
  /** Which workout in the 5-day cycle comes next. Advances only on finish. */
  cycleIndex: number;
  /**
   * Your chosen exercise per slot, keyed by `workoutId/slot`. Absent means the
   * slot's first option. Set from the Plan screen or by swapping mid-workout.
   */
  choices: Record<string, string>;
  /** Exercises you have added to the catalogue. */
  custom: Exercise[];
  /**
   * Built-in exercises you have removed. Hidden rather than deleted, so
   * restoring one brings its training history back with it.
   */
  hidden: string[];
  /**
   * One record per exercise PER SCHEME, keyed by `exerciseId:scheme`.
   *
   * An exercise done on a strength day and on a volume day is tracked
   * separately: the two sit on different rep ladders at different weights,
   * so sharing one record would make a volume 👍 bump the strength number.
   */
  history: Record<string, ExerciseState>;
  /** The workout currently in progress, or null on the Today screen. */
  active: {
    workoutId: string;
    items: Item[];
    /** Index of the exercise on screen. */
    cursor: number;
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
export const slotKey = (workoutId: string, slot: string) => `${workoutId}/${slot}`;

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
    CYCLE.find((w) => w.id === workoutId)
      ?.exercises.filter((e) => e.slot !== entry.slot)
      .map((e) => chosenRaw(state, workoutId, e)) ?? [],
  );

/**
 * The raw choice for a slot without the duplicate filtering, used to work out
 * what other slots have taken. Falls back to the first built-in option.
 */
const chosenRaw = (state: SessionState, workoutId: string, entry: Entry): string =>
  state.choices[slotKey(workoutId, entry.slot)] ?? entry.options[0];

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



export const initialState: SessionState = {
  cycleIndex: 0,
  choices: {},
  custom: [],
  hidden: [],
  history: {},
  active: null,
};

export const buildWorkout = (state: SessionState): SessionState => {
  const workout = workoutAt(state.cycleIndex);
  return {
    ...state,
    active: {
      workoutId: workout.id,
      items: (() => {
        // The first exercise of each muscle group gets a warm-up; by the time
        // the second push or pull comes round you are already warm.
        const warmed = new Set<Group>();
        return workout.exercises.map((e) => {
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
      })(),
      cursor: 0,
    },
  };
};

export const currentWorkout = (state: SessionState): Workout =>
  CYCLE.find((w) => w.id === state.active?.workoutId) ?? workoutAt(state.cycleIndex);

/** The prescription for the exercise currently on screen. */
export const currentPrescription = (state: SessionState): Prescription | null => {
  if (!state.active) return null;
  const item = state.active.items[state.active.cursor];
  if (!item) return null;
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
  if (!item) return false;
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
 * Swap the exercise filling a slot. Used from Plan and from the workout.
 *
 * The choice sticks: a swap mid-workout becomes the module's new default, so
 * something you tried and liked carries over without a second trip to Plan.
 */
export const chooseExercise = (
  state: SessionState,
  workoutId: string,
  slot: string,
  exerciseId: string,
): SessionState => {
  // Refuse an exercise another slot in this module is already using: it would
  // mean doing the same movement twice in one session. Mid-workout, check the
  // live items — a swap already made this session counts.
  if (state.active?.workoutId === workoutId) {
    const taken = new Set(
      state.active.items
        .filter((it) => it.slot !== slot)
        .flatMap((it) => [it.exerciseId, ...(it.supersetWith ? [it.supersetWith] : [])]),
    );
    if (taken.has(exerciseId)) return state;
  } else {
    const entry = CYCLE.find((w) => w.id === workoutId)?.exercises.find(
      (e) => e.slot === slot,
    );
    if (entry && takenElsewhere(state, workoutId, entry).has(exerciseId)) return state;
  }

  const choices = { ...state.choices, [slotKey(workoutId, slot)]: exerciseId };
  if (!state.active || state.active.workoutId !== workoutId) {
    return { ...state, choices };
  }
  // Mid-workout: swap the live item too, seeding it from that exercise's own
  // history so it opens at the right weight.
  const ex = byId(exerciseId)!;
  return {
    ...state,
    choices,
    active: {
      ...state.active,
      items: state.active.items.map((it) =>
        it.slot === slot && !it.logged.some((r) => r !== null)
          ? {
              ...it,
              exerciseId,
              weight: (state.history[key(exerciseId, it.scheme)] ?? freshState(ex))
                .weight,
              logged: Array<number | null>(setsFor(it)).fill(null),
            }
          : it,
      ),
    },
  };
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
      .filter((_, i) => i !== cursor)
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
    .filter((it, i) => i > cursor && it.floater)
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

  const order = CYCLE.find((w) => w.id === workoutId)?.exercises.map((e) => e.slot) ?? [];
  const rank = (it: Item) => {
    const i = order.indexOf(it.slot);
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
 * Finish the workout and advance the cycle. Nothing is owed if it was short.
 *
 * **This is the only place history is written.** Everything during a session —
 * circle taps, weight edits, thumbs, skips — lives on the session's items, so
 * you can go Back and change any of it. The commit happens once, here, whether
 * you finished every exercise or left partway through.
 *
 * Anything neither logged nor given feedback counts as skipped: its weight and
 * rep ladder are left untouched and it is flagged for next time.
 */
export const finishWorkout = (state: SessionState): SessionState => {
  const history = { ...state.history };

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
      ? applyResult(base, scheme, logged, feedback)
      : markSkipped(base);
  };

  for (const item of state.active?.items ?? []) {
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
    cycleIndex: (state.cycleIndex + 1) % CYCLE.length,
    active: null,
  };
};

export const isComplete = (state: SessionState): boolean =>
  !!state.active && state.active.cursor >= state.active.items.length;

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
