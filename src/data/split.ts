import type { CardioBlock, CardioEnd } from "@/data/conditioning";
import type { Pattern } from "@/data/exercises";

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
 * target is one of 6, 8, 10 or 12 — never an 11 or a 13.
 */
export const REPS_RANGE = { min: 6, max: 12 } as const;
export const REP_STEP = 2;

/** The range every slot starts on: 6 → 8 → 10 → 12. */
export const DEFAULT_SCHEME: Scheme = `${REPS_RANGE.min}-${REPS_RANGE.max}`;

/** Snap a rep count onto the range's even steps. */
const onStep = (reps: number): number =>
  Math.max(
    REPS_RANGE.min,
    Math.min(
      REPS_RANGE.max,
      REPS_RANGE.min + Math.round((reps - REPS_RANGE.min) / REP_STEP) * REP_STEP,
    ),
  );

/**
 * The scheme for a rep range. A range matching a named scheme's ends IS that
 * scheme — 8–12 is volume — so the lift keeps the history it already has.
 */
export const rangeScheme = (min: number, max: number): Scheme => {
  const lo = onStep(Math.min(min, max));
  const hi = onStep(Math.max(min, max));
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
};

export type Workout = {
  id: string;
  name: string;
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
   * The mobility routine it ends on. Absent means the everyday stretch —
   * see `DEFAULT_MOBILITY`; null means none.
   */
  mobility?: string | null;
};

/** A workout as authored below — slot ids are filled in from the labels. */
type Authored = Omit<Workout, "exercises"> & { exercises: Omit<Entry, "id">[] };

const FULL_CYCLE: Authored[] = [
  /*
   * Push, pull, legs, push, pull. Each slot names its exercise; the swap
   * button offers everything else in the catalogue of the same movement type.
   *
   * Every slot climbs 6 → 8 → 10 → 12, so a lift on two days is one record
   * at one weight, progressed by both. Pull-ups and dips are "as many as you
   * can" on paper — here they climb the range like anything else, and
   * hitting the top adds weight or takes off assistance.
   */
  {
    id: "push_a",
    name: "Push A",
    subtitle: "chest focus",
    exercises: [
      { slot: "Horizontal press", pattern: "horizontal_push", options: ["db_bench"], scheme: DEFAULT_SCHEME },
      { slot: "Vertical press", pattern: "vertical_push", options: ["db_shoulder"], scheme: DEFAULT_SCHEME },
      { slot: "Chest fly", pattern: "chest_iso", options: ["cable_crossover"], scheme: DEFAULT_SCHEME },
      { slot: "Dips", pattern: "triceps", options: ["dips"], scheme: DEFAULT_SCHEME },
      { slot: "Abs", pattern: "abs", options: ["hanging_leg_raise"], scheme: DEFAULT_SCHEME },
    ],
  },
  {
    id: "pull_a",
    name: "Pull A",
    subtitle: "vertical pull focus",
    exercises: [
      { slot: "Vertical pull", pattern: "vertical_pull", options: ["pullup"], scheme: DEFAULT_SCHEME },
      { slot: "Heavy row", pattern: "horizontal_pull", options: ["bb_row"], scheme: DEFAULT_SCHEME },
      { slot: "Machine row", pattern: "horizontal_pull", options: ["machine_row"], scheme: DEFAULT_SCHEME },
      { slot: "Biceps", pattern: "biceps", options: ["bb_curl"], scheme: DEFAULT_SCHEME },
      { slot: "Abs", pattern: "abs", options: ["ab_machine"], scheme: DEFAULT_SCHEME },
    ],
  },
  {
    id: "legs",
    name: "Legs",
    subtitle: "squat focus",
    exercises: [
      { slot: "Squat", pattern: "squat", options: ["back_squat"], scheme: DEFAULT_SCHEME },
      { slot: "Hinge", pattern: "hinge", options: ["rdl"], scheme: DEFAULT_SCHEME },
      { slot: "Single leg", pattern: "lunge", options: ["bulgarian"], scheme: DEFAULT_SCHEME, sets: 2 },
      { slot: "Abs", pattern: "abs", options: ["hanging_leg_raise"], scheme: DEFAULT_SCHEME },
    ],
  },
  {
    id: "push_b",
    name: "Push B",
    subtitle: "shoulder focus",
    exercises: [
      { slot: "Vertical press", pattern: "vertical_push", options: ["db_shoulder"], scheme: DEFAULT_SCHEME },
      { slot: "Horizontal press", pattern: "horizontal_push", options: ["db_bench"], scheme: DEFAULT_SCHEME },
      { slot: "Chest fly", pattern: "chest_iso", options: ["cable_crossover"], scheme: DEFAULT_SCHEME },
      { slot: "Triceps", pattern: "triceps", options: ["pushdown"], scheme: DEFAULT_SCHEME },
      { slot: "Abs", pattern: "abs", options: ["ab_machine"], scheme: DEFAULT_SCHEME },
    ],
  },
  {
    id: "pull_b",
    name: "Pull B",
    subtitle: "row focus",
    exercises: [
      { slot: "Vertical pull", pattern: "vertical_pull", options: ["lat_pulldown"], scheme: DEFAULT_SCHEME },
      { slot: "Single-arm row", pattern: "horizontal_pull", options: ["db_row"], scheme: DEFAULT_SCHEME },
      { slot: "Machine row", pattern: "horizontal_pull", options: ["machine_row"], scheme: DEFAULT_SCHEME },
      { slot: "Biceps", pattern: "biceps", options: ["db_curl"], scheme: DEFAULT_SCHEME },
      { slot: "Abs", pattern: "abs", options: ["hanging_leg_raise"], scheme: DEFAULT_SCHEME },
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
 * low reps, no ladder — and everything else climbs 6 → 8 → 10 → 12.
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
