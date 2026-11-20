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
  unit: "km" | "m" | "skips" | "reps";
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
  /**
   * Nothing to enter: the minutes count down on the card, and running out is
   * done — see `onTheClock`. For cardio with no machine to read a number off.
   */
  clock?: boolean;
  /** Set false to bench a machine without losing its records. */
  enabled?: boolean;
};

/**
 * The cardio pool. First is the default for the opening block; the closing
 * block's default is named separately below, since ski-erg after legs is a
 * different job from a treadmill before them.
 */
export const CARDIO: CardioExercise[] = [
  { id: "treadmill", name: "Treadmill", metric: KM, distance: 1, cue: "Look ahead and let your arms move naturally. Use the rails for balance when needed." },
  { id: "row", name: "Rower", metric: METRES, cue: "Legs, back, arms — then the reverse." },
  { id: "ski_erg", name: "Ski-erg", metric: METRES, cue: "Hinge at the hips, finish past the pockets." },
  { id: "bike", name: "Bike", metric: KM },
  { id: "assault_bike", name: "Assault bike", metric: KM, cue: "Arms and legs, same effort." },
  { id: "stair", name: "Stair climber", metric: KM, cue: "Stand upright. Use the rails for balance without leaning your weight on them." },
  { id: "elliptical", name: "Elliptical", metric: KM },
];

/**
 * Cardio that needs no machine, for away from the gym: it opens a workout in
 * place of the machine there. Not in the machine pool, so a gym's list is
 * never longer for it. With no machine to read a number off, each is just a
 * clock counting down the minutes — see `onTheClock`.
 */
export const AWAY_CARDIO: CardioExercise[] = [
  { id: "outdoor", name: "Walk or jog outside", metric: KM, clock: true, cue: "Out of the door, and back when the time is up." },
  { id: "skipping", name: "Skipping rope", metric: SKIPS, cue: "Small hops on the balls of your feet." },
  { id: "jumping_jacks", name: "Jumping jacks", metric: { unit: "reps", decimals: 0, step: 10 } },
];

/**
 * Cardio done against the clock alone, with nothing to enter: marked so, or
 * counted in skips or reps — nobody counts five minutes of skips, so a count
 * is never asked for. Its block is always minutes, never a set distance.
 * (Their unit stays, so counts entered before still read right in history.)
 */
export const onTheClock = (machine: CardioExercise): boolean =>
  machine.clock === true || machine.metric.unit === "skips" || machine.metric.unit === "reps";

/** The two ends of a session a cardio block can sit at. */
export type CardioEnd = "open" | "close";

/**
 * How hard to go, by where the block sits rather than which machine it is:
 * a warm-up readies you for the lifts, so it is never a race. A machine's own
 * `cue` is only ever about how to use it.
 */
export const EFFORT: Record<CardioEnd, string> = {
  open: "Start easy. Finish at a pace where talking gets a little hard.",
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
  if (onTheClock(machine)) return { minutes: block?.minutes ?? CARDIO_MINUTES };
  if (block?.course !== undefined) return { course: block.course };
  if (block?.minutes !== undefined) return { minutes: block.minutes };
  return machine.distance !== undefined ? { course: machine.distance } : { minutes: CARDIO_MINUTES };
};

/**
 * The distance a block starts on when switched from the clock to a set
 * distance: the machine's own, else a round number in its unit.
 */
export const defaultCourse = (machine: CardioExercise): number =>
  machine.distance ?? (machine.metric.unit === "km" ? 1 : machine.metric.unit === "m" ? 1000 : 100);

