/**
 * Cardio and mobility: the work that bookends the lifting.
 *
 * These are pools, not programmes. A session opens with one cardio block and
 * closes with another plus mobility; which machine or which routine fills
 * each is swapped the same way a lift is, and remembered per slot.
 *
 * Neither kind climbs a rep ladder. Cardio progresses by covering more ground
 * in the same fixed minutes — you are only ever racing your own last go on
 * that machine. Mobility does not progress at all; it is a checklist.
 */

/** What a machine measures, and in what unit the number is entered. */
export type CardioMetric = {
  /** Unit the distance is entered and stored in. */
  unit: "km" | "m";
  /** Decimals shown and accepted. Metres are whole; kilometres are fine. */
  decimals: number;
  /** Nudge size for the +/- steppers. */
  step: number;
};

const KM: CardioMetric = { unit: "km", decimals: 2, step: 0.05 };
// Five minutes on a rower or ski-erg is a four-figure distance — step it in hundreds.
const METRES: CardioMetric = { unit: "m", decimals: 0, step: 100 };

export type CardioExercise = {
  id: string;
  name: string;
  /** How far you got, in this machine's own unit. */
  metric: CardioMetric;
  /** Shown once on the screen. Keep it short. */
  cue?: string;
  /** Set false to bench a machine without losing its records. */
  enabled?: boolean;
};

/**
 * The cardio pool. First is the default for the opening block; the closing
 * block's default is named separately below, since ski-erg after legs is a
 * different job from a treadmill before them.
 */
export const CARDIO: CardioExercise[] = [
  { id: "treadmill", name: "Treadmill", metric: KM, cue: "Find a pace you could hold for twice as long." },
  { id: "row", name: "Rower", metric: METRES, cue: "Legs, back, arms — then the reverse." },
  { id: "ski_erg", name: "Ski-erg", metric: METRES, cue: "Hinge at the hips, finish past the pockets." },
  { id: "bike", name: "Bike", metric: KM },
  { id: "assault_bike", name: "Assault bike", metric: KM, cue: "Arms and legs, same effort." },
  { id: "stair", name: "Stair climber", metric: KM, cue: "Stand tall, off the handrails." },
  { id: "elliptical", name: "Elliptical", metric: KM },
];

/** The machine each cardio slot opens with until you swap it. */
export const CARDIO_DEFAULT = {
  open: "treadmill",
  close: "ski_erg",
} as const;

/** How long a cardio block runs, in minutes. The same every session. */
export const CARDIO_MINUTES = 5;

export type MobilityMove = {
  id: string;
  name: string;
  /** Seconds to hold. Doubled in effect when `perSide` — it is per side. */
  seconds: number;
  /** Held on each side in turn, so the block is twice this long. */
  perSide?: boolean;
  cue?: string;
};

export type MobilityRoutine = {
  id: string;
  name: string;
  /** What it is for, in lower case. A few words. */
  subtitle: string;
  moves: MobilityMove[];
  enabled?: boolean;
};

/**
 * The mobility pool. One routine per slot, swapped like any other exercise —
 * so a hip-heavy day can end on hips and a pressing day on shoulders.
 */
export const MOBILITY: MobilityRoutine[] = [
  {
    id: "full_body",
    name: "Full body",
    subtitle: "a bit of everything",
    moves: [
      { id: "fb_couch", name: "Couch stretch", seconds: 45, perSide: true, cue: "Squeeze the glute to feel the front of the hip." },
      { id: "fb_pigeon", name: "Pigeon pose", seconds: 45, perSide: true },
      { id: "fb_ham", name: "Seated hamstring fold", seconds: 45 },
      { id: "fb_thoracic", name: "Thoracic opener over a bench", seconds: 45 },
      { id: "fb_child", name: "Child's pose", seconds: 60, cue: "Breathe into the back of the ribs." },
    ],
  },
  {
    id: "hips",
    name: "Hips & hamstrings",
    subtitle: "after squats and hinges",
    moves: [
      { id: "hp_90", name: "90/90 hip switch hold", seconds: 45, perSide: true },
      { id: "hp_couch", name: "Couch stretch", seconds: 60, perSide: true },
      { id: "hp_frog", name: "Frog stretch", seconds: 60, cue: "Rock back slowly, do not force it." },
      { id: "hp_ham", name: "Standing hamstring fold", seconds: 45 },
      { id: "hp_lizard", name: "Lizard lunge", seconds: 45, perSide: true },
    ],
  },
  {
    id: "shoulders",
    name: "Shoulders & chest",
    subtitle: "after pressing",
    moves: [
      { id: "sh_doorway", name: "Doorway pec stretch", seconds: 45, perSide: true },
      { id: "sh_hang", name: "Passive bar hang", seconds: 30, cue: "Let the shoulders come up around the ears." },
      { id: "sh_sleeper", name: "Sleeper stretch", seconds: 45, perSide: true },
      { id: "sh_thread", name: "Thread the needle", seconds: 45, perSide: true },
      { id: "sh_wall", name: "Wall angel hold", seconds: 45 },
    ],
  },
  {
    id: "spine",
    name: "Spine & lower back",
    subtitle: "after deadlifts",
    moves: [
      { id: "sp_cat", name: "Cat–cow", seconds: 60, cue: "Slow. One breath per position." },
      { id: "sp_twist", name: "Supine spinal twist", seconds: 45, perSide: true },
      { id: "sp_cobra", name: "Cobra", seconds: 45 },
      { id: "sp_knees", name: "Knees to chest", seconds: 45 },
      { id: "sp_child", name: "Child's pose", seconds: 60 },
    ],
  },
  {
    id: "quick",
    name: "Quick reset",
    subtitle: "three minutes, no floor",
    moves: [
      { id: "qk_hang", name: "Passive bar hang", seconds: 30 },
      { id: "qk_doorway", name: "Doorway pec stretch", seconds: 30, perSide: true },
      { id: "qk_lunge", name: "Standing lunge stretch", seconds: 30, perSide: true },
      { id: "qk_fold", name: "Standing forward fold", seconds: 45 },
    ],
  },
];

/**
 * The lean starting pools: the two machines the blocks default to plus one
 * alternative, and three routines.
 *
 * Kept a little wider than the lifting catalogue because a conditioning block
 * has no equipment fallback — if the treadmill is taken you want a second
 * option there and then, not a trip to the library mid-session.
 *
 * Everything else ships removed and is one tap from coming back.
 */
export const LEAN_CARDIO: string[] = ["treadmill", "ski_erg", "row"];
export const LEAN_MOBILITY: string[] = ["full_body", "hips", "shoulders"];

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

export const setCustomConditioning = (
  cardio: CardioExercise[],
  mobility: MobilityRoutine[],
) => {
  customCardio = cardio;
  customMobility = mobility;
};

export const cardioById = (id: string): CardioExercise | undefined =>
  CARDIO.find((c) => c.id === id) ?? customCardio.find((c) => c.id === id);

export const mobilityById = (id: string): MobilityRoutine | undefined =>
  MOBILITY.find((m) => m.id === id) ?? customMobility.find((m) => m.id === id);

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
  ...MOBILITY.filter((m) => m.enabled !== false && !hidden.includes(m.id)),
  ...customMobility,
];

/** Built-ins you have removed, so they can be put back. */
export const hiddenCardio = (hidden: string[]): CardioExercise[] =>
  CARDIO.filter((c) => hidden.includes(c.id));

export const hiddenMobility = (hidden: string[]): MobilityRoutine[] =>
  MOBILITY.filter((m) => hidden.includes(m.id));

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
