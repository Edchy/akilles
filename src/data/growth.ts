import { DEFAULT_SCHEME, DEFAULT_WORKOUTS, type Entry } from "@/data/split";

/**
 * How a plan grows: it starts small, and showing up earns more.
 *
 * Everyone starts on Push, Pull, Legs with three lifts each, easy cardio to
 * open and the everyday stretch to close: about half an hour, every day. After
 * three weeks of coming most days, the end of a workout offers a bit more —
 * you choose what — and nothing changes without a yes:
 *
 *   One more exercise    a fourth lift each day, later a fifth
 *   More cardio          five easy minutes to finish, as well as to start
 *   A longer stretch     the Yoga flow instead of the everyday stretch
 *
 * Each step is offered once it's earned, one at a time, and the plan stops
 * growing at today's full plan: five lifts and cardio at both ends. Past
 * that, getting stronger is the weights' job, as it always was.
 *
 * Growth works on slots, never on exercises: a slot it added and you swapped
 * is still that slot, so it's never added twice; one you took out is never
 * put back. It only touches Klay's own Push, Pull and Legs, running in the
 * loop in use — never a workout you made, or one you paused.
 */

export type Track = "lift" | "cardio" | "stretch";

export const TRACKS: Track[] = ["lift", "cardio", "stretch"];

/** How many steps each track has before it is full. */
export const TRACK_STEPS: Record<Track, number> = { lift: 2, cardio: 1, stretch: 1 };

/** Most lifts growth takes a workout to. You can add more yourself. */
export const LIFT_CAP = 5;

/** How long between offers, and how many workouts in that time earn one. */
export const GROWTH_EVERY_DAYS = 21;
export const GROWTH_SESSIONS = 12;

/** The routine "a longer stretch" brings. */
export const LONGER_STRETCH = "yoga";

/** How many lifts a starting workout begins with. */
export const START_LIFTS = 3;

/** Klay's own workouts, which start small and grow. */
const GROWING = ["push", "pull", "legs"];

const slotsOf = (id: string): Entry[] =>
  (DEFAULT_WORKOUTS.find((w) => w.id === id)?.exercises ?? []).map((e) => ({ ...e }));

/**
 * The slots each starting workout keeps: the first three of its full plan.
 * Read from the plan itself, so changing the plan changes this with it.
 */
export const START_SLOTS: Record<string, string[]> = Object.fromEntries(
  GROWING.map((id) => [id, slotsOf(id).slice(0, START_LIFTS).map((e) => e.id)]),
);

/** A core slot, for a full plan that has none: growth brings one. */
const CORE: Entry = { id: "Abs", slot: "Abs", pattern: "abs", options: ["plank"], scheme: DEFAULT_SCHEME };

/**
 * The slots "one more exercise" adds to each workout, in order: the rest of
 * its full plan, then core if the plan has none.
 */
export const GROWTH_SLOTS: Record<string, Entry[]> = Object.fromEntries(
  GROWING.map((id) => {
    const rest = slotsOf(id).slice(START_LIFTS);
    return [id, rest.some((e) => e.pattern === "abs") ? rest : [...rest, CORE]];
  }),
);
