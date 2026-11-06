import {
  BODY,
  centreOfMass,
  poseFrom,
  SIDES,
  SIZE,
  type Limb,
  type Pose,
  type Prop,
} from "@/motion/figure";
import { Vec3 } from "@/motion/vector";

/**
 * A movement as Milo films it: the pose at every depth of one rep, from 0
 * (the start) to 1 (the hardest point), what the lifter uses, and how the
 * film shows it.
 *
 * Each pose is worked out from the rules a coach would give, not drawn, so it
 * can't drift: the feet stay flat where they are, the knees bend towards the
 * toes, every bone keeps its length, and the lifter balances — standing,
 * over the middle of the foot; hanging, under the bar. Where the body touches
 * something, it touches it as drawn (see `SIZE`). tests/motion.cjs checks
 * each one against a coach's ranges.
 */
export type Move = {
  pose: (depth: number) => Pose;
  /**
   * What the lifter uses: a barbell — its plates' radius, if not 10 kg ones —
   * or a fixed bar to hang from; dumbbells (see `Pose.dumbbells`); a bench.
   */
  kit: { bar?: "barbell" | "fixed"; plate?: number; dumbbells?: boolean; bench?: Bench };
  film: {
    /** One rep from each, in degrees round the lifter: 0 is the side, 90 the front. */
    views: number[];
    /** The way to the hardest point is the lift — a pull, a curl — and the way back lowers. */
    lifts?: boolean;
    /**
     * A movement that goes round instead — a stride, a stroke — one turn every
     * `cycle` seconds, its pose the same at depth 0 and 1 (see `filmOf`).
     */
    cycle?: number;
    /** The point on the floor the film turns about, in the middle of the picture. */
    middle: Vec3;
    /** What the picture must hold, in metres: the height above the floor, and the width. */
    room: { height: number; width: number };
  };
};

/**
 * A flat bench along the lifter: the top of its pad and the pad's thickness,
 * where the pad starts and ends along the floor, half its width, and where
 * its two legs stand.
 */
export type Bench = {
  top: number;
  pad: number;
  from: number;
  to: number;
  half: number;
  legs: [number, number];
};

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rad = (degrees: number) => (degrees * Math.PI) / 180;

/** A 5 kg plate's radius: 23 cm across, for the lighter barbell lifts. */
export const PLATE_5KG = 0.115;

/** A bar's radius: an Olympic bar is 28 mm across. */
export const BAR_RADIUS = 0.014;

/**
 * Standing: the feet `stance` apart from the middle, turned out `toeOut`
 * radians, and how far the middle of the foot is ahead of the ankle.
 */
export function stand(stance: number, toeOut: number) {
  const feet = SIDES.map((s) => new Vec3(Math.cos(toeOut), 0, s * Math.sin(toeOut))) as [
    Vec3,
    Vec3,
  ];
  const ankles = SIDES.map((s) => new Vec3(0, BODY.ankle, s * stance)) as [Vec3, Vec3];
  /** Halfway from heel to toe, along the floor. */
  const midFoot = ((BODY.toe - BODY.heel) / 2) * Math.cos(toeOut);
  return { feet, ankles, midFoot };
}

/** A hand on each side of the bar, `grip` from its middle. */
export const handsOn = (bar: Vec3, grip: number) =>
  SIDES.map((s) => bar.clone().add(new Vec3(0, 0, s * grip))) as [Vec3, Vec3];

