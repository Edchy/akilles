/**
 * Saving your training to the device.
 *
 * The whole state is one small JSON object — a year of training is a few
 * kilobytes — so there is nothing to diff and nothing to migrate between
 * screens. We write the lot on every change and read it back once on launch.
 *
 * The workout in progress is saved too, but is only resumed until the end of the
 * day it was started. Reopening the app mid-session should put you back where
 * you were; reopening it on Thursday closes out Tuesday's workout instead.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

import { setCustomConditioning } from "@/data/conditioning";
import { leanHiddenExercises, setCustomExercises, setExerciseEdits } from "@/data/exercises";
import { DEFAULT_SCHEME, DEFAULT_WORKOUTS, ladderFor, type Entry, type Scheme } from "@/data/split";
import { progressScore, type ExerciseState } from "@/lib/progression";
import {
  CONDITIONING_ID,
  finishWorkout,
  initialState,
  isConditioning,
  key,
  type Item,
  type SessionState,
} from "@/store/session";

// The app's old working name. Never rename it: a new key reads as an empty
// store, and every saved workout would appear to be gone.
const KEY = "achilles/state";

/**
 * Bumped whenever the saved shape changes in a way older blobs cannot satisfy.
 * A blob from a newer version than we understand is left alone rather than
 * overwritten, so downgrading the app does not destroy training history.
 *
 * 2 — added cardio records and the conditioning catalogue. A version-1 blob
 *     is migrated rather than dropped: everything it holds is still valid, it
 *     simply has no conditioning yet.
 * 3 — exercise records carry timestamps, so weights can be eased back after a
 *     layoff. A record without them is simply never decayed, so older blobs
 *     migrate cleanly and start their clocks at the next session.
 * 4 — workouts moved into the saved state so they can be added, removed and
 *     reordered, and "next" became a workout id instead of a position. An
 *     older blob gets the built-in five, with next taken from its old
 *     position — the built-ins keep their ids, so choices still line up.
 * 5 — the starting program changed to push/pull/legs/push/pull, and existing
 *     workouts are replaced by it: a deliberate one-time wipe. Exercise
 *     choices for the old workouts go with them; the new program's exercises
 *     are put back in the catalogue if they had been removed. Training history
 *     is untouched — it is kept per exercise, not per workout.
 * 6 — removed built-in workouts are kept on a Removed list so they can be put
 *     back. Any built-in already missing — deleted before the list existed —
 *     is placed on it at its default position.
 * 7 — the exercise catalogue starts from a new default pool, and the rest is
 *     a library to add from rather than a "Removed" list. The catalogue is
 *     reset to that pool — plus anything a workout uses — since nothing had
 *     been curated by hand yet. Exercise edits (name, weight step) are new.
 * 8 — the default pool gained an alternative for every slot that had none
 *     (squat, hinge, single leg, chest fly); those are added to the
 *     catalogue. Nothing is removed.
 * 9 — every slot climbs 6 → 8 → 10 → 12, and abs are two sets. A lift's
 *     records on its old ranges are folded into one on the new range — see
 *     `toEvenRanges` — so no weight goes back to a guess.
 */
const VERSION = 9;

/** What actually goes to disk. Older blobs carry a cycle position, not an id. */
type Saved = {
  version: number;
  state: SessionState & { cycleIndex?: number };
};

/**
 * Whether a session started at `startedAt` is still today's.
 *
 * Calendar day in the phone's own timezone, not twenty-four hours: a workout
 * begun at 9pm is stale by the next morning, not by the next evening. A clock
 * that has moved backwards — a timezone change, a manual correction — reads as
 * a different day and closes the session out, which is the safe direction to err.
 */
const isToday = (startedAt: number | undefined): boolean => {
  // A session saved before sessions carried a timestamp has no day to compare
  // against, so it is treated as stale.
  if (typeof startedAt !== "number") return false;
  const then = new Date(startedAt);
  const now = new Date();
  return (
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate()
  );
};

const DAY = 24 * 60 * 60 * 1000;

