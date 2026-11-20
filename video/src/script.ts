/**
 * The intro film, line by line: what the body says, and what is shown while
 * it says it. One clay story (see SCRIPT.md, draft 11): the body talks to its
 * person — it remembers playing, it's learning to sit, it wants to move — then
 * the gym, the fear, the app, and the walk home. It ends on the clay K.
 *
 * The voice is one take (`npm run voice`), so its timing is real: every line's
 * start and end, and every word's, are in public/voice/film.json. A scene
 * starts a little before its line and runs until the next one; shots and
 * poses inside it are cued to a word, so a new take never breaks the timing.
 *
 * Pictures: art/clay/<id>-<n>.png, copied to public/clay by `npm run pictures`.
 */

/** When something happens inside a line: seconds after the line starts, or at a word (plus a nudge). */
export type Cue = number | { word: string; plus?: number };

/** One clay scene: its poses flip like stop-motion while the camera drifts. */
export type ClayShot = {
  kind: "clay";
  id: string;
  /** Pose n from a cue on. The first is in place from the shot's start. */
  poses: { n: number; at: Cue }[];
  /** Keep flipping between the poses, every this many seconds (a run, a swing). */
  cycle?: number;
  /** Fade between poses over this many seconds instead of cutting (sinking into the chair). */
  melt?: number;
  /** The camera: from scale to scale, centred on a point of the picture (0–1 across, 0–1 down). */
  zoom?: [number, number];
  focus?: [number, number];
  /** Moves across the frame, px a second (a runner); with a hop on every step. */
  travel?: number;
  hop?: boolean;
  /** The warm light of the walk home. */
  dusk?: boolean;
};

/** The app on the phone, full size, opening out of the phone in his hands. */
export type AppShot = { kind: "today" } | { kind: "lift" };

/** The clay K: the ball shaped into the letter (public/logo/klay-k.mp4), then the name and the line. */
export type LogoShot = { kind: "logo" };

export type Shot = (ClayShot | AppShot | LogoShot) & {
  /** When the shot comes in; the scene's start if left out. */
  from?: Cue;
};

export type Scene = {
  id: string;
  /** Said, and shown as the caption. */
  line: string;
  shots: Shot[];
  /** How long the picture is up before the line starts, in seconds. */
  lead?: number;
};

/** The app's page and ink (PAPER in src/constants/theme.ts). */
export const PAPER = "#FCFCFA";
export const INK = "#1C1C1A";
export const MUTED = "#5C5B55";
/** Legs, on a dusk card (DUSK, DUSK_INK in src/constants/theme.ts): the day's lift is a light goblet squat. */
export const DUSK = { top: "#5B2F8C", foot: "#1A1030", glow: "#B987FF" };
export const CREAM = "#F3E9D6";
export const CREAM_SOFT = "#F3E9D6CC";

const at = (word: string, plus = 0): Cue => ({ word, plus });

