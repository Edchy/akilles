/**
 * Cardio and mobility: the work that bookends the lifting.
 *
 * These are pools, not programmes. A session opens with one cardio block —
 * then, on a day that presses, the shoulder warm-up — and closes with another
 * plus mobility. Each workout says which machine and
 * routine fill its blocks, and how long each cardio block runs — see
 * `CardioBlock` and `Workout` in `split.ts`. Out of the box every workout
 * opens on the treadmill, finishes on the ski-erg and ends on the everyday
 * stretch.
 *
 * Neither kind climbs a rep ladder. Cardio progresses by covering more ground
 * in the same fixed minutes, or — on a machine with a set distance — by
 * covering that distance faster. Either way you are only ever racing your own
 * last go on that machine. Mobility does not progress at all; it is a checklist.
 */

/** What a machine measures, and in what unit the number is entered. */
export type CardioMetric = {
  /** Unit the distance is entered and stored in. */
  unit: "km" | "m" | "skips";
  /** Decimals shown and accepted. Metres are whole; kilometres are fine. */
  decimals: number;
  /** Nudge size for the +/- steppers. */
  step: number;
};

const KM: CardioMetric = { unit: "km", decimals: 2, step: 0.05 };
// Five minutes on a rower or ski-erg is a four-figure distance — step it in hundreds.
const METRES: CardioMetric = { unit: "m", decimals: 0, step: 100 };
// Skipping counts turns of the rope, if you count them at all.
const SKIPS: CardioMetric = { unit: "skips", decimals: 0, step: 10 };

export type CardioExercise = {
  id: string;
  name: string;
  /** How far you got, in this machine's own unit. */
  metric: CardioMetric;
  /** Shown once on the screen. Keep it short. */
  cue?: string;
  /**
   * Run a set distance and time it, rather than a set time and measure it.
   * In the machine's own unit. Only the default: each workout can change it,
   * or switch the block to the clock.
   */
  distance?: number;
  /** Set false to bench a machine without losing its records. */
  enabled?: boolean;
};

/**
 * The cardio pool. First is the default for the opening block; the closing
 * block's default is named separately below, since ski-erg after legs is a
 * different job from a treadmill before them.
 */
export const CARDIO: CardioExercise[] = [
  { id: "treadmill", name: "Treadmill", metric: KM, distance: 1, cue: "Stand tall, hands off the rails." },
  { id: "row", name: "Rower", metric: METRES, cue: "Legs, back, arms — then the reverse." },
  { id: "ski_erg", name: "Ski-erg", metric: METRES, cue: "Hinge at the hips, finish past the pockets." },
  { id: "bike", name: "Bike", metric: KM },
  { id: "assault_bike", name: "Assault bike", metric: KM, cue: "Arms and legs, same effort." },
  { id: "stair", name: "Stair climber", metric: KM, cue: "Stand tall, off the handrails." },
  { id: "elliptical", name: "Elliptical", metric: KM },
];

/**
 * Cardio that needs no machine, for away from the gym: it opens a workout in
 * place of the machine there. Not in the machine pool, so a gym's list is
 * never longer for it. The distance or count is yours to enter if you know
 * it; the minutes are what matter.
 */
export const AWAY_CARDIO: CardioExercise[] = [
  { id: "outdoor", name: "Walk or jog outside", metric: KM, cue: "Out of the door and back. Enter the distance if you know it." },
  { id: "skipping", name: "Skipping rope", metric: SKIPS, cue: "Small hops on the balls of your feet. Count the skips if you like." },
];

/** The two ends of a session a cardio block can sit at. */
export type CardioEnd = "open" | "close";

/**
 * How hard to go, by where the block sits rather than which machine it is:
 * a warm-up readies you for the lifts, so it is never a race. A machine's own
 * `cue` is only ever about how to use it.
 */
export const EFFORT: Record<CardioEnd, string> = {
  open: "An easy pace you could talk at. Save your effort for the lifts.",
  close: "Steady, then pick it up at the end if you have it left.",
};

