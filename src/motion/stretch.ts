import {
  armFrom,
  balance,
  clamp01,
  ease,
  lerp,
  mirror,
  mixed,
  rad,
  stand,
  standing,
  standingHips,
  turned,
  withArms,
  withinReach,
  type Move,
} from "@/motion/build";
import { body, feetFlat, kneesAt, legsFrom, twisted } from "@/motion/core";
import {
  BODY,
  poseFrom,
  SIDES,
  SIZE,
  type Leg,
  type Limb,
  type Pose,
  type Prop,
} from "@/motion/figure";
import { Vec3 } from "@/motion/vector";

/**
 * The stretches: each a film from getting set to the stretch itself, held at
 * its deepest point. Each follows its guide (see `data/guides.ts`).
 */

const DOWN = new Vec3(0, -1, 0);
const UP = new Vec3(0, 1, 0);
const AHEAD = new Vec3(1, 0, 0);
const ACROSS = new Vec3(0, 0, 1);
const LEG = 0.998 * (BODY.thigh + BODY.shin);
const ARM = 0.995 * (BODY.upperArm + BODY.forearm);

const rod = (from: Vec3, to: Vec3): Prop => ({ kind: "line", from, to });
const along = (a: number) => new Vec3(Math.sin(a), Math.cos(a), 0);
const unit = (x: number, y: number, z: number) => new Vec3(x, y, z).normalize();
const blend = (a: Vec3, b: Vec3, t: number) => mixed(a, b, t).normalize();

/** The head turned `degrees` from straight up the spine toward `toward`. */
function looking(pose: Pose, toward: Vec3, degrees: number) {
  const top = pose.pelvis.clone().addScaledVector(pose.trunk, BODY.torso);
  pose.head = top.addScaledVector(turned(pose.trunk, toward, degrees), BODY.neck);
  return pose;
}

/** Feet flat or not. */
function flat(pose: Pose, on: [boolean, boolean]) {
  pose.legs = pose.legs.map((leg, i) => ({ ...leg, planted: on[i] })) as [Leg, Leg];
  return pose;
}

/** A film held at its deepest point: from getting set to the stretch. */
const hold = (middle: number, room: { height: number; width: number }, views = [0]) => ({
  views,
  middle: new Vec3(middle, 0, 0),
  room,
});

/** A mat on the floor under a lying or kneeling body. */
const mat = (from: number, to: number): Prop => ({
  kind: "pad",
  from: new Vec3(from, 0.012, 0),
  to: new Vec3(to, 0.012, 0),
  half: 0.3,
  thick: 0.012,
});

/**
 * The couch stretch: the back knee down by a wall, shin and foot up against
 * it, the front foot flat; rise from leaning on the front knee to upright,
 * squeezing the back glute — the pelvis tucked, not the back arched.
 */
function couch(): Move {
  const wall = -0.27;
  const knee = new Vec3(wall + SIZE.shin + 0.03, 0.07, -BODY.hip);
  const ankle = knee.clone().add(new Vec3(-0.03, BODY.shin * 0.999, 0));
  ankle.x = knee.x - Math.sqrt(BODY.shin ** 2 - (ankle.y - knee.y) ** 2);
  const front = new Vec3(0.5, BODY.ankle, 0.11);
  const toeOut = rad(6);
  return {
    kit: {},
    film: hold(0.1, { height: 1.55, width: 1.7 }),
    pose(depth) {
      const d = ease(clamp01(depth));
      // The back thigh from just behind upright to forward of it: the hip opening.
      const thigh = along(rad(lerp(-4, 20, d)));
      const pelvis = knee.clone().setZ(0).addScaledVector(thigh, BODY.thigh);
      const lean = rad(lerp(32, -2, d));
      const ankles = [front, ankle] as [Vec3, Vec3];
      const feet = [unit(Math.cos(toeOut), 0, Math.sin(toeOut)), unit(-0.2, 1, 0)] as [Vec3, Vec3];
      const sketch = poseFrom(
        { pelvis, lean, ankles, feet, hands: [pelvis, pelvis], elbowPole: DOWN },
      );
      const frontKnee = sketch.legs[0].mid;
      const onKnee = frontKnee.clone().add(new Vec3(0.02, 0.06, 0));
      const onHips = pelvis.clone().add(new Vec3(0.02, 0.1, 0));
      const pose = poseFrom({
        pelvis,
        lean,
        ankles,
        feet,
        hands: SIDES.map((s, i) =>
          withinReach(
            sketch.arms[i].root,
            mixed(onKnee, onHips.clone().setZ(s * 0.24), d).setZ(lerp(0.1 * s + 0.08, s * 0.24, d)),
          ),
        ) as [Vec3, Vec3],
        elbowPole: mirror(new Vec3(-0.6, -0.3, 0.6)),
      });
      pose.legs[1] = { ...pose.legs[1], mid: knee.clone(), planted: false };
      pose.props = [
        {
          kind: "pad",
          from: new Vec3(wall - 0.06, 0, 0),
          to: new Vec3(wall - 0.06, 0.95, 0),
          half: 0.5,
          thick: 0.06,
          up: AHEAD.clone(),
        },
        mat(-0.2, 0.75),
      ];
      return pose;
    },
  };
}

