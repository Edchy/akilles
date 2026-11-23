import type { Gear } from "@/data/kit";
import type { Movement, Muscle } from "@/data/exercise-tags";
import type { RepBounds } from "@/data/split";

/**
 * The exercise pool.
 *
 * To add an exercise: copy an entry, change the fields, give it a guide in
 * `guides.ts`. If it should not land in everyone's catalogue, it needs a
 * migration too — see version 11 in `store/storage.ts`.
 * To remove one: delete the entry. Slots fall back to whatever is left.
 * To stop an exercise appearing without deleting history: set `enabled: false`.
 *
 * `increment` is the smallest weight jump you can actually make on that
 * equipment: 2.5 for a barbell (2 x 1.25 plates), 2.5 between dumbbells,
 * 4 for kettlebells, 5 for most machine stacks.
 */

export type Pattern =
  | "horizontal_push"
  | "vertical_push"
  | "horizontal_pull"
  | "vertical_pull"
  | "squat"
  | "hinge"
  | "lunge"
  | "biceps"
  | "triceps"
  | "shoulders"
  | "quads"
  | "hamstrings"
  | "calves"
  | "chest_iso"
  | "abs"
  | "carry"
  | "jump";

/**
 * Broad movement family. Used to decide what needs warming up: the first
 * exercise of each group gets a ramp, the rest are already warm.
 */
export type Group =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "quads"
  | "hamstrings"
  | "calves"
  | "core"
  | "explosive";

export type Exercise = {
  id: string;
  name: string;
  /**
   * Other names people type for it — "pec deck", "RDL", "skull crusher" —
   * so search finds it whatever the gym calls it. Lower case.
   */
  aliases?: string[];
  /**
   * Every movement type this exercise counts as. Most have one; some
   * genuinely belong to two — a hip thrust is both a hinge and hamstring
   * work — and appear under both headings in the library and in both slots.
   */
  patterns: Pattern[];
  /** Equipment chosen for a custom exercise; built-ins use the kit table. */
  equipment?: Gear[];
  /** Discovery tags, independent of the patterns used by workout slots. */
  movements?: Movement[];
  muscles?: Muscle[];
  /** False keeps a new library option out of automatic substitutions until chosen. */
  autoSelect?: boolean;
  /** Defaults to the group implied by `pattern` — see `groupOf`. */
  group?: Group;
  /** Smallest practical weight jump, in kg. */
  increment: number;
  /** Bodyweight movements track reps only until you add load. */
  bodyweight?: boolean;
  /**
   * A bodyweight movement using pause progression in this app. Some can also
   * be externally loaded; this mode deliberately progresses by holding instead.
   * The `weight` number is the seconds held at
   * the hardest point of every rep, stepping up a second at a time to
   * `HOLD_MAX`. Its `increment` is that second.
   */
  holds?: boolean;
  /**
   * A timed hold rather than a rep count — the ladder numbers are seconds.
   * Only affects how the target is labelled on screen.
   */
  timed?: boolean;
  /**
   * A timed hold's own ladder, in seconds, in place of the slot's range:
   * a dead hang starts at 10 and climbs 5 seconds at a time. The slot's range
   * is ignored for it.
   */
  seconds?: { from: number; to: number; step: number };
  /**
   * Can be done on an assist machine that takes weight off you. The weight
   * may then go negative — −30 means bodyweight minus 30 of assistance — and
   * progress is that number climbing back toward zero, then past it.
   */
  assistable?: boolean;
  /**
   * Held in each hand. The weight stored and shown is the weight of ONE
   * dumbbell — "20 kg per hand" — because that is the number written on the
   * dumbbell you pick up, not the total you are moving.
   */
  perHand?: boolean;
  /**
   * Only offered by a slot that names it explicitly. Speed work belongs to
   * the power day, not to every slot sharing its movement type.
   */
  restricted?: boolean;
  /**
   * Explosive work with no load to track: jumps and throws. Shows reps only,
   * no weight control, and never progresses on the ladder — you progress it
   * by jumping higher or further, which the app does not try to measure.
   */
  unloaded?: boolean;
  /** Set false to bench an exercise without losing its history. */
  enabled?: boolean;
  /**
   * The weight it opens at before there is any history, in the same units as
   * `weight` — one dumbbell for a per-hand lift. Absent means a guess by
   * movement type; see `freshState`.
   */
  startWeight?: number;
  /** Shown once, on the first screen of the exercise. Keep it short. */
  cue?: string;
  /**
   * The reps this lift does its best work in, when that isn't the usual
   * 6–10: more for isolation work and swings, fewer for a heavy pull from the
   * floor. It climbs this range in any slot whose range doesn't fit — see
   * `ownRange` and `schemeOf`.
   */
  range?: RepBounds;
};

/** Isolation work and swings: 10 → 12 → 14, like the small muscles. */
const HIGH: RepBounds = { min: 10, max: 14 };
/** A heavy pull from the floor: 4 → 6 → 8. Its form goes before its lungs do. */
const LOW: RepBounds = { min: 4, max: 8 };

