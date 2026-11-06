/**
 * The short film of a movement, looping without a seam: one rep from each of
 * its views, turning to the next view between reps, at the start of the rep.
 * A squat shows the side — the view every guide is written for — then turns
 * to the front, to show what the side can't (the knees following the toes),
 * and back. A bench press stays side on, where everything that matters shows.
 */

/**
 * One rep, in seconds: ready, the way to the hardest point, the pause there,
 * the way back, ready. Lowering takes longer than lifting — owning the
 * weight on the way down.
 */
const REP = { ready: 0.35, lower: 1.1, lift: 0.9, pause: 0.55, top: 0.3 };
const REP_SECONDS = REP.ready + REP.lower + REP.pause + REP.lift + REP.top;

/** How long a turn takes, between reps. */
const TURN_SECONDS = 0.9;

const easeInOut = (t: number) => (1 - Math.cos(Math.PI * Math.min(Math.max(t, 0), 1))) / 2;

/**
 * A moment of a film: how deep into the rep the lifter is, 0 to 1, and how
 * far round they have turned, in degrees — 0 is the side view, 90 the front.
 */
export type Moment = { depth: number; turn: number };

/**
 * A film of `views`, in degrees round the lifter — the way to the hardest
 * point the lowering (a squat, a press) or, for a pull or a curl, the lift:
 * how long it runs, each moment, the still, and when a film that plays only
 * so many times comes to rest.
 */
export function filmOf({
  views,
  lifts,
  cycle,
}: {
  views: number[];
  lifts?: boolean;
  cycle?: number;
}) {
  if (cycle) return cycling(views[0], cycle);
  const leg = REP_SECONDS + (views.length > 1 ? TURN_SECONDS : 0);
  const seconds = views.length * leg;
  const [there, back] = lifts ? [REP.lift, REP.lower] : [REP.lower, REP.lift];
  /** How far into a rep the lifter is, 0 to 1, `t` seconds after it starts. */
  const depthIn = (t: number) => {
    if ((t -= REP.ready) < 0) return 0;
    if (t < there) return easeInOut(t / there);
    if ((t -= there) < REP.pause) return 1;
    if ((t -= REP.pause) < back) return 1 - easeInOut(t / back);
    return 0;
  };
  /** The moment shown when nothing may move (Reduce Motion): the hardest point of the first rep. */
  const still = REP.ready + there + REP.pause / 2;
  return {
    seconds,
    still,
    /** After `plays` loops it goes on into the next rep and holds the hardest point: the still. */
    restsAt: (plays: number) => plays * seconds + still,
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

/** How many strides, strokes or turns a cycling film shows before it loops. */
const CYCLES = 3;

/**
 * The film of a movement that goes round — a stride, a stroke, a pedal —
 * from one view, `cycle` seconds a turn, at an even pace: the depth is how
 * far round it is, 0 to 1 and back to 0 without a seam. Its still is half
 * way round.
 */
function cycling(view: number, cycle: number) {
  const seconds = CYCLES * cycle;
  const still = cycle / 2;
  return {
    seconds,
    still,
    restsAt: (plays: number) => plays * seconds + still,
    momentAt(at: number): Moment {
      const t = ((at % cycle) + cycle) % cycle;
      return { depth: t / cycle, turn: view };
    },
  };
}