/**
 * The world's greatest stretch: a long lunge, back knee off the floor, both
 * hands down inside the front foot; turn the chest open and reach the arm
 * on the front leg's side to the ceiling.
 */
function worldsGreatest(): Move {
  const front = new Vec3(0.5, BODY.ankle, 0.13);
  const back = new Vec3(-0.65, 0.12, -0.11);
  const toeOut = rad(6);
  const feet = [unit(Math.cos(toeOut), 0, Math.sin(toeOut)), unit(-0.35, -1, 0)] as [Vec3, Vec3];
  const pelvis = new Vec3(0.02, 0.45, 0);
  const lean = rad(74);
  const base = { trunk: along(lean), forward: new Vec3(Math.cos(lean), -Math.sin(lean), 0) };
  return {
    kit: {},
    film: hold(0, { height: 1.55, width: 1.9 }),
    pose(depth) {
      const d = ease(clamp01(depth));
      const frame = twisted(base.trunk, base.forward, -rad(80) * d);
      const sketch = poseFrom(
        {
          pelvis,
          lean,
          frame,
          ankles: [front, back],
          feet,
          hands: [pelvis, pelvis],
          elbowPole: DOWN,
        },
      );
      const [near, far] = [sketch.arms[0].root, sketch.arms[1].root];
      const floorNear = new Vec3(0.44, 0.04, 0.03);
      const floorFar = new Vec3(0.44, 0.04, -0.13);
      const upward = near.clone().addScaledVector(blend(DOWN, UP, 1), ARM);
      const reach = d < 0.5 ? floorNear : mixed(floorNear, upward, ease((d - 0.3) / 0.7));
      const pose = poseFrom({
        pelvis,
        lean,
        frame,
        ankles: [front, back],
        feet,
        hands: [withinReach(near, reach), withinReach(far, floorFar)],
        elbowPole: [new Vec3(0.3, -0.2, 1), new Vec3(0, 1, -0.5)],
        kneePole: [undefined, DOWN],
      });
      flat(pose, [true, false]);
      looking(pose, UP, lerp(0, 60, d));
      pose.props = [mat(-0.8, 0.75)];
      return pose;
    },
  };
}

/** Lying on the back, the head toward −x: the hips, and up the spine. */
const LYING = { pelvis: new Vec3(0, SIZE.trunk.side, 0), trunk: new Vec3(-1, 0.001, 0) };

/**
 * A thigh raised `degrees` from along the floor toward the head, the knee
 * bent at a right angle: the knee and ankle.
 */
function raisedLeg(hip: Vec3, degrees: number) {
  const thigh = turned(AHEAD, UP, degrees);
  const shin = new Vec3(thigh.y, -thigh.x, 0);
  const knee = hip.clone().addScaledVector(thigh, BODY.thigh);
  return { knee, ankle: knee.clone().addScaledVector(shin, BODY.shin), thigh };
}

/**
 * The figure-four stretch: on the back, one ankle crossed over the opposite
 * knee; hold behind the bottom thigh and pull both legs toward the chest,
 * the head and shoulders resting on the floor.
 */
