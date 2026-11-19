import { EVERYDAY_WARMUP, type CardioBlock, type CardioEnd } from "@/data/conditioning";
import type { Pattern } from "@/data/exercises";
import type { WorkoutKind } from "@/data/kinds";

/**
 * The split: workouts in a cycle, each a list of exercise slots.
 *
 * The cycle advances when you TRAIN, not when the calendar moves.
 * Miss a day and you simply pick up at the next workout in the cycle.
 * There is no debt and nothing to make up.
 *
 * The workouts themselves live in your saved state and are edited from the
 * Plan tab — add, remove, reorder, and change what is in each. What is here is
 * the starting program a fresh install opens with. The exercise ids come from
 * `exercises.ts` — that file is the menu, this file is the default order.
 */

/**
 * Which rep ladder an exercise climbs before adding weight.
 *
 * Either one of the named schemes, or a rep range of your own written
 * "min-max" — "6-12" climbs 6 → 8 → 10 → 12, then adds weight and starts again.
 *
 * The same lift can appear on more than one scheme — heavy bench one day,
 * lighter bench another — and each scheme keeps its own weight and its own
 * rung. See the `history` key in `store/session.ts`.
 */
export type NamedScheme = "strength" | "volume" | "pump" | "speed";
export type Scheme = NamedScheme | `${number}-${number}`;

export const LADDERS: Record<NamedScheme, number[]> = {
  strength: [5, 6, 8],
  volume: [8, 10, 12],
  pump: [12, 15, 20],
  // Speed work does not climb: the reps stay at 3 and the weight comes from
  // the heavy day. Moving it faster is the progression.
  speed: [3],
};

export const SETS: Record<NamedScheme, number> = {
  strength: 4,
  volume: 3,
  pump: 3,
  speed: 6,
};

/** Sets for a rep range of your own, unless the slot says otherwise. */
const DEFAULT_SETS = 3;

/** Abs are small and trained often: two sets is plenty. */
const ABS_SETS = 2;

const isNamed = (scheme: Scheme): scheme is NamedScheme => scheme in LADDERS;

/**
 * Fewest and most reps a range can span, and the step between rungs. Every
 * target is one of 6, 8, 10 or 12 — never an 11 or a 13. Slots start on
 * 6–10 (`DEFAULT_SCHEME`); 12 is there for a range you choose.
 */
export const REPS_RANGE = { min: 6, max: 12 } as const;
export const REP_STEP = 2;

/** The fewest and most reps a range can span. */
export type RepBounds = { readonly min: number; readonly max: number };

/**
 * The range small muscles climb instead: triceps, biceps, shoulders, calves
 * and core do their best work on ten reps or more. 10 → 12 → 14, then the
 * weight goes up. See `highReps` in `exercises.ts` for which lifts.
 */
export const HIGH_REPS_RANGE = { min: 10, max: 14 } as const;
export const HIGH_REPS_SCHEME: Scheme = `${HIGH_REPS_RANGE.min}-${HIGH_REPS_RANGE.max}`;

/**
 * The range every slot starts on: 6 → 8 → 10, then the weight goes up. Ten
 * clean reps at a weight you own is the signal to add to it; two more on top
 * only add tiredness. Lifts that do their best work elsewhere keep their own
 * range in any slot — see `ownRange` in `lib/progression.ts`.
 */
export const DEFAULT_REPS = { min: 6, max: 10 } as const;
export const DEFAULT_SCHEME: Scheme = `${DEFAULT_REPS.min}-${DEFAULT_REPS.max}`;

/** Snap a rep count onto the range's even steps. */
const onStep = (reps: number, bounds: RepBounds): number =>
  Math.max(
    bounds.min,
    Math.min(bounds.max, bounds.min + Math.round((reps - bounds.min) / REP_STEP) * REP_STEP),
  );

/**
 * The scheme for a rep range. A range matching a named scheme's ends IS that
 * scheme — 8–12 is volume — so the lift keeps the history it already has.
 */
export const rangeScheme = (min: number, max: number, bounds: RepBounds = REPS_RANGE): Scheme => {
  const lo = onStep(Math.min(min, max), bounds);
  const hi = onStep(Math.max(min, max), bounds);
  for (const name of ["strength", "volume", "pump"] as const) {
    const ladder = LADDERS[name];
    if (ladder[0] === lo && ladder[ladder.length - 1] === hi) return name;
  }
  return `${lo}-${hi}`;
};

/**
 * The rungs a scheme climbs. A range of your own climbs two reps at a time:
 * 6–12 is 6 → 8 → 10 → 12, 10–12 is 10 → 12. The top is always a rung, so a
 * range kept from before the even steps still finishes where it said.
 */