export const EXERCISES: Exercise[] = [
  // ---------- horizontal push ----------
  { id: "bench", name: "BB bench press", patterns: ["horizontal_push"], increment: 2.5, cue: "Elbows ~45°, touch low chest.",
    aliases: ["barbell bench press", "bench press", "flat bench", "flat bench press", "bb bench"] },
  { id: "db_bench", name: "DB bench press", patterns: ["horizontal_push"], increment: 2.5, perHand: true, cue: "Lower until you feel a stretch.",
    aliases: ["dumbbell bench press", "db bench", "dumbbell press", "flat dumbbell press", "dumbbell chest press"] },
  { id: "db_floor_press", name: "DB floor press", patterns: ["horizontal_push"], increment: 2.5, perHand: true,
    cue: "Lying on the floor. Down until your upper arms touch it.",
    aliases: ["dumbbell floor press", "floor press"] },
  { id: "kb_floor_press", name: "KB floor press", patterns: ["horizontal_push"], increment: 4, perHand: true,
    cue: "Lying on the floor, bells on the backs of your wrists.",
    aliases: ["kettlebell floor press", "floor press with kettlebells"] },
  { id: "incline_bench", name: "Incline BB press", patterns: ["horizontal_push"], increment: 2.5,
    aliases: ["incline barbell press", "incline bench press", "incline bench", "incline barbell bench"] },
  { id: "machine_chest", name: "Machine chest press", patterns: ["horizontal_push"], increment: 5,
    aliases: ["chest press", "chest press machine", "seated chest press"] },
  { id: "incline_db_press", name: "Incline DB press", patterns: ["horizontal_push"], increment: 2.5, perHand: true, cue: "Bench at about 30°. Press over the collarbones.",
    aliases: ["incline dumbbell press", "incline dumbbell bench press"] },
  { id: "dips", name: "Dips", patterns: ["horizontal_push", "triceps"], increment: 2.5, bodyweight: true, assistable: true,
    aliases: ["dip", "parallel bar dips", "chest dips", "assisted dips", "weighted dips"] },
  { id: "push_up", name: "Push-up", patterns: ["horizontal_push"], increment: 1, bodyweight: true, holds: true,
    aliases: ["push up", "push ups", "push-ups", "pushups", "press up", "press-ups"] },
  { id: "decline_bench", name: "Decline bench press", patterns: ["horizontal_push"], increment: 2.5,
    aliases: ["decline press", "decline barbell press", "decline bench"] },
  // A press, and the heavy triceps lift — it fills a Triceps slot as dips do.
  { id: "close_grip_bench", name: "Close-grip bench press", patterns: ["horizontal_push", "triceps"], increment: 2.5,
    cue: "Hands shoulder width, elbows tucked.",
    aliases: ["close grip bench press", "close grip bench", "narrow grip bench press", "cgbp"] },
  { id: "smith_bench", name: "Smith machine bench press", patterns: ["horizontal_push"], increment: 2.5,
    aliases: ["smith bench", "smith bench press", "smith machine bench"] },
  { id: "smith_incline_press", name: "Smith machine incline press", patterns: ["horizontal_push"], increment: 2.5,
    aliases: ["smith incline", "smith incline bench", "incline smith press"] },
  { id: "incline_machine_press", name: "Incline machine press", patterns: ["horizontal_push"], increment: 5,
    aliases: ["incline chest press", "incline chest press machine", "incline press machine"] },

  // ---------- chest isolation ----------
  // Flyes open the chest rather than pressing. Kept as their own type so they
  // never turn up as a substitute for the day's press.
  { id: "cable_fly", name: "Cable incline fly", patterns: ["chest_iso"], increment: 2.5, cue: "Low pulleys, slight bend in the elbows. Squeeze at the top.",
    aliases: ["low to high cable fly", "incline cable fly", "low cable fly"] },
  { id: "cable_crossover", name: "Cable crossover", patterns: ["chest_iso"], increment: 2.5, cue: "High pulleys, hands meet low in front of the hips.",
    aliases: ["cable fly", "high to low cable fly", "cable crossovers", "standing cable fly"] },
  { id: "pec_deck", name: "Pec deck", patterns: ["chest_iso"], increment: 5,
    aliases: ["machine fly", "pec fly", "chest fly machine", "butterfly", "pec dec", "fly machine"] },
  { id: "db_fly", name: "DB fly", patterns: ["chest_iso"], increment: 2.5, perHand: true,
    aliases: ["dumbbell flye", "flat dumbbell fly", "chest fly", "dumbbell fly"] },
  { id: "incline_db_fly", name: "Incline DB fly", patterns: ["chest_iso"], increment: 2.5, perHand: true,
    aliases: ["incline dumbbell flye", "incline fly", "incline dumbbell fly"] },

  // ---------- vertical push ----------
  { id: "ohp", name: "Overhead press", patterns: ["vertical_push"], increment: 2.5, cue: "Squeeze glutes, ribs down.",
    aliases: ["ohp", "military press", "standing press", "barbell shoulder press", "strict press"] },
  { id: "db_shoulder", name: "DB shoulder press", patterns: ["vertical_push"], increment: 2.5, perHand: true,
    aliases: ["seated dumbbell press", "dumbbell overhead press", "dumbbell shoulder press"] },
  { id: "machine_shoulder", name: "Machine shoulder press", patterns: ["vertical_push"], increment: 5,
    aliases: ["shoulder press machine", "seated shoulder press", "machine overhead press"] },
  { id: "kb_press", name: "KB overhead press", patterns: ["vertical_push"], increment: 4, cue: "One bell, each arm in turn. Ribs down, press straight up.",
    aliases: ["kb press", "kettlebell press", "kettlebell overhead press", "single arm kettlebell press"] },
  { id: "arnold_press", name: "Arnold press", patterns: ["vertical_push"], increment: 2.5, perHand: true,
    aliases: ["arnold dumbbell press", "arnolds"] },
  { id: "smith_shoulder_press", name: "Smith machine shoulder press", patterns: ["vertical_push"], increment: 2.5,
    aliases: ["smith shoulder press", "smith overhead press", "smith military press"] },

  { id: "pike_push_up", name: "Pike push-up", patterns: ["vertical_push"], increment: 1, bodyweight: true, holds: true,
    cue: "Hips high. Lower the top of your head toward the floor.",
    aliases: ["pike push up", "pike press", "bodyweight shoulder press"] },
  // Steps on the way to a handstand (see `chains.ts`): offered by the chain,
  // never picked on their own for a slot. The pike push-up above is one too.
  { id: "tripod_knees_elbows", name: "Tripod knees to elbows", patterns: ["vertical_push"], autoSelect: false, increment: 0, bodyweight: true, timed: true,
    seconds: { from: 10, to: 30, step: 5 }, cue: "Head and hands in a triangle. Rest the knees on the elbows.",
    aliases: ["tripod", "tripod balance", "frog stand on head", "tripod knee to elbow"] },
  { id: "tripod_headstand", name: "Tripod headstand", patterns: ["vertical_push"], autoSelect: false, increment: 0, bodyweight: true, timed: true,
    seconds: { from: 10, to: 30, step: 5 }, cue: "From knees on elbows, lift the legs slowly straight up.",
    aliases: ["headstand", "tripod head stand", "head stand"] },
  { id: "wall_walk", name: "Wall walk", patterns: ["vertical_push"], autoSelect: false, increment: 1, bodyweight: true, holds: true,
    cue: "Feet on the wall, walk the hands in. Only as close as you control.",
    aliases: ["wall walks", "wall climb", "wall walk up"] },
  { id: "wall_handstand", name: "Handstand against the wall", patterns: ["vertical_push"], autoSelect: false, increment: 0, bodyweight: true, timed: true,
    seconds: { from: 15, to: 60, step: 5 }, cue: "Chest to the wall, arms straight, push the floor away.",
    aliases: ["wall handstand", "chest to wall handstand", "handstand hold"] },
  { id: "handstand", name: "Handstand", patterns: ["vertical_push"], autoSelect: false, increment: 0, bodyweight: true, timed: true,
    seconds: { from: 5, to: 30, step: 5 }, cue: "Kick up, find the balance through your fingers. Come down any time.",
    aliases: ["freestanding handstand", "free handstand", "handstands"] },
  // ---------- vertical pull ----------
  { id: "pullup", name: "Pull-up", patterns: ["vertical_pull"], increment: 2.5, bodyweight: true, assistable: true, cue: "Chest to bar, full hang each rep.",
    aliases: ["pull up", "pull ups", "pull-ups", "pullups", "assisted pull-up", "assisted pull up"] },
  // Steps on the way to a pull-up (see `chains.ts`): offered by the chain,
  // never picked on their own for a slot.
  { id: "scap_pullup", name: "Scapular pull-up", patterns: ["vertical_pull"], autoSelect: false, increment: 1, bodyweight: true, holds: true,
    cue: "Arms stay straight. Pull your shoulders down, away from your ears.",
    aliases: ["scap pull up", "scap pull-ups", "scapular pull ups", "shoulder blade pull up"] },
  { id: "pullup_negative", name: "Slow-lowering pull-up", patterns: ["vertical_pull"], autoSelect: false, increment: 1, bodyweight: true, holds: true,
    cue: "Start with your chin over the bar. Take five seconds to lower.",
    aliases: ["negative pull up", "pull up negatives", "eccentric pull up", "pull-up negative"] },
  { id: "lat_pulldown", name: "Lat pulldown", patterns: ["vertical_pull"], increment: 5,
    aliases: ["lat pull down", "lat pull-down", "pulldown", "wide grip pulldown", "lat machine"] },
  { id: "chinup", name: "Chin-up", patterns: ["vertical_pull", "biceps"], increment: 2.5, bodyweight: true, assistable: true,
    aliases: ["chin up", "chin ups", "chin-ups", "chinups", "assisted chin-up", "underhand pull-up"] },
  { id: "close_grip_pulldown", name: "Close-grip pulldown", patterns: ["vertical_pull"], increment: 5,
    aliases: ["close grip pulldown", "v-bar pulldown", "v bar pulldown", "neutral grip pulldown"] },
  { id: "machine_pulldown", name: "Machine pulldown", patterns: ["vertical_pull"], increment: 5,
    aliases: ["pulldown machine", "iso-lateral pulldown", "plate loaded pulldown"] },
  { id: "straight_arm_pulldown", name: "Straight-arm pulldown", patterns: ["vertical_pull"], range: HIGH, increment: 2.5,
    cue: "Arms stay straight. Lats, not triceps.",
    aliases: ["straight arm pulldown", "lat pushdown", "cable pullover", "straight arm lat pulldown"] },
  { id: "db_pullover", name: "DB pullover", patterns: ["vertical_pull"], increment: 2.5,
    cue: "Arms long. Lower behind your head until you feel your back stretch.",
    aliases: ["dumbbell pullover", "pullover", "lying pullover"] },

  // ---------- horizontal pull ----------
  { id: "bb_row", name: "BB row", patterns: ["horizontal_pull"], increment: 2.5, cue: "Torso still, pull to navel.",
    aliases: ["bent-over row", "bent over row", "barbell bent-over row", "barbell row"] },
  { id: "cable_row", name: "Seated cable row", patterns: ["horizontal_pull"], increment: 5,
    aliases: ["seated row", "low row", "cable rows", "seated cable rows"] },
  { id: "chest_supported_row", name: "Chest-supported row", patterns: ["horizontal_pull"], increment: 2.5,
    aliases: ["chest supported row", "incline dumbbell row", "lying t-bar row", "seal row"] },
  { id: "machine_row", name: "Row machine", patterns: ["horizontal_pull"], increment: 5,
    aliases: ["machine row", "seated row machine", "iso-lateral row", "plate loaded row"] },
  { id: "db_row", name: "DB row", patterns: ["horizontal_pull"], increment: 2.5, perHand: true, cue: "One arm at a time. Pull to the hip, not the chest.",
    aliases: ["one arm dumbbell row", "single arm dumbbell row", "one arm row", "dumbbell row"] },
  { id: "kb_row", name: "KB row", patterns: ["horizontal_pull"], increment: 4, cue: "One arm at a time. Pull to the hip, not the chest.",
    aliases: ["kettlebell row", "one arm kettlebell row"] },
  { id: "tbar_row", name: "T-bar row", patterns: ["horizontal_pull"], increment: 2.5,
    aliases: ["t bar row", "t-bar", "t bar", "landmine row"] },
  { id: "inverted_row", name: "Inverted row", patterns: ["horizontal_pull"], increment: 1, bodyweight: true, holds: true,
    aliases: ["bodyweight row", "australian pull-up", "australian pull up"] },

  // ---------- squat ----------
  { id: "back_squat", name: "Back squat", patterns: ["squat"], increment: 2.5, cue: "Knees track over toes.",
    aliases: ["squat", "barbell squat", "high bar squat", "low bar squat"] },
  { id: "front_squat", name: "Front squat", patterns: ["squat"], increment: 2.5,
    aliases: ["barbell front squat"] },
  { id: "goblet_squat", name: "Goblet squat", patterns: ["squat"], increment: 2.5,
    aliases: ["dumbbell goblet squat", "db goblet squat"] },
  { id: "kb_goblet_squat", name: "KB goblet squat", patterns: ["squat"], increment: 4, cue: "Bell held by the horns at the chest. Elbows inside the knees.",
    aliases: ["kettlebell goblet squat"] },
  { id: "bw_squat", name: "Bodyweight squat", patterns: ["squat"], increment: 1, bodyweight: true, holds: true,
    cue: "Arms forward, sit down between your heels.",
    aliases: ["air squat", "body weight squat", "squat with no weight"] },
  // Squat-pattern machines: they fill a Squat slot as well as quad work.
  { id: "hack_squat", name: "Hack squat", patterns: ["squat", "quads"], increment: 5,
    aliases: ["hack squat machine", "machine hack squat"] },
  { id: "leg_press", name: "Leg press", patterns: ["squat", "quads"], increment: 5,
    aliases: ["leg press machine", "seated leg press", "45 degree leg press", "sled leg press"] },
  { id: "smith_squat", name: "Smith machine squat", patterns: ["squat", "quads"], increment: 2.5, cue: "Feet a little in front of the bar.",
    aliases: ["smith squat", "smith machine squats"] },

  // ---------- hinge ----------
  { id: "deadlift", name: "Deadlift", patterns: ["hinge"], range: LOW, increment: 2.5, cue: "Bar close, push the floor away.",
    aliases: ["conventional deadlift", "barbell deadlift", "deadlifts", "dl"] },
  { id: "rdl", name: "Romanian deadlift", patterns: ["hinge"], increment: 2.5, cue: "Hips back, slight knee bend.",
    aliases: ["rdl", "romanian dl", "barbell rdl", "stiff leg deadlift", "stiff-legged deadlift", "sldl"] },
  { id: "good_morning", name: "Good morning", patterns: ["hinge"], increment: 2.5,
    aliases: ["good mornings", "barbell good morning"] },
  { id: "hip_thrust", name: "Hip thrust", patterns: ["hinge", "hamstrings"], increment: 2.5,
    aliases: ["barbell hip thrust", "glute thrust", "hip thrusts"] },
  { id: "back_ext", name: "Back extension", patterns: ["hinge", "hamstrings"], increment: 2.5, bodyweight: true,
    aliases: ["hyperextension", "hyperextensions", "back hyper", "45 degree back extension", "roman chair"] },
  { id: "db_rdl", name: "DB Romanian deadlift", patterns: ["hinge", "hamstrings"], increment: 2.5, perHand: true, cue: "Hips back, dumbbells close to the legs.",
    aliases: ["dumbbell romanian deadlift", "db rdl", "dumbbell rdl", "dumbbell stiff leg deadlift"] },
  { id: "kb_rdl", name: "KB Romanian deadlift", patterns: ["hinge", "hamstrings"], increment: 4, cue: "Hips back, the bell close to your legs.",
    aliases: ["kettlebell romanian deadlift", "kb rdl", "kettlebell rdl"] },
  { id: "nordic_curl", name: "Nordic curl", patterns: ["hamstrings"], increment: 1, bodyweight: true, holds: true,
    aliases: ["nordic hamstring curl", "nordics", "nordic"] },
  { id: "kb_swing", name: "KB swing", patterns: ["hinge"], range: HIGH, autoSelect: false, increment: 4, cue: "Snap the hips, arms just guide the bell.",
    aliases: ["kettlebell swing", "russian swing", "kettlebell swings"] },
  { id: "sumo_deadlift", name: "Sumo deadlift", patterns: ["hinge"], range: LOW, increment: 2.5,
    aliases: ["sumo", "sumo dl", "sumo deadlifts"] },
  { id: "trap_bar_deadlift", name: "Trap bar deadlift", patterns: ["hinge"], increment: 2.5,
    aliases: ["hex bar deadlift", "trap bar", "hex bar", "trap bar dl"] },
  { id: "glute_bridge", name: "Glute bridge", patterns: ["hinge", "hamstrings"], increment: 2.5, bodyweight: true,
    aliases: ["hip bridge", "barbell glute bridge", "glute bridges", "bridge"] },
  { id: "cable_pull_through", name: "Cable pull-through", patterns: ["hinge"], increment: 5,
    aliases: ["cable pull through", "pull through", "pull-through", "rope pull-through"] },
  { id: "single_leg_rdl", name: "Single-leg Romanian deadlift", patterns: ["hinge", "hamstrings"], increment: 2.5, perHand: true,
    cue: "Hips square, free leg reaches back.",
    aliases: ["single leg rdl", "single-leg rdl", "single leg deadlift", "one leg rdl", "sl rdl"] },

  // ---------- lunge / single leg ----------
  { id: "bulgarian", name: "Bulgarian split squat", patterns: ["lunge", "quads"], increment: 2.5, perHand: true,
    aliases: ["bss", "rear foot elevated split squat", "rfess", "bulgarians"] },
  { id: "walking_lunge", name: "Walking lunge", patterns: ["lunge", "quads"], increment: 2.5, perHand: true,
    aliases: ["lunges", "dumbbell lunge", "walking lunges"] },
  { id: "step_up", name: "Step-up", patterns: ["lunge", "quads"], increment: 2.5, perHand: true,
    aliases: ["step up", "step ups", "step-ups", "box step-up"] },
  { id: "reverse_lunge", name: "Reverse lunge", patterns: ["lunge", "quads"], increment: 2.5, perHand: true,
    aliases: ["reverse lunges", "dumbbell reverse lunge", "step back lunge", "rear lunge"] },
  { id: "split_squat", name: "Split squat", patterns: ["lunge", "quads"], increment: 2.5, perHand: true,
    aliases: ["split squats", "static lunge", "stationary lunge", "dumbbell split squat"] },
  { id: "bw_split_squat", name: "Bodyweight split squat", patterns: ["lunge", "quads"], increment: 1, bodyweight: true, holds: true,
    cue: "Arms at your sides. Drop the back knee straight down.",
    aliases: ["body weight split squat", "split squat with no weight", "bodyweight static lunge"] },

  // ---------- quads / hams isolation ----------
  { id: "leg_ext", name: "Leg extension", patterns: ["quads"], increment: 5,
    aliases: ["leg extension machine", "leg extensions", "quad extension"] },
  { id: "leg_curl", name: "Leg curl", patterns: ["hamstrings"], range: HIGH, increment: 5,
    aliases: ["lying leg curl", "leg curl machine", "hamstring curl", "prone leg curl"] },
  { id: "seated_leg_curl", name: "Seated leg curl", patterns: ["hamstrings"], range: HIGH, increment: 5,
    aliases: ["seated hamstring curl", "leg curl machine", "seated leg curls"] },
  // The hip machines and the glute kickback. There is no glute or adductor
  // type, so they sit with the other hip work under Hamstrings, beside the hip
  // thrust and the leg curl, rather than turning up as a swap for a squat.
  { id: "hip_abduction", name: "Hip abduction", patterns: ["hamstrings"], range: HIGH, increment: 5,
    aliases: ["abductor machine", "abduction machine", "hip abductor", "outer thigh machine", "abductors"] },
  { id: "hip_adduction", name: "Hip adduction", patterns: ["hamstrings"], range: HIGH, increment: 5,
    aliases: ["adductor machine", "adduction machine", "hip adductor", "inner thigh machine", "adductors"] },
  { id: "cable_kickback", name: "Cable glute kickback", patterns: ["hamstrings"], range: HIGH, increment: 2.5,
    cue: "Ankle strap, low pulley. One leg at a time.",
    aliases: ["glute kickback", "cable kickback", "glute kickback machine"] },

  // ---------- shoulders ----------
  { id: "lateral_raise", name: "Lateral raise", patterns: ["shoulders"], increment: 2.5, perHand: true,
    aliases: ["side raise", "side lateral raise", "lat raise", "dumbbell lateral raise", "lateral raises"] },
  { id: "rear_delt_fly", name: "Rear delt fly", patterns: ["shoulders"], increment: 2.5, perHand: true,
    aliases: ["reverse fly", "rear delt raise", "bent-over reverse fly", "dumbbell reverse fly"] },
  { id: "face_pull", name: "Face pull", patterns: ["shoulders", "horizontal_pull"], increment: 5,
    aliases: ["face pulls", "rope face pull"] },
  { id: "cable_lateral_raise", name: "Cable lateral raise", patterns: ["shoulders"], increment: 2.5, cue: "One arm at a time, cable across the body.",
    aliases: ["cable side raise", "cable lat raise", "single arm cable lateral raise"] },
  { id: "machine_lateral_raise", name: "Machine lateral raise", patterns: ["shoulders"], increment: 5,
    aliases: ["lateral raise machine", "side raise machine", "lateral delt machine"] },
  { id: "front_raise", name: "Front raise", patterns: ["shoulders"], increment: 2.5, perHand: true,
    aliases: ["dumbbell front raise", "front raises", "front delt raise", "plate front raise"] },
  { id: "upright_row", name: "Upright row", patterns: ["shoulders"], increment: 2.5, cue: "Stop at chest height.",
    aliases: ["upright rows", "barbell upright row", "ez bar upright row"] },
  { id: "reverse_fly_machine", name: "Reverse fly machine", patterns: ["shoulders"], increment: 5,
    aliases: ["reverse pec deck", "rear delt machine", "rear delt fly machine", "reverse machine fly"] },
  { id: "cable_rear_delt_fly", name: "Cable rear delt fly", patterns: ["shoulders"], increment: 2.5,
    aliases: ["cable reverse fly", "cable rear delt", "reverse cable crossover"] },
  // Shrugs work the traps: shoulder-girdle work with no row in it, so they sit
  // with the raises rather than turning up as a swap for the day's row.
  { id: "db_shrug", name: "DB shrug", patterns: ["shoulders"], increment: 2.5, perHand: true,
    aliases: ["dumbbell shrug", "shrug", "shrugs", "dumbbell shrugs", "trap shrug"] },
  { id: "bb_shrug", name: "BB shrug", patterns: ["shoulders"], increment: 2.5,
    aliases: ["barbell shrug", "shrug", "shrugs", "barbell shrugs"] },

  // ---------- biceps ----------
  { id: "db_curl", name: "DB curl", patterns: ["biceps"], increment: 2.5, perHand: true,
    aliases: ["bicep curl", "biceps curl", "dumbbell curl", "alternating curl"] },
  { id: "kb_curl", name: "KB curl", patterns: ["biceps"], increment: 4, cue: "Both hands on the handle. Elbows still.",
    aliases: ["kettlebell curl", "kettlebell bicep curl"] },
  { id: "bb_curl", name: "BB curl", patterns: ["biceps"], increment: 2.5, cue: "Elbows pinned, no swing.",
    aliases: ["bicep curl", "biceps curl", "standing barbell curl", "barbell curl"] },
  { id: "hammer_curl", name: "Hammer curl", patterns: ["biceps"], increment: 2.5, perHand: true,
    aliases: ["hammer curls", "dumbbell hammer curl", "neutral grip curl"] },
  { id: "cable_curl", name: "Cable curl", patterns: ["biceps"], increment: 2.5,
    aliases: ["cable bicep curl", "cable biceps curl", "straight bar cable curl"] },
  { id: "spider_curl", name: "Spider curl", patterns: ["biceps"], increment: 2.5, perHand: true, cue: "Chest on the incline, arms straight down. No swing.",
    aliases: ["incline prone curl", "chest supported curl"] },
  { id: "preacher_curl", name: "Preacher curl", patterns: ["biceps"], increment: 2.5,
    aliases: ["ez bar preacher curl", "scott curl", "preacher curls", "preacher bench curl"] },
  { id: "ez_bar_curl", name: "EZ-bar curl", patterns: ["biceps"], increment: 2.5,
    aliases: ["ez bar curl", "ez curl", "ez bar bicep curl", "cambered bar curl"] },
  { id: "incline_db_curl", name: "Incline DB curl", patterns: ["biceps"], increment: 2.5, perHand: true,
    aliases: ["incline curl", "incline bicep curl", "incline dumbbell curl", "seated incline curl"] },
  { id: "concentration_curl", name: "Concentration curl", patterns: ["biceps"], increment: 2.5, perHand: true,
    cue: "One arm at a time, elbow braced on the thigh.",
    aliases: ["concentration curls", "seated concentration curl"] },
  { id: "machine_curl", name: "Machine curl", patterns: ["biceps"], increment: 5,
    aliases: ["bicep curl machine", "biceps curl machine", "curl machine", "machine preacher curl"] },
  { id: "cable_hammer_curl", name: "Cable hammer curl", patterns: ["biceps"], increment: 2.5,
    aliases: ["rope hammer curl", "rope curl", "cable rope curl"] },
  { id: "reverse_curl", name: "Reverse curl", patterns: ["biceps"], increment: 2.5,
    aliases: ["reverse grip curl", "overhand curl", "reverse barbell curl", "reverse ez bar curl"] },

  // ---------- triceps ----------
  { id: "pushdown", name: "Triceps pushdown", patterns: ["triceps"], increment: 2.5,
    aliases: ["tricep pushdown", "triceps pressdown", "tricep pressdown", "cable pushdown", "bar pushdown"] },
  { id: "overhead_ext", name: "Overhead triceps extension", patterns: ["triceps"], increment: 2.5, perHand: true,
    aliases: ["overhead tricep extension", "overhead extension", "dumbbell overhead extension", "seated triceps extension"] },
  { id: "skullcrusher", name: "Skullcrusher", patterns: ["triceps"], increment: 2.5,
    aliases: ["skull crusher", "skull crushers", "lying triceps extension", "ez bar skullcrusher", "french press"] },
  { id: "kickback", name: "Triceps kickback", patterns: ["triceps"], increment: 2.5, perHand: true, cue: "Upper arm pinned to your side, straighten from the elbow.",
    aliases: ["tricep kickback", "dumbbell kickback"] },
  { id: "rope_pushdown", name: "Rope pushdown", patterns: ["triceps"], increment: 2.5,
    aliases: ["rope pressdown", "tricep rope pushdown", "triceps rope pushdown", "rope triceps extension"] },
  { id: "cable_overhead_ext", name: "Cable overhead extension", patterns: ["triceps"], increment: 2.5,
    aliases: ["overhead cable extension", "cable overhead triceps extension", "overhead rope extension"] },
  { id: "seated_dip", name: "Seated dip machine", patterns: ["triceps"], increment: 5,
    aliases: ["dip machine", "seated dip", "tricep dip machine", "triceps press machine"] },
  { id: "bench_dip", name: "Bench dip", patterns: ["triceps"], increment: 1, bodyweight: true, holds: true,
    aliases: ["bench dips", "tricep dips", "triceps dips", "chair dip"] },

  // ---------- calves ----------
  { id: "calf_raise", name: "Standing calf raise", patterns: ["calves"], increment: 5,
    aliases: ["calf raises", "calf raise machine", "standing calf machine"] },
  { id: "seated_calf", name: "Seated calf raise", patterns: ["calves"], increment: 5,
    aliases: ["seated calf machine", "seated calf raises"] },
  { id: "leg_press_calf", name: "Leg press calf raise", patterns: ["calves"], increment: 5,
    aliases: ["calf press", "leg press calf press"] },
  { id: "single_leg_calf_raise", name: "Single-leg calf raise", patterns: ["calves"], increment: 2.5, bodyweight: true,
    aliases: ["single leg calf raise", "one leg calf raise", "dumbbell calf raise", "step calf raise"] },

  // ---------- jumps ----------
  // Explosive, unloaded. Progress these by height or distance, not by weight.
  { id: "box_jump", name: "Box jump", patterns: ["jump"], increment: 0, unloaded: true, cue: "Land soft, step back down.",
    aliases: ["box jumps"] },
  { id: "broad_jump", name: "Broad jump", patterns: ["jump"], increment: 0, unloaded: true, cue: "Reach with the hips, stick the landing.",
    aliases: ["standing long jump", "broad jumps"] },
  { id: "depth_jump", name: "Depth jump", patterns: ["jump"], increment: 0, unloaded: true, cue: "Off the box, rebound instantly.",
    aliases: ["drop jump"] },
  { id: "jump_squat", name: "Jump squat", patterns: ["jump"], increment: 0, unloaded: true, cue: "Every rep as high as the first.",
    aliases: ["squat jump", "squat jumps"] },
  // A throw rather than a jump, but the same job: explosive, nothing to track.
  { id: "med_ball_slam", name: "Medicine ball slam", patterns: ["jump"], increment: 0, unloaded: true, cue: "Every slam as hard as the first.",
    aliases: ["med ball slam", "ball slam", "ball slams", "slam ball"] },

  // ---------- speed work ----------
  // Submaximal weight moved fast. The weight is derived from the heavy day's
  // working weight rather than tracked on its own — see `derive` in split.ts.
  { id: "speed_squat", name: "Speed squat", patterns: ["squat"], increment: 2.5, restricted: true, cue: "Fast up, controlled down." },
  { id: "speed_deadlift", name: "Speed deadlift", patterns: ["hinge"], increment: 2.5, restricted: true, cue: "Accelerate through the whole pull." },

  // ---------- abs ----------
  // Grip and shoulders as much as abs; 10 seconds is a fair start, and five
  // more each time you own it, up to a full minute.
  { id: "dead_hang", name: "Dead hang", patterns: ["abs"], increment: 0, bodyweight: true, timed: true,
    seconds: { from: 10, to: 60, step: 5 }, cue: "Arms straight, shoulders gently down. Breathe.",
    aliases: ["hang", "bar hang", "passive hang", "dead hangs"] },
  { id: "hanging_leg_raise", name: "Hanging leg raise", patterns: ["abs"], increment: 1, bodyweight: true, holds: true,
    aliases: ["hanging knee raise", "hanging leg raises", "hanging leg lift"] },
  // Retired: the same machine as ab_machine below. Kept, disabled, so any
  // record that points at it still resolves.
  { id: "rotation_machine", name: "Rotation machine", patterns: ["abs"], increment: 5, enabled: false, cue: "Turn from the ribs, hips still. Both directions." },
  { id: "cable_crunch", name: "Cable crunch", patterns: ["abs"], increment: 5,
    aliases: ["kneeling cable crunch", "rope crunch", "cable crunches"] },
  // Seated twist against a stack — rotation rather than flexion, so it earns
  // its place next to the crunches rather than duplicating one.
  { id: "ab_machine", name: "Rotary torso machine", patterns: ["abs"], increment: 5, cue: "Turn from the ribs, hips still. Both directions.",
    aliases: ["torso rotation machine", "rotation machine", "oblique machine", "torso twist"] },
  { id: "hollow_hold", name: "Hollow hold", patterns: ["abs"], range: { min: 4, max: 8 }, increment: 0, bodyweight: true, timed: true, cue: "Lower back stays against the floor.",
    aliases: ["hollow body hold", "hollow body", "hollow holds"] },
  { id: "plank", name: "Plank", patterns: ["abs"], increment: 0, bodyweight: true, timed: true,
    aliases: ["front plank", "forearm plank", "planks"] },
  { id: "crunch", name: "Crunch", patterns: ["abs"], increment: 2.5, bodyweight: true,
    aliases: ["crunches", "ab crunch", "floor crunch"] },
  { id: "machine_crunch", name: "Ab crunch machine", patterns: ["abs"], increment: 5,
    aliases: ["crunch machine", "machine crunch", "abdominal machine", "seated crunch machine"] },
  { id: "decline_situp", name: "Decline sit-up", patterns: ["abs"], increment: 2.5, bodyweight: true,
    aliases: ["decline sit up", "decline situp", "sit-up", "sit up", "sit ups", "decline crunch"] },
  { id: "ab_wheel", name: "Ab wheel", patterns: ["abs"], increment: 1, bodyweight: true, holds: true, cue: "Only roll out as far as your back stays flat.",
    aliases: ["ab wheel rollout", "ab rollout", "ab roller", "rollout", "wheel rollout"] },
  { id: "lying_leg_raise", name: "Lying leg raise", patterns: ["abs"], increment: 1, bodyweight: true, holds: true,
    aliases: ["leg raises", "lying leg raises", "floor leg raise", "bench leg raise"] },
  { id: "captains_chair", name: "Captain's chair knee raise", patterns: ["abs"], increment: 1, bodyweight: true, holds: true,
    aliases: ["captains chair", "captain's chair", "knee raise", "vertical knee raise", "roman chair leg raise"] },
  { id: "russian_twist", name: "Russian twist", patterns: ["abs"], increment: 2.5, bodyweight: true,
    aliases: ["russian twists", "seated twist", "plate twist"] },
  { id: "side_plank", name: "Side plank", patterns: ["abs"], increment: 0, bodyweight: true, timed: true, cue: "Hold each side.",
    aliases: ["side planks", "lateral plank"] },
  // Cable core work that resists or makes a turn, like the rotary machine.
  { id: "pallof_press", name: "Pallof press", patterns: ["abs"], increment: 2.5, cue: "Don't let it turn you. Both sides.",
    aliases: ["pallof", "anti-rotation press", "cable pallof press"] },
  { id: "woodchop", name: "Cable woodchop", patterns: ["abs"], increment: 2.5, cue: "Turn from the ribs, arms long. Both sides.",
    aliases: ["wood chop", "woodchopper", "wood chopper", "cable chop"] },

  // Movement-first expansion: every entry has a source-checked guide in reviewed-guides.ts.
  { id: "wall_push_up", name: "Wall push-up", patterns: ["horizontal_push"], autoSelect: false, increment: 1, bodyweight: true, holds: true,
    aliases: ["wall press up", "wall pushup"] },
  { id: "incline_push_up", name: "Incline push-up", patterns: ["horizontal_push"], autoSelect: false, increment: 1, bodyweight: true, holds: true,
    aliases: ["elevated push up", "hands elevated push up", "bench push up"] },
  { id: "knee_push_up", name: "Knee push-up", patterns: ["horizontal_push"], autoSelect: false, increment: 1, bodyweight: true, holds: true,
    aliases: ["bent knee push up", "modified push up", "kneeling push up"] },
  { id: "decline_push_up", name: "Decline push-up", patterns: ["horizontal_push"], autoSelect: false, increment: 1, bodyweight: true, holds: true,
    aliases: ["feet elevated push up", "decline pushup"] },
  { id: "sit_to_stand", name: "Sit-to-stand", patterns: ["squat"], autoSelect: false, increment: 1, bodyweight: true, holds: true,
    aliases: ["chair stand", "chair squat", "stand from chair"] },
  { id: "supported_squat", name: "Supported mini-squat", patterns: ["squat"], autoSelect: false, increment: 1, bodyweight: true, holds: true,
    aliases: ["chair supported squat", "mini squat"] },
  { id: "dead_bug", name: "Dead bug", patterns: ["abs"], movements: ["anti_extension"], muscles: ["abs", "obliques"],
    autoSelect: false, increment: 1, bodyweight: true, holds: true, aliases: ["deadbug", "alternating dead bug"] },
  { id: "bird_dog", name: "Bird dog", patterns: ["abs"], movements: ["anti_rotation"], muscles: ["abs", "obliques", "glutes", "lower_back"],
    autoSelect: false, increment: 1, bodyweight: true, holds: true, aliases: ["birddog", "quadruped opposite arm leg raise"] },
  { id: "db_front_squat", name: "DB front squat", patterns: ["squat"], autoSelect: false, increment: 2.5, perHand: true, startWeight: 2.5,
    aliases: ["dumbbell front squat", "double dumbbell squat"] },
  { id: "kb_deadlift", name: "KB deadlift", patterns: ["hinge"], autoSelect: false, increment: 4, startWeight: 4,
    aliases: ["kettlebell deadlift", "kettlebell floor deadlift"] },
  { id: "ball_hamstring_curl", name: "Stability ball hamstring curl", patterns: ["hamstrings"], movements: ["knee_flexion"],
    muscles: ["hamstrings", "glutes"], autoSelect: false, increment: 1, bodyweight: true, holds: true,
    aliases: ["swiss ball leg curl", "exercise ball leg curl", "stability ball leg curl"] },
  { id: "suspension_row", name: "Suspension row", patterns: ["horizontal_pull"], autoSelect: false, increment: 1, bodyweight: true, holds: true,
    aliases: ["trx row", "suspension trainer row", "trx back row"] },
  // Carries use the existing timed-set ladder (seconds) and track kg separately.
  { id: "farmer_carry", name: "DB farmer’s carry", patterns: ["carry", "abs"], movements: ["carry"], muscles: ["forearms", "abs", "upper_back"],
    autoSelect: false, increment: 2.5, perHand: true, timed: true, startWeight: 7.5,
    aliases: ["farmers walk", "farmer carry", "dumbbell loaded carry", "farmer's carry"] },
  { id: "suitcase_carry", name: "DB suitcase carry", patterns: ["carry", "abs"], movements: ["carry", "lateral_stability"], muscles: ["forearms", "obliques"],
    autoSelect: false, increment: 2.5, timed: true, startWeight: 7.5, aliases: ["suitcase walk", "single arm loaded carry", "dumbbell suitcase carry"] },
  // The PPLPPL plan's kettlebell and dumbbell lifts — see `data/plans.ts`.
  { id: "double_kb_press", name: "Double KB overhead press", patterns: ["vertical_push"], autoSelect: false, increment: 4, perHand: true, startWeight: 8,
    cue: "Both bells in the rack. Ribs down, press straight up.", aliases: ["double kb press", "double kettlebell press", "double kettlebell overhead press", "double kettlebell military press"] },
  { id: "deficit_push_up", name: "Deficit push-up", patterns: ["horizontal_push"], autoSelect: false, increment: 1, bodyweight: true, holds: true,
    cue: "Hands on two dumbbells. Chest sinks below your hands.", aliases: ["deficit pushup", "push-up on dumbbells", "dumbbell push up"] },
  { id: "turkish_get_up", name: "Turkish get-up", patterns: ["vertical_push"], range: { min: 1, max: 2 }, autoSelect: false, increment: 4, startWeight: 8,
    cue: "Eyes on the bell, arm straight, all the way up and back down.", aliases: ["tgu", "get up", "get-up", "kettlebell get up"] },
  { id: "db_bent_over_row", name: "DB bent-over row", patterns: ["horizontal_pull"], autoSelect: false, increment: 2.5, perHand: true,
    cue: "Both arms at once. Flat back, pull to the hips.", aliases: ["two arm dumbbell row", "dumbbell bent over row", "bent over dumbbell row"] },
  { id: "kb_high_pull", name: "KB high pull", patterns: ["horizontal_pull"], autoSelect: false, increment: 4, startWeight: 12,
    cue: "Hips drive the bell; the elbow pulls it back, high and close.", aliases: ["kettlebell high pull", "kettlebell sumo high pull"] },
  { id: "twisting_knee_raise", name: "Hanging knee raise with a twist", patterns: ["abs"], autoSelect: false, increment: 1, bodyweight: true, holds: true,
    cue: "Knees up toward one side, then the other.", aliases: ["twisting hanging knee raise", "oblique hanging knee raise", "hanging oblique raise"] },
  { id: "single_leg_ext", name: "Single-leg extension", patterns: ["quads"], autoSelect: false, increment: 5,
    cue: "One leg at a time, same weight both sides.", aliases: ["single leg extension", "one leg extension", "single leg knee extension"] },
  { id: "double_kb_front_squat", name: "Double KB front squat", patterns: ["squat"], autoSelect: false, increment: 4, perHand: true, startWeight: 12,
    cue: "Both bells in the rack, elbows under them. Hips drop straight down.", aliases: ["double kettlebell front squat", "kettlebell front squat"] },
  // Kettlebell Flow's one-bell lifts — see `data/plans.ts`.
  { id: "kb_single_leg_rdl", name: "One-arm, one-leg KB deadlift", patterns: ["hinge", "hamstrings"], autoSelect: false, increment: 4, startWeight: 8,
    cue: "One bell, in the hand opposite the standing leg. Hips square.",
    aliases: ["single leg kettlebell deadlift", "single arm single leg deadlift", "kettlebell single leg rdl", "kb single leg rdl"] },
  // Marched with high knees, forward and back. A minute each side, every set:
  // the bell gets heavier, the minute stays.
  { id: "kb_suitcase_carry", name: "KB suitcase carry", patterns: ["carry", "abs"], movements: ["carry", "lateral_stability"], muscles: ["forearms", "obliques"],
    autoSelect: false, increment: 4, timed: true, seconds: { from: 60, to: 60, step: 5 }, startWeight: 12,
    aliases: ["kettlebell suitcase carry", "one arm kettlebell carry", "suitcase walk", "suitcase march", "high knee carry"] },
];