function figureFour(): Move {
  const { pelvis, trunk } = LYING;
  return {
    kit: {},
    film: hold(-0.1, { height: 1.15, width: 1.8 }, [28]),
    pose(depth) {
      const d = ease(clamp01(depth));
      const hip = pelvis.clone().setZ(BODY.hip);
      const bottom = raisedLeg(hip, lerp(37, 96, d));
      // The top ankle across the bottom knee, its knee out to the side.
      const cross = bottom.knee.clone().add(new Vec3(0.02, 0.075, -0.05));
      const top = pelvis.clone().setZ(-BODY.hip);
      const crossed = top.clone().addScaledVector(
        cross.clone().sub(top).normalize(),
        Math.min(LEG, cross.distanceTo(top)),
      );
      const shoulders = SIDES.map((s) =>
        pelvis.clone().addScaledVector(trunk, BODY.torso).setZ(s * BODY.shoulder),
      );
      const behind = bottom.knee
        .clone()
        .addScaledVector(bottom.thigh, -0.12)
        .add(new Vec3(-0.06, -0.02, 0));
      const atSides = SIDES.map((s) => new Vec3(-0.1, 0.04, s * 0.3));
      const holds = [behind.clone().setZ(0.2), behind.clone().setZ(-0.02)];
      const hands = SIDES.map((_, i) =>
        withinReach(shoulders[i], mixed(atSides[i], holds[i], ease(d * 1.6))),
      ) as [Vec3, Vec3];
      const pose = body(pelvis, trunk, {
        ankles: [bottom.ankle, crossed],
        feet: [blend(AHEAD, bottom.thigh, d), unit(0.3, 0.6, 1)],
        hands,
        elbowPole: mirror(new Vec3(0.2, 1, 0.8)),
        kneePole: [UP, unit(0.3, 0.4, -1)],
      });
      pose.legs[0] = { ...pose.legs[0], mid: bottom.knee, planted: d < 0.05 };
      pose.legs[1] = { ...pose.legs[1], planted: false };
      pose.props = [mat(-0.95, 0.6)];
      return pose;
    },
  };
}

/**
 * The calf stretch on a wall: hands on the wall, one foot well behind; the
 * back leg straight with the heel down, lean in until the calf stretches.
 */
function calfWall(): Move {
  const wall = 0.6;
  const back = new Vec3(-0.45, BODY.ankle, -0.11);
  const front = new Vec3(0.12, BODY.ankle, 0.11);
  const toeOut = rad(5);
  const reach = Math.sqrt(LEG ** 2 - (BODY.hip - 0.11) ** 2) * 0.999;
  return {
    kit: {},
    film: hold(0.05, { height: 2.0, width: 1.6 }),
    pose(depth) {
      const d = ease(clamp01(depth));
      const lean = rad(lerp(21, 34, d));
      // The back leg and trunk in one line from the heel.
      const pelvis = back.clone().setZ(0).addScaledVector(along(lean), reach);
      const shoulders = SIDES.map((s) =>
        pelvis.clone().addScaledVector(along(lean), BODY.torso).setZ(s * BODY.shoulder),
      );
      const hands = SIDES.map((s, i) =>
        withinReach(shoulders[i], new Vec3(wall - 0.03, 1.28, s * 0.2)),
      ) as [Vec3, Vec3];
      const pose = poseFrom({
        pelvis,
        lean,
        ankles: [front, back],
        feet: [
          unit(Math.cos(toeOut), 0, Math.sin(toeOut)),
          unit(Math.cos(toeOut), 0, -Math.sin(toeOut)),
        ],
        hands,
        elbowPole: mirror(new Vec3(0, -1, 0.6)),
      });
      pose.props = [
        {
          kind: "pad",
          from: new Vec3(wall + 0.03, 0, 0),
          to: new Vec3(wall + 0.03, 2.0, 0),
          half: 0.6,
          thick: 0.06,
          up: AHEAD.clone().negate(),
        },
      ];
      return pose;
    },
  };
}

/**
 * On all fours: knees under the hips, hands under the shoulders, the trunk at
 * `lean` and the hips `back` behind the knees (a child's pose sits back).
 */
function allFours(lean: number, hands: [Vec3, Vec3], kneeWide = 0.1) {
  const knees = mirror(new Vec3(0, 0.07, kneeWide));
  const ankles = knees.map((k) => {
    const dz = 0.08 * Math.sign(k.z) - k.z;
    return k.clone().add(new Vec3(-Math.sqrt(BODY.shin ** 2 - dz * dz - 0.01 ** 2), -0.01, dz));
  }) as [Vec3, Vec3];
  return (back: number) => {
    const rise = Math.sqrt(BODY.thigh ** 2 - (kneeWide - BODY.hip) ** 2);
    const pelvis = new Vec3(-rise * Math.sin(back), 0.07 + rise * Math.cos(back), 0);
    const shoulders = SIDES.map((s) =>
      pelvis.clone().addScaledVector(along(lean), BODY.torso).setZ(s * BODY.shoulder),
    );
    const pose = poseFrom({
      pelvis,
      lean,
      ankles,
      feet: mirror(unit(-1, -0.2, 0)),
      hands: SIDES.map((_, i) => withinReach(shoulders[i], hands[i])) as [Vec3, Vec3],
      elbowPole: mirror(new Vec3(-0.6, 0.4, 0.2)),
    });
    kneesAt(pose, knees);
    return flat(pose, [false, false]);
  };
}

/**
 * Cat–cow: on all fours; round the back up, the head dropping — then let it
 * sag, the head and tail lifting. One slow breath for each.
 */
