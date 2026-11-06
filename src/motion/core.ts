import {
  cableProps,
  chestAt,
  clamp01,
  ease,
  elbowUpright,
  lerp,
  mirror,
  mixed,
  PAD,
  rad,
  secant,
  seatProps,
  stand,
  standingHips,
  turned,
  withinReach,
  type Move,
} from "@/motion/build";
import {
  BODY,
  centreOfMass,
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
 * The core family: hanging and lying leg raises, crunches and sit-ups,
 * planks, the ab wheel and the turning work — twists, the Pallof press and
 * the woodchop. Each follows its guide (see `data/guides.ts`).
 */

const DOWN = new Vec3(0, -1, 0);
const UP = new Vec3(0, 1, 0);
const AHEAD = new Vec3(1, 0, 0);
const ACROSS = new Vec3(0, 0, 1);
const LEG = 0.998 * (BODY.thigh + BODY.shin);
const ARM = 0.995 * (BODY.upperArm + BODY.forearm);

const rod = (from: Vec3, to: Vec3): Prop => ({ kind: "line", from, to });

/** A trunk in the side-on plane, `a` radians round from straight up (toward +x). */
const along = (a: number) => new Vec3(Math.sin(a), Math.cos(a), 0);

/** A pose whose trunk leans in the side-on plane, given its direction up the spine. */
export function body(
  pelvis: Vec3,
  trunk: Vec3,
  rest: Omit<Parameters<typeof poseFrom>[0], "pelvis" | "lean" | "frame">,
) {
  return poseFrom({ ...rest, pelvis, lean: Math.atan2(trunk.x, trunk.y) });
}

/** The knees of `pose` put where given — exact, where the solver might pick the other side. */
export function kneesAt(pose: Pose, knees: Vec3[]) {
  pose.legs = pose.legs.map((leg, i) => ({ ...leg, mid: knees[i] })) as [Leg, Leg];
  return pose;
}

/** Legs out from each hip: the thigh along `thigh`, the shin along `shin`. */
export function legsFrom(pelvis: Vec3, across: Vec3, thigh: Vec3, shin: Vec3) {
  const knees = SIDES.map((s) =>
    pelvis.clone().addScaledVector(across, s * BODY.hip).addScaledVector(thigh, BODY.thigh),
  );
  const ankles = knees.map((k) => k.clone().addScaledVector(shin, BODY.shin)) as [Vec3, Vec3];
  return { knees, ankles };
}

/** Hands beside the head, fingertips by the ears, elbows out. */
function byTheHead(pose: Pose) {
  const { trunk, forward, across } = pose;
  const top = pose.pelvis.clone().addScaledVector(trunk, BODY.torso + 0.1);
  return SIDES.map((s) =>
    top.clone().addScaledVector(across, s * 0.1).addScaledVector(forward, 0.02),
  ) as [Vec3, Vec3];
}

// ---- hanging and lying leg raises ----

/**
 * The hanging leg raise: from a bar, shoulders engaged; raise the straight
 * legs by curling the pelvis up, and lower without swinging. The body sways
 * back just enough to keep its weight under the bar.
 */
function hangingLegRaise(): Move {
  const height = 2.3;
  const bar = new Vec3(0, height, 0);
  const grip = 0.26;
  const hands = SIDES.map((s) => bar.clone().setZ(s * grip)) as [Vec3, Vec3];
  /** The shoulders `x` behind the bar, the legs raised `raise`, the pelvis curled `curl`. */
  const at = (x: number, raise: number, curl: number) => {
    const drop = Math.sqrt(ARM ** 2 - x * x - (grip - BODY.shoulder) ** 2);
    const shoulders = new Vec3(x, height - drop, 0);
    const trunk = along(-curl);
    const pelvis = shoulders.clone().addScaledVector(trunk, -BODY.torso);
    const leg = turned(DOWN, AHEAD, raise);
    const { knees, ankles } = legsFrom(pelvis, ACROSS, leg, leg);
    const foot = turned(leg, UP, -50);
    const pose = body(pelvis, trunk, {
      ankles,
      feet: [foot, foot],
      hands,
      elbowPole: AHEAD,
      bar,
    });
    pose.arms = pose.arms.map((arm) => ({
      ...arm,
      mid: elbowUpright(arm.root, arm.end, "front") ?? arm.mid,
    })) as [Limb, Limb];
    return kneesAt(pose, knees);
  };
  const posed = (raise: number, curl: number) => {
    const x = secant((h) => centreOfMass(at(h, raise, curl)).x - bar.x, -0.02, -0.06);
    return at(x, raise, curl);
  };
  return {
    kit: { bar: "fixed" },
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.1, 0, 0),
      room: { height: 2.5, width: 1.7 },
    },
    pose(depth) {
      const d = ease(clamp01(depth));
      return posed(lerp(2, 98, d), rad(lerp(0, 22, d)));
    },
  };
}

