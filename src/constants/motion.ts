import { Easing } from "react-native-reanimated";

/**
 * How Humbell moves — one small set, used everywhere, so the same kind of
 * movement always feels the same.
 *
 * - Springs for anything a finger drives or can interrupt (rows, cards,
 *   sheets, a pressed button letting go): they carry the finger's speed and
 *   can be caught mid-way.
 * - Ease-out for things that simply appear or fade: fast at the start, so
 *   the app answers at once, then settling.
 * - Short. Nothing a person waits on runs past 300 ms. Nothing that happens
 *   dozens of times a workout (a set's circle) gets more than a tick.
 */
export const spring = {
  /** Flicked by a finger: rows, cards, a swipe letting go. */
  snappy: { damping: 28, stiffness: 340, mass: 0.8 },
  /** Something arriving: a sheet, a screen, a selection moving. */
  gentle: { damping: 26, stiffness: 220, mass: 0.9 },
  /** A small reward: a set's mark, a button let go. */
  bouncy: { damping: 16, stiffness: 420, mass: 0.6 },
} as const;

export const duration = {
  /** A press going down. */
  press: 85,
  /** A fade or a small change of state. */
  quick: 160,
  /** Something arriving. */
  base: 240,
} as const;

/** Strong ease-out: answers at once, then settles. */
export const easeOut = Easing.bezier(0.23, 1, 0.32, 1);

/** How far a pressed button sinks. Every button, the same. */
export const PRESS_SCALE = 0.97;