/**
 * Version 9: every slot onto 6–12, and each lift's records onto that range.
 *
 * A lift trained on two ranges — heavy bench on Push A, lighter on Push B —
 * becomes one record. It takes the heavier weight, at the rung nearest the
 * reps it was on: 6 → 8 → 10 → 12 starts at 6, so the heavy day's weight is
 * the one to keep. A range left idle for three weeks or more is passed over,
 * since its weight is no longer the one you lift. Speed work has no range
 * and is left alone.
 */
const toEvenRanges = (state: SessionState): SessionState => {
  const retune = <T extends Entry>(e: T): T => ({
    ...e,
    ...(e.scheme === "speed" || e.derive ? {} : { scheme: DEFAULT_SCHEME }),
    ...(e.pattern === "abs" ? { sets: 2 } : {}),
  });
  const retuneItem = (it: Item): Item =>
    isConditioning(it) || it.derive || it.scheme === "speed"
      ? it
      : {
          ...it,
          scheme: DEFAULT_SCHEME,
          supersetEntry: it.supersetEntry && retuneItem(it.supersetEntry),
        };

  type Held = { k: string; scheme: Scheme; record: ExerciseState };
  const byExercise = new Map<string, Held[]>();
  for (const [k, record] of Object.entries(state.history)) {
    const scheme = k.slice(k.indexOf(":") + 1) as Scheme;
    if (scheme === "speed") continue;
    byExercise.set(record.exerciseId, [...(byExercise.get(record.exerciseId) ?? []), { k, scheme, record }]);
  }

  const ladder = ladderFor(DEFAULT_SCHEME);
  const target = ({ scheme, record }: Held) => {
    const own = ladderFor(scheme);
    return own[Math.min(record.rung, own.length - 1)];
  };
  const history = { ...state.history };
  for (const [id, held] of byExercise) {
    const times = held.flatMap((h) => (typeof h.record.lastTrainedAt === "number" ? [h.record.lastTrainedAt] : []));
    const newest = times.length > 0 ? Math.max(...times) : undefined;
    const current = held.filter(
      (h) => newest === undefined || (h.record.lastTrainedAt ?? newest) >= newest - 21 * DAY,
    );
    const source = current.reduce((a, b) =>
      b.record.weight > a.record.weight ||
      (b.record.weight === a.record.weight && target(b) > target(a))
        ? b
        : a,
    );
    const rung = Math.max(0, ladder.filter((reps) => reps <= target(source)).length - 1);
    const moved: ExerciseState = { ...source.record, rung };
    const merged: ExerciseState = {
      ...moved,
      lastTrainedAt: newest,
      bestWeight: Math.max(...held.map((h) => Math.max(h.record.bestWeight ?? h.record.weight, h.record.weight))),
      // The routine back-off compares progress against a baseline. Carry over
      // how far it had moved, not the number, which was on the old ladder.
      backOffScore:
        typeof source.record.backOffScore === "number"
          ? progressScore(moved, DEFAULT_SCHEME) -
            (progressScore(source.record, source.scheme) - source.record.backOffScore)
          : undefined,
    };
    for (const h of held) delete history[h.k];
    history[key(id, DEFAULT_SCHEME)] = merged;
  }

  return {
    ...state,
    workouts: state.workouts.map((w) => ({ ...w, exercises: w.exercises.map(retune) })),
    removedWorkouts: state.removedWorkouts.map((r) => ({
      ...r,
      workout: { ...r.workout, exercises: r.workout.exercises.map(retune) },
    })),
    history,
    active: state.active && {
      ...state.active,
      items: state.active.items.map(retuneItem),
    },
  };
};

/**
 * Why a saved blob could not be read: not ours at all, or written by a newer
 * version of the app than this one understands.
 */
export type Unreadable = "invalid" | "newer";

/**
 * Turn saved text back into state, migrating it from whatever version wrote
 * it. Shared by launch and by restoring a backup file, so both go through
 * exactly the same migrations.
 *
 * Throws nothing: anything that is not a saved blob comes back as the reason.
 */