/** The machine each end of a workout uses until you choose another. */
export const CARDIO_DEFAULT: Record<CardioEnd, string> = {
  open: "treadmill",
  close: "ski_erg",
};

/** How long a cardio block on the clock runs, in minutes, unless a workout says otherwise. */
export const CARDIO_MINUTES = 5;

/** How far − and + move a block's minutes, and the most it can run. */
export const MINUTES_STEP = 1;
export const MINUTES_MAX = 60;

/**
 * One cardio block as a workout has it: the machine, and how long.
 *
 * Leave both lengths out and the machine's own default is used — its set
 * distance if it has one, else `CARDIO_MINUTES` on the clock. Set `course`
 * to time a distance, or `minutes` to measure one; `course` wins if both are.
 */
export type CardioBlock = {
  machine: string;
  /** Timed over this distance, in the machine's unit. */
  course?: number;
  /** Or: the distance covered in this many minutes is the score. */
  minutes?: number;
};

/** A block's length, worked out: exactly one of the two is set. */
export type CardioLength = { course: number; minutes?: undefined } | { minutes: number; course?: undefined };

/** How long a block on this machine runs — its own setting, else the machine's default. */
export const lengthOf = (
  machine: CardioExercise,
  block?: Pick<CardioBlock, "course" | "minutes">,
): CardioLength => {
  if (block?.course !== undefined) return { course: block.course };
  if (block?.minutes !== undefined) return { minutes: block.minutes };
  return machine.distance !== undefined ? { course: machine.distance } : { minutes: CARDIO_MINUTES };
};

/**
 * The distance a block starts on when switched from the clock to a set
 * distance: the machine's own, else a round number in its unit.
 */
export const defaultCourse = (machine: CardioExercise): number =>
  machine.distance ?? (machine.metric.unit === "km" ? 1 : 1000);

/**
 * A stretch the app knows: a photo, a how-to guide — both keyed by this id —
 * and the hold it starts with when added to a routine.
 *
 * Only stretches with a real photo belong here (see `data/photos.ts`); one you
 * type in yourself is just a name and a time, and shows a placeholder.
 */
export type Stretch = {
  id: string;
  name: string;
  /**
   * Seconds to hold when first added. Per side, when `perSide`. For a move
   * done for reps, roughly how long they take — see `secondsFor`.
   */
  seconds: number;
  perSide?: boolean;
  /**
   * Done for a count rather than held: a band pull-apart is 15 slow reps, not
   * a minute on a clock. Per side, when `perSide`. Its card has no timer —
   * you say when you're done.
   */
  reps?: number;
  /** One line on the card. Keep it short. */
  cue?: string;
};