/** How far `p` is from the line from `a` to `b`, seen from the side. */
export function sideOnDistance(p: Vec3, a: Vec3, b: Vec3) {
  const [dx, dy] = [b.x - a.x, b.y - a.y];
  const t = Math.min(Math.max(((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy), 0), 1);
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/**
 * The front of the ▽ seen from the side, `h` up the spine from the hip
 * joints: from its point below the hips to its corner above the shoulders.
 */
export const chestAt = (h: number) =>
  (SIZE.trunk.side * (h - SIZE.trunk.down)) / (BODY.torso + SIZE.trunk.up - SIZE.trunk.down);

/**
 * How far `p` is clear of the trunk's ▽, seen from the side; less than
 * nothing is inside it.
 */
export function clearOfTrunk(pose: Pose, p: Vec3) {
  const T = SIZE.trunk;
  const top = pose.pelvis.clone().addScaledVector(pose.trunk, BODY.torso + T.up);
  const corners = [
    top.clone().addScaledVector(pose.forward, T.side),
    pose.pelvis.clone().addScaledVector(pose.trunk, T.down),
    top.clone().addScaledVector(pose.forward, -T.side),
  ];
  const sides = corners.map((a, i) => {
    const b = corners[(i + 1) % 3];
    return Math.sign((b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x));
  });
  const nearest = Math.min(...corners.map((a, i) => sideOnDistance(p, a, corners[(i + 1) % 3])));
  return sides.every((side) => side === sides[0]) ? -nearest : nearest;
}

/**
 * Where `f` crosses zero near `a` and `b`, by following the line through the
 * last two tries: a few steps where `f` is smooth, as a balance is.
 */
export function secant(f: (x: number) => number, a: number, b: number) {
  let [fa, fb] = [f(a), f(b)];
  for (let i = 0; i < 12 && Math.abs(fb) > 1e-7 && fb !== fa; i++) {
    [a, fa, b] = [b, fb, b - (fb * (b - a)) / (fb - fa)];
    fb = f(b);
  }
  return b;
}

/** Where `f` crosses zero between `lo` and `hi`, found by halving; `f` rises across it. */
export function halve(f: (x: number) => number, lo: number, hi: number) {
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The elbow in line with the hand, the forearm upright, as seen from the
 * side (a press: the elbow straight under the bar) or from the front (a
 * pull-up: the elbow straight under the hand) — and below the line from
 * shoulder to hand. Nothing if the arm can't reach.
 */
export function elbowUpright(shoulder: Vec3, hand: Vec3, seen: "side" | "front") {
  const [kept, free] = seen === "side" ? (["x", "z"] as const) : (["z", "x"] as const);
  // In the plane of the forearm the elbow is on two circles, one round the
  // shoulder and one round the hand: where they meet.
  const r1 = Math.sqrt(BODY.upperArm ** 2 - (hand[kept] - shoulder[kept]) ** 2);
  const r2 = BODY.forearm;
  const dy = hand.y - shoulder.y;
  const du = hand[free] - shoulder[free];
  const d = Math.hypot(dy, du);
  if (!(r1 > 0) || !(d > 0) || d > r1 + r2 || d < Math.abs(r1 - r2)) return undefined;
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(r1 * r1 - a * a, 0));
  const meet = (sign: number) => {
    const elbow = hand.clone();
    elbow.y = shoulder.y + (a * dy - sign * h * du) / d;
    elbow[free] = shoulder[free] + (a * du + sign * h * dy) / d;
    return elbow;
  };
  const [one, two] = [meet(1), meet(-1)];
  return one.y < two.y ? one : two;
}

/** Midway between the hands: where what they hold weighs, for balance. */
export const held = (pose: Pose) =>
  pose.arms[0].end.clone().add(pose.arms[1].end).multiplyScalar(0.5);

/** Standing on straight legs, the hips `x` ahead of the ankles, feet `stance` apart. */
export const standingHips = (x: number, stance: number) => {
  const reach = 0.9995 * (BODY.thigh + BODY.shin);
  return new Vec3(x, BODY.ankle + Math.sqrt(reach ** 2 - x * x - (stance - BODY.hip) ** 2), 0);
};

/** 0 to 1. */
export const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);

/** Eased in and out, 0 to 1. */
export const ease = (t: number) => (1 - Math.cos(Math.PI * clamp01(t))) / 2;

/** One for each side: as given for side 0, mirrored across the body for side 1. */
export const mirror = (v: Vec3) => [v.clone(), new Vec3(v.x, v.y, -v.z)] as [Vec3, Vec3];

/** A point between `a` and `b`. */
export const mixed = (a: Vec3, b: Vec3, t: number) =>
  a.clone().addScaledVector(b.clone().sub(a), t);

/**
 * How far the back of the ▽ tilts from the spine, seen from the side: lying
 * on a pad, the spine leans this much more than the pad does.
 */
export const EDGE_TILT = Math.atan2(
  SIZE.trunk.side,
  BODY.torso + SIZE.trunk.up - SIZE.trunk.down,
);

/**
 * The back of the ▽ seen from the side, from its point to its top corner:
 * what a back pad touches.
 */
export function backEdge(pose: Pose) {
  const T = SIZE.trunk;
  const low = pose.pelvis.clone().addScaledVector(pose.trunk, T.down);
  const high = pose.pelvis
    .clone()
    .addScaledVector(pose.trunk, BODY.torso + T.up)
    .addScaledVector(pose.forward, -T.side);
  return { low, high };
}

/** The pad of a bench or a machine seat: 28 cm wide and 6.5 cm thick. */
export const PAD = { half: 0.14, thick: 0.065 };

/**
 * A seat at `top`, from `from` to `to` along the floor, on a post — and,
 * given `back`, a back pad along the back of the ▽, running on `past` metres
 * beyond its top corner (to hold the head, lying back), on a strut to the
 * floor.
 */
export function seatProps(
  pose: Pose,
  { top, from, to, back, past = 0.05 }: {
    top: number;
    from: number;
    to: number;
    back?: boolean;
    past?: number;
  },
): Prop[] {
  const under = top - PAD.thick;
  const middle = (from + to) / 2;
  const props: Prop[] = [
    { kind: "pad", from: new Vec3(from, top, 0), to: new Vec3(to, top, 0), ...PAD },
    { kind: "line", from: new Vec3(middle, under, 0), to: new Vec3(middle, 0, 0) },
    { kind: "line", from: new Vec3(from - 0.05, 0, 0), to: new Vec3(to + 0.05, 0, 0) },
  ];
  if (back) {
    const { low, high } = backEdge(pose);
    const along = high.clone().sub(low).normalize();
    const start = low.clone().addScaledVector(along, -0.02);
    const end = high.clone().addScaledVector(along, past);
    props.push({ kind: "pad", from: start, to: end, ...PAD, up: pose.forward.clone() });
    const brace = mixed(start, end, 0.6).addScaledVector(pose.forward, -PAD.thick);
    if (brace.y > under + 0.05) {
      props.push({ kind: "line", from: brace, to: new Vec3(brace.x, 0, 0) });
    }
  }
  return props;
}

/** Two upright rails of a Smith machine, either side, at `x` along the floor. */
export const smithProps = (x: number): Prop[] =>
  [1, -1].map((s) => ({
    kind: "line" as const,
    from: new Vec3(x, 0, s * 0.82),
    to: new Vec3(x, 2.15, s * 0.82),
  }));

/**
 * A cable column at `base` on the floor, its pulley at `height`, and the
 * cable from there to `hand`.
 */
export function cableProps(base: Vec3, height: number, hand?: Vec3): Prop[] {
  const pulley = new Vec3(base.x, height, base.z);
  const props: Prop[] = [
    {
      kind: "pad",
      from: new Vec3(base.x, 0, base.z),
      to: new Vec3(base.x, 2.1, base.z),
      half: 0.07,
      thick: 0.14,
      up: new Vec3(1, 0, 0),
      across: new Vec3(0, 0, 1),
    },
  ];
  if (hand) props.push({ kind: "line", from: pulley, to: hand });
  return props;
}

/**
 * `hand` brought in along the line from `shoulder` if the arm, straight,
 * couldn't reach it.
 */
export function withinReach(shoulder: Vec3, hand: Vec3, slack = 0.998) {
  const reach = slack * (BODY.upperArm + BODY.forearm);
  const d = hand.distanceTo(shoulder);
  return d <= reach ? hand : mixed(shoulder, hand, reach / d);
}

/** An arm from `shoulder`: the upper arm along `upper`, the forearm along `fore`. */
export function armFrom(shoulder: Vec3, upper: Vec3, fore: Vec3): Limb {
  const mid = shoulder.clone().addScaledVector(upper.clone().normalize(), BODY.upperArm);
  const end = mid.clone().addScaledVector(fore.clone().normalize(), BODY.forearm);
  return { root: shoulder.clone(), mid, end };
}

/** A direction `degrees` from `a` toward `b`, in the plane of the two. */
export function turned(a: Vec3, b: Vec3, degrees: number) {
  const n = new Vec3().crossVectors(a, b);
  if (n.length() < 1e-9) return a.clone().normalize();
  return a.clone().normalize().applyAxisAngle(n.normalize(), rad(degrees));
}

/** Each shoulder joint of a trunk at `pelvis` leaning `lean`, lifted `shrug`. */
export function shouldersAt(pelvis: Vec3, lean: number, shrug = 0) {
  const trunk = new Vec3(Math.sin(lean), Math.cos(lean), 0);
  const top = pelvis.clone().addScaledVector(trunk, BODY.torso + shrug);
  return mirror(new Vec3(0, 0, BODY.shoulder)).map((v) => v.add(top)) as [Vec3, Vec3];
}

/** The arms of `pose` set to `arms`, side 0 then side 1. */
export function withArms(pose: Pose, arms: [Limb, Limb]) {
  pose.arms = arms;
  return pose;
}

/**
 * Standing, feet `stance` from the middle and turned out `toeOut`, the
 * hips `x` ahead of the ankles and `bend` lower than straight legs allow,
 * leaning `lean`, the hands where given.
 */
export function standing(
  { stance = 0.15, toeOut = rad(10), x = 0, bend = 0, lean = 0, shrug = 0 }: {
    stance?: number;
    toeOut?: number;
    x?: number;
    bend?: number;
    lean?: number;
    shrug?: number;
  },
  hands: [Vec3, Vec3],
  elbowPole: Vec3 | [Vec3, Vec3] = new Vec3(0, -1, 0),
) {
  const { feet, ankles } = stand(stance, toeOut);
  const pelvis = standingHips(x, stance).add(new Vec3(0, -bend, 0));
  return poseFrom({ pelvis, lean, ankles, feet, hands, elbowPole, shrug });
}

/**
 * Where to stand — the hips' `x` — so that `make(x)` balances over the middle
 * of the foot, with `load` (a share of the body's weight) in the hands.
 */
export function balance(make: (x: number) => Pose, load = 0, toeOut = rad(10)) {
  const midFoot = ((BODY.toe - BODY.heel) / 2) * Math.cos(toeOut);
  return secant((x) => {
    const pose = make(x);
    return centreOfMass(pose, load, held(pose)).x - midFoot;
  }, 0, -0.03);
}

/**
 * Numbers that move through `keys` — each a time from 0 to 1 and the values
 * there — easing in and out between one key and the next. The last key
 * should match the first, for a film that loops.
 */
export function keyframes<K extends string>(keys: ({ t: number } & Record<K, number>)[]) {
  return (t: number): Record<K, number> => {
    const at = clamp01(t);
    let i = 0;
    while (i < keys.length - 2 && keys[i + 1].t <= at) i++;
    const [a, b] = [keys[i], keys[i + 1]];
    const f = ease((at - a.t) / Math.max(b.t - a.t, 1e-9));
    const out = {} as Record<K, number>;
    for (const k of Object.keys(a) as (K | "t")[]) {
      if (k !== "t") out[k] = lerp(a[k], b[k], f);
    }
    return out;
  };
}