export const fromSaved = (raw: string): SessionState | Unreadable => {
  let saved: Saved;
  try {
    saved = JSON.parse(raw) as Saved;
  } catch {
    return "invalid";
  }
  if (
    !saved ||
    typeof saved.version !== "number" ||
    !saved.state ||
    typeof saved.state !== "object" ||
    typeof saved.state.history !== "object"
  ) {
    return "invalid";
  }
  // Older versions are read and filled in from `initialState`; a newer one
  // we cannot understand is refused rather than half-interpreted.
  if (saved.version > VERSION) return "newer";

  try {

    // Pre-4 blobs carry a cycle position; the new program starts at the top.
    const { cycleIndex: _position, ...stored } = saved.state;
    const restored: SessionState = { ...initialState, ...stored };
    if (saved.version < 5) {
      restored.workouts = DEFAULT_WORKOUTS;
      restored.nextWorkout = DEFAULT_WORKOUTS[0].id;
      restored.choices = Object.fromEntries(
        Object.entries(restored.choices).filter(([k]) =>
          k.startsWith(`${CONDITIONING_ID}/`),
        ),
      );
      const used = new Set(
        DEFAULT_WORKOUTS.flatMap((w) => w.exercises.flatMap((e) => e.options)),
      );
      restored.hidden = restored.hidden.filter((id) => !used.has(id));
    }
    if (saved.version < 6) {
      restored.removedWorkouts = DEFAULT_WORKOUTS.flatMap((workout, at) =>
        restored.workouts.some((w) => w.id === workout.id) ? [] : [{ workout, at }],
      );
    }
    if (saved.version < 7) {
      const used = new Set(
        restored.workouts.flatMap((w) =>
          w.exercises.flatMap((e) => [
            ...e.options,
            ...(restored.choices[`${w.id}/${e.id}`] ? [restored.choices[`${w.id}/${e.id}`]] : []),
          ]),
        ),
      );
      restored.hidden = leanHiddenExercises().filter((id) => !used.has(id));
    }
    if (saved.version < 8) {
      const added = ["goblet_squat", "db_rdl", "walking_lunge", "cable_fly"];
      restored.hidden = restored.hidden.filter((id) => !added.includes(id));
    }
    // `byId`, `cardioById` and `mobilityById` resolve custom entries through
    // module-level lists, so those have to be repopulated before anything
    // looks one up — including the migration and the commit below.
    setCustomExercises(restored.custom);
    setExerciseEdits(restored.exerciseEdits);
    setCustomConditioning(restored.customCardio, restored.customMobility);

    const migrated = saved.version < 9 ? toEvenRanges(restored) : restored;

    // Yesterday's abandoned workout is not resumed. It is closed out exactly
    // as if you had pressed Leave: whatever you trained counts, the rest is
    // skipped, and the cycle moves on — a dead phone should not cost you a
    // session's progress. If nothing was trained, `finishWorkout` just drops
    // it and the same workout comes up again.
    if (migrated.active && !isToday(migrated.active.startedAt)) {
      const startedAt = migrated.active.startedAt;
      return finishWorkout(migrated, typeof startedAt === "number" ? startedAt : Date.now());
    }
    return migrated;
  } catch {
    return "invalid";
  }
};

/** State as the text that goes to disk — or into a backup file. */
export const toSaved = (state: SessionState): string => {
  const saved: Saved = { version: VERSION, state };
  return JSON.stringify(saved);
};

/**
 * Read the saved training back.
 *
 * Anything unreadable — absent, corrupt, or written by a future version —
 * yields a fresh state rather than throwing, since failing to start is a
 * worse outcome than starting empty.
 */
export const load = async (): Promise<SessionState> => {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return initialState;
    const state = fromSaved(raw);
    return typeof state === "string" ? initialState : state;
  } catch {
    return initialState;
  }
};

/** Write the training to disk. Errors are swallowed — see `useSaved`. */
export const save = async (state: SessionState): Promise<void> => {
  try {
    await AsyncStorage.setItem(KEY, toSaved(state));
  } catch {
    // A failed write is not worth interrupting a set for. The next change
    // writes the whole state again, so one lost write costs nothing.
  }
};

/** Throw the saved training away. */
export const clear = async (): Promise<void> => {
  await AsyncStorage.removeItem(KEY);
};