/**
 * The captain's chair: back on the pad, forearms on the rests; raise the
 * knees to the chest, curling the pelvis up off the pad, and lower slowly.
 */
function captainsChair(): Move {
  const shoulders = new Vec3(0, 1.5, 0);
  const rest = shoulders.y - BODY.upperArm - SIZE.forearm;
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.1, 0, 0),
      room: { height: 2.0, width: 1.6 },
    },
    pose(depth) {
      const d = ease(clamp01(depth));
      const curl = rad(lerp(0, 16, d));
      const trunk = along(-curl);
      const pelvis = shoulders.clone().addScaledVector(trunk, -BODY.torso);
      const thigh = turned(DOWN, AHEAD, lerp(8, 112, d));
      const shin = turned(DOWN, AHEAD, lerp(2, 15, d));
      const { knees, ankles } = legsFrom(pelvis, ACROSS, thigh, shin);
      const foot = turned(shin, UP, -55);
      const hands = SIDES.map((s) =>
        new Vec3(BODY.forearm * 0.995, shoulders.y - BODY.upperArm, s * 0.21),
      ) as [Vec3, Vec3];
      const pose = body(pelvis, trunk, {
        ankles,
        feet: [foot, foot],
        hands,
        elbowPole: mirror(new Vec3(-0.2, -1, 0)),
      });
      kneesAt(pose, knees);
      const back = -SIZE.trunk.side - PAD.thick - 0.01;
      pose.props = [
        // The back pad, the arm rests and the handles, on a frame.
        {
          kind: "pad",
          from: new Vec3(back + PAD.thick, 0.85, 0),
          to: new Vec3(back + PAD.thick, 1.62, 0),
          ...PAD,
          up: AHEAD.clone(),
        },
        {
          kind: "pad",
          from: new Vec3(-0.12, rest, 0.24),
          to: new Vec3(0.3, rest, 0.24),
          half: 0.05,
          thick: 0.05,
        },
        rod(new Vec3(0.3, rest + 0.06, 0.24), new Vec3(0.3, rest - 0.04, 0.24)),
        rod(new Vec3(back, 1.65, 0.3), new Vec3(back, 0, 0.3)),
        rod(new Vec3(back, rest - 0.05, 0.3), new Vec3(0.3, rest - 0.05, 0.3)),
        rod(new Vec3(back - 0.1, 0, 0.3), new Vec3(0.45, 0, 0.3)),
      ];
      return pose;
    },
  };
}

/**
 * Lying on the back, the head toward −x, the trunk `a` radians up off the
 * floor from the hips: where the hips are, and the trunk's direction.
 */
function lyingTrunk(a: number, pelvis = new Vec3(0, SIZE.trunk.side, 0)) {
  return { pelvis, trunk: new Vec3(-Math.cos(a), Math.sin(a), 0) };
}

/**
 * The lying leg raise: flat on the back, hands under the hips; raise the
 * straight legs to vertical, lower back pressed down, and lower until the
 * heels hover just off the floor.
 */
function lyingLegRaise(): Move {
  const { pelvis, trunk } = lyingTrunk(0);
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(-0.05, 0, 0),
      room: { height: 1.2, width: 2.1 },
    },
    pose(depth) {
      const raise = lerp(8, 88, ease(clamp01(depth)));
      const leg = turned(AHEAD, UP, raise);
      const { knees, ankles } = legsFrom(pelvis, ACROSS, leg, leg);
      const foot = turned(leg, UP, 40);
      const hands = SIDES.map((s) => new Vec3(pelvis.x - 0.12, 0.05, s * 0.12)) as [Vec3, Vec3];
      const pose = body(pelvis, trunk, {
        ankles,
        feet: [foot, foot],
        hands,
        elbowPole: mirror(new Vec3(0, 1, 0.6)),
      });
      return kneesAt(pose, knees);
    },
  };
}