function catCow(): Move {
  const hands = mirror(new Vec3(0.49, 0.04, 0.12));
  return {
    kit: {},
    film: hold(0.05, { height: 1.15, width: 1.7 }),
    pose(depth) {
      const d = ease(clamp01(depth));
      const lean = rad(lerp(79, 71, d));
      const pose = allFours(lean, hands)(rad(lerp(3, -3, d)));
      pose.arch = lerp(-0.07, 0.08, d);
      looking(pose, pose.forward, lerp(55, -18, d));
      pose.props = [mat(-0.6, 0.75)];
      return pose;
    },
  };
}

/**
 * Child's pose: kneeling, big toes together and knees wide; sink the hips
 * back to the heels, arms long in front, and breathe into the back.
 */
function childsPose(): Move {
  return {
    kit: {},
    film: hold(0, { height: 1.15, width: 1.9 }),
    pose(depth) {
      const d = ease(clamp01(depth));
      const lean = rad(lerp(75, 94, d));
      const hands = mirror(new Vec3(lerp(0.49, 0.72, d), 0.04, 0.14));
      const pose = allFours(lean, hands, 0.2)(rad(lerp(0, 72, d)));
      looking(pose, pose.forward, lerp(20, 8, d));
      pose.props = [mat(-0.6, 0.9)];
      return pose;
    },
  };
}

/**
 * The chest and shoulder opener: a stick held well wider than the shoulders,
 * arms straight; raise it overhead and take it back behind the head.
 */
function chestOpener(): Move {
  const grip = 0.55;
  const spread = Math.asin((grip - BODY.shoulder) / ARM);
  return {
    kit: {},
    film: hold(0, { height: 2.3, width: 1.5 }, [35]),
    pose(depth) {
      const d = clamp01(depth);
      const a = d < 0.6 ? lerp(8, 180, ease(d / 0.6)) : lerp(180, 214, ease((d - 0.6) / 0.4));
      const lean = rad(lerp(0, -4, d));
      const pelvis = standingHips(0, 0.15);
      const { feet, ankles } = stand(0.15, rad(10));
      const top = pelvis.clone().addScaledVector(along(lean), BODY.torso);
      const arms = SIDES.map((s) => {
        const dir = turned(DOWN, AHEAD, a).multiplyScalar(Math.cos(spread)).add(
          new Vec3(0, 0, s * Math.sin(spread)),
        );
        return armFrom(top.clone().setZ(s * BODY.shoulder), dir, dir);
      }) as [Limb, Limb];
      const pose = withArms(
        poseFrom(
          { pelvis, lean, ankles, feet, hands: [arms[0].end, arms[1].end], elbowPole: DOWN },
        ),
        arms,
      );
      const [l, r] = [arms[0].end, arms[1].end];
      const out = l.clone().sub(r).normalize().multiplyScalar(0.12);
      pose.props = [rod(l.clone().add(out), r.clone().sub(out))];
      return pose;
    },
  };
}

/**
 * The cross-body shoulder stretch: one arm straight across the chest at
 * chest height, held at the elbow by the other hand and pulled in gently,
 * the shoulder kept down. Seen from the front.
 */
function crossBody(): Move {
  return {
    kit: {},
    film: hold(0, { height: 2.0, width: 1.4 }, [75]),
    pose(depth) {
      const d = ease(clamp01(depth));
      const pelvis = standingHips(0, 0.15);
      const { feet, ankles } = stand(0.15, rad(10));
      const top = pelvis.clone().addScaledVector(UP, BODY.torso);
      const across = unit(0.32, -0.08, -1);
      const dir = blend(DOWN, across, d);
      const arm = armFrom(top.clone().setZ(BODY.shoulder), dir, dir);
      const other = top.clone().setZ(-BODY.shoulder);
      const atSide = other.clone().add(new Vec3(0.02, -ARM, -0.03));
      const atElbow = arm.mid.clone().add(new Vec3(0.07, -0.02, 0));
      const hand = withinReach(other, mixed(atSide, atElbow, ease((d - 0.2) / 0.8)));
      const pose = poseFrom({
        pelvis,
        lean: 0,
        ankles,
        feet,
        hands: [arm.end, hand],
        elbowPole: [DOWN, unit(0.2, -1, -0.6)],
      });
      pose.arms[0] = arm;
      return pose;
    },
  };
}

/**
 * The standing forward fold: feet hip width, knees soft; fold from the hips
 * and let the upper body, arms and head hang.
 */