/** Every stretch on offer, roughly hips first and upper body last, then the warm-up moves. */
export const STRETCHES: Stretch[] = [
  { id: "couch", name: "Couch stretch", seconds: 60, perSide: true, cue: "Squeeze the glute to feel the front of the hip." },
  { id: "worlds_greatest", name: "World's greatest stretch", seconds: 30, perSide: true, cue: "Elbow down to the instep, then turn the chest open." },
  { id: "figure_four", name: "Figure-four stretch", seconds: 45, perSide: true, cue: "Ankle over the knee, pull the bottom leg in." },
  { id: "seated_hamstring", name: "Seated hamstring stretch", seconds: 30, perSide: true, cue: "Fold from the hips, not the back." },
  { id: "standing_hip_flexor", name: "Standing hip flexor stretch", seconds: 30, perSide: true, cue: "Tuck the pelvis and shift forward." },
  { id: "forward_fold", name: "Standing forward fold", seconds: 45, cue: "Let the head and arms hang." },
  { id: "calf_wall", name: "Calf stretch", seconds: 30, perSide: true, cue: "Back heel down, back knee straight." },
  { id: "supine_twist", name: "Lying twist", seconds: 45, perSide: true, cue: "Knee across, shoulders stay down." },
  { id: "knees_to_chest", name: "Knees to chest", seconds: 45, cue: "Hands under the knees, not over." },
  { id: "cat_cow", name: "Cat–cow", seconds: 60, cue: "Slow. One breath per position." },
  { id: "childs_pose", name: "Child's pose", seconds: 60, cue: "Breathe into the back of the ribs." },
  { id: "chest_opener", name: "Chest and shoulder opener", seconds: 45, cue: "A stick or empty bar, wide grip, up and back." },
  { id: "lat_wall", name: "Lat stretch on a wall", seconds: 30, perSide: true, cue: "Forearm on the wall, sink the chest away." },
  { id: "cross_body", name: "Cross-body shoulder stretch", seconds: 30, perSide: true, cue: "Pull the arm across at chest height." },
  // The shoulder warm-up's: to ready the shoulders to press, not to stretch them.
  { id: "ball_shoulder", name: "Ball on the wall", seconds: 45, perSide: true, cue: "Ball under the front of the shoulder. Lean in and roll slowly." },
  { id: "band_pull_apart", name: "Band pull-apart", seconds: 45, reps: 15, cue: "Arms straight, squeeze the shoulder blades together." },
  { id: "band_external_rotation", name: "Band external rotation", seconds: 36, reps: 12, perSide: true, cue: "Elbow pinned to your side. Turn the hand out slowly." },
  // The same job with nothing to hold, for away from the gym.
  { id: "arm_circles", name: "Arm circles", seconds: 30, cue: "Arms straight out. Small circles, then bigger." },
  { id: "wall_slide", name: "Wall slide", seconds: 30, reps: 10, cue: "Back and arms against a wall. Slide up slowly, then down." },
  { id: "prone_y_raise", name: "Lying Y-raise", seconds: 30, reps: 10, cue: "Face down, arms in a Y, thumbs up. Lift them off the floor." },
];

export const stretchById = (id: string): Stretch | undefined => STRETCHES.find((s) => s.id === id);

/** A rep, at the slow pace a warm-up move is done at. */
export const SECONDS_PER_REP = 3;

/** Fewest and most reps a move done for reps can be set to. */
export const REPS_RANGE_MOVE = { min: 5, max: 30 } as const;

/** Roughly how long a move done for reps takes: a rep every few seconds. */
export const secondsFor = (reps: number): number => reps * SECONDS_PER_REP;

/** How far − and + move a hold, and the range it stays within. */
export const HOLD_STEP = 15;
export const HOLD_RANGE = { min: 15, max: 180 } as const;

export type MobilityMove = {
  /** Unique within its routine. */
  id: string;
  /**
   * The stretch this is, for its photo and guide. Absent for one you typed in
   * yourself, which shows a placeholder.
   */
  stretch?: string;
  name: string;
  /** Seconds to hold. Doubled in effect when `perSide` — it is per side. */
  seconds: number;
  /** Held on each side in turn, so the block is twice this long. */
  perSide?: boolean;
  /** Done for this many reps rather than held — see `Stretch`. `seconds` is then how long they take. */
  reps?: number;
  cue?: string;
};

/** The id a move's photo and guide are found under. */
export const pictureOf = (move: MobilityMove): string => move.stretch ?? move.id;

/** A stretch from the library as a hold in a routine, with its own times unless told otherwise. */
export const holdOf = (
  stretch: Stretch,
  id: string = stretch.id,
  overrides: Partial<Pick<MobilityMove, "seconds" | "perSide">> = {},
): MobilityMove => ({
  id,
  stretch: stretch.id,
  name: stretch.name,
  seconds: stretch.seconds,
  ...(stretch.perSide ? { perSide: true } : {}),
  ...(stretch.reps ? { reps: stretch.reps } : {}),
  ...(stretch.cue ? { cue: stretch.cue } : {}),
  ...overrides,
});

const hold = (id: string, overrides?: Partial<Pick<MobilityMove, "seconds" | "perSide">>) =>
  holdOf(stretchById(id)!, id, overrides);

export type MobilityRoutine = {
  id: string;
  name: string;
  /** What it is for, in lower case. A few words. */
  subtitle: string;
  moves: MobilityMove[];
  enabled?: boolean;
};

