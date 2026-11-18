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

import {
  CARDIO_DEFAULT,
  DEFAULT_MOBILITY,
  RETIRED_MOBILITY,
  mobilityById,
  setCustomConditioning,
  setMobilityEdits,
  type CardioBlock,
  type CardioEnd,
} from "@/data/conditioning";
import {
  LEAN,
  MOVEMENT_EXPANSION_IDS,
  PULLUP_STEP_IDS,
  byId,
  leanHiddenExercises,
  setCustomExercises,
  setExerciseEdits,
  type Exercise,
} from "@/data/exercises";
import {
  DEFAULT_SCHEME,
  DEFAULT_WORKOUTS,
  ladderFor,
  type Entry,
  type Scheme,
  type Workout,
} from "@/data/split";
import { HOLD_MAX, schemeOf, type ExerciseState } from "@/lib/progression";
import {
  CARDIO_SLOTS,
  correctTreadmillTarget,
  foldLoops,
  cardioKey,
  courseKey,
  CONDITIONING_ID,
  MOBILITY_SLOT,
  finishWorkout,
  initialState,
  isLift,
  key,
  resetToDefault,
  type Item,
  type SessionState,
} from "@/store/session";

/**
 * Whose training is on screen: yours, or test mode's. Test mode is a second,
 * separate save — the real one is neither read nor written while it is on —
 * so you can try things on your own phone without changing what you train.
 */
export type Profile = "real" | "test";

// The real key is the app's old working name. Never rename it: a new key
// reads as an empty store, and every saved workout would appear to be gone.
const KEYS: Record<Profile, string> = { real: "achilles/state", test: "achilles/test" };
/** Present, as "test", only while test mode is on — so it survives a restart. */
const MODE_KEY = "achilles/mode";
/**
 * Where a save that could not be read is kept, untouched, before the app
 * starts afresh and writes over it: `achilles/kept/<profile>/<when>`. Nothing
 * reads these back by itself; they are there so training is never lost to a
 * save the app could not understand.
 */
const KEPT = "achilles/kept";

/**
 * Running from the Mac (a development bundle served by Metro), rather than
 * the version published to the phone. Expo Go keeps one store per project,
 * so both see the same saves: from the Mac the app is always in test mode,
 * and the real training is read — for "A copy of my training" — but never
 * written. Your gym training can only ever be changed by the published app.
 */
export const FROM_MAC = typeof __DEV__ !== "undefined" && !!__DEV__;

/**
 * Saves this version found written by a newer one. Nothing is written to
 * them, ever: an older version that started afresh over a newer save is how
 * training was lost once (16 November 2026).
 */
const locked = new Set<Profile>();
/** Whether a save is from a newer version, and so left alone. */
export const isLocked = (profile: Profile): boolean => locked.has(profile);
/** Test mode started afresh on purpose: its old save may now be written over. */
export const unlock = (profile: Profile): void => {
  locked.delete(profile);
};

/**
 * One copy of the real training a day, as it was before that day's first
 * change: `achilles/daily/<yyyy-mm-dd>`, the last two weeks of them. Settings
 * › Backup lists them, to put one back.
 */
const DAILY = "achilles/daily";
const KEEP_DAYS = 14;
const dayOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
/** The day a copy was last made, so the check costs nothing after the first save. */
let copiedOn: string | null = null;

const copyToday = async (): Promise<void> => {
  const today = dayOf(new Date());
  if (copiedOn === today) return;
  copiedOn = today;
  const key = `${DAILY}/${today}`;
  if ((await AsyncStorage.getItem(key)) !== null) return;
  const raw = await AsyncStorage.getItem(KEYS.real);
  if (!raw) return;
  await AsyncStorage.setItem(key, raw);
  const days = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(`${DAILY}/`)).sort();
  const old = days.slice(0, Math.max(0, days.length - KEEP_DAYS));
  if (old.length) await AsyncStorage.multiRemove(old);
};

export type DailyCopy = { day: string; state: SessionState; workouts: number };

/** The daily copies that can still be read, newest first. */
export const dailyCopies = async (): Promise<DailyCopy[]> => {
  try {
    const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(`${DAILY}/`)).sort().reverse();
    const copies: DailyCopy[] = [];
    for (const key of keys) {
      const raw = await AsyncStorage.getItem(key);
      const state = raw ? fromSaved(raw) : "invalid";
      if (typeof state === "string") continue;
      copies.push({ day: key.slice(DAILY.length + 1), state, workouts: state.log?.length ?? 0 });
    }
    return copies;
  } catch {
    return [];
  }
};