/** Knees bent, feet flat on the floor, lying or sitting with the hips at `pelvis`. */
export function feetFlat(pelvis: Vec3, out = 0.36) {
  const toeOut = rad(6);
  const ankles = mirror(new Vec3(pelvis.x + out, BODY.ankle, 0.13));
  const feet = mirror(new Vec3(Math.cos(toeOut), 0, Math.sin(toeOut)));
  return { ankles, feet };
}

/**
 * The crunch: on the back, knees bent, hands by the head; curl the ribs
 * toward the hips until the shoulder blades leave the floor, and lower
 * slowly. The neck stays long — the hands don't pull.
 */
function crunch(): Move {
  return {
    kit: {},
    film: { views: [0], lifts: true, middle: new Vec3(0, 0, 0), room: { height: 1.0, width: 1.9 } },
    pose(depth) {
      const { pelvis, trunk } = lyingTrunk(rad(lerp(2, 34, ease(clamp01(depth)))));
      const { ankles, feet } = feetFlat(pelvis);
      const sketch = body(pelvis, trunk, {
        ankles,
        feet,
        hands: [pelvis, pelvis],
        elbowPole: UP,
        kneePole: UP,
      });
      return body(pelvis, trunk, {
        ankles,
        feet,
        hands: byTheHead(sketch),
        elbowPole: mirror(new Vec3(0.3, 0.2, 1)),
        kneePole: UP,
      });
    },
  };
}

/**
 * The decline sit-up: feet hooked in on a decline bench, arms across the
 * chest; curl up until the chest is over the knees, and lower slowly back
 * down to the bench.
 */
function declineSitup(): Move {
  const tilt = rad(22);
  /** Down the bench, toward the head. */
  const down = new Vec3(-Math.cos(tilt), -Math.sin(tilt), 0);
  const normal = new Vec3(-Math.sin(tilt), Math.cos(tilt), 0);
  const seat = new Vec3(0, 0.72, 0);
  const pelvis = seat.clone().addScaledVector(normal, SIZE.trunk.side);
  const thigh = down.clone().negate();
  const shin = turned(DOWN, AHEAD, 32);
  const { knees, ankles } = legsFrom(pelvis, ACROSS, thigh, shin);
  const foot = turned(shin, UP, -70);
  const bench = (x: number) => seat.clone().addScaledVector(down, x);
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0, 0, 0),
      room: { height: 1.65, width: 2.2 },
    },
    pose(depth) {
      const d = ease(clamp01(depth));
      // From lying along the bench to the chest over the knees.
      const a = lerp(-tilt + 0.02, rad(78), d);
      const trunk = new Vec3(-Math.cos(a), Math.sin(a), 0);
      const forward = new Vec3(trunk.y, -trunk.x, 0);
      const chest = pelvis
        .clone()
        .addScaledVector(trunk, 0.38)
        .addScaledVector(forward, chestAt(0.38) + 0.05);
      const pose = body(pelvis, trunk, {
        ankles,
        feet: [foot, foot],
        hands: SIDES.map((s) => chest.clone().setZ(-s * 0.1)) as [Vec3, Vec3],
        elbowPole: mirror(new Vec3(0, 0, 1).addScaledVector(forward, 0.2)),
      });
      kneesAt(pose, knees);
      pose.legs = pose.legs.map((leg) => ({ ...leg, planted: false })) as [Leg, Leg];
      const roller = ankles[0]
        .clone()
        .addScaledVector(shin, -0.02)
        .addScaledVector(turned(shin, UP, 90), 0.08);
      const end = bench(-0.62);
      const top = bench(-0.62 + 0.62 + BODY.thigh + 0.06);
      pose.props = [
        { kind: "pad", from: end, to: top, ...PAD, up: normal.clone() },
        { kind: "ring", at: roller.clone().setZ(0.15), normal: ACROSS.clone(), r: 0.045 },
        rod(roller.clone().setZ(0.2), roller.clone().setZ(-0.2)),
        rod(top.clone().addScaledVector(normal, -PAD.thick), new Vec3(top.x + 0.1, 0, 0)),
        rod(roller.clone().setZ(0.2), new Vec3(top.x + 0.1, 0.4, 0.2)),
        rod(end.clone().addScaledVector(normal, -PAD.thick), new Vec3(end.x, 0, 0)),
        rod(new Vec3(end.x - 0.1, 0, 0), new Vec3(top.x + 0.2, 0, 0)),
      ];
      return pose;
    },
  };
}