/** Frozen batch: Kettlebell Flow's one-bell lifts, new in save version 27. */
export const KB_FLOW_IDS = ["kb_single_leg_rdl", "kb_suitcase_carry"];

/** Frozen batch: the PPLPPL plan's lifts, new in save version 22. */
export const PPLPPL_IDS = [
  "double_kb_press", "deficit_push_up", "turkish_get_up", "db_bent_over_row", "kb_high_pull",
  "twisting_knee_raise", "single_leg_ext", "double_kb_front_squat",
];

/** Frozen batch: the handstand and its steps, new in save version 24. */
export const HANDSTAND_IDS = ["tripod_knees_elbows", "tripod_headstand", "wall_walk", "wall_handstand", "handstand"];

/** Frozen batch: the steps to a pull-up, new in save version 21. */
export const PULLUP_STEP_IDS = ["scap_pullup", "pullup_negative"];

/** Frozen batch for save migration: new library entries must not clutter old catalogues. */
export const MOVEMENT_EXPANSION_IDS = [
  "wall_push_up", "incline_push_up", "knee_push_up", "decline_push_up", "sit_to_stand", "supported_squat",
  "dead_bug", "bird_dog", "db_front_squat", "kb_deadlift", "ball_hamstring_curl", "suspension_row", "farmer_carry", "suitcase_carry",
];