export const SCENES: Scene[] = [
  {
    id: "hello",
    line: "Hey. It's me. Your body.",
    lead: 0.9,
    shots: [{ kind: "clay", id: "body_hello", poses: [{ n: 0, at: 0 }, { n: 1, at: at("Hey", 0.1) }, { n: 0, at: at("body", 0.4) }], zoom: [1.0, 1.12], focus: [0.5, 0.35] }],
  },
  {
    id: "remember",
    line: "Remember when we used to climb everything? Run for no reason? Hang upside down until dinner?",
    shots: [
      { kind: "clay", id: "young_climb", poses: [{ n: 0, at: 0 }, { n: 1, at: at("climb") }], cycle: 0.45, zoom: [1.05, 1.12], focus: [0.42, 0.4] },
      { kind: "clay", id: "young_run", from: at("Run", -0.15), poses: [{ n: 0, at: 0 }], cycle: 0.16, travel: 260, hop: true, zoom: [1.1, 1.1], focus: [0.5, 0.45] },
      { kind: "clay", id: "young_hang", from: at("Hang", -0.15), poses: [{ n: 0, at: 0 }, { n: 1, at: at("upside") }], cycle: 0.6, zoom: [1.05, 1.15], focus: [0.5, 0.5] },
    ],
  },
  {
    id: "best",
    line: "That was the best.",
    shots: [{ kind: "clay", id: "young_hang", poses: [{ n: 1, at: 0 }, { n: 0, at: at("best", 0.2) }, { n: 1, at: at("best", 0.8) }], zoom: [1.2, 1.45], focus: [0.62, 0.62] }],
  },
  {
    id: "sit",
    line: "Lately we mostly sit.",
    lead: 0.8,
    shots: [{ kind: "clay", id: "sit", poses: [{ n: 0, at: 0 }], zoom: [1.0, 1.04], focus: [0.5, 0.5] }],
  },
  {
    id: "soft",
    line: "I'm soft, you know. Whatever you do every day, that's the shape I take.",
    shots: [{ kind: "clay", id: "sit", poses: [{ n: 0, at: 0 }, { n: 1, at: at("Whatever") }], melt: 2.4, zoom: [1.04, 1.12], focus: [0.5, 0.52] }],
  },
  {
    id: "learn-sit",
    line: "Sit all day, and I'll learn to sit.",
    shots: [{ kind: "clay", id: "sit", poses: [{ n: 1, at: 0 }], zoom: [1.12, 1.2], focus: [0.5, 0.52] }],
  },
  {
    id: "move-me",
    line: "But move me, play with me, a little every day, and I'll learn that too.",
    lead: 0.3,
    shots: [{ kind: "clay", id: "get_up", poses: [{ n: 0, at: 0 }, { n: 1, at: at("play") }], zoom: [1.0, 1.08], focus: [0.55, 0.45] }],
  },
  {
    id: "gym",
    line: "So take me to the gym.",
    lead: 0.6,
    shots: [{ kind: "clay", id: "gym_lost", poses: [{ n: 0, at: 0 }], zoom: [0.92, 0.98], focus: [0.5, 0.5] }],
  },
  {
    id: "scary",
    line: "I know. It's a bit scary. Nobody ever showed us what to do there.",
    shots: [{ kind: "clay", id: "gym_lost", poses: [{ n: 0, at: 0 }], zoom: [0.98, 1.2], focus: [0.5, 0.3] }],
  },
  {
    id: "start",
    line: "That's okay. Tap Start. It shows us everything.",
    shots: [
      { kind: "clay", id: "gym_lost", poses: [{ n: 1, at: 0 }, { n: 2, at: at("okay", 0.2) }], zoom: [1.05, 1.5], focus: [0.5, 0.42] },
      { kind: "today", from: at("Tap", -0.5) },
      { kind: "lift", from: at("shows", -0.2) },
    ],
  },
  {
    id: "slowly",
    line: "Go slowly. Tap a circle.",
    // Him, going down slow with one small dumbbell; then the card, and a circle tapped.
    shots: [
      { kind: "clay", id: "goblet_squat", poses: [{ n: 0, at: 0 }, { n: 1, at: at("slowly", -0.1) }, { n: 0, at: at("slowly", 1.0) }], zoom: [1.1, 1.18], focus: [0.5, 0.5] },
      { kind: "lift", from: at("Tap", -0.45) },
    ],
  },
  {
    id: "home",
    line: "And on the way home, feel it. That's us, changing shape.",
    lead: 0.7,
    shots: [{ kind: "clay", id: "walk_home", poses: [{ n: 0, at: 0 }], cycle: 0.42, travel: 40, dusk: true, zoom: [1.0, 1.06], focus: [0.5, 0.45] }],
  },
  {
    id: "end",
    line: "Klay. Get in shape.",
    // The ball is a K by 1.7 s into the logo film: that's when the name is said.
    lead: 1.8,
    shots: [{ kind: "logo" }],
  },
];

/** When the tap on Start lands, and the tap on a circle: the finger and the chime. */
export const TAP_START: Cue = at("Start", 0.05);
export const TAP_CIRCLE: Cue = at("circle", 0.05);