// ---- planks and the wheel ----

/**
 * The plank: forearms under the shoulders, body in one line from the heels.
 * It starts from the knees and lifts into the hold — ribs down, glutes tight,
 * the hips neither sagging nor piked.
 */
function plank(): Move {
  const elbowY = SIZE.upperArm;
  const shoulders = new Vec3(0.45, elbowY + BODY.upperArm, 0);
  // Straight from shoulders to ankles, on the toes.
  const ankleY = 0.11;
  const tilt = Math.asin((shoulders.y - ankleY) / (BODY.torso + LEG));
  // On the knees: one line from the knees to the shoulders, feet up.
  const kneeling = Math.asin((shoulders.y - 0.07) / (BODY.torso + BODY.thigh));
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(-0.1, 0, 0),
      room: { height: 1.0, width: 2.1 },
    },
    pose(depth) {
      const d = ease(clamp01(depth));
      const a = lerp(kneeling, tilt, d);
      const line = new Vec3(Math.cos(a), Math.sin(a), 0);
      const pelvis = shoulders.clone().addScaledVector(line, -BODY.torso);
      const back = line.clone().negate();
      // The shins from raised behind to in line with the thighs.
      const shin = turned(back, UP, lerp(38, 0, d));
      const { knees, ankles } = legsFrom(pelvis, ACROSS, back, shin);
      const onToes = d > 0.97;
      const foot = onToes ? new Vec3(-0.35, -1, 0).normalize() : turned(shin, DOWN, 70);
      const hands = SIDES.map((s) =>
        new Vec3(shoulders.x + BODY.forearm * 0.99, 0.05, s * 0.09),
      ) as [Vec3, Vec3];
      const pose = body(pelvis, line, {
        ankles,
        feet: [foot, foot],
        hands,
        elbowPole: mirror(new Vec3(-0.4, -1, 0.1)),
      });
      kneesAt(pose, knees);
      pose.legs = pose.legs.map((leg) => ({
        ...leg,
        planted: onToes,
        ...(onToes ? { top: AHEAD.clone() } : {}),
      })) as [Leg, Leg];
      return pose;
    },
  };
}

/**
 * The side plank: on one forearm, the elbow under the shoulder, feet
 * stacked; lift the hips until the body is in one line, and hold. Seen from
 * the front of the body.
 */