export const ladderFor = (scheme: Scheme): number[] => {
  if (isNamed(scheme)) return LADDERS[scheme];
  const [lo, hi] = scheme.split("-").map(Number);
  if (!(lo > 0) || !(hi >= lo)) return LADDERS.volume;
  const rungs: number[] = [];
  for (let reps = lo; reps < hi; reps += REP_STEP) rungs.push(reps);
  return [...rungs, hi];
};

/** The ends of a scheme's ladder. */
export const repRange = (scheme: Scheme): { min: number; max: number } => {
  const ladder = ladderFor(scheme);
  return { min: ladder[0], max: ladder[ladder.length - 1] };
};

/** "6–10", or just "3" for speed work that does not climb. */
export const repLabel = (scheme: Scheme): string => {
  const { min, max } = repRange(scheme);
  return min === max ? `${min}` : `${min}–${max}`;
};

export type Entry = {
  /**
   * Identifies the slot within its workout, so two slots with the same label
   * — a second Biceps — stay distinct. Built-in slots use their label, which
   * keeps choices saved before slots had ids pointing at the right place.
   */
  id: string;
  /**
   * What this slot is for. It does not change when you swap the exercise
   * inside it.
   */
  slot: string;
  /**
   * The movement type this slot holds. An exercise qualifies if it counts as
   * this type — some count as two, so a hip thrust appears in both the Hinge
   * and the Hamstrings slot.
   */
  pattern: Pattern;
  /**
   * The exercises that can fill this slot: the first is the default, the rest
   * are what the swap button cycles through. Same movement pattern and
   * similar loading, so any of them keeps the module coherent.
   */
  options: string[];
  scheme: Scheme;
  /**
   * Take the weight from another exercise instead of tracking its own.
   * Speed squat at 65% of whatever your heavy squat currently is, so it keeps
   * up automatically with no second number to maintain and no 1RM test.
   */
  derive?: { from: string; scheme: Scheme; fraction: number };
  /**
   * Override the scheme's set count for this entry. Abs default to 2 without
   * one — see `setsFor`.
   */
  sets?: number;
  /**
   * Where in the workout it runs: with the warm-up at the start, among the
   * finishers at the end, or — absent — with the main lifts in between.
   */
  part?: EntryPart;
};

/** The start and finish of a workout, around its main lifts. */
export type EntryPart = "start" | "finish";

export type Workout = {
  id: string;
  name: string;
  /**
   * What it is for — Push, Pull, Legs, Full body, or Empty. Guides what Add
   * exercise shows first; never limits it. Absent on workouts made before
   * kinds: see `kindOf`.
   */
  kind?: WorkoutKind;
  /** What the workout trains, in lower case. Keep it to a few words. */
  subtitle: string;
  exercises: Entry[];
  /**
   * The cardio that opens the session and the cardio that finishes it.
   * Absent means the default machine at its default length; null means the
   * workout has none there.
   */
  cardio?: Partial<Record<CardioEnd, CardioBlock | null>>;
  /**
   * The routine it opens with, after the opening cardio. Absent means the
   * warm-up for its kind of day — see `WARMUP` and `warmupDay`; null means
   * none.
   */
  warmup?: string | null;
  /**
   * The mobility routine it ends on. Absent means the everyday stretch —
   * see `DEFAULT_MOBILITY`; null means none.
   */
  mobility?: string | null;
  /**
   * More cardio and routines, as many as you like, in any of the three
   * blocks — a second stretch, a run between two lifts. The ones above are
   * each block's first; these are the rest.
   */
  extras?: Extra[];
  /**
   * The order of each block, by id — exercises, extras, and the cardio and
   * routines above by their slot. Absent, or missing an id, the usual order:
   * see `partIds`.
   */
  order?: Partial<Record<Block, string[]>>;
};

/** The three blocks of a workout, in the order you do them. */
export type Block = EntryPart | "main";

/** A cardio block or a routine added to a workout: one or the other. */
export type Extra = {
  id: string;
  /** Which block it is in; absent, the main one. */
  part?: EntryPart;
  cardio?: CardioBlock;
  /** A mobility routine's id. */
  routine?: string;
};

/** A workout as authored below — slot ids are filled in from the labels. */
type Authored = Omit<Workout, "exercises"> & { exercises: Omit<Entry, "id">[] };