function forwardFold(): Move {
  return {
    kit: {},
    film: hold(-0.1, { height: 2.0, width: 1.6 }),
    pose(depth) {
      const d = ease(clamp01(depth));
      const lean = rad(lerp(0, 112, d));
      const bend = lerp(0.005, 0.05, d);
      const make = (x: number) => {
        const pelvis = standingHips(x, 0.15).add(new Vec3(0, -bend, 0));
        const top = pelvis.clone().addScaledVector(along(lean), BODY.torso);
        const hands = SIDES.map((s) =>
          top.clone().add(new Vec3(0.03, -ARM * 0.99, s * 0.17)),
        ) as [Vec3, Vec3];
        return standing({ x, bend, lean }, hands, mirror(new Vec3(-1, 0, 0.2)));
      };
      const pose = make(balance(make));
      looking(pose, pose.forward, lerp(0, 25, d));
      return pose;
    },
  };
}

/**
 * Knees to chest: on the back, hug both knees in with the hands under them,
 * the head resting on the floor.
 */
function kneesToChest(): Move {
  const { pelvis, trunk } = LYING;
  return {
    kit: {},
    film: hold(-0.15, { height: 1.1, width: 1.8 }),
    pose(depth) {
      const d = ease(clamp01(depth));
      const legs = SIDES.map((s) => raisedLeg(pelvis.clone().setZ(s * BODY.hip), lerp(37, 122, d)));
      const shoulders = SIDES.map((s) =>
        pelvis.clone().addScaledVector(trunk, BODY.torso).setZ(s * BODY.shoulder),
      );
      const hands = SIDES.map((s, i) => {
        const under = legs[i].knee
          .clone()
          .addScaledVector(legs[i].thigh, -0.06)
          .add(new Vec3(0.03, -0.07, s * 0.04));
        return withinReach(
          shoulders[i],
          mixed(new Vec3(-0.1, 0.04, s * 0.3), under, ease(d * 1.5)),
        );
      }) as [Vec3, Vec3];
      const pose = body(pelvis, trunk, {
        ankles: legs.map((l) => l.ankle) as [Vec3, Vec3],
        feet: legs.map((l) => blend(AHEAD, l.thigh, d)) as [Vec3, Vec3],
        hands,
        elbowPole: mirror(new Vec3(0, 1, 0.8)),
      });
      kneesAt(pose, legs.map((l) => l.knee));
      flat(pose, [d < 0.05, d < 0.05]);
      pose.props = [mat(-0.95, 0.6)];
      return pose;
    },
  };
}

/**
 * The lat stretch on a wall: standing side-on, the forearm on the wall above
 * the head; lean in and let the chest sink away from the arm, the shoulder
 * down from the ear. Seen from the front.
 */
function latWall(): Move {
  const wall = -0.5;
  return {
    kit: {},
    film: { views: [90], middle: new Vec3(0, 0, -0.15), room: { height: 2.35, width: 1.5 } },
    pose(depth) {
      const d = ease(clamp01(depth));
      const tilt = rad(lerp(0, 16, d));
      const trunk = new Vec3(0, Math.cos(tilt), -Math.sin(tilt));
      const frame = { trunk, forward: AHEAD.clone() };
      const across = new Vec3().crossVectors(AHEAD, trunk);
      const { feet, ankles } = stand(0.16, rad(8));
      const pelvis = standingHips(0, 0.16).add(new Vec3(0, -lerp(0.02, 0.04, d), lerp(0, 0.05, d)));
      const top = pelvis.clone().addScaledVector(trunk, BODY.torso);
      const shoulder = top.clone().addScaledVector(across, -BODY.shoulder);
      const dz = (wall + SIZE.upperArm - shoulder.z) / BODY.upperArm;
      const upper = new Vec3(0.05, Math.sqrt(Math.max(1 - dz * dz - 0.0025, 0)), dz);
      const elbow = shoulder.clone().addScaledVector(upper, BODY.upperArm);
      const arm: Limb = {
        root: shoulder,
        mid: elbow,
        end: elbow.clone().add(new Vec3(0.02, BODY.forearm * 0.9997, 0)),
      };
      arm.end = elbow.clone().addScaledVector(unit(0.06, 1, 0), BODY.forearm);
      const near = top.clone().addScaledVector(across, BODY.shoulder);
      const onHip = withinReach(
        near,
        pelvis.clone().addScaledVector(across, 0.2).add(new Vec3(0.03, 0.08, 0)),
      );
      const pose = poseFrom({
        pelvis,
        lean: 0,
        frame,
        ankles,
        feet,
        hands: [onHip, arm.end],
        elbowPole: [unit(-0.3, -0.2, 1), DOWN],
      });
      pose.arms[1] = arm;
      pose.props = [
        {
          kind: "pad",
          from: new Vec3(0, 0, wall - 0.03),
          to: new Vec3(0, 2.25, wall - 0.03),
          half: 0.6,
          thick: 0.06,
          up: ACROSS.clone(),
          across: AHEAD.clone(),
        },
      ];
      return pose;
    },
  };
}