/**
 * The starting catalogue: what the starting program names, plus a common
 * alternative or two for each job, so every slot has something to swap to.
 * "Each job" means each slot's movement type: a slot only offers exercises of
 * its own type, so a leg curl is no alternative for a Hinge slot. Beyond
 * that, the machines and moves found in any gym — a pec deck, a push-up, a
 * crunch — so the lifts most people already do are there from the start.
 *
 * Everything else in `EXERCISES` above is the *library* — not in your
 * catalogue, but one tap away from the + on each group. The app opens with
 * a short list rather than every variation it knows, and grows only where
 * you decide it should.
 *
 * This is a starting point, not a rule. It seeds `hidden` on first launch —
 * and, for a lift added in an update, once on that update — and is never
 * consulted again, so anything you add stays added.
 */
export const LEAN: string[] = [
  // Push — the program's presses, plus one or two to swap to for each
  "db_bench",
  "bench",
  "incline_db_press",
  "db_shoulder",
  "machine_shoulder",
  "cable_crossover",
  "cable_fly",
  "lateral_raise",
  "dips",
  "pushdown",
  "overhead_ext",
  "push_up",
  "incline_push_up",
  "pec_deck",
  "cable_lateral_raise",
  "reverse_fly_machine",
  "db_shrug",
  "rope_pushdown",
  // Pull
  "pullup",
  "lat_pulldown",
  "bb_row",
  "machine_row",
  "db_row",
  "cable_row",
  "face_pull",
  "bb_curl",
  "db_curl",
  "hammer_curl",
  "tbar_row",
  "preacher_curl",
  // Legs
  "back_squat",
  "goblet_squat",
  "leg_press",
  "rdl",
  "db_rdl",
  "bulgarian",
  "walking_lunge",
  "split_squat",
  "leg_ext",
  "leg_curl",
  "calf_raise",
  "smith_squat",
  "glute_bridge",
  "seated_leg_curl",
  "hip_abduction",
  // Core
  "dead_hang",
  "hanging_leg_raise",
  "ab_machine",
  "machine_crunch",
  "cable_crunch",
  "plank",
  "dead_bug",
  "farmer_carry",
  "crunch",
  "ab_wheel",
];