function sidePlank(): Move {
  const elbowY = SIZE.upperArm;
  const shoulder = new Vec3(0.55, elbowY + BODY.upperArm, -0.02);
  const forward = new Vec3(0, 0, 1);
  /** The trunk `a` radians up from the floor, the legs as straight as reaches the floor. */
  const at = (a: number) => {
    const trunk = new Vec3(Math.cos(a), Math.sin(a), 0);
    const across = new Vec3().crossVectors(forward, trunk);
    // The lower shoulder (side 1) over the elbow.
    const pelvis = shoulder
      .clone()
      .addScaledVector(across, BODY.shoulder)
      .addScaledVector(trunk, -BODY.torso);
    const hip = pelvis.clone().addScaledVector(across, -BODY.hip);
    // The legs straight, the lower ankle on the floor.
    const drop = Math.min(1, (hip.y - 0.06) / LEG);
    const leg = new Vec3(-Math.sqrt(1 - drop * drop), -drop, 0);
    const legAcross = new Vec3().crossVectors(forward, leg.clone().negate());
    // The feet stacked: the top ankle a little above the bottom one, in reach.
    const bottom = hip.clone().addScaledVector(leg, LEG);
    const upper = pelvis.clone().addScaledVector(across, BODY.hip);
    const stacked = bottom.clone().addScaledVector(legAcross, 0.11).sub(upper).normalize();
    const ankles = [upper.clone().addScaledVector(stacked, LEG), bottom] as [Vec3, Vec3];
    const foot = turned(leg, forward, 90);
    const elbow = new Vec3(shoulder.x, elbowY, shoulder.z);
    const lower = elbow.clone().add(new Vec3(0.02, 0, BODY.forearm * 0.99));
    const top = pelvis.clone().addScaledVector(trunk, BODY.torso);
    const raised = top.clone().addScaledVector(across, BODY.shoulder);
    const hand = withinReach(raised, pelvis.clone().addScaledVector(across, BODY.hip + 0.1));
    const pose = poseFrom({
      pelvis,
      lean: 0,
      frame: { trunk, forward },
      ankles,
      feet: [foot, foot],
      hands: [hand, lower],
      elbowPole: [new Vec3(0, 1, 0.3), new Vec3(-0.2, -1, -0.2)],
      kneePole: forward,
    });
    pose.legs = pose.legs.map((leg) => ({ ...leg, planted: false })) as [Leg, Leg];
    return pose;
  };
  // The hips on the floor, then lifted into one line.
  const flat = secant((a) => at(a).legs[1].root.y - 0.14, 0.6, 0.7);
  const lineUp = secant((a) => {
    const pose = at(a);
    const t = pose.trunk;
    const leg = pose.legs[1].end.clone().sub(pose.legs[1].root).normalize();
    return t.x * leg.y - t.y * leg.x;
  }, 0.2, 0.3);
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(-0.1, 0, 0),
      room: { height: 1.15, width: 2.1 },
    },
    pose: (depth) => at(lerp(flat, lineUp, ease(clamp01(depth)))),
  };
}

/**
 * The ab wheel: kneeling, the wheel under the shoulders, glutes tight; roll
 * out as far as the back stays flat, and pull back in with the abs. At the
 * far end the body is one line from the knees.
 */
function abWheel(): Move {
  const knee = new Vec3(0, 0.07, 0);
  const ankle = knee.clone().add(new Vec3(-BODY.shin * 0.998, 0.02, 0));
  const r = 0.09;
  return {
    kit: {},
    film: { views: [0], middle: new Vec3(0.45, 0, 0), room: { height: 1.1, width: 2.4 } },
    pose(depth) {
      const d = ease(clamp01(depth));
      const thighAngle = rad(lerp(12, 64, d));
      const pelvis = knee.clone().addScaledVector(along(thighAngle), BODY.thigh);
      // The shoulders as high as the arms, straight, reach the wheel below.
      const leanStart = Math.acos(Math.min(1, (r + ARM * 0.98 - pelvis.y) / BODY.torso));
      const lean = lerp(leanStart, rad(lerp(68, 70, d)), d);
      const shoulders = pelvis.clone().addScaledVector(along(lean), BODY.torso);
      const drop = shoulders.y - r;
      const wheel = new Vec3(
        shoulders.x + Math.sqrt(Math.max((ARM * 0.995) ** 2 - drop * drop, 0)),
        r,
        0,
      );
      const pose = body(pelvis, along(lean), {
        ankles: mirror(ankle.clone().setZ(0.1)),
        feet: mirror(new Vec3(-1, -0.25, 0).normalize()),
        hands: SIDES.map((s) => wheel.clone().setZ(s * 0.12)) as [Vec3, Vec3],
        elbowPole: mirror(new Vec3(-1, 1, 0)),
        kneePole: DOWN,
      });
      pose.props = [
        { kind: "ring", at: wheel.clone(), normal: ACROSS.clone(), r },
        rod(wheel.clone().setZ(0.16), wheel.clone().setZ(-0.16)),
      ];
      return pose;
    },
  };
}

// ---- kneeling and seated crunches ----

/**
 * The cable crunch: kneeling below a high pulley, the rope beside the head;
 * curl the ribs down toward the hips, the hips staying still, and return
 * slowly.
 */