/** Your changes to a built-in routine: its name, its holds. Kept beside it, so it can be put back. */
export type MobilityEdit = { name?: string; moves?: MobilityMove[] };

/** The routine every workout ends on until you choose another. */
export const DEFAULT_MOBILITY = "everyday";

/**
 * The routine a workout that presses opens with, after the cardio, until you
 * choose another or take it out. Shoulders are the joint pressing hurts most.
 * Not "shoulders": that id belonged to a routine retired in version 10.
 */
export const SHOULDER_WARMUP = "shoulder_warmup";

/**
 * The built-in routines: one, and a good one. The best of the stretches for
 * someone who lifts — hips, hamstrings, glutes, chest and back — in about seven
 * minutes. Every hold has a photo and a guide. Change it in Plan, or make
 * routines of your own for particular days.
 */
export const MOBILITY: MobilityRoutine[] = [
  {
    id: DEFAULT_MOBILITY,
    name: "Everyday stretch",
    subtitle: "hips, hamstrings, chest and back",
    moves: [
      hold("couch"),
      hold("worlds_greatest"),
      hold("figure_four"),
      hold("seated_hamstring"),
      hold("chest_opener"),
      hold("childs_pose"),
    ],
  },
  {
    id: SHOULDER_WARMUP,
    name: "Shoulder warm-up",
    subtitle: "before you press",
    moves: [hold("ball_shoulder"), hold("band_pull_apart"), hold("band_external_rotation")],
  },
];

/**
 * The shoulder warm-up with nothing to hold: what a workout that presses
 * opens with away from the gym, where there is no ball or band. Not in the
 * routine pool: the gym one stays the one you see and change.
 */
export const AWAY_WARMUP: MobilityRoutine = {
  id: "shoulder_warmup_away",
  name: "Shoulder warm-up",
  subtitle: "before you press, nothing needed",
  moves: [hold("arm_circles"), hold("wall_slide"), hold("prone_y_raise")],
};

/** Routines earlier versions shipped, all retired for `everyday`. Read only by the save migration. */
export const RETIRED_MOBILITY = ["full_body", "hips", "shoulders", "spine", "quick"];

/**
 * The lean starting pools: the two machines the blocks default to plus one
 * alternative, and the one routine.
 *
 * Kept a little wider than the lifting catalogue because a conditioning block
 * has no equipment fallback — if the treadmill is taken you want a second
 * option there and then, not a trip to the library mid-session.
 *
 * Everything else ships removed and is one tap from coming back.
 */
export const LEAN_CARDIO: string[] = ["treadmill", "ski_erg", "row"];
export const LEAN_MOBILITY: string[] = [DEFAULT_MOBILITY, SHOULDER_WARMUP];

/** Built-in machines and routines that start out removed. */
export const leanHiddenConditioning = (): string[] => [
  ...CARDIO.filter((c) => !LEAN_CARDIO.includes(c.id)).map((c) => c.id),
  ...MOBILITY.filter((m) => !LEAN_MOBILITY.includes(m.id)).map((m) => m.id),
];

/**
 * Machines and routines you have added, kept here so `cardioById` and
 * `mobilityById` resolve them everywhere without threading session state
 * through every call site. The store keeps these in sync; nothing else
 * should write to them.
 *
 * Exactly the arrangement `exercises.ts` uses for custom lifts — see
 * `setCustomExercises` there.
 */
let customCardio: CardioExercise[] = [];
let customMobility: MobilityRoutine[] = [];
let mobilityEdits: Record<string, MobilityEdit> = {};

export const setCustomConditioning = (
  cardio: CardioExercise[],
  mobility: MobilityRoutine[],
) => {
  customCardio = cardio;
  customMobility = mobility;
};

/** Your changes to the built-in routines, as `exerciseEdits` is for lifts. */
export const setMobilityEdits = (edits: Record<string, MobilityEdit>) => {
  mobilityEdits = edits;
};

/** A built-in routine as you have changed it. */
const withMobilityEdits = (routine: MobilityRoutine): MobilityRoutine => {
  const edit = mobilityEdits[routine.id];
  return edit ? { ...routine, ...edit } : routine;
};