/** Built-in lifts that start in the library — everything not in `LEAN`. */
export const leanHiddenExercises = (): string[] =>
  EXERCISES.filter((e) => !LEAN.includes(e.id)).map((e) => e.id);

/**
 * Which muscle group a pattern belongs to. The library browses by muscle —
 * you look under Shoulders for an overhead press — while slots still match on
 * the finer pattern underneath.
 */
const GROUP_BY_PATTERN: Record<Pattern, Group> = {
  horizontal_push: "chest",
  chest_iso: "chest",
  vertical_push: "shoulders",
  horizontal_pull: "back",
  vertical_pull: "back",
  squat: "quads",
  hinge: "hamstrings",
  lunge: "quads",
  quads: "quads",
  hamstrings: "hamstrings",
  calves: "calves",
  shoulders: "shoulders",
  biceps: "arms",
  triceps: "arms",
  abs: "core",
  carry: "core",
  jump: "explosive",
};

export const GROUP_LABEL: Record<Group, string> = {
  chest: "Chest",
  back: "Back",
  shoulders: "Shoulders",
  arms: "Arms",
  quads: "Quads & squats",
  hamstrings: "Hamstrings & hinge",
  calves: "Calves",
  core: "Core",
  explosive: "Explosive",
};

/** The order groups appear in the library. */
export const GROUP_ORDER: Group[] = [
  "chest",
  "back",
  "shoulders",
  "arms",
  "quads",
  "hamstrings",
  "calves",
  "core",
  "explosive",
];

