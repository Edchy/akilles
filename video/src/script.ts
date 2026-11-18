/**
 * The intro film, scene by scene: what is said (and captioned), and what is
 * shown. One film, start to finish: a short why (move every day, like eating
 * and sleeping; at the gym, now what?), then how a workout goes in Klay, drawn
 * as the app draws it but simplified — Start, the circles, a short set, next
 * time, the cards, a stretch, Finish — and the close. See SCRIPT.md.
 *
 * The why is the clay fellow (art/clay/scenes.json, copied to public/clay by
 * `npm run pictures`). A scene lasts as long as its line takes to say, plus a
 * breath (see `durations.json`, which `npm run voice` writes), or as long as
 * what it shows, whichever is longer.
 */

/** What a scene shows. */
export type Show =
  /** The clay fellow: one picture, or several cross-fading at their times. */
  | { kind: "clay"; pictures: { at: number; id: string }[] }
  /** Today's workout and Start, tapped. */
  | { kind: "start" }
  /** A lift's card; each tap sets a circle to a number. */
  | { kind: "lift"; filled: (number | null)[]; taps: { at: number; circle: number; value: number }[] }
  /** A lift's last times, a row at a time, then next time's weight. */
  | { kind: "journal" }
  /** The deck: swiped on to the next card, and back. */
  | { kind: "deck" }
  /** A stretch on its card, thrown off upwards; the next comes in. */
  | { kind: "stretch" }
  /** The workout card pulled down: every card, and Finish. */
  | { kind: "finish" }
  /** The close: the name and the line. */
  | { kind: "end" };

export type Scene = {
  id: string;
  /** Said, and shown as the caption. */
  line: string;
  show: Show;
};

/** The app's page and ink (PAPER in src/constants/theme.ts). */
export const PAPER = "#FCFCFA";
export const INK = "#1C1C1A";
export const MUTED = "#5C5B55";
export const LINE = "#DCDBD4";
export const SURFACE = "#F1F0EB";
/** The push family's field: the lift card's colour. */
export const CARD = "#17181B";

const clay = (id: string): Show => ({ kind: "clay", pictures: [{ at: 0, id }] });

export const SCENES: Scene[] = [
  // Why, in a breath.
  { id: "eat", line: "You eat every day.", show: clay("eat") },
  { id: "sleep", line: "You sleep every day.", show: clay("sleep") },
  { id: "move", line: "And your body needs to move every day, too.", show: clay("off_to_train") },
  { id: "now-what", line: "So you go to the gym. Now what?", show: clay("gym_lost") },
  // How a workout goes.
  { id: "start", line: "Open Klay and tap Start. Your workout is ready, every weight worked out.", show: { kind: "start" } },
  {
    id: "circles",
    line: "Each card is one exercise. Lift, rest, then tap a circle for each set.",
    show: {
      kind: "lift",
      filled: [null, null, null],
      taps: [
        { at: 1.6, circle: 0, value: 8 },
        { at: 2.6, circle: 1, value: 8 },
      ],
    },
  },
  {
    id: "short",
    line: "Got fewer? Tap again to count down. Klay writes down what you really did.",
    show: {
      kind: "lift",
      filled: [8, 8, null],
      taps: [
        { at: 1.0, circle: 2, value: 8 },
        { at: 2.0, circle: 2, value: 7 },
      ],
    },
  },
  {
    id: "next",
    line: "Next time, Klay asks for a little more. Came up short? You try the same again.",
    show: { kind: "journal" },
  },
  {
    id: "deck",
    line: "Swipe for the next exercise. Bench taken? Do the next one, and swipe back to it.",
    show: { kind: "deck" },
  },
  { id: "stretch", line: "Stretches move on by themselves. Done early? Swipe up.", show: { kind: "stretch" } },
  { id: "finish", line: "Pull down to see every card. Then tap Finish.", show: { kind: "finish" } },
  // The habit.
  { id: "shaped", line: "Show up, do a little. Small days add up.", show: clay("shaped") },
  { id: "end", line: "Klay. Shape your life.", show: { kind: "end" } },
];
