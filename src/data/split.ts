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
 * Either one of the named schemes, or any rep range of your own written
 * "min-max" — "6-10" climbs 6 → 8 → 10, then adds weight and starts again.
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

const isNamed = (scheme: Scheme): scheme is NamedScheme => scheme in LADDERS;

/** Fewest and most reps a range can span. */
export const REPS_RANGE = { min: 1, max: 30 } as const;

/**
 * The scheme for a rep range. A range matching a named scheme's ends IS that
 * scheme — 8–12 is volume — so the lift keeps the history it already has.
 */
export const rangeScheme = (min: number, max: number): Scheme => {
  const lo = Math.max(REPS_RANGE.min, Math.min(min, max));
  const hi = Math.min(REPS_RANGE.max, Math.max(min, max));
  for (const name of ["strength", "volume", "pump"] as const) {
    const ladder = LADDERS[name];
    if (ladder[0] === lo && ladder[ladder.length - 1] === hi) return name;
  }
  return `${lo}-${hi}`;
};

/**
 * The rungs a scheme climbs. A range of your own gets three — bottom,
 * middle, top — or every rep when it is too narrow for that: 8–10 climbs
 * 8 → 9 → 10, 6–10 climbs 6 → 8 → 10.
 */
export const ladderFor = (scheme: Scheme): number[] => {
  if (isNamed(scheme)) return LADDERS[scheme];
  const [lo, hi] = scheme.split("-").map(Number);
  if (!(lo > 0) || !(hi >= lo)) return LADDERS.volume;
  return [...new Set([lo, Math.round((lo + hi) / 2), hi])];
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
   * Override the scheme's set count for this entry.
   * Used to keep the daily arms/abs work at 2 sets so it doesn't outweigh
   * the compound lifts over a week.
   */
  sets?: number;
  /**
   * Arms/abs work you can fold into an earlier exercise as a superset.
   * Only entries marked here are offered as superset partners.
   */
  floater?: boolean;
};

export type Workout = {
  id: string;
  name: string;
  /** What the workout trains, in lower case. Keep it to a few words. */
  subtitle: string;
  exercises: Entry[];
};

/** A workout as authored below — slot ids are filled in from the labels. */
type Authored = Omit<Workout, "exercises"> & { exercises: Omit<Entry, "id">[] };

const FULL_CYCLE: Authored[] = [
  /*
   * Push, pull, legs, push, pull. Each slot names its exercise; the swap
   * button offers everything else in the catalogue of the same movement type.
   *
   * Progression follows the exercise AND its rep range: bench at 6–10 on Push
   * A and at 10–12 on Push B are two records at two weights. Pull-ups and dips
   * are "as many as you can" on paper — here they climb a range like
   * anything else, and hitting the top adds weight or takes off assistance.
   *
   * Arms and abs are floaters: they can be folded into an earlier exercise's
   * rest as a superset.
   */
  {
    id: "push_a",
    name: "Push A",
    subtitle: "chest focus",
    exercises: [
      { slot: "Horizontal press", pattern: "horizontal_push", options: ["db_bench"], scheme: "6-10" },
      { slot: "Vertical press", pattern: "vertical_push", options: ["db_shoulder"], scheme: "volume" },
      { slot: "Chest fly", pattern: "chest_iso", options: ["cable_crossover"], scheme: "12-15" },
      { slot: "Dips", pattern: "triceps", options: ["dips"], scheme: "6-12" },
      { slot: "Abs", pattern: "abs", options: ["hanging_leg_raise"], scheme: "10-15", floater: true },
    ],
  },
  {
    id: "pull_a",
    name: "Pull A",
    subtitle: "vertical pull focus",
    exercises: [
      { slot: "Vertical pull", pattern: "vertical_pull", options: ["pullup"], scheme: "5-10" },
      { slot: "Heavy row", pattern: "horizontal_pull", options: ["bb_row"], scheme: "6-10" },
      { slot: "Machine row", pattern: "horizontal_pull", options: ["machine_row"], scheme: "10-12" },
      { slot: "Biceps", pattern: "biceps", options: ["bb_curl"], scheme: "volume", floater: true },
      { slot: "Abs", pattern: "abs", options: ["ab_machine"], scheme: "12-15", floater: true },
    ],
  },
  {
    id: "legs",
    name: "Legs",
    subtitle: "squat, hinge, split squat",
    exercises: [
      { slot: "Squat", pattern: "squat", options: ["back_squat"], scheme: "6-10" },
      { slot: "Hinge", pattern: "hinge", options: ["rdl"], scheme: "8-10" },
      { slot: "Single leg", pattern: "lunge", options: ["bulgarian"], scheme: "8-10", sets: 2 },
      { slot: "Abs", pattern: "abs", options: ["hanging_leg_raise"], scheme: "10-15", floater: true },
    ],
  },
  {
    id: "push_b",
    name: "Push B",
    subtitle: "shoulder focus",
    exercises: [
      { slot: "Vertical press", pattern: "vertical_push", options: ["db_shoulder"], scheme: "6-10" },
      { slot: "Horizontal press", pattern: "horizontal_push", options: ["db_bench"], scheme: "10-12" },
      { slot: "Chest fly", pattern: "chest_iso", options: ["cable_crossover"], scheme: "12-15" },
      { slot: "Triceps", pattern: "triceps", options: ["pushdown"], scheme: "10-15", floater: true },
      { slot: "Abs", pattern: "abs", options: ["ab_machine"], scheme: "12-15", floater: true },
    ],
  },
  {
    id: "pull_b",
    name: "Pull B",
    subtitle: "row focus",
    exercises: [
      { slot: "Vertical pull", pattern: "vertical_pull", options: ["lat_pulldown"], scheme: "volume" },
      { slot: "Single-arm row", pattern: "horizontal_pull", options: ["db_row"], scheme: "volume" },
      { slot: "Machine row", pattern: "horizontal_pull", options: ["machine_row"], scheme: "10-12" },
      { slot: "Biceps", pattern: "biceps", options: ["db_curl"], scheme: "10-12", floater: true },
      { slot: "Abs", pattern: "abs", options: ["hanging_leg_raise"], scheme: "10-15", floater: true },
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
 * low reps, no ladder — and everything else opens in the middle of the range.
 */
export const defaultScheme = (pattern: Pattern): Scheme =>
  pattern === "jump" ? "speed" : "volume";

/** Set count for an entry: its own override, else the scheme default. */
export const setsFor = (entry: Entry): number =>
  entry.sets ?? (isNamed(entry.scheme) ? SETS[entry.scheme] : DEFAULT_SETS);
