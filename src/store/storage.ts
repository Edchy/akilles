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
import { setCustomExercises } from "@/data/exercises";
import { DEFAULT_WORKOUTS } from "@/data/split";
import {
  CONDITIONING_ID,
  finishWorkout,
  initialState,
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
 */
const VERSION = 6;

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
    // `byId`, `cardioById` and `mobilityById` resolve custom entries through
    // module-level lists, so those have to be repopulated before anything
    // looks one up — including the commit below.
    setCustomExercises(restored.custom);
    setCustomConditioning(restored.customCardio, restored.customMobility);

    // Yesterday's abandoned workout is not resumed. It is closed out exactly
    // as if you had pressed Leave: whatever you trained counts, the rest is
    // skipped, and the cycle moves on — a dead phone should not cost you a
    // session's progress. If nothing was trained, `finishWorkout` just drops
    // it and the same workout comes up again.
    if (restored.active && !isToday(restored.active.startedAt)) {
      const startedAt = restored.active.startedAt;
      return finishWorkout(restored, typeof startedAt === "number" ? startedAt : Date.now());
    }
    return restored;
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