/** The group an exercise belongs to, taken from its first pattern. */
export const groupOf = (ex: Exercise): Group =>
  ex.group ?? GROUP_BY_PATTERN[ex.patterns[0]];

/**
 * How the exercise list is browsed: the split you train in. Worked out from
 * movement types, so an exercise spanning two — a face pull is shoulder work
 * and a row — is listed under both.
 */
export type Category = "push" | "pull" | "legs" | "core";

const CATEGORY_BY_PATTERN: Record<Pattern, Category> = {
  horizontal_push: "push",
  vertical_push: "push",
  chest_iso: "push",
  triceps: "push",
  shoulders: "push",
  horizontal_pull: "pull",
  vertical_pull: "pull",
  biceps: "pull",
  squat: "legs",
  hinge: "legs",
  lunge: "legs",
  quads: "legs",
  hamstrings: "legs",
  calves: "legs",
  jump: "legs",
  abs: "core",
  carry: "core",
};

export const CATEGORY_LABEL: Record<Category, string> = {
  push: "Push",
  pull: "Pull",
  legs: "Legs",
  core: "Core",
};

/** Every category an exercise belongs to, from all of its movement types. */
export const categoriesOf = (ex: Exercise): Category[] => [
  ...new Set(ex.patterns.map((p) => CATEGORY_BY_PATTERN[p])),
];