export const cardioById = (id: string): CardioExercise | undefined =>
  CARDIO.find((c) => c.id === id) ??
  AWAY_CARDIO.find((c) => c.id === id) ??
  customCardio.find((c) => c.id === id);

export const mobilityById = (id: string): MobilityRoutine | undefined => {
  if (id === AWAY_WARMUP.id) return AWAY_WARMUP;
  const builtIn = MOBILITY.find((m) => m.id === id);
  return builtIn ? withMobilityEdits(builtIn) : customMobility.find((m) => m.id === id);
};

/**
 * Everything currently on offer, in authored order: the built-ins first, then
 * yours. `hidden` is what you have removed — built-ins are hidden rather than
 * deleted so restoring one brings its records back with it.
 */
export const cardioPool = (hidden: string[] = []): CardioExercise[] => [
  ...CARDIO.filter((c) => c.enabled !== false && !hidden.includes(c.id)),
  ...customCardio,
];

export const mobilityPool = (hidden: string[] = []): MobilityRoutine[] => [
  ...MOBILITY.filter((m) => m.enabled !== false && !hidden.includes(m.id)).map(withMobilityEdits),
  ...customMobility,
];

/** Built-ins you have removed, so they can be put back. */
export const hiddenCardio = (hidden: string[]): CardioExercise[] =>
  CARDIO.filter((c) => hidden.includes(c.id));

export const hiddenMobility = (hidden: string[]): MobilityRoutine[] =>
  MOBILITY.filter((m) => hidden.includes(m.id)).map(withMobilityEdits);

/** The units a machine can measure in, offered when you add one. */
export const METRICS: { label: string; metric: CardioMetric }[] = [
  { label: "Kilometres", metric: KM },
  { label: "Metres", metric: METRES },
];

/** How long a routine takes, counting both sides of anything one-sided. */
export const routineSeconds = (routine: MobilityRoutine): number =>
  routine.moves.reduce((n, m) => n + m.seconds * (m.perSide ? 2 : 1), 0);

/** A distance in its machine's own unit — "1.02 km", "1240 m". */
export const distanceLabel = (cardio: CardioExercise, distance: number): string =>
  `${distance.toFixed(cardio.metric.decimals)} ${cardio.metric.unit}`;

/** A set distance, without trailing zeros — "1 km", "2.5 km", "500 m". */
export const courseLabel = (cardio: CardioExercise, distance: number): string =>
  `${Number(distance.toFixed(cardio.metric.decimals))} ${cardio.metric.unit}`;

/**
 * How far a set distance moves at a time, by unit. Coarse on purpose: every
 * distance keeps its own record, so a free choice would scatter your times
 * across 1.35, 1.4 and 1.55 km with nothing to compare against.
 */
export const COURSE_STEP: Record<CardioMetric["unit"], number> = { km: 0.5, m: 500, skips: 100 };

/** How far − and + move a time, in seconds. */
export const TIME_STEP = 5;

/** Seconds as a clock — "4:52", "1:02:10". */
export const timeLabel = (seconds: number): string => {
  const s = Math.round(seconds);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const ss = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${ss}` : `${m}:${ss}`;
};

/**
 * A typed time back to seconds. Forgiving, since it is typed on a number pad
 * mid-gasp: "4:52", "4.52" and "452" are all four fifty-two, and a bare "5"
 * is five minutes. Null for anything that is not a time.
 */
export const parseTime = (text: string): number | null => {
  const t = text.trim();
  if (!t) return null;
  const parts = t.split(/[:.,]/);
  if (parts.some((p) => !/^\d*$/.test(p))) return null;
  const nums = parts.map((p) => Number(p || 0));
  if (nums.length === 1) {
    const digits = parts[0];
    // Up to two digits is minutes; beyond that the last two are seconds.
    if (digits.length <= 2) return nums[0] * 60;
    return Math.floor(nums[0] / 100) * 60 + (nums[0] % 100);
  }
  return nums.reduce((total, n) => total * 60 + n, 0);
};
