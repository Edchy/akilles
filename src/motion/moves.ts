import { BODY, poseFrom, SIDES, SIZE, type Limb, type Pose } from "@/motion/figure";
import { Vec3 } from "@/motion/vector";

/**
 * A movement as Milo films it: the pose at every depth of one rep, from 0
 * (the start) to 1 (the hardest point), what the lifter uses, and how the
 * film shows it.
 *
 * Each pose is worked out from the rules a coach would give, not drawn, so it
 * can't drift: the feet stay flat where they are, the knees bend towards the
 * toes, every bone keeps its length, and — standing with a barbell — the
 * trunk leans exactly as far as keeps the bar over the middle of the foot.
 * Where the body touches something, it touches it as drawn (see `SIZE`).
 * tests/motion.cjs checks each one against a coach's ranges.
 */
export type Move = {
  pose: (depth: number) => Pose;
  kit: { bar: boolean; bench?: Bench };
  film: {
    /** One rep from each, in degrees round the lifter: 0 is the side, 90 the front. */
    views: number[];
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

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Where `f` crosses zero between `lo` and `hi`, found by halving; `f` rises across it. */
function halve(f: (x: number) => number, lo: number, hi: number) {
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (f(mid) < 0) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * The high-bar back squat. Feet a little wider than the hips, toes turned out
 * 20°. The bar sits on the upper back, a little above and behind the shoulder
 * joints, hands wide on it. Down, the hips go back first and then mostly
 * down, to just below parallel; the bar travels straight up and down over the
 * middle of the foot.
 */
function backSquat(): Move {
  const stance = 0.21;
  const toeOut = (20 * Math.PI) / 180;
  const grip = 0.36;
  const barUp = 0.05;
  const barBack = 0.11;

  const feet = SIDES.map((s) => new Vec3(Math.cos(toeOut), 0, s * Math.sin(toeOut))) as [
    Vec3,
    Vec3,
  ];
  const ankles = SIDES.map((s) => new Vec3(0, BODY.ankle, s * stance)) as [Vec3, Vec3];
  /** Halfway from heel to toe, along the floor. */
  const midFoot = ((BODY.toe - BODY.heel) / 2) * Math.cos(toeOut);

  // Standing: the hips a touch ahead of the ankles and the knees all but
  // locked. The bottom: hip joints a few centimetres below the knees.
  const topX = 0.08;
  const reach = 0.9995 * (BODY.thigh + BODY.shin);
  const spread = stance - BODY.hip;
  const topY = BODY.ankle + Math.sqrt(reach * reach - topX * topX - spread * spread);
  const bottomX = -0.15;
  const bottomY = 0.37;

  return {
    kit: { bar: true },
    film: { views: [0, 90], middle: new Vec3(midFoot, 0, 0), room: { height: 1.85, width: 2.4 } },
    pose(depth) {
      const d = Math.min(Math.max(depth, 0), 1);
      // Hips back early, then down.
      const pelvis = new Vec3(
        lerp(topX, bottomX, Math.sin((d * Math.PI) / 2)),
        lerp(topY, bottomY, d),
        0,
      );
      const barFrom = (lean: number) => {
        const trunk = new Vec3(Math.sin(lean), Math.cos(lean), 0);
        const forward = new Vec3(Math.cos(lean), -Math.sin(lean), 0);
        return pelvis
          .clone()
          .addScaledVector(trunk, BODY.torso + barUp)
          .addScaledVector(forward, -barBack);
      };
      // The trunk leans exactly as far as keeps the bar over mid-foot.
      const lean = halve((l) => barFrom(l).x - midFoot, -0.2, 1.2);
      const bar = barFrom(lean);
      const trunk = new Vec3(Math.sin(lean), Math.cos(lean), 0);
      const forward = new Vec3(Math.cos(lean), -Math.sin(lean), 0);
      return poseFrom({
        pelvis,
        lean,
        ankles,
        feet,
        hands: SIDES.map((s) => bar.clone().add(new Vec3(0, 0, s * grip))) as [Vec3, Vec3],
        // Elbows down and a little back, under the bar.
        elbowPole: trunk.clone().negate().addScaledVector(forward, -0.5),
        bar,
      });
    },
  };
}

/**
 * The barbell bench press, with an arch. Lying on a flat bench: the upper
 * back and the seat on the pad and the lower back lifted off it, the chest
 * high, the head resting on the bench, feet flat on the floor under the
 * knees. Down, the bar comes to the low chest with the forearms upright and
 * the elbows about 45° from the sides; up, it drifts back to over the
 * shoulders.
 */
function benchPress(): Move {
  const bench: Bench = {
    top: 0.44,
    pad: 0.065,
    from: -0.86,
    to: 0.34,
    half: 0.14,
    legs: [-0.66, 0.16],
  };
  const T = SIZE.trunk;
  // The seat on the pad: the round end of the thigh under the hip joints.
  const pelvis = new Vec3(0, bench.top + SIZE.thigh, 0);
  // The trunk tilts, chest up, until the back of the ▽ — the upper back,
  // shoulder blades pinched — presses a little into the pad.
  const press = 0.065;
  const tilt = halve(
    (t) => pelvis.y + (BODY.torso + T.up) * Math.sin(t) - T.side * Math.cos(t) - bench.top + press,
    -0.3,
    0.6,
  );
  const lean = tilt - Math.PI / 2;
  const trunk = new Vec3(Math.sin(lean), Math.cos(lean), 0);
  const forward = new Vec3(Math.cos(lean), -Math.sin(lean), 0);
  const shoulders = pelvis.clone().addScaledVector(trunk, BODY.torso);
  // The arch: the lower back lifts off the pad until the ▽'s point meets the
  // top of the thigh.
  const arch = (SIZE.thigh - T.down * Math.sin(tilt)) / Math.cos(tilt);

  // The top of the chest runs from the ▽'s front corner down to its point.
  const corner = shoulders.clone().addScaledVector(trunk, T.up).addScaledVector(forward, T.side);
  const point = pelvis.clone().addScaledVector(trunk, T.down).addScaledVector(forward, arch);
  const chestAt = (x: number) =>
    corner.y + ((point.y - corner.y) * (x - corner.x)) / (point.x - corner.x);
  /** The bar resting on the chest, `along` past the shoulders; its middle just clear. */
  const barOn = (along: number) => {
    const x = shoulders.x + along;
    return new Vec3(x, chestAt(x) + 0.022, 0);
  };
  // The bottom: each forearm upright under the bar and each elbow 45° from
  // the side — as far down the body as it is out from the shoulder.
  const shoulder = shoulders.clone().add(new Vec3(0, 0, BODY.shoulder));
  const elbowAt = (along: number) =>
    barOn(along).add(new Vec3(0, -BODY.forearm, BODY.shoulder + along));
  const along = halve((a) => elbowAt(a).distanceTo(shoulder) - BODY.upperArm, 0, 0.3);
  const grip = BODY.shoulder + along;
  const bottom = barOn(along);
  // The top: arms straight, the bar over the shoulder joints.
  const reach = 0.998 * (BODY.upperArm + BODY.forearm);
  const top = new Vec3(shoulders.x, shoulders.y + Math.sqrt(reach * reach - along * along), 0);

  const toeOut = (25 * Math.PI) / 180;
  const feet = SIDES.map((s) => new Vec3(Math.cos(toeOut), 0, s * Math.sin(toeOut))) as [
    Vec3,
    Vec3,
  ];
  const ankles = SIDES.map((s) => new Vec3(0.4, BODY.ankle, s * 0.3)) as [Vec3, Vec3];

  return {
    kit: { bar: true, bench },
    film: { views: [0], middle: new Vec3(-0.15, 0, 0), room: { height: 1.45, width: 1.8 } },
    pose(depth) {
      const d = Math.min(Math.max(depth, 0), 1);
      // Straight down at first, drifting to the chest late; up, back over
      // the shoulders early.
      const bar = new Vec3(lerp(top.x, bottom.x, d * d), lerp(top.y, bottom.y, d), 0);
      const pose = poseFrom({
        pelvis,
        lean,
        ankles,
        feet,
        hands: SIDES.map((s) => bar.clone().add(new Vec3(0, 0, s * grip))) as [Vec3, Vec3],
        elbowPole: new Vec3(0, -1, 0),
        bar,
      });
      // The forearms upright all the way down.
      pose.arms = pose.arms.map((arm) => {
        const mid = elbowUnder(arm.root, arm.end) ?? arm.mid;
        return { ...arm, mid };
      }) as [Limb, Limb];
      // The head rests on the bench.
      pose.head = new Vec3(pose.head.x, bench.top + SIZE.head, 0);
      pose.arch = arch;
      return pose;
    },
  };
}

/**
 * The elbow straight under the hand, seen from the side — the forearm
 * upright, as a pressing coach asks all the way down — and below the line
 * from shoulder to hand. Nothing if the arm can't reach.
 */
function elbowUnder(shoulder: Vec3, hand: Vec3) {
  // Across the body the elbow is on two circles, one round the shoulder and
  // one round the hand: where they meet.
  const r1 = Math.sqrt(BODY.upperArm ** 2 - (hand.x - shoulder.x) ** 2);
  const r2 = BODY.forearm;
  const dy = hand.y - shoulder.y;
  const dz = hand.z - shoulder.z;
  const d = Math.hypot(dy, dz);
  if (!(d > 0) || d > r1 + r2 || d < Math.abs(r1 - r2)) return undefined;
  const a = (r1 * r1 - r2 * r2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(r1 * r1 - a * a, 0));
  const y = shoulder.y + (a * dy) / d;
  const z = shoulder.z + (a * dz) / d;
  const [ey, ez] = [-dz / d, dy / d];
  const one = new Vec3(hand.x, y + h * ey, z + h * ez);
  const two = new Vec3(hand.x, y - h * ey, z - h * ez);
  return one.y < two.y ? one : two;
}

/** Every movement Milo can film, by its id. */
export const MOVES: Record<string, Move> = {
  back_squat: backSquat(),
  bench: benchPress(),
};