/** What is there now, set aside before a copy is put back over it. */
export const keepAside = async (state: SessionState): Promise<void> => {
  try {
    await AsyncStorage.setItem(`${KEPT}/real/${Date.now()}`, toSaved(state));
  } catch {
    // Worst case, today's daily copy still holds the morning's training.
  }
};

/**
 * Bumped whenever the saved shape changes in a way older blobs cannot satisfy.
 * A blob from a newer version than we understand is not read, and is kept
 * aside before anything is written over it (see `KEPT`), so downgrading the
 * app does not destroy training history.
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
 * 10 — cardio and mobility belong to each workout, instead of one choice
 *     shared by all, and the five built-in routines are replaced by one,
 *     the everyday stretch, whose routines can be edited. The shared
 *     machines and distances are written into every workout — see
 *     `toWorkoutConditioning`.
 * 11 — 59 more built-in exercises, so the lifts found in any gym are there.
 *     The most common join the catalogue; the rest go to the library, as on
 *     a fresh install — see `ADDED_IN_11`. Nothing already there moves.
 * 12 — bodyweight movements you cannot load progress by holding instead:
 *     their number is seconds held at the hardest point of a rep, not kg.
 *     Kilograms already earned on them become seconds — see `toHolds`.
 * 13 — triceps, biceps, shoulders, calves and core climb 10 → 12 → 14 in any
 *     slot. Their weights are kept and their ladders start again at 10 —
 *     see `toHighReps`.
 * 14 — the bodyweight squat and split squat, for training away from a gym,
 *     start in the library — see `ADDED_IN_14`.
 * 15 — the pike push-up and the kettlebell and floor lifts for training at
 *     home start in the library too — see `ADDED_IN_15`.
 */
// 16: explicit cardio record modes, shared targets and shared cardio notes.
// 17: correct treadmill time-trial targets to 1 km, including resumed sessions.
// 18: add hollow hold to the optional exercise library.
// 19: restore warm-up and cool-down defaults omitted by the first Bodyweight template.
const VERSION = 21;

/**
 * Version 14: lifts for training away from a gym. They start in the library
 * on every phone, as on a fresh install; Klay reaches for them away from the
 * gym whether or not they are in your catalogue.
 */
const ADDED_IN_14: string[] = ["bw_squat", "bw_split_squat"];

/** Version 15: more of the same, as version 14. */
const ADDED_IN_15: string[] = [
  "pike_push_up",
  "kb_row",
  "kb_rdl",
  "kb_curl",
  "db_floor_press",
  "kb_floor_press",
  "db_pullover",
];

/**
 * Version 11: the built-ins added in this version.
 *
 * `hidden` lists what was hidden when the save was written, so a lift that did
 * not exist then is in nobody's `hidden` — without this, every one of them
 * would land in every existing catalogue. Those in `LEAN` are meant to; the
 * rest are hidden, so they start in the library just as they would on a fresh
 * install. Frozen: a built-in added later needs a version of its own.
 */
const ADDED_IN_11: string[] = [
  // Push
  "push_up", "decline_bench", "close_grip_bench", "smith_bench", "smith_incline_press",
  "incline_machine_press", "pec_deck", "db_fly", "incline_db_fly", "arnold_press",
  "smith_shoulder_press", "cable_lateral_raise", "machine_lateral_raise", "front_raise",
  "upright_row", "reverse_fly_machine", "cable_rear_delt_fly", "db_shrug", "bb_shrug",
  "rope_pushdown", "cable_overhead_ext", "seated_dip", "bench_dip",
  // Pull
  "close_grip_pulldown", "machine_pulldown", "straight_arm_pulldown", "tbar_row",
  "inverted_row", "preacher_curl", "ez_bar_curl", "incline_db_curl", "concentration_curl",
  "machine_curl", "cable_hammer_curl", "reverse_curl",
  // Legs
  "smith_squat", "sumo_deadlift", "trap_bar_deadlift", "glute_bridge", "cable_pull_through",
  "single_leg_rdl", "reverse_lunge", "split_squat", "seated_leg_curl", "hip_abduction",
  "hip_adduction", "cable_kickback", "single_leg_calf_raise", "med_ball_slam",
  // Core
  "crunch", "machine_crunch", "decline_situp", "ab_wheel", "lying_leg_raise",
  "captains_chair", "russian_twist", "side_plank", "pallof_press", "woodchop",
];

