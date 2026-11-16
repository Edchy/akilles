/**
 * The onboarding video, scene by scene: what is said (and captioned), what
 * is on the phone, and where a finger touches it.
 *
 * Times are seconds from the start of the scene. Points are in the
 * screenshot's own pixels (1206 × 2622, an iPhone 17 Pro). A scene lasts as
 * long as its line takes to say, plus a breath (see `durations.json`, which
 * `npm run voice` writes).
 */

export type Touch =
  | { kind: "tap"; at: number; x: number; y: number }
  | { kind: "hold"; at: number; x: number; y: number; for?: number }
  | { kind: "drag"; at: number; x: number; y: number; toX: number; toY: number; for?: number };

/** A band of the screen lifted and carried, the way a held row moves. */
export type Carry = { at: number; for: number; top: number; bottom: number; by: number };

export type Scene = {
  id: string;
  /** A word or two over the phone. */
  title: string;
  /** Said, and shown as the caption. */
  line: string;
  /** The background's colour: the family on screen. */
  tint: string;
  /** The stills, in order, each from its time on. The first is from 0. */
  shots: { at: number; shot: string }[];
  touches?: Touch[];
  carries?: Carry[];
  /** Lean in on part of the screen, from a time. */
  zoom?: { at: number; x: number; y: number; scale: number };
  /** The closing card instead of a phone. */
  end?: boolean;
};

export const PUSH = "#2277BB";
export const PULL = "#23864D";
export const LEGS = "#F08A24";
export const NAVY = "#13325B";
export const DANGER = "#B42318";

export const SCENES: Scene[] = [
  {
    id: "own",
    title: "Humbell",
    line: "Most gym apps count how much you lift. Humbell counts how much you own.",
    tint: PUSH,
    shots: [{ at: 0, shot: "home" }],
    zoom: { at: 1.2, x: 603, y: 1100, scale: 1.08 },
  },
  {
    id: "open",
    title: "Open and go",
    line: "Open it, and Humbell tells you what to do. One exercise at a time, with the weight already worked out.",
    tint: PUSH,
    shots: [
      { at: 0, shot: "home" },
      { at: 1.4, shot: "lift0" },
    ],
    touches: [{ kind: "tap", at: 0.9, x: 811, y: 2142 }],
  },
  {
    id: "sets",
    title: "Tap each set",
    line: "Tap a circle for each set. Slow, steady reps are the ones that count.",
    tint: PUSH,
    shots: [
      { at: 0, shot: "lift0" },
      { at: 1.3, shot: "lift1" },
      { at: 2.3, shot: "lift2" },
      { at: 3.3, shot: "lift3" },
    ],
    touches: [
      { kind: "tap", at: 1.0, x: 262, y: 1583 },
      { kind: "tap", at: 2.0, x: 603, y: 1583 },
      { kind: "tap", at: 3.0, x: 944, y: 1583 },
    ],
  },
  {
    id: "workouts",
    title: "A few workouts, in turn",
    line: "Your training is a few workouts, done in turn. Miss a day and nothing is lost. You just do the next one.",
    tint: PULL,
    shots: [{ at: 0, shot: "plan" }],
    zoom: { at: 0.8, x: 603, y: 1000, scale: 1.1 },
  },
  {
    id: "library",
    title: "Built from exercises",
    line: "Each workout is built from exercises in the Library. Change one there, and it changes everywhere it's used.",
    tint: PUSH,
    shots: [
      { at: 0, shot: "editor" },
      { at: 3.0, shot: "plan" },
      { at: 3.8, shot: "library" },
    ],
    touches: [
      { kind: "tap", at: 2.7, x: 1069, y: 275 },
      { kind: "tap", at: 3.5, x: 869, y: 599 },
    ],
  },
  {
    id: "order",
    title: "Your order",
    line: "Hold anything and drag it to change the order: your workouts, or the exercises inside one.",
    tint: LEGS,
    shots: [
      { at: 0, shot: "plan" },
      { at: 2.3, shot: "reordered" },
      { at: 3.0, shot: "editor" },
      { at: 5.1, shot: "editorMoved" },
    ],
    touches: [
      { kind: "drag", at: 0.6, x: 603, y: 1807, toX: 603, toY: 1491, for: 1.1 },
      { kind: "drag", at: 3.5, x: 520, y: 1676, toX: 520, toY: 1460, for: 1.0 },
    ],
    carries: [
      { at: 1.0, for: 1.35, top: 1672, bottom: 1942, by: -316 },
      { at: 3.9, for: 1.25, top: 1576, bottom: 1776, by: -216 },
    ],
  },
  {
    id: "swap",
    title: "Swap",
    line: "Machine taken? Swap it for today.",
    tint: PUSH,
    shots: [
      { at: 0, shot: "lift0" },
      { at: 0.8, shot: "menu" },
      { at: 1.9, shot: "swap" },
    ],
    touches: [
      { kind: "tap", at: 0.5, x: 1049, y: 769 },
      { kind: "tap", at: 1.6, x: 699, y: 1110 },
    ],
  },
  {
    id: "add",
    title: "Add",
    line: "Want more? Add one.",
    tint: PUSH,
    shots: [
      { at: 0, shot: "add" },
      { at: 1.1, shot: "addChest" },
    ],
    touches: [{ kind: "tap", at: 0.8, x: 324, y: 2021 }],
  },
  {
    id: "pause",
    title: "Pause",
    line: "Need a break from a workout? Swipe it, and pause it.",
    tint: PULL,
    shots: [
      { at: 0, shot: "plan" },
      { at: 1.1, shot: "swipe" },
      { at: 2.3, shot: "paused" },
    ],
    touches: [
      { kind: "drag", at: 0.3, x: 950, y: 1489, toX: 450, toY: 1489, for: 0.6 },
      { kind: "tap", at: 2.0, x: 728, y: 1489 },
    ],
  },
  {
    id: "end",
    title: "Humbell",
    line: "Show up. Go light. Own it.",
    tint: NAVY,
    shots: [],
    end: true,
  },
];