/**
 * A stretch the app knows: its clay picture, a how-to guide — both keyed by this id —
 * and the hold it starts with when added to a routine.
 *
 * Only stretches with the clay figure's pictures belong here (see
 * `data/clay.ts`); one you type in yourself is just a name and a time, and shows a placeholder.
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
  // Every warm-up opens with these two: the legs and hips, whatever the day.
  { id: "wide_stance", name: "Wide stance", seconds: 30, cue: "Feet wide, sit down between your heels, chest up." },
  { id: "side_stance", name: "Side stance", seconds: 30, perSide: true, cue: "Sit to one side. The other leg straight, toes up." },
  // A leg day's: the legs moving through what they are about to do.
  { id: "leg_swing", name: "Leg swings", seconds: 30, reps: 10, perSide: true, cue: "Hold on to something. Swing one leg, easy and loose." },
  { id: "bodyweight_squat", name: "Bodyweight squat", seconds: 30, reps: 10, cue: "Sit down slowly, pause at the bottom, stand up." },
  // A push or pull day's: to ready the shoulders, not to stretch them.
  { id: "ball_shoulder", name: "Ball on the wall", seconds: 45, perSide: true, cue: "Ball under the front of the shoulder. Lean in and roll slowly." },
  { id: "band_pull_apart", name: "Band pull-apart", seconds: 45, reps: 15, cue: "Arms straight, squeeze the shoulder blades together." },
  { id: "band_external_rotation", name: "Band external rotation", seconds: 36, reps: 12, perSide: true, cue: "Elbow pinned to your side. Turn the hand out slowly." },
  // The same job with nothing to hold, for away from the gym.
  { id: "arm_circles", name: "Arm circles", seconds: 30, cue: "Arms straight out. Small circles, then bigger." },
  { id: "wall_slide", name: "Wall slide", seconds: 30, reps: 10, cue: "Back and arms against a wall. Slide up slowly, then down." },
  { id: "prone_y_raise", name: "Lying Y-raise", seconds: 30, reps: 10, cue: "Face down, arms in a Y, thumbs up. Lift them off the floor." },
  // Shoulder blades for pressing, the upper back for pulling.
  { id: "scapular_pushup", name: "Scapular push-up", seconds: 30, reps: 10, cue: "Arms straight. Let the chest sink between the shoulders, then push it away." },
  { id: "thread_needle", name: "Thread the needle", seconds: 30, perSide: true, cue: "On hands and knees. Slide one arm under the other and turn the upper back." },
  // Yoga: slow holds for the spine, hips and hamstrings.
  { id: "downward_dog", name: "Downward dog", seconds: 45, cue: "Hands and feet down, hips high. Let the heels sink toward the floor." },
  { id: "low_lunge", name: "Low lunge", seconds: 30, perSide: true, cue: "Back knee down. Let the hips sink forward, chest up." },
  { id: "pigeon", name: "Pigeon", seconds: 45, perSide: true, cue: "Front shin across, back leg long. Fold forward only as far as is easy." },
  { id: "cobra", name: "Cobra", seconds: 30, cue: "Face down, hands under the shoulders. Lift the chest; the hips stay down." },
  // Kung fu: loosening the legs and hips the way a class starts — from
  // Järna Kung Fu, beside the wide and side stance above.
  { id: "knee_circles", name: "Knee circles", seconds: 40, reps: 10, perSide: true, cue: "Arms out, stand tall. Lift a knee and draw big circles, five each way." },
  { id: "hamstring_bounce", name: "Hamstring bounces", seconds: 45, cue: "Fold forward, knees soft. Small, gentle bounces; straighten the legs halfway." },
  { id: "front_kick_swing", name: "Front kick swings", seconds: 40, reps: 10, perSide: true, cue: "Arms out, back straight. Swing the straight leg up, then lower it slowly." },
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
   * The stretch this is, for its picture and guide. Absent for one you typed in
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

/** The id a move's picture and guide are found under. */
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
  /**
   * Where it goes: "warmup" for mobility, done before the lifts to get you
   * moving; absent for stretches, done at the end. Built-ins are told apart
   * by id — see `routineUse`.
   */
  use?: RoutineUse;
};

/** Mobility opens a workout; stretches close it. */
export type RoutineUse = "warmup" | "end";

/** Whether a routine is mobility, for the warm-up, or stretches, for the cool-down. */
export const routineUse = (routine: Pick<MobilityRoutine, "id" | "use">): RoutineUse => {
  if (routine.use) return routine.use;
  const id = routine.id.replace(/:away$/, "");
  return (Object.values(WARMUP) as string[]).includes(id) || id.startsWith(SHOULDER_WARMUP) ? "warmup" : "end";
};

/** Your changes to a built-in routine: its name, its holds. Kept beside it, so it can be put back. */
export type MobilityEdit = { name?: string; moves?: MobilityMove[] };

/** The routine every workout ends on until you choose another. */
export const DEFAULT_MOBILITY = "everyday";

/**
 * The warm-ups, one for each kind of day, each readying what that day works:
 * the upper back and shoulders on a push day, the lats and upper back on a
 * pull day, the hips and ankles on a leg day. A workout opens with its
 * day's, straight after the cardio, unless it has one of its own.
 */
export const WARMUP = { push: "warmup_push", pull: "warmup_pull", legs: "warmup_legs" } as const;
export type WarmupDay = keyof typeof WARMUP;

/**
 * Routines the PPLPPL plan had of its own for a day, folded on 2026-11-19
 * into the day warm-ups and the everyday stretch — each id and the one that
 * took its place. Read only by the save migration.
 */
export const RETIRED_PPLPPL: Record<string, string> = {
  pplppl_push: "warmup_push",
  pplppl_pull: "warmup_pull",
  pplppl_legs: "warmup_legs",
  pplppl_push_end: "everyday",
  pplppl_pull_end: "everyday",
  pplppl_legs_end: "everyday",
};

