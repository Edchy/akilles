import { BODY, poseFrom, SIDES, type Pose } from "@/motion/figure";
import { Vec3 } from "@/motion/vector";

/**
 * A movement as Milo films it: the pose at every depth of one rep, from 0
 * (the start) to 1 (the hardest point), and what the lifter holds.
 *
 * Each pose is worked out from the rules a coach would give, not drawn, so it
 * can't drift: the feet stay flat where they are, the knees bend towards the
 * toes, every bone keeps its length, and — for a barbell — the trunk leans
 * exactly as far as keeps the bar over the middle of the foot. tests/motion.cjs
 * checks each one against a coach's ranges.
 */
export type Move = {
  pose: (depth: number) => Pose;
  kit: "barbell";
};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** The forward lean, in radians, that puts `bar` over `x`, found by halving. */
function leanToBalance(barAt: (lean: number) => number, x: number) {
  let lo = -0.2;
  let hi = 1.2;
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (barAt(mid) < x) lo = mid;
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
    kit: "barbell",
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
      const lean = leanToBalance((l) => barFrom(l).x, midFoot);
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

/** Every movement Milo can film, by its id. */
export const MOVES: Record<string, Move> = {
  back_squat: backSquat(),
};