/** Whether an exercise counts as a given movement type. */
export const isPattern = (ex: Exercise, pattern: Pattern): boolean =>
  ex.patterns.includes(pattern);

/** Human-readable heading for each pattern, used by the exercise library. */
export const PATTERN_LABEL: Record<Pattern, string> = {
  horizontal_push: "Horizontal press",
  chest_iso: "Chest isolation",
  vertical_push: "Vertical press",
  horizontal_pull: "Horizontal pull",
  vertical_pull: "Vertical pull",
  squat: "Squat",
  hinge: "Hinge",
  lunge: "Lunge",
  quads: "Quads",
  hamstrings: "Hamstrings",
  calves: "Calves",
  shoulders: "Shoulders",
  biceps: "Biceps",
  triceps: "Triceps",
  abs: "Abs",
  carry: "Carry",
  jump: "Explosive",
};

export const PATTERN_ORDER: Pattern[] = [
  "horizontal_push",
  "chest_iso",
  "vertical_push",
  "horizontal_pull",
  "vertical_pull",
  "squat",
  "hinge",
  "lunge",
  "quads",
  "hamstrings",
  "calves",
  "shoulders",
  "biceps",
  "triceps",
  "abs",
  "carry",
  "jump",
];

/**
 * Small muscles do their best work on ten reps or more: six heavy reps on a
 * pushdown or a crunch is all strain and little growth. An exercise counts by
 * its main movement type, so dips and close-grip bench — presses first,
 * triceps second — can still go down to six, and so can chin-ups. Chest
 * flies and leg extensions are the same kind of work for bigger muscles, so
 * they count too. Planks and other timed holds keep their seconds. A lift
 * with a `range` of its own uses that instead.
 */