const FULL_CYCLE: Authored[] = [
  /*
   * Push, pull, legs: three workouts, each once a lap, so legs come round as
   * often as the rest, and three visits a week is about a lap a week. Each
   * slot names its exercise; the swap button offers everything else in the
   * catalogue of the same movement type.
   *
   * The picks are ones a first-timer can lower slowly and lift without
   * swinging from the first day — dumbbells, cables and machines, nothing
   * that needs a spotter or a teacher. The harder versions (pull-ups,
   * barbell squats and rows) are one swap away. Lifts that work several
   * joints at once, the most for the time: no curls, pushdowns, leg curls
   * or face pulls.
   *
   * Every slot climbs 6 → 8 → 10, then adds weight and starts again. Each
   * day opens on five minutes of cardio — the rower on Pull, the treadmill
   * otherwise — and the same four-minute warm-up.
   */
  {
    id: "push",
    name: "Push",
    subtitle: "chest, shoulders",
    warmup: EVERYDAY_WARMUP,
    exercises: [
      { slot: "Horizontal press", pattern: "horizontal_push", options: ["db_bench"], scheme: DEFAULT_SCHEME },
      { slot: "Vertical press", pattern: "vertical_push", options: ["db_shoulder"], scheme: DEFAULT_SCHEME },
      // The push-up chain: done at your step, from the wall to the floor (see `chains.ts`).
      { slot: "Bodyweight press", pattern: "horizontal_push", options: ["push_up", "incline_push_up", "knee_push_up"], scheme: DEFAULT_SCHEME },
      // Dips over a pushdown: more of the press, the triceps included. The
      // assisted machine takes off as much of you as you need.
      { slot: "Dips", pattern: "triceps", options: ["dips"], scheme: DEFAULT_SCHEME },
      { slot: "Abs", pattern: "abs", options: ["dead_bug"], scheme: DEFAULT_SCHEME },
    ],
  },
  {
    id: "pull",
    name: "Pull",
    subtitle: "back, arms",
    // The rower warms the back and the grip before you pull.
    cardio: { open: { machine: "row" } },
    warmup: EVERYDAY_WARMUP,
    exercises: [
      // The pull-up chain first, while you are fresh: from a hang to the whole
      // pull-up, a step at a time (see `chains.ts`). The pulldown builds the
      // strength alongside it.
      { slot: "Pull-up", pattern: "vertical_pull", options: ["pullup"], scheme: DEFAULT_SCHEME },
      { slot: "Vertical pull", pattern: "vertical_pull", options: ["lat_pulldown"], scheme: DEFAULT_SCHEME },
      { slot: "Row", pattern: "horizontal_pull", options: ["cable_row"], scheme: DEFAULT_SCHEME },
      // A second row rather than a curl: rows and pulldowns train the biceps already.
      { slot: "One-arm row", pattern: "horizontal_pull", options: ["db_row"], scheme: DEFAULT_SCHEME },
      { slot: "Abs", pattern: "abs", options: ["plank"], scheme: DEFAULT_SCHEME },
    ],
  },
  {
    id: "legs",
    name: "Legs",
    subtitle: "legs, hips",
    warmup: EVERYDAY_WARMUP,
    exercises: [
      { slot: "Squat", pattern: "squat", options: ["goblet_squat"], scheme: DEFAULT_SCHEME },
      { slot: "Hinge", pattern: "hinge", options: ["db_rdl"], scheme: DEFAULT_SCHEME },
      { slot: "Single leg", pattern: "lunge", options: ["split_squat"], scheme: DEFAULT_SCHEME },
      // A carry over a leg curl: grip, trunk, legs and posture at once. Timed.
      { slot: "Carry", pattern: "abs", options: ["farmer_carry"], scheme: DEFAULT_SCHEME },
      { slot: "Abs", pattern: "abs", options: ["plank"], scheme: DEFAULT_SCHEME },
    ],
  },
];

/**
 * The program a fresh install starts with. Built-in slots take their label as
 * their id — labels are unique within each built-in workout.
 */
export const DEFAULT_WORKOUTS: Workout[] = FULL_CYCLE.map((w) => ({
  ...w,
  exercises: w.exercises.map((e) => ({ ...e, id: e.slot })),
}));

/**
 * Dev flag for manual testing: bundle with `EXPO_PUBLIC_SHORT_WORKOUTS=1`
 * (`npm run start:dev`) and every workout runs only its first two exercises,
 * so a full lap of the cycle takes minutes instead of five sessions. Ladders,
 * swaps and history behave exactly as in the full split — there is just less
 * of it.
 */
export const SHORT_WORKOUTS = process.env.EXPO_PUBLIC_SHORT_WORKOUTS === "1";

/** A short id for something you created, unique enough for one phone. */
export const newId = (prefix: string): string =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

/**
 * The scheme a new slot of a movement type starts on. Jumps are speed work —
 * low reps, no ladder — and everything else climbs 6 → 8 → 10.
 */
export const defaultScheme = (pattern: Pattern): Scheme =>
  pattern === "jump" ? "speed" : DEFAULT_SCHEME;

/** Set count for an entry: its own override, else two for abs, else the scheme default. */
export const setsFor = (entry: Entry): number =>
  entry.sets ??
  (entry.pattern === "abs"
    ? ABS_SETS
    : isNamed(entry.scheme)
      ? SETS[entry.scheme]
      : DEFAULT_SETS);
