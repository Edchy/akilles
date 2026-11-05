import { Vec3 } from "@/motion/vector";

/**
 * Milo's figure: a body with real joints in the right places, so every angle
 * of a movement is true from any side.
 *
 * Lengths are in metres for someone 1.75 m tall, from standard body-segment
 * ratios (thigh and shin about a quarter of height each, upper arm under a
 * fifth). This file is only where the joints are; how the body is drawn
 * over them is `marks.ts`.
 *
 * Axes: the figure faces +x, y is up, and z runs across the body. Side 0 is
 * +z, side 1 is −z.
 */
export const BODY = {
  /** The ankle joint above the floor. */
  ankle: 0.075,
  /** The back of the heel behind the ankle joint, and the toes ahead of it. */
  heel: 0.065,
  toe: 0.195,
  shin: 0.43,
  thigh: 0.43,
  /** Each hip joint from the middle of the pelvis. */
  hip: 0.09,
  /** Hip joints to shoulder joints, up the spine. */
  torso: 0.5,
  /** Each shoulder joint from the middle. */
  shoulder: 0.19,
  upperArm: 0.31,
  /** Elbow to the middle of the fist. */
  forearm: 0.29,
  /** Shoulder joints to the middle of the head. */
  neck: 0.21,
};

export const SIDES = [1, -1] as const;

/** An arm or a leg: shoulder or hip, elbow or knee, hand or ankle. */
export type Limb = { root: Vec3; mid: Vec3; end: Vec3 };

/** A leg, with the way its foot points (heel to toe, flat on the floor). */
export type Leg = Limb & { foot: Vec3 };

/** Where everything is at one moment. */
export type Pose = {
  /** Midway between the hip joints. */
  pelvis: Vec3;
  /** Up the spine, out of the chest and across the body: unit vectors. */
  trunk: Vec3;
  forward: Vec3;
  across: Vec3;
  legs: [Leg, Leg];
  arms: [Limb, Limb];
  /** The middle of the head. */
  head: Vec3;
  /** The middle of a barbell, when there is one; it runs across the body. */
  bar?: Vec3;
};

/**
 * The middle joint of a two-bone limb whose ends are fixed: the knee between
 * hip and ankle, the elbow between shoulder and hand. It bends towards `pole`
 * — a knee towards its toes, so it always tracks them.
 */
export function twoBone(root: Vec3, end: Vec3, a: number, b: number, pole: Vec3): Vec3 {
  const axis = end.clone().sub(root);
  const d = Math.min(axis.length(), a + b - 1e-6);
  axis.normalize();
  const along = (a * a - b * b + d * d) / (2 * d);
  const out = Math.sqrt(Math.max(a * a - along * along, 0));
  const bend = pole.clone().addScaledVector(axis, -pole.dot(axis)).normalize();
  return root.clone().addScaledVector(axis, along).addScaledVector(bend, out);
}

/**
 * A knee over its foot: bent the way the toes point, then turned out round
 * the hip–ankle line until, seen from above, it sits over the line of the
 * foot. Bending towards the toes isn't enough when the feet are wider than
 * the hips — the knee would fall a few centimetres inside the foot, which is
 * a knee caving in. Nearly straight, a knee can't be moved off that line at
 * all, so there it simply stays as close as it can.
 */
function kneeOverFoot(hip: Vec3, ankle: Vec3, foot: Vec3): Vec3 {
  const up = new Vec3(0, 1, 0);
  const across = new Vec3().crossVectors(up, foot).normalize();
  const kneeAt = (turn: number) =>
    twoBone(hip, ankle, BODY.thigh, BODY.shin, foot.clone().applyAxisAngle(up, turn));
  const off = (turn: number) => kneeAt(turn).sub(ankle).dot(across);
  const limit = Math.PI / 4;
  let lo = -limit;
  let hi = limit;
  if (Math.sign(off(lo)) === Math.sign(off(hi))) {
    return kneeAt(Math.abs(off(lo)) < Math.abs(off(hi)) ? lo : hi);
  }
  const rising = off(hi) > off(lo);
  for (let i = 0; i < 40; i++) {
    const mid = (lo + hi) / 2;
    if (off(mid) > 0 === rising) hi = mid;
    else lo = mid;
  }
  return kneeAt((lo + hi) / 2);
}

/**
 * A whole pose from what a movement decides — where the pelvis is, how far
 * the trunk leans, where the feet and hands are — with the knees and elbows
 * worked out so every bone keeps its length, and the knees over the feet.
 */
export function poseFrom({
  pelvis,
  lean,
  ankles,
  feet,
  hands,
  elbowPole,
  bar,
}: {
  pelvis: Vec3;
  /** Forward lean of the trunk from upright, in radians. */
  lean: number;
  ankles: [Vec3, Vec3];
  feet: [Vec3, Vec3];
  hands: [Vec3, Vec3];
  /** The way the elbows point. */
  elbowPole: Vec3;
  bar?: Vec3;
}): Pose {
  const trunk = new Vec3(Math.sin(lean), Math.cos(lean), 0);
  const forward = new Vec3(Math.cos(lean), -Math.sin(lean), 0);
  const across = new Vec3(0, 0, 1);
  const top = pelvis.clone().addScaledVector(trunk, BODY.torso);

  const legs = SIDES.map((side, i): Leg => {
    const root = pelvis.clone().addScaledVector(across, side * BODY.hip);
    const end = ankles[i];
    return { root, mid: kneeOverFoot(root, end, feet[i]), end, foot: feet[i] };
  }) as [Leg, Leg];

  const arms = SIDES.map((side, i): Limb => {
    const root = top.clone().addScaledVector(across, side * BODY.shoulder);
    const end = hands[i];
    return { root, mid: twoBone(root, end, BODY.upperArm, BODY.forearm, elbowPole), end };
  }) as [Limb, Limb];

  const head = top.clone().addScaledVector(trunk, BODY.neck).addScaledVector(forward, 0.015);
  return { pelvis, trunk, forward, across, legs, arms, head, bar };
}

/** The angle between two directions, in degrees. */
export const degrees = (a: Vec3, b: Vec3) => (a.angleTo(b) * 180) / Math.PI;

/**
 * The joint angles a coach looks at, in degrees, for checking a movement:
 * each knee and hip bent from straight, each ankle's shin forward of upright
 * (in the plane of its foot), and the trunk's lean.
 */
export function anglesOf(pose: Pose) {
  const up = new Vec3(0, 1, 0);
  const spineDown = pose.trunk.clone().negate();
  return {
    knees: pose.legs.map(
      (l) => 180 - degrees(l.root.clone().sub(l.mid), l.end.clone().sub(l.mid)),
    ),
    hips: pose.legs.map((l) => degrees(l.mid.clone().sub(l.root), spineDown)),
    ankles: pose.legs.map((l) => {
      const shin = l.mid.clone().sub(l.end);
      const inPlane = l.foot.clone().multiplyScalar(shin.dot(l.foot)).addScaledVector(up, shin.y);
      return degrees(inPlane, up);
    }),
    lean: degrees(pose.trunk, up),
  };
}