/**
 * The seated hamstring stretch: one leg straight, the other foot against its
 * inner thigh; hinge forward from the hips over the straight leg and reach
 * for the shin or ankle.
 */
function seatedHamstring(): Move {
  const pelvis = new Vec3(0, 0.14, 0);
  const hip = pelvis.clone().setZ(BODY.hip);
  const full = BODY.thigh + BODY.shin;
  const straight = hip.clone().add(
    new Vec3(Math.sqrt(full ** 2 - (hip.y - BODY.ankle) ** 2), BODY.ankle - hip.y, 0),
  );
  const bentHip = pelvis.clone().setZ(-BODY.hip);
  const knee = bentHip.clone().addScaledVector(unit(0.3, -0.07, -0.33), BODY.thigh);
  const ankle = knee.clone().addScaledVector(
    new Vec3(0.3, 0.075, 0.05).sub(knee).normalize(),
    BODY.shin,
  );
  return {
    kit: {},
    film: hold(0.15, { height: 1.3, width: 1.8 }),
    pose(depth) {
      const d = ease(clamp01(depth));
      const lean = rad(lerp(2, 58, d));
      const shoulders = SIDES.map((s) =>
        pelvis.clone().addScaledVector(along(lean), BODY.torso).setZ(s * BODY.shoulder),
      );
      const onFloor = SIDES.map((s) => new Vec3(-0.12, 0.04, s * 0.3));
      const shin = straight.clone().add(new Vec3(-0.08, 0.07, 0));
      const hands = SIDES.map((s, i) =>
        withinReach(shoulders[i], mixed(onFloor[i], shin.clone().setZ(BODY.hip + 0.06 * s), d)),
      ) as [Vec3, Vec3];
      const pose = poseFrom({
        pelvis,
        lean,
        ankles: [straight, ankle],
        feet: [UP.clone(), unit(1, 0.1, 0.5)],
        hands,
        elbowPole: mirror(new Vec3(-0.3, -1, 0.5)),
        kneePole: [UP, UP],
      });
      kneesAt(pose, [hip.clone().add(straight).multiplyScalar(0.5), knee]);
      flat(pose, [false, false]);
      pose.props = [mat(-0.6, 1.0)];
      return pose;
    },
  };
}

/**
 * The standing hip flexor stretch: a long split stance, back heel up; tuck
 * the pelvis, bend both knees a little and shift forward until the front of
 * the back hip stretches.
 */
function standingHipFlexor(): Move {
  const front = new Vec3(0.38, BODY.ankle, 0.11);
  const back = new Vec3(-0.5, 0.13, -0.11);
  const toeOut = rad(6);
  const feet = [unit(Math.cos(toeOut), 0, Math.sin(toeOut)), unit(-0.35, -1, 0)] as [Vec3, Vec3];
  return {
    kit: {},
    film: hold(0, { height: 2.0, width: 1.7 }),
    pose(depth) {
      const d = ease(clamp01(depth));
      const x = lerp(-0.08, 0.06, d);
      const reach = (a: Vec3, z: number) =>
        a.y + Math.sqrt(LEG ** 2 - (x - a.x) ** 2 - (z - a.z) ** 2);
      const high = Math.min(reach(front, BODY.hip), reach(back, -BODY.hip));
      const pelvis = new Vec3(x, high - lerp(0.02, 0.1, d), 0);
      const lean = rad(lerp(3, -3, d));
      const shoulders = SIDES.map((s) =>
        pelvis.clone().addScaledVector(along(lean), BODY.torso).setZ(s * BODY.shoulder),
      );
      const hands = SIDES.map((s, i) =>
        withinReach(shoulders[i], pelvis.clone().add(new Vec3(0.03, 0.12, s * 0.21))),
      ) as [Vec3, Vec3];
      const pose = poseFrom({
        pelvis,
        lean,
        ankles: [front, back],
        feet,
        hands,
        elbowPole: mirror(new Vec3(-0.6, 0, 1)),
        kneePole: [undefined, unit(0.3, -1, 0)],
      });
      return flat(pose, [true, false]);
    },
  };
}

/**
 * The lying twist: on the back, one leg straight; bend the other knee and
 * draw it across the body to the floor, holding it down, the other arm out
 * wide, looking away from it — both shoulder blades staying down.
 */