function cableCrunch(): Move {
  const knee = new Vec3(0, 0.07, 0);
  const ankle = knee.clone().add(new Vec3(-BODY.shin * 0.998, 0.02, 0));
  const pelvis = knee.clone().addScaledVector(along(rad(12)), BODY.thigh);
  const pulley = new Vec3(0.95, 2.1, 0);
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.3, 0, 0),
      room: { height: 2.25, width: 2.0 },
    },
    pose(depth) {
      const lean = rad(lerp(22, 78, ease(clamp01(depth))));
      const trunk = along(lean);
      const forward = new Vec3(Math.cos(lean), -Math.sin(lean), 0);
      const top = pelvis
        .clone()
        .addScaledVector(trunk, BODY.torso + 0.1)
        .addScaledVector(forward, 0.12);
      const hands = SIDES.map((s) => top.clone().setZ(s * 0.09)) as [Vec3, Vec3];
      const pose = body(pelvis, trunk, {
        ankles: mirror(ankle.clone().setZ(0.11)),
        feet: mirror(new Vec3(-1, -0.25, 0).normalize()),
        hands,
        elbowPole: mirror(new Vec3(0.3, -1, 0.4)),
        kneePole: DOWN,
      });
      const rope = hands[0].clone().setZ(0);
      pose.props = cableProps(new Vec3(pulley.x, 0, 0), pulley.y, rope);
      return pose;
    },
  };
}

/**
 * The crunch machine: the pads on the chest, feet hooked under the rollers;
 * curl the ribs down toward the hips, and return slowly without letting the
 * stack rest. The pads ride on a lever that turns with the trunk.
 */
function machineCrunch(): Move {
  const seat = 0.5;
  const pelvis = new Vec3(0, seat + SIZE.thigh, 0);
  const { knees, ankles } = legsFrom(pelvis, ACROSS, AHEAD, turned(DOWN, AHEAD, -12));
  const foot = turned(turned(DOWN, AHEAD, -12), UP, -80);
  const pivot = pelvis.clone().add(new Vec3(0.02, 0.05, 0.3));
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.1, 0, 0),
      room: { height: 1.75, width: 1.7 },
    },
    pose(depth) {
      const lean = rad(lerp(-8, 38, ease(clamp01(depth))));
      const trunk = along(lean);
      const forward = new Vec3(Math.cos(lean), -Math.sin(lean), 0);
      const pad = pelvis
        .clone()
        .addScaledVector(trunk, 0.4)
        .addScaledVector(forward, chestAt(0.4) + 0.05);
      const shoulders = pelvis.clone().addScaledVector(trunk, BODY.torso);
      const hands = SIDES.map((s) =>
        shoulders.clone().addScaledVector(forward, 0.2).addScaledVector(trunk, 0.04).setZ(s * 0.2),
      ) as [Vec3, Vec3];
      const pose = body(pelvis, trunk, {
        ankles,
        feet: [foot, foot],
        hands,
        elbowPole: mirror(new Vec3(0, -1, 0.5)),
      });
      kneesAt(pose, knees);
      pose.legs = pose.legs.map((leg) => ({ ...leg, planted: false })) as [Leg, Leg];
      const lever = pivot
        .clone()
        .addScaledVector(trunk, 0.4)
        .addScaledVector(forward, chestAt(0.4) + 0.05);
      const roller = ankles[0].clone().add(new Vec3(-0.07, 0.03, 0.15));
      pose.props = [
        ...seatProps(pose, { top: seat, from: -0.25, to: 0.3, back: true }),
        {
          kind: "pad",
          from: pad.clone().setZ(-0.17),
          to: pad.clone().setZ(0.17),
          half: 0.05,
          thick: 0.06,
          up: trunk.clone(),
          across: forward.clone(),
        },
        rod(pivot, lever),
        rod(lever, pad.clone().setZ(0.3)),
        { kind: "ring", at: pivot.clone(), normal: ACROSS.clone(), r: 0.035 },
        { kind: "ring", at: roller, normal: ACROSS.clone(), r: 0.045 },
        rod(roller.clone().setZ(0.2), roller.clone().setZ(-0.2)),
      ];
      return pose;
    },
  };
}

// ---- turning ----