/** What actually goes to disk. Older blobs carry a cycle position, not an id. */
type Saved = {
  version: number;
  state: SessionState & { cycleIndex?: number; courses?: Record<string, number> };
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
    !isLift(it) || it.derive || it.scheme === "speed"
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
    const merged: ExerciseState = { ...moved, lastTrainedAt: newest };
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
 * Version 10: cardio and mobility move into each workout.
 *
 * Before, one machine opened every session, one finished it, and each timed
 * machine ran one distance everywhere. Those carry into every workout, so
 * nothing about the cardio changes. The old built-in routines are retired
 * for the everyday stretch; a routine of your own that you had picked is
 * kept, on every workout. A session in progress on a retired routine is
 * dealt the everyday stretch instead.
 */
const toWorkoutConditioning = (
  state: SessionState & { courses?: Record<string, number> },
): SessionState => {
  const { courses = {}, ...rest } = state;
  const legacy = (slot: string): string | undefined => rest.choices[`${CONDITIONING_ID}/${slot}`];

  const block = (where: CardioEnd): CardioBlock | undefined => {
    const picked = legacy(CARDIO_SLOTS[where]);
    const machine = picked ?? CARDIO_DEFAULT[where];
    const course = courses[machine];
    // Nothing chosen and nothing changed: the default still says it.
    if (picked === undefined && course === undefined) return undefined;
    return course === undefined ? { machine } : { machine, course };
  };
  const open = block("open");
  const close = block("close");
  const routine = legacy(MOBILITY_SLOT);
  const mine = routine && rest.customMobility.some((m) => m.id === routine) ? routine : undefined;

  const move = (w: Workout): Workout => ({
    ...w,
    ...(open || close ? { cardio: { ...(open && { open }), ...(close && { close }) } } : {}),
    ...(mine ? { mobility: mine } : {}),
  });

  const everyday = mobilityById(DEFAULT_MOBILITY)!;
  return {
    ...rest,
    workouts: rest.workouts.map(move),
    removedWorkouts: rest.removedWorkouts.map((r) => ({ ...r, workout: move(r.workout) })),
    choices: Object.fromEntries(
      Object.entries(rest.choices).filter(([k]) => !k.startsWith(`${CONDITIONING_ID}/`)),
    ),
    hiddenConditioning: rest.hiddenConditioning.filter((id) => !RETIRED_MOBILITY.includes(id)),
    active: rest.active && {
      ...rest.active,
      items: rest.active.items.map((it) =>
        it.kind === "mobility" && !mobilityById(it.exerciseId)
          ? { ...it, exerciseId: everyday.id, moves: everyday.moves.map(() => false) }
          : it,
      ),
    },
  };
};

/**
 * Version 12: the built-ins that became holds lifts. Frozen, like
 * `ADDED_IN_11`: a lift moved to holds later needs a version of its own.
 */
const HOLDS_IN_12: string[] = [
  "push_up", "inverted_row", "nordic_curl", "bench_dip", "hanging_leg_raise",
  "ab_wheel", "lying_leg_raise", "captains_chair",
];

/**
 * Version 12: kilograms to seconds on every lift that now progresses by
 * holding — those above, and every bodyweight exercise of your own that a
 * machine cannot assist, which is what the Bodyweight choice now makes.
 *
 * A step earned is a step kept: each 2.5 kg became one second, and anything
 * above nothing is at least one, up to `HOLD_MAX`. The log is converted too,
 * so History never reads "2.5 s hold". A weight step set on one of them is
 * dropped — a hold steps a second at a time.
 */
const toHolds = (state: SessionState): SessionState => {
  const mine = (ex: Exercise) =>
    ex.bodyweight && !ex.assistable && !ex.timed && !ex.unloaded && !ex.holds;
  const custom = state.custom.map((ex) =>
    mine(ex)
      ? {
          ...ex,
          holds: true,
          increment: 1,
          ...(ex.startWeight !== undefined ? { startWeight: seconds(ex.startWeight) } : {}),
        }
      : ex,
  );
  const ids = new Set([...HOLDS_IN_12, ...state.custom.filter(mine).map((ex) => ex.id)]);

  const exerciseEdits = Object.fromEntries(
    Object.entries(state.exerciseEdits).map(([id, edit]) => {
      if (!ids.has(id)) return [id, edit];
      const { increment: _step, startWeight, ...rest } = edit;
      return [id, startWeight === undefined ? rest : { ...rest, startWeight: seconds(startWeight) }];
    }),
  );
  const history = Object.fromEntries(
    Object.entries(state.history).map(([k, r]) => [
      k,
      ids.has(r.exerciseId) ? { ...r, weight: seconds(r.weight) } : r,
    ]),
  );
  const item = (it: Item): Item => ({
    ...it,
    ...(ids.has(it.exerciseId) ? { weight: seconds(it.weight) } : {}),
    ...(it.supersetEntry
      ? {
          supersetEntry: item(it.supersetEntry),
          ...(it.supersetWeight !== undefined && ids.has(it.supersetEntry.exerciseId)
            ? { supersetWeight: seconds(it.supersetWeight) }
            : {}),
        }
      : {}),
  });

  return {
    ...state,
    custom,
    exerciseEdits,
    history,
    log: state.log.map((s) => ({
      ...s,
      entries: s.entries.map((e) =>
        e.kind === "lift" && ids.has(e.exerciseId) ? { ...e, weight: seconds(e.weight) } : e,
      ),
    })),
    active: state.active && { ...state.active, items: state.active.items.map(item) },
  };
};

/** 2.5 kg a second, at least one if anything was added, never past the longest hold. */
const seconds = (kg: number): number =>
  kg > 0 ? Math.min(HOLD_MAX, Math.max(1, Math.round(kg / 2.5))) : 0;

/**
 * Version 13: a small-muscle lift now climbing 10–14 where it climbed 6–12
 * starts that ladder at its bottom, 10 reps, at the weight it had. Keeping
 * the rung instead would turn a lift on its 10-rep rung into a 14-rep one.
 * Must run after the custom list is registered, so your own lifts count.
 */
const toHighReps = (state: SessionState): SessionState => ({
  ...state,
  history: Object.fromEntries(
    Object.entries(state.history).map(([k, r]) => {
      const scheme = k.split(":")[1] as Scheme;
      const ex = byId(r.exerciseId);
      if (!ex || schemeOf(ex, scheme) === scheme) return [k, r];
      return [k, { ...r, rung: 0, reloading: false }];
    }),
  ),
});

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
    if (saved.version < 11) {
      // Already hidden if version 7 just rebuilt the list from today's lean pool.
      const library = ADDED_IN_11.filter(
        (id) => !LEAN.includes(id) && !restored.hidden.includes(id),
      );
      restored.hidden = [...restored.hidden, ...library];
    }
    // New optional library entries do not silently join an existing catalogue.
    if (saved.version < 18 && !restored.hidden.includes("hollow_hold")) {
      restored.hidden = [...restored.hidden, "hollow_hold"];
    }
    if (saved.version < 20) {
      const added = MOVEMENT_EXPANSION_IDS.filter((id) => !LEAN.includes(id) && !restored.hidden.includes(id));
      restored.hidden = [...restored.hidden, ...added];
    }
    if (saved.version < 21) {
      const added = PULLUP_STEP_IDS.filter((id) => !LEAN.includes(id) && !restored.hidden.includes(id));
      restored.hidden = [...restored.hidden, ...added];
    }
    // Before the custom list is registered below, so its holds lifts resolve as such.
    const held = saved.version < 12 ? toHolds(restored) : restored;
    // `byId`, `cardioById` and `mobilityById` resolve custom entries through
    // module-level lists, so those have to be repopulated before anything
    // looks one up — including the migration and the commit below.
    setCustomExercises(held.custom);
    setExerciseEdits(held.exerciseEdits);
    setCustomConditioning(held.customCardio, held.customMobility);
    setMobilityEdits(held.mobilityEdits);

    const ranged = saved.version < 9 ? toEvenRanges(held) : held;
    const conditioned = saved.version < 10 ? toWorkoutConditioning(ranged) : ranged;
    let migrated = saved.version < 13 ? toHighReps(conditioned) : conditioned;
    if (saved.version < 14) {
      migrated.hidden = [
        ...migrated.hidden,
        ...ADDED_IN_14.filter((id) => !migrated.hidden.includes(id)),
      ];
    }
    if (saved.version < 15) {
      migrated.hidden = [
        ...migrated.hidden,
        ...ADDED_IN_15.filter((id) => !migrated.hidden.includes(id)),
      ];
    }
    if (saved.version < 16) {
      // Keep every existing record, with an explicit mode so metres cannot
      // collide with minutes. Custom exercise units have been registered above.
      migrated.conditioning = Object.fromEntries(Object.entries(migrated.conditioning).map(([key, record]) => [
        typeof record.cardioId === "string"
          ? record.course !== undefined ? courseKey(record.cardioId, record.course) : cardioKey(record.cardioId, record.minutes ?? 5)
          : key,
        record,
      ]));
      // The latest session note becomes the shared exercise note. An empty
      // session note was a deliberate deletion and should remain one.
      const sessionNotes = { ...migrated.active?.notes };
      migrated.notes = { ...migrated.notes };
      for (const [key, note] of Object.entries(sessionNotes)) {
        if (!key.startsWith("cardio/")) continue;
        if (note.trim()) migrated.notes[key] = note;
        else delete migrated.notes[key];
        delete sessionNotes[key];
      }
      if (migrated.active) migrated.active = { ...migrated.active, notes: sessionNotes };
    }

    if (saved.version < 19) {
      const restoreBodyweightRoutines = (workout: Workout): Workout => {
        if (workout.kind !== "bodyweight" || workout.warmup !== null || workout.mobility !== null) return workout;
        const { warmup, mobility, ...rest } = workout;
        return rest;
      };
      migrated = {
        ...migrated,
        workouts: migrated.workouts.map(restoreBodyweightRoutines),
        removedWorkouts: migrated.removedWorkouts.map((entry) => ({ ...entry, workout: restoreBodyweightRoutines(entry.workout) })),
      };
    }

    // Yesterday's abandoned workout is not resumed. It is closed out exactly
    // as if you had pressed Leave: whatever you trained counts, the rest is
    // skipped, and the cycle moves on — a dead phone should not cost you a
    // session's progress. If nothing was trained, `finishWorkout` just drops
    // it and the same workout comes up again.
    if (migrated.active && !isToday(migrated.active.startedAt)) {
      const startedAt = migrated.active.startedAt;
      migrated = finishWorkout(migrated, typeof startedAt === "number" ? startedAt : Date.now());
    }
    // Close older sessions at the target actually trained, then correct the
    // saved plan and any current card that will genuinely be resumed.
    // Not a version step: any save with loops, old or new, folds them in.
    migrated = foldLoops(migrated);
    return correctTreadmillTarget(saved.version < 17 ? { ...migrated, treadmillTargetRevision: undefined } : migrated);
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
 * worse outcome than starting empty. The next change is saved over what was
 * there, so a save that is there but unreadable is first kept aside, as it
 * is (see `KEPT`): a fresh start must never cost the training behind it.
 */
export const load = async (profile: Profile = "real"): Promise<SessionState> => {
  try {
    const raw = await AsyncStorage.getItem(KEYS[profile]);
    // Fresh through `resetToDefault`, which also empties the custom lists, so
    // nothing of the other profile's lingers after a switch.
    if (!raw) return resetToDefault();
    const state = fromSaved(raw);
    if (typeof state !== "string") return state;
    // From a newer version: left exactly as it is, and never written to.
    if (state === "newer") {
      locked.add(profile);
      return resetToDefault();
    }
    await AsyncStorage.setItem(`${KEPT}/${profile}/${Date.now()}`, raw);
    return resetToDefault();
  } catch {
    return resetToDefault();
  }
};

/** Write the training to disk. Errors are swallowed — see `useSaved`. */
export const save = async (state: SessionState, profile: Profile = "real"): Promise<void> => {
  // The two rules that keep the gym training safe, here at the bottom so no
  // screen can get round them.
  if (locked.has(profile)) return;
  if (profile === "real" && FROM_MAC) return;
  try {
    if (profile === "real") await copyToday();
    await AsyncStorage.setItem(KEYS[profile], toSaved(state));
  } catch {
    // A failed write is not worth interrupting a set for. The next change
    // writes the whole state again, so one lost write costs nothing.
  }
};

/** Whether there is anything saved under a profile — test mode to carry on with. */
export const hasSaved = async (profile: Profile): Promise<boolean> => {
  try {
    return (await AsyncStorage.getItem(KEYS[profile])) !== null;
  } catch {
    return false;
  }
};

/** Which profile was on when the app last ran. Anything unreadable is the real one. */
export const loadProfile = async (): Promise<Profile> => {
  if (FROM_MAC) return "test";
  try {
    return (await AsyncStorage.getItem(MODE_KEY)) === "test" ? "test" : "real";
  } catch {
    return "real";
  }
};

export const saveProfile = async (profile: Profile): Promise<void> => {
  // From the Mac the mode is always test, and is never written: written, it
  // would open the gym app in test mode too.
  if (FROM_MAC) return;
  try {
    if (profile === "test") await AsyncStorage.setItem(MODE_KEY, "test");
    else await AsyncStorage.removeItem(MODE_KEY);
  } catch {
    // Worst case the app reopens on the other profile, with both saves intact.
  }
};

/**
 * Your training as test mode starts it: a copy, read back through the same
 * path as a save, so the custom exercises it refers to are registered.
 */
export const copyForTest = (real: SessionState): SessionState => {
  const copy = fromSaved(toSaved(real));
  return typeof copy === "string" ? resetToDefault() : copy;
};