const HIGH_REP_PATTERNS: Pattern[] = ["triceps", "biceps", "shoulders", "calves", "abs", "chest_iso", "quads"];

export const highReps = (ex: Exercise): boolean =>
  !ex.timed && !ex.unloaded && HIGH_REP_PATTERNS.includes(ex.patterns[0]);

/**
 * Exercises you have added, kept here so `byId` resolves them everywhere
 * without threading session state through every call site. The store keeps
 * this in sync; nothing else should write to it.
 */
let customExercises: Exercise[] = [];

export const setCustomExercises = (list: Exercise[]) => {
  customExercises = list;
};

/**
 * Your changes to an exercise — its name, its weight step, where it starts — kept apart from
 * the definition, so a built-in keeps its id and history and its original
 * values stay underneath. Kept in sync by the store, like the custom list.
 */
export type ExerciseEdit = { name?: string; increment?: number; startWeight?: number };

let exerciseEdits: Record<string, ExerciseEdit> = {};

export const setExerciseEdits = (edits: Record<string, ExerciseEdit>) => {
  exerciseEdits = edits;
};

/** An exercise as you have it: its definition with your edits on top. */
export const withEdits = (ex: Exercise): Exercise => {
  const edit = exerciseEdits[ex.id];
  return edit ? { ...ex, ...edit } : ex;
};

export const byId = (id: string): Exercise | undefined => {
  const ex = EXERCISES.find((e) => e.id === id) ?? customExercises.find((e) => e.id === id);
  return ex && withEdits(ex);
};

/**
 * A name as it reads mid-sentence: "First go at the DB bench press." Lower
 * case, but the gym's shorthand keeps its capitals — DB, BB, KB.
 */
export const inSentence = (name: string) =>
  name.replace(/\S+/g, (word) => (/^[A-Z]{2,}$/.test(word) ? word : word.toLowerCase()));