/** Up the spine at `trunk`, the chest turned `turn` radians round the spine toward +z. */
export function twisted(trunk: Vec3, forward: Vec3, turn: number) {
  const across = new Vec3().crossVectors(forward, trunk).normalize();
  const f = forward.clone().multiplyScalar(Math.cos(turn)).addScaledVector(across, -Math.sin(turn));
  return { trunk: trunk.clone(), forward: f };
}

/**
 * The rotation machine: seated, the hips fixed, the chest against the pad;
 * turn from the middle to one side and back slowly — never thrown. Seen
 * from the front.
 */
function rotationMachine(): Move {
  const seat = 0.5;
  const pelvis = new Vec3(0, seat + SIZE.thigh, 0);
  const shin = turned(DOWN, AHEAD, -5);
  const { ankles } = legsFrom(pelvis, ACROSS, AHEAD, shin);
  const foot = AHEAD.clone();
  return {
    kit: {},
    film: {
      views: [70],
      lifts: true,
      middle: new Vec3(0, 0, 0),
      room: { height: 1.7, width: 1.6 },
    },
    pose(depth) {
      const turn = rad(lerp(0, 50, ease(clamp01(depth))));
      const frame = twisted(UP, AHEAD, turn);
      const across = new Vec3().crossVectors(frame.forward, frame.trunk);
      const pad = pelvis
        .clone()
        .addScaledVector(UP, 0.42)
        .addScaledVector(frame.forward, chestAt(0.42) + 0.06);
      const hands = SIDES.map((s) =>
        pad.clone().addScaledVector(frame.forward, 0.06).addScaledVector(across, s * 0.17),
      ) as [Vec3, Vec3];
      const pose = poseFrom({
        pelvis,
        lean: 0,
        frame,
        ankles,
        feet: [foot, foot],
        hands,
        elbowPole: SIDES.map((s) => across.clone().multiplyScalar(s).add(new Vec3(0, -0.5, 0))) as [
          Vec3,
          Vec3,
        ],
        kneePole: new Vec3(1, 1, 0),
      });
      pose.props = [
        ...seatProps(pose, { top: seat, from: -0.25, to: 0.3 }),
        {
          kind: "pad",
          from: pad.clone().addScaledVector(UP, -0.12),
          to: pad.clone().addScaledVector(UP, 0.12),
          half: 0.13,
          thick: 0.06,
          up: frame.forward.clone().negate(),
          across: across.clone(),
        },
        rod(
          pad.clone().addScaledVector(frame.forward, 0.06),
          pelvis.clone().add(new Vec3(0, 0.42, 0)).addScaledVector(frame.forward, 0.35),
        ),
        rod(
          pelvis.clone().add(new Vec3(0, 0.42, 0)).addScaledVector(frame.forward, 0.35),
          pelvis.clone().add(new Vec3(0, 0.42, 0)).addScaledVector(AHEAD, 0.35),
        ),
        rod(pelvis.clone().add(new Vec3(0.35, 0.42, 0)), new Vec3(0.35, 0, 0)),
      ];
      return pose;
    },
  };
}

/**
 * The Russian twist: sitting, knees bent, leaning back with a flat back,
 * the weight at the chest; turn the ribs to one side, through the middle
 * to the other. A film that goes round, side to side.
 */
function russianTwist(): Move {
  const lean = rad(-42);
  const pelvis = new Vec3(0, SIZE.trunk.side * 0.75, 0);
  const { ankles, feet } = feetFlat(pelvis, 0.48);
  const r = 0.1;
  return {
    kit: {},
    film: {
      views: [60],
      cycle: 2.6,
      middle: new Vec3(0.1, 0, 0),
      room: { height: 1.2, width: 1.7 },
    },
    pose(depth) {
      const turn = rad(42) * Math.sin(2 * Math.PI * depth);
      const base = along(lean);
      const frame = twisted(base, new Vec3(Math.cos(lean), -Math.sin(lean), 0), turn);
      const ball = pelvis
        .clone()
        .addScaledVector(frame.trunk, 0.32)
        .addScaledVector(frame.forward, chestAt(0.32) + 0.2);
      const across = new Vec3().crossVectors(frame.forward, frame.trunk);
      const hands = SIDES.map((s) => ball.clone().addScaledVector(across, s * (r + 0.01))) as [
        Vec3,
        Vec3,
      ];
      const pose = poseFrom({
        pelvis,
        lean,
        frame,
        ankles,
        feet,
        hands,
        elbowPole: SIDES.map((s) => across.clone().multiplyScalar(s).add(DOWN)) as [Vec3, Vec3],
        kneePole: UP,
      });
      pose.props = [{ kind: "ball", at: ball, r }];
      return pose;
    },
  };
}