/**
 * A move with no clay picture yet: its name, its count and its cue, and a
 * placeholder where the picture goes. An id that is also a lift's — the dead
 * hang — borrows that lift's picture and guide.
 */
const drill = (
  id: string,
  name: string,
  dose: Pick<MobilityMove, "seconds" | "perSide" | "reps">,
  cue: string,
): MobilityMove => ({ id, name, ...dose, cue });

/** A library stretch done for a count rather than held. */
const forReps = (id: string, reps: number): MobilityMove => ({
  ...hold(id),
  reps,
  seconds: secondsFor(reps),
});

/**
 * A general warm-up: the same four moves for any day, about four minutes.
 * The spine, the hips and hamstrings, the shoulders, then the squat with no
 * load. In the library to pick; the built-in days open with their own.
 */
export const EVERYDAY_WARMUP = "warmup";

/** Retired for the day warm-ups. Read only by old saves and sessions. */
export const SHOULDER_WARMUP = "shoulder_warmup";

/**
 * The built-in routines: one, and a good one. The best of the stretches for
 * someone who lifts — hips, hamstrings, glutes, chest and back — in about seven
 * minutes. Every hold has a picture and a guide. Change it in Plan, or make
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
    id: EVERYDAY_WARMUP,
    name: "Warm-up",
    subtitle: "spine, hips and shoulders, about four minutes",
    use: "warmup",
    moves: [
      { ...forReps("cat_cow", 8), cue: "Slow, one breath each way. Gets your whole spine moving." },
      { ...forReps("worlds_greatest", 3), cue: "Hips, hamstrings and upper back in one move." },
      { ...forReps("arm_circles", 20), cue: "Small circles growing big: 10 forwards, then 10 back." },
      { ...forReps("bodyweight_squat", 10), cue: "Sit down to a box or bench and stand up. No weight yet." },
    ],
  },
  {
    id: WARMUP.push,
    name: "Push mobility",
    subtitle: "the shoulders, thoroughly, before you press",
    moves: [
      hold("arm_circles"),
      hold("band_pull_apart"),
      hold("band_external_rotation"),
      forReps("wall_slide", 10),
      forReps("scapular_pushup", 10),
      drill("open_book", "Open book", { seconds: 48, reps: 8, perSide: true }, "Lie on your side, knees bent. Open the top arm to the other side, eyes follow the hand."),
    ],
  },
  {
    id: WARMUP.pull,
    name: "Pull mobility",
    subtitle: "the lats and the upper back, before you pull",
    moves: [
      drill("dead_hang", "Dead hang", { seconds: 50 }, "Hang relaxed, twice for about 25 seconds. Rest between."),
      drill("scap_pullup", "Scapular pull-up", { seconds: 24, reps: 8 }, "Arms straight. Pull the shoulders down away from the ears, then let them rise."),
      forReps("thread_needle", 6),
      forReps("cat_cow", 8),
    ],
  },
  {
    id: WARMUP.legs,
    name: "Leg mobility",
    subtitle: "hips and ankles, before you squat",
    moves: [
      forReps("worlds_greatest", 4),
      drill("hip_switch", "90/90 hip switches", { seconds: 48, reps: 8, perSide: true }, "Sit with both knees bent to one side. Lift them over to the other side, chest tall."),
      drill("ankle_rock", "Knee-to-wall ankle rocks", { seconds: 30, reps: 10, perSide: true }, "Foot a hand from the wall. Push the knee to the wall, heel stays down."),
      drill("goblet_hold", "Goblet squat hold", { seconds: 60 }, "Light bell at the chest. Sit deep, elbows push the knees out. Twice for 30 seconds."),
    ],
  },
  {
    id: "yoga",
    name: "Yoga flow",
    subtitle: "spine, hips and hamstrings",
    moves: [
      hold("cat_cow", { seconds: 45 }),
      hold("downward_dog"),
      hold("low_lunge"),
      hold("pigeon"),
      hold("cobra"),
      hold("childs_pose"),
      hold("supine_twist"),
    ],
  },
  {
    id: "kung_fu",
    name: "Kung fu mobility",
    subtitle: "legs and hips, the way a kung fu class starts",
    use: "warmup",
    moves: [hold("knee_circles"), hold("wide_stance"), hold("hamstring_bounce"), hold("side_stance"), hold("front_kick_swing")],
  },
  {
    // On all fours and on the floor, like an animal: the spine, shoulders
    // and wrists, for fun. No clay pictures yet, so each shows the placeholder.
    id: "animal",
    name: "Animal",
    subtitle: "crawl, arch and push, on the floor",
    use: "warmup",
    moves: [
      drill("back_bend", "Back bend", { seconds: 40 }, "On your back, hands by your ears. Push up into an arch, twice for 20 seconds."),
      drill("alligator_crawl", "Alligator crawl", { seconds: 30, reps: 10 }, "Low push-up position, hips down. Crawl forward, knee toward elbow each step."),
      drill("cobra_pushup", "Cobra push-up", { seconds: 24, reps: 8 }, "Lower to the floor like a push-up, lift the chest into cobra, then push back up."),
    ],
  },
];

/**
 * Away from a gym there is no band, bar or kettlebell: each move that needs
 * one becomes one that needs nothing and does the same job.
 */