function supineTwist(): Move {
  const { pelvis } = LYING;
  return {
    kit: {},
    film: { views: [0], middle: new Vec3(0, 0, 0), room: { height: 1.05, width: 2.15 } },
    pose(depth) {
      const d = ease(clamp01(depth));
      const roll = rad(lerp(0, 10, d));
      const frame = {
        trunk: new Vec3(-1, 0, 0),
        forward: new Vec3(0, Math.cos(roll), -Math.sin(roll)),
      };
      const across = new Vec3().crossVectors(frame.forward, frame.trunk);
      const hips = SIDES.map((s) => pelvis.clone().addScaledVector(across, s * BODY.hip));
      // The twisting leg (side 0) from straight to its knee across on the floor.
      const thigh = blend(AHEAD, unit(0.45, 0.42, -0.78), d);
      const shin = blend(AHEAD, unit(0.55, -0.5, 0.65), d);
      const knee = hips[0].clone().addScaledVector(thigh, BODY.thigh);
      const ankle = knee.clone().addScaledVector(shin, BODY.shin);
      const straight = hips[1].clone().add(
        new Vec3(Math.sqrt(LEG ** 2 - (hips[1].y - BODY.ankle) ** 2), BODY.ankle - hips[1].y, 0),
      );
      const top = pelvis.clone().addScaledVector(frame.trunk, BODY.torso);
      const shoulders = SIDES.map((s) => top.clone().addScaledVector(across, s * BODY.shoulder));
      const wide = shoulders[0].clone().add(new Vec3(-0.12, 0, ARM * 0.95));
      const sideOf = (i: number) => new Vec3(-0.1, 0.04, SIDES[i] * 0.3);
      const onKnee = knee.clone().add(new Vec3(0, 0.07, 0));
      const hands = [
        withinReach(shoulders[0], mixed(sideOf(0), wide, d)),
        withinReach(shoulders[1], mixed(sideOf(1), onKnee, d)),
      ] as [Vec3, Vec3];
      const pose = poseFrom({
        pelvis,
        lean: 0,
        frame,
        ankles: [ankle, straight],
        feet: [blend(UP, unit(0.2, 0.3, -1), d), UP.clone()],
        hands,
        elbowPole: [UP, unit(0, 1, -0.3)],
      });
      pose.legs[0] = { ...pose.legs[0], root: hips[0], mid: knee, end: ankle };
      flat(pose, [false, false]);
      looking(pose, ACROSS, lerp(0, 40, d));
      pose.props = [mat(-0.95, 0.95)];
      return pose;
    },
  };
}

// ---- the shoulder warm-up ----

/** A light band from hand to hand, or from where it is tied to the hand. */
const band = (from: Vec3, to: Vec3): Prop => rod(from, to);

/**
 * The ball on the wall: turned half toward the wall so the near shoulder
 * leads, a ball pinned between the wall and the front of that shoulder, the
 * far hand on the wall; lean in and roll it by dipping slowly at the knees.
 * Seen from the side, the ball against the wall.
 */
function ballShoulder(): Move {
  const r = 0.06;
  const lean = rad(15);
  const turn = rad(50);
  // A step back from the wall, so only the shoulder reaches it.
  const back = -0.14;
  const trunk = along(lean);
  // Turned about the spine so the near shoulder points at the wall.
  const forward = new Vec3(Math.cos(turn), 0, -Math.sin(turn));
  const across = new Vec3().crossVectors(forward, trunk).normalize();
  return {
    kit: {},
    film: hold(0.05, { height: 2.1, width: 1.6 }),
    pose(depth) {
      const d = ease(clamp01(depth));
      // Soft at the knees from the start: turned, the hips sit wider of the feet.
      const bend = lerp(0.03, 0.09, d);
      const pelvis = standingHips(back, 0.15).add(new Vec3(0, -bend, 0));
      const top = pelvis.clone().addScaledVector(trunk, BODY.torso);
      const near = top.clone().addScaledVector(across, BODY.shoulder);
      const far = top.clone().addScaledVector(across, -BODY.shoulder);
      // The ball sits just ahead of the near shoulder joint, and the wall just
      // past the ball where it starts — the ball rolls down it as you dip.
      const front = 0.06;
      const ball = near.clone().add(new Vec3(front + r, 0, 0));
      const start = standingHips(back, 0.15).add(new Vec3(0, -0.03, 0)).addScaledVector(trunk, BODY.torso).addScaledVector(across, BODY.shoulder);
      const wall = start.x + front + 2 * r;
      const hands: [Vec3, Vec3] = [
        // The near arm hangs, out of the ball's way.
        withinReach(near, near.clone().add(new Vec3(-0.03, -ARM, 0.04)), 0.99),
        withinReach(far, new Vec3(wall - 0.03, 1.33 - bend, far.z), 0.99),
      ];
      const { feet, ankles } = stand(0.15, rad(10));
      ankles.forEach((a) => (a.x += back));
      const pose = poseFrom({
        pelvis,
        lean,
        frame: { trunk, forward },
        ankles,
        feet,
        hands,
        elbowPole: [unit(-0.2, -1, 0.3), unit(0, -1, -0.6)],
      });
      pose.props = [
        { kind: "ball", at: ball, r },
        {
          kind: "pad",
          from: new Vec3(wall + 0.03, 0, 0),
          to: new Vec3(wall + 0.03, 2.0, 0),
          half: 0.6,
          thick: 0.06,
          up: AHEAD.clone().negate(),
        },
      ];
      return pose;
    },
  };
}