/**
 * Standing side-on to a cable column at `side` (z), the hips square to the
 * front, knees soft.
 */
function athletic(turn: number, hands: (pose: Pose) => [Vec3, Vec3]) {
  const toeOut = rad(10);
  const { feet, ankles } = stand(0.22, toeOut);
  const pelvis = standingHips(0.02, 0.22).add(new Vec3(0, -0.05, 0));
  const frame = twisted(UP, AHEAD, turn);
  const sketch = poseFrom(
    { pelvis, lean: 0, frame, ankles, feet, hands: [pelvis, pelvis], elbowPole: DOWN },
  );
  const at = hands(sketch);
  return poseFrom({
    pelvis,
    lean: 0,
    frame,
    ankles,
    feet,
    hands: SIDES.map((_, i) => withinReach(sketch.arms[i].root, at[i])) as [Vec3, Vec3],
    elbowPole: DOWN,
  });
}

/**
 * The Pallof press: standing side-on to a cable at chest height, the handle
 * at the chest; press it straight out without being pulled round, and bring
 * it back under control.
 */
function pallofPress(): Move {
  const column = new Vec3(0.3, 0, -1.05);
  const height = 1.22;
  return {
    kit: {},
    film: { views: [72], middle: new Vec3(0, 0, -0.45), room: { height: 2.2, width: 2.2 } },
    pose(depth) {
      const out = lerp(0.18, 0.56, ease(clamp01(depth)));
      const pose = athletic(0, () => {
        const handle = new Vec3(out + 0.05, height, 0);
        return [handle.clone().setZ(0.03), handle.clone().setZ(-0.03)];
      });
      const handle = new Vec3(out + 0.05, height, 0);
      pose.props = [...cableProps(column, height, handle)];
      return pose;
    },
  };
}

/**
 * The woodchop: the pulley high, standing side-on, both hands on the handle;
 * pull it down and across the body, turning from the ribs with the arms
 * long, and return slowly. Seen from the front.
 */
function woodchop(): Move {
  const column = new Vec3(0.15, 0, -0.95);
  const pulley = new Vec3(0.15, 2.05, -0.95);
  const reach = ARM * 0.97;
  return {
    kit: {},
    film: {
      views: [90],
      lifts: true,
      middle: new Vec3(0, 0, -0.25),
      room: { height: 2.3, width: 2.2 },
    },
    pose(depth) {
      const d = ease(clamp01(depth));
      const turn = rad(lerp(55, -50, d));
      const pose = athletic(turn, (sketch) => {
        // Arms long from between the shoulders, high toward the pulley to
        // low across the body.
        const mid = sketch.arms[0].root.clone().add(sketch.arms[1].root).multiplyScalar(0.5);
        const dir = sketch.forward
          .clone()
          .multiplyScalar(0.55)
          .addScaledVector(UP, lerp(0.85, -0.75, d))
          .normalize();
        const handle = mid.clone().addScaledVector(dir, reach);
        return [handle, handle.clone()];
      });
      pose.props = [
        ...cableProps(column, pulley.y),
        rod(pulley, held(pose)),
      ];
      return pose;
    },
  };
}

const held = (pose: Pose) => pose.arms[0].end.clone().add(pose.arms[1].end).multiplyScalar(0.5);

/** The core movements, by id. */
export const CORE: Record<string, () => Move> = {
  hanging_leg_raise: hangingLegRaise,
  captains_chair: captainsChair,
  lying_leg_raise: lyingLegRaise,
  crunch,
  decline_situp: declineSitup,
  plank,
  side_plank: sidePlank,
  ab_wheel: abWheel,
  cable_crunch: cableCrunch,
  machine_crunch: machineCrunch,
  rotation_machine: rotationMachine,
  ab_machine: rotationMachine,
  russian_twist: russianTwist,
  pallof_press: pallofPress,
  woodchop,
};
