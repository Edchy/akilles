/**
 * The short film of a movement: two reps and two turns, looping without a
 * seam.
 *
 * 1. One rep from the side: the view every guide is written for.
 * 2. Standing tall, the lifter turns to face you.
 * 3. One rep from the front, to show what the side can't (for a squat, the
 *    knees following the toes).
 * 4. Standing, the lifter turns back to the side, where the film began.
 */

/** One rep, in seconds: ready, down, the pause at the bottom, up, ready. */
const REP = { ready: 0.35, down: 1.1, pause: 0.55, up: 0.9, top: 0.3 };
const REP_SECONDS = REP.ready + REP.down + REP.pause + REP.up + REP.top;

/** How long a turn takes, standing between reps. */
const TURN_SECONDS = 0.9;

export const FILM_SECONDS = 2 * (REP_SECONDS + TURN_SECONDS);

/** The moment shown when nothing may move (Reduce Motion): the bottom, from the side. */
export const STILL_SECONDS = REP.ready + REP.down + REP.pause / 2;

const easeInOut = (t: number) => (1 - Math.cos(Math.PI * Math.min(Math.max(t, 0), 1))) / 2;

/** How deep into a rep the lifter is, 0 to 1, `t` seconds after it starts. */
function depthIn(t: number) {
  if ((t -= REP.ready) < 0) return 0;
  if (t < REP.down) return easeInOut(t / REP.down);
  if ((t -= REP.down) < REP.pause) return 1;
  if ((t -= REP.pause) < REP.up) return 1 - easeInOut(t / REP.up);
  return 0;
}

/**
 * A moment of the film: how deep into the rep the lifter is, 0 to 1, and how
 * far round they have turned, in degrees — 0 is the side view, 90 the front.
 */
export type Moment = { depth: number; turn: number };

export function momentAt(seconds: number): Moment {
  let t = ((seconds % FILM_SECONDS) + FILM_SECONDS) % FILM_SECONDS;
  if (t < REP_SECONDS) return { depth: depthIn(t), turn: 0 };
  const turned = (s: number) => 90 * easeInOut(s / TURN_SECONDS);
  if ((t -= REP_SECONDS) < TURN_SECONDS) return { depth: 0, turn: turned(t) };
  if ((t -= TURN_SECONDS) < REP_SECONDS) return { depth: depthIn(t), turn: 90 };
  return { depth: 0, turn: 90 - turned(t - REP_SECONDS) };
}