const AWAY = ":away";
const AWAY_SWAP: Record<string, string> = {
  band_pull_apart: "prone_y_raise",
  band_external_rotation: "wall_slide",
  dead_hang: "lat_wall",
  scap_pullup: "prone_y_raise",
  goblet_hold: "bodyweight_squat",
};

/** The version of a routine that needs nothing, or the routine itself if it already doesn't. */
export const awayVersion = (routine: MobilityRoutine): MobilityRoutine => {
  const needs = (m: MobilityMove) => AWAY_SWAP[m.stretch ?? m.id];
  if (!routine.moves.some(needs)) return routine;
  return {
    ...routine,
    id: `${routine.id}${AWAY}`,
    moves: routine.moves.map((m) => {
      const swap = needs(m);
      return swap ? hold(swap) : m;
    })
      // A swap for a move already there is not done twice.
      .filter((m, i, all) => all.findIndex((o) => o.id === m.id) === i),
  };
};

/** The shoulder warm-up as it last shipped, so a session started with it still reads. */
const OLD_WARMUPS: MobilityRoutine[] = [
  {
    id: SHOULDER_WARMUP,
    name: "Shoulder mobility",
    subtitle: "before you press",
    moves: [hold("ball_shoulder"), hold("band_pull_apart"), hold("band_external_rotation")],
  },
  {
    id: "shoulder_warmup_away",
    name: "Shoulder mobility",
    subtitle: "before you press, nothing needed",
    moves: [hold("arm_circles"), hold("wall_slide"), hold("prone_y_raise")],
  },
];

/** Routines earlier versions shipped, all retired for `everyday`. Read only by the save migration. */
export const RETIRED_MOBILITY = ["full_body", "hips", "shoulders", "spine", "quick", SHOULDER_WARMUP];

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
export const LEAN_MOBILITY: string[] = [DEFAULT_MOBILITY, EVERYDAY_WARMUP, WARMUP.push, WARMUP.pull, WARMUP.legs, "yoga", "kung_fu", "animal"];

/** Built-in machines and routines a new phone starts without — added from the foot of their list. */
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
  if (id.endsWith(AWAY)) {
    const home = mobilityById(id.slice(0, -AWAY.length));
    return home && awayVersion(home);
  }
  const old = OLD_WARMUPS.find((m) => m.id === id);
  if (old) return old;
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
  ...AWAY_CARDIO.filter((c) => !hidden.includes(c.id)),
  ...customCardio,
];

export const mobilityPool = (hidden: string[] = []): MobilityRoutine[] => [
  ...MOBILITY.filter((m) => m.enabled !== false && !hidden.includes(m.id)).map(withMobilityEdits),
  ...customMobility,
];

/** Built-ins you have removed, so they can be put back. */
export const hiddenCardio = (hidden: string[]): CardioExercise[] =>
  [...CARDIO, ...AWAY_CARDIO].filter((c) => hidden.includes(c.id));

export const hiddenMobility = (hidden: string[]): MobilityRoutine[] =>
  MOBILITY.filter((m) => hidden.includes(m.id)).map(withMobilityEdits);

/** The units a machine can measure in, offered when you add one. */
export const METRICS: { label: string; metric: CardioMetric }[] = [
  { label: "Kilometres", metric: KM },
  { label: "Metres", metric: METRES },
  // Reps are never counted (see `onTheClock`): this is the one with only a timer.
  { label: "Just a timer", metric: { unit: "reps", decimals: 0, step: 10 } },
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
export const COURSE_STEP: Record<CardioMetric["unit"], number> = { km: 0.5, m: 500, skips: 100, reps: 10 };

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
  if (parts.length > 3 || parts.some((p) => !/^\d*$/.test(p)) || !parts.some((p) => p.length > 0)) return null;
  const nums = parts.map((p) => Number(p || 0));
  if (nums.length === 1) {
    const digits = parts[0];
    // Up to two digits is minutes; beyond that the last two are seconds.
    if (digits.length <= 2) return nums[0] * 60;
    return nums[0] % 100 < 60 ? Math.floor(nums[0] / 100) * 60 + (nums[0] % 100) : null;
  }
  if (nums.slice(1).some((n) => n >= 60)) return null;
  return nums.reduce((total, n) => total * 60 + n, 0);
};
