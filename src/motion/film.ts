/**
 * The short film of a movement, looping without a seam: one rep from each of
 * its views, turning to the next view between reps, standing tall. A squat
 * shows the side — the view every guide is written for — then turns to the
 * front, to show what the side can't (the knees following the toes), and
 * back. A bench press stays side on, where everything that matters shows.
 */

/** One rep, in seconds: ready, down, the pause at the bottom, up, ready. */
const REP = { ready: 0.35, down: 1.1, pause: 0.55, up: 0.9, top: 0.3 };
const REP_SECONDS = REP.ready + REP.down + REP.pause + REP.up + REP.top;

/** How long a turn takes, standing between reps. */
const TURN_SECONDS = 0.9;

/** The moment shown when nothing may move (Reduce Motion): the bottom of the first rep. */
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
 * A moment of a film: how deep into the rep the lifter is, 0 to 1, and how
 * far round they have turned, in degrees — 0 is the side view, 90 the front.
 */
export type Moment = { depth: number; turn: number };

/** A film of `views`, in degrees round the lifter: how long it runs, and each moment. */
export function filmOf(views: number[]) {
  const leg = REP_SECONDS + (views.length > 1 ? TURN_SECONDS : 0);
  const seconds = views.length * leg;
  return {
    seconds,
    momentAt(at: number): Moment {
      const t = ((at % seconds) + seconds) % seconds;
      const i = Math.min(Math.floor(t / leg), views.length - 1);
      const into = t - i * leg;
      if (into < REP_SECONDS) return { depth: depthIn(into), turn: views[i] };
      const from = views[i];
      const to = views[(i + 1) % views.length];
      const turned = easeInOut((into - REP_SECONDS) / TURN_SECONDS);
      return { depth: 0, turn: from + (to - from) * turned };
    },
  };
}