/**
 * The band pull-apart: a light band held at shoulder height, arms straight
 * out in front, hands shoulder width; pull it apart into a T until it meets
 * the chest, then let it back slowly. Seen from the front.
 */
function bandPullApart(): Move {
  return {
    kit: {},
    film: { views: [90], lifts: true, middle: new Vec3(0, 0, 0), room: { height: 2.0, width: 2.0 } },
    pose(depth) {
      const d = ease(clamp01(depth));
      const pelvis = standingHips(0, 0.15);
      const { feet, ankles } = stand(0.15, rad(10));
      const top = pelvis.clone().addScaledVector(UP, BODY.torso);
      const arms = SIDES.map((s) => {
        // Ahead with the hands a shoulder width apart, out to the side in a
        // T — a little ahead still, so the band meets the chest.
        const ahead = unit(1, -0.05, 0);
        const out = unit(0.16, -0.05, s);
        const dir = blend(ahead, out, d);
        return armFrom(top.clone().setZ(s * BODY.shoulder), dir, dir);
      }) as [Limb, Limb];
      const pose = withArms(
        poseFrom({
          pelvis,
          lean: 0,
          ankles,
          feet,
          hands: [arms[0].end, arms[1].end],
          elbowPole: DOWN,
        }),
        arms,
      );
      pose.props = [band(arms[0].end, arms[1].end)];
      return pose;
    },
  };
}

/**
 * The band external rotation: side-on to a band tied at elbow height, held
 * in the far hand; the elbow bent square and pinned to the side, turn the
 * hand out from across the belly, slowly, and back. Seen from the front.
 */
function bandExternalRotation(): Move {
  return {
    kit: {},
    film: { views: [90], lifts: true, middle: new Vec3(0, 0, -0.3), room: { height: 2.1, width: 2.0 } },
    pose(depth) {
      const d = ease(clamp01(depth));
      const pelvis = standingHips(0, 0.15);
      const { feet, ankles } = stand(0.15, rad(10));
      const top = pelvis.clone().addScaledVector(UP, BODY.torso);
      const shoulder = top.clone().setZ(BODY.shoulder);
      // The upper arm hangs against the side; the forearm turns about it,
      // level, from across the belly to out past the shoulder.
      const upper = unit(0.06, -1, -0.04);
      const turn = rad(lerp(-62, 55, d));
      const fore = new Vec3(Math.cos(turn), 0, Math.sin(turn));
      const arm = armFrom(shoulder, upper, fore);
      const other = top.clone().setZ(-BODY.shoulder);
      const hanging = withinReach(other, other.clone().add(new Vec3(0.02, -ARM, -0.05)), 0.99);
      const pose = poseFrom({
        pelvis,
        lean: 0,
        ankles,
        feet,
        hands: [arm.end, hanging],
        elbowPole: [DOWN, unit(0, -1, -0.6)],
      });
      pose.arms[0] = arm;
      // Tied to a post on the other side, so turning out stretches it.
      const post = new Vec3(arm.mid.x + 0.1, 0, -0.95);
      pose.props = [
        {
          kind: "pad",
          from: post,
          to: post.clone().setY(2.0),
          half: 0.05,
          thick: 0.1,
          up: AHEAD.clone(),
          across: ACROSS.clone(),
        },
        band(new Vec3(post.x, arm.mid.y, post.z + 0.05), arm.end),
      ];
      return pose;
    },
  };
}

/** The stretches, by id. */
export const STRETCHES: Record<string, () => Move> = {
  couch,
  worlds_greatest: worldsGreatest,
  figure_four: figureFour,
  calf_wall: calfWall,
  cat_cow: catCow,
  chest_opener: chestOpener,
  childs_pose: childsPose,
  cross_body: crossBody,
  forward_fold: forwardFold,
  knees_to_chest: kneesToChest,
  lat_wall: latWall,
  seated_hamstring: seatedHamstring,
  standing_hip_flexor: standingHipFlexor,
  supine_twist: supineTwist,
  ball_shoulder: ballShoulder,
  band_pull_apart: bandPullApart,
  band_external_rotation: bandExternalRotation,
};

void feetFlat;
void legsFrom;
void ACROSS;
