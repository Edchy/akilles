import {
  armFrom,
  BAR_RADIUS,
  cableProps,
  chestAt,
  clamp01,
  ease,
  halve,
  handsOn,
  held,
  keyframes,
  lerp,
  mirror,
  mixed,
  PAD,
  rad,
  seatProps,
  secant,
  shouldersAt,
  sideOnDistance,
  stand,
  standingHips,
  turned,
  withArms,
  withinReach,
  type Move,
} from "@/motion/build";
import {
  anglesOf,
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
 * The legs family: deadlifts and hinges, bridges, lunges and step-ups, the
 * leg machines, calf raises and jumps. Each follows its guide (see
 * `data/guides.ts`).
 */

const DOWN = new Vec3(0, -1, 0);
const UP = new Vec3(0, 1, 0);
const AHEAD = new Vec3(1, 0, 0);
/** A leg as long as it reaches, all but straight. */
const LEG = 0.995 * (BODY.thigh + BODY.shin);
/** An arm, all but straight. */
const ARM = 0.995 * (BODY.upperArm + BODY.forearm);

const rod = (from: Vec3, to: Vec3): Prop => ({ kind: "line", from, to });

/** Up the spine and out of the chest, leaning `lean`. */
const frameOf = (lean: number) => ({
  trunk: new Vec3(Math.sin(lean), Math.cos(lean), 0),
  forward: new Vec3(Math.cos(lean), -Math.sin(lean), 0),
});

/** The middle of the foot, ahead of the ankle, with the toes turned out `toeOut`. */
const midFootOf = (toeOut: number) => ((BODY.toe - BODY.heel) / 2) * Math.cos(toeOut);

/** How far a bar is clear of the shins, seen from the side. */
function shinsClear(pose: Pose, bar: Vec3, thick = BAR_RADIUS) {
  return Math.min(...pose.legs.map((l) => sideOnDistance(bar, l.mid, l.end) - SIZE.shin)) - thick;
}

/** Arms hanging straight from the shoulders to `hands`, as a pose would solve them. */
const hangingTo = (pose: Pose) => pose;

/**
 * A pull from the floor: the deadlift, the sumo deadlift, the trap-bar
 * deadlift. Standing tall at the start, lowering to the floor and pulling
 * back up; the bar travels straight up and down over mid-foot, close to
 * the legs, lifter and bar balanced over mid-foot. The trap bar's handles
 * are at the sides, so the arms hang straight down instead.
 */
function deadlift(kind: "conventional" | "sumo" | "trap"): Move {
  const stance = kind === "sumo" ? 0.38 : kind === "trap" ? 0.17 : 0.15;
  const toeOut = rad(kind === "sumo" ? 38 : 10);
  const { feet, ankles } = stand(stance, toeOut);
  const midFoot = midFootOf(toeOut);
  const grip = kind === "sumo" ? 0.16 : kind === "trap" ? 0.29 : 0.25;
  const load = 1.0;
  const floor = kind === "trap" ? 0.23 : 0.225;
  const reach = Math.sqrt(ARM ** 2 - (grip - BODY.shoulder) ** 2);
  const kneeOut = kind === "sumo";

  /**
   * The hips at `pelvis`, the bar at height `y`; the shoulders where the
   * arms, straight, reach it.
   */
  // The bar over the middle of the foot — just clear of the shins as drawn.
  const barX = kind === "trap" ? midFoot : Math.max(midFoot, SIZE.shin + BAR_RADIUS + 0.008);
  const at = (y: number, pelvis: Vec3) => {
    const bar = new Vec3(barX, y, 0);
    // The shoulders on two circles, round the hips and round the bar: the
    // upper meeting.
    const d = Math.hypot(bar.x - pelvis.x, bar.y - pelvis.y);
    const a = (BODY.torso ** 2 - reach ** 2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(BODY.torso ** 2 - a * a, 0));
    const [ux, uy] = [(bar.x - pelvis.x) / d, (bar.y - pelvis.y) / d];
    const sx = pelvis.x + a * ux - h * uy;
    const sy = pelvis.y + a * uy + h * ux;
    const lean = Math.atan2(sx - pelvis.x, sy - pelvis.y);
    const hands = SIDES.map((s) => bar.clone().setZ(s * grip)) as [Vec3, Vec3];
    const pose = poseFrom({
      pelvis,
      lean,
      ankles,
      feet,
      hands,
      elbowPole: mirror(new Vec3(-1, 0, kneeOut ? -0.2 : 0.2)),
      bar: kind === "trap" ? undefined : bar,
    });
    if (kind === "trap") {
      // The hexagon round the lifter at the handles' height, its plates out to the sides.
      const c = new Vec3(barX, y, 0);
      const ring = [
        [0.42, 0],
        [0.22, 0.34],
        [-0.22, 0.34],
        [-0.42, 0],
        [-0.22, -0.34],
        [0.22, -0.34],
      ].map(([x, z]) => c.clone().add(new Vec3(x, 0, z)));
      pose.props = [
        ...ring.map((p, i) => rod(p, ring[(i + 1) % ring.length])),
        ...SIDES.flatMap((s) => [
          rod(
            c.clone().add(new Vec3(-0.06, 0, s * 0.29)),
            c.clone().add(new Vec3(0.06, 0, s * 0.29)),
          ),
          rod(c.clone().setZ(s * 0.34), c.clone().setZ(s * 0.85)),
          {
            kind: "ring" as const,
            at: c.clone().setZ(s * 0.62),
            normal: new Vec3(0, 0, 1),
            r: 0.225,
          },
        ]),
      ];
    }
    return pose;
  };
  /** At bar height `y`, the hips `hipY` high and as far back as balances lifter and bar. */
  const balancedAt = (y: number, hipY: number, guess = -0.1) => {
    const x = secant((hx) => {
      const pose = at(y, new Vec3(hx, hipY, 0));
      return centreOfMass(pose, load, held(pose)).x - midFoot;
    }, guess, guess - 0.02);
    return at(y, new Vec3(x, hipY, 0));
  };
  // The top: standing tall. The bottom: the bar on the floor, the hips as
  // high as lets the shins meet the bar — or, the trap bar, set low.
  const standY = BODY.ankle + Math.sqrt((LEG - 0.004) ** 2 - 0.03 ** 2 - (stance - BODY.hip) ** 2);
  const top = standY + BODY.torso - Math.sqrt(reach ** 2 - 0.09 ** 2);
  const lowestClear = () => {
    // From low up, the first hip height at which the shins clear the bar.
    for (let h = 0.45; h < 0.85; h += 0.005) {
      // Drawn shins are thicker than real ones: let the bar press in a little.
      if (shinsClear(balancedAt(floor, h), new Vec3(barX, floor, 0)) >= -0.03) return h;
    }
    return 0.7;
  };
  const bottomHip = kind === "trap" ? 0.6 : Math.min(lowestClear(), kind === "sumo" ? 0.58 : 0.65);
  const STEPS = 10;
  let guess = 0.05;
  const table = Array.from({ length: STEPS + 1 }, (_, i) => {
    const t = i / STEPS;
    const y = lerp(top, floor, t);
    // The knees unbend first off the floor, the hips come through last.
    const hipY = lerp(standY, bottomHip, Math.pow(t, 0.8));
    const pelvis = balancedAt(y, hipY, guess).pelvis;
    guess = pelvis.x;
    return { y, pelvis };
  });
  return {
    kit: kind === "trap" ? {} : { bar: "barbell", plate: 0.225 },
    film: {
      views: kind === "sumo" ? [0, 90] : [0],
      middle: new Vec3(midFoot, 0, 0),
      room: { height: 1.9, width: kind === "trap" ? 2.1 : 2.4 },
    },
    pose(depth) {
      const t = clamp01(depth) * STEPS;
      const i = Math.min(Math.floor(t), STEPS - 1);
      const [a, b] = [table[i], table[i + 1]];
      const f = t - i;
      return at(lerp(a.y, b.y, f), mixed(a.pelvis, b.pelvis, f));
    },
  };
}

/**
 * The good morning: the bar on the upper back, knees soft and staying so;
 * hinge at the hips until the trunk nears level, back flat, and drive the
 * hips forward to stand. Balanced over mid-foot throughout.
 */
function goodMorning(): Move {
  const toeOut = rad(10);
  const midFoot = midFootOf(toeOut);
  const { feet, ankles } = stand(0.17, toeOut);
  const at = (x: number, lean: number) => {
    const pelvis = standingHips(x, 0.17).add(new Vec3(0, -0.05, 0));
    const { trunk, forward } = frameOf(lean);
    const bar = pelvis
      .clone()
      .addScaledVector(trunk, BODY.torso + 0.05)
      .addScaledVector(forward, -0.11);
    return poseFrom({
      pelvis,
      lean,
      ankles,
      feet,
      hands: SIDES.map((s) => bar.clone().setZ(s * 0.36)) as [Vec3, Vec3],
      elbowPole: trunk.clone().negate().addScaledVector(forward, -0.5),
      bar,
    });
  };
  const balanceAt = (lean: number) =>
    secant((x) => centreOfMass(at(x, lean), 0.35).x - midFoot, 0, -0.1);
  return {
    kit: { bar: "barbell" },
    film: { views: [0], middle: new Vec3(0, 0, 0), room: { height: 1.85, width: 2.0 } },
    pose(depth) {
      const lean = lerp(0, rad(72), clamp01(depth));
      return at(balanceAt(lean), lean);
    },
  };
}

/**
 * The hip thrust — upper back on a bench, the bar over the hips — and the
 * glute bridge, lying on the floor: feet flat, drive the hips up until the
 * body is straight from shoulders to knees, squeeze, and lower. The
 * shoulders stay where they are; at the top of a hip thrust the shins are
 * upright.
 */
function bridge(bench: boolean): Move {
  const shoulders = bench ? new Vec3(-0.12, 0.6, 0) : new Vec3(-0.58, SIZE.trunk.side - 0.02, 0);
  const footX = bench
    ? shoulders.x + BODY.torso + BODY.thigh - 0.03
    : shoulders.x + BODY.torso + 0.33;
  const toeOut = rad(10);
  const feet = mirror(new Vec3(Math.cos(toeOut), 0, Math.sin(toeOut)));
  const ankles = mirror(new Vec3(footX, BODY.ankle, 0.17));
  /** The trunk tipped `a` from level, the hips lower than the shoulders when `a` is above 0. */
  const at = (a: number) => {
    const trunk = new Vec3(-Math.cos(a), Math.sin(a), 0);
    const pelvis = shoulders.clone().addScaledVector(trunk, -BODY.torso);
    const lean = a - Math.PI / 2;
    const forward = new Vec3(Math.cos(lean), -Math.sin(lean), 0);
    const bar = pelvis.clone().addScaledVector(forward, SIZE.trunk.side * 0.5 + 0.06);
    const hands = bench
      ? (SIDES.map((s) => bar.clone().setZ(s * 0.32)) as [Vec3, Vec3])
      : (SIDES.map((s) => new Vec3(pelvis.x - 0.05, 0.04, s * 0.3)) as [Vec3, Vec3]);
    const pose = poseFrom({
      pelvis,
      lean,
      ankles,
      feet,
      hands,
      elbowPole: bench ? mirror(new Vec3(-0.5, -1, 0.5)) : mirror(new Vec3(0, 1, 0.3)),
    });
    if (bench) pose.bar = bar;
    pose.props = bench
      ? [
          { kind: "pad", from: new Vec3(-0.85, 0.43, 0), to: new Vec3(-0.08, 0.43, 0), ...PAD },
          rod(new Vec3(-0.2, 0.43 - PAD.thick, 0), new Vec3(-0.2, 0, 0)),
          rod(new Vec3(-0.75, 0.43 - PAD.thick, 0), new Vec3(-0.75, 0, 0)),
        ]
      : [];
    return pose;
  };
  // The top: hips straight. The bottom: a hip thrust's hips sink well down;
  // a bridge's come to the floor.
  let high = 0.3;
  // Up until the hips are straight — or, on the floor, as high as they go.
  while (high > -1 && anglesOf(at(high)).hips[0] > 4 && at(high).pelvis.y < 0.4) high -= 0.005;
  const low = bench
    ? high + rad(32)
    : secant((a) => at(a).pelvis.y - SIZE.trunk.side * 0.8, high + 0.3, high + 0.35);
  return {
    kit: bench ? { bar: "barbell" } : {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(bench ? 0.25 : 0, 0, 0),
      room: { height: bench ? 1.1 : 0.9, width: 1.9 },
    },
    pose: (depth) => at(lerp(low, high, ease(clamp01(depth)))),
  };
}

/**
 * The back extension on a 45° bench: the pad just below the hips, ankles
 * locked in, arms crossed on the chest; lower with a flat back to a
 * hamstring stretch, and rise until the body is straight — no further.
 */
function backExtension(): Move {
  const tilt = rad(45);
  const dir = new Vec3(Math.sin(tilt), Math.cos(tilt), 0);
  const ankle = new Vec3(-0.45, 0.28, 0);
  const pelvis = ankle.clone().addScaledVector(dir, LEG);
  const foot = new Vec3(Math.cos(tilt), -Math.sin(tilt), 0);
  return {
    kit: {},
    film: { views: [0], middle: new Vec3(0.05, 0, 0), room: { height: 1.75, width: 2.1 } },
    pose(depth) {
      const d = ease(clamp01(depth));
      const lean = lerp(tilt, rad(140), d);
      const { trunk, forward } = frameOf(lean);
      const chest = pelvis
        .clone()
        .addScaledVector(trunk, 0.4)
        .addScaledVector(forward, chestAt(0.4) + 0.05);
      const pose = poseFrom({
        pelvis,
        lean,
        ankles: SIDES.map((s) => ankle.clone().setZ(s * 0.12)) as [Vec3, Vec3],
        feet: [foot, foot],
        hands: SIDES.map((s) =>
          chest.clone().addScaledVector(new Vec3(0, 0, 1), -s * 0.1),
        ) as [Vec3, Vec3],
        elbowPole: mirror(new Vec3(0, 0, 1).addScaledVector(forward, 0.2)),
        kneePole: foot,
      });
      pose.legs = pose.legs.map((leg) =>
        ({ ...leg, planted: true, top: dir.clone() }),
      ) as [Leg, Leg];
      // The hip pad on the front of the thighs, the foot plate, the frame.
      const hip = pelvis
        .clone()
        .addScaledVector(dir, -0.14)
        .addScaledVector(foot, SIZE.thigh + 0.035);
      pose.props = [
        {
          kind: "pad",
          from: hip.clone().addScaledVector(dir, -0.16),
          to: hip.clone().addScaledVector(dir, 0.08),
          ...PAD,
          up: foot.clone().negate(),
        },
        {
          kind: "pad",
          from: ankle.clone().addScaledVector(foot, -0.1).addScaledVector(dir, -BODY.ankle),
          to: ankle.clone().addScaledVector(foot, 0.25).addScaledVector(dir, -BODY.ankle),
          ...PAD,
          up: dir.clone(),
        },
        {
          kind: "ring",
          at: ankle.clone().addScaledVector(dir, 0.06).addScaledVector(foot, -0.09).setZ(0.16),
          normal: new Vec3(0, 0, 1),
          r: 0.04,
        },
        rod(ankle.clone().add(new Vec3(-0.1, -0.12, 0)), hip.clone().addScaledVector(foot, 0.12)),
        rod(new Vec3(-0.75, 0, 0), new Vec3(0.75, 0, 0)),
        rod(ankle.clone().add(new Vec3(-0.1, -0.12, 0)), new Vec3(-0.65, 0, 0)),
        rod(hip.clone().addScaledVector(foot, 0.12), new Vec3(hip.x + 0.25, 0, 0)),
      ];
      return pose;
    },
  };
}

/**
 * The Nordic curl: kneeling, ankles anchored; lower the body forward as
 * slowly as possible, hips straight — knees to head in one line — and
 * catch yourself with the hands at the bottom.
 */
function nordicCurl(): Move {
  const knee = new Vec3(0, 0.07, 0);
  const ankle = knee.clone().add(new Vec3(-BODY.shin * 0.998, 0.02, 0));
  return {
    kit: {},
    film: { views: [0], middle: new Vec3(0.15, 0, 0), room: { height: 1.45, width: 1.9 } },
    pose(depth) {
      const d = clamp01(depth);
      const angle = lerp(rad(4), rad(68), ease(d));
      const dir = new Vec3(Math.sin(angle), Math.cos(angle), 0);
      const pelvis = knee.clone().addScaledVector(dir, BODY.thigh);
      const { forward } = frameOf(angle);
      const shoulders = shouldersAt(pelvis, angle);
      // Arms crossed on the chest, reaching out to catch in the last part.
      const chest = pelvis
        .clone()
        .addScaledVector(dir, 0.4)
        .addScaledVector(forward, chestAt(0.4) + 0.05);
      const catchAt = (i: number) => new Vec3(pelvis.x + 0.75, 0.05, SIDES[i] * 0.25);
      const reach = ease((d - 0.55) / 0.45);
      const hands = SIDES.map((s, i) =>
        withinReach(shoulders[i], mixed(chest.clone().setZ(-s * 0.1), catchAt(i), reach)),
      ) as [Vec3, Vec3];
      const pose = poseFrom({
        pelvis,
        lean: angle,
        ankles: SIDES.map((s) => ankle.clone().setZ(s * 0.11)) as [Vec3, Vec3],
        feet: mirror(new Vec3(-1, -0.4, 0).normalize()),
        hands,
        elbowPole: mirror(new Vec3(-0.3, -1, 0.6)),
        kneePole: DOWN,
      });
      pose.props = [
        {
          kind: "pad",
          from: new Vec3(-0.6, 0.03, 0),
          to: new Vec3(0.12, 0.03, 0),
          half: 0.2,
          thick: 0.03,
        },
        {
          kind: "ring",
          at: ankle.clone().add(new Vec3(0, 0.09, 0.15)),
          normal: new Vec3(0, 0, 1),
          r: 0.035,
        },
        rod(ankle.clone().add(new Vec3(0, 0.09, 0.2)), ankle.clone().add(new Vec3(0, 0.09, -0.2))),
      ];
      return pose;
    },
  };
}

/**
 * The kettlebell swing: hike the bell back between the legs in a hinge, snap
 * the hips forward to stand tall, and let it float to chest height on
 * straight arms. A hip snap, not a squat or a lift with the arms.
 */
function kettlebellSwing(): Move {
  const toeOut = rad(15);
  const midFoot = midFootOf(toeOut);
  const { feet, ankles } = stand(0.2, toeOut);
  const load = 0.2;
  const at = (x: number, d: number) => {
    const lean = lerp(rad(60), rad(-4), d);
    const pelvis = standingHips(x, 0.2).add(new Vec3(0, -lerp(0.1, 0, d), 0));
    const shoulders = shouldersAt(pelvis, lean);
    // The arms from back between the legs to forward at chest height.
    const swing = lerp(-25, 88, d);
    const dir = turned(DOWN, AHEAD, swing);
    const arms = SIDES.map((s, i) =>
      armFrom(
        shoulders[i],
        dir.clone().add(new Vec3(0, 0, -0.28 * s)),
        dir.clone().add(new Vec3(0, 0, -0.3 * s)),
      ),
    ) as [Limb, Limb];
    const pose = withArms(
      poseFrom({ pelvis, lean, ankles, feet, hands: [arms[0].end, arms[1].end], elbowPole: UP }),
      arms,
    );
    const hand = held(pose);
    pose.props = [{ kind: "kettlebell", at: hand, down: dir.clone() }];
    return pose;
  };
  const bell = (pose: Pose) => held(pose).addScaledVector(turned(DOWN, AHEAD, 0), 0);
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(midFoot, 0, 0),
      room: { height: 1.9, width: 1.9 },
    },
    pose(depth) {
      const d = ease(clamp01(depth));
      const x = secant(
        (h) => centreOfMass(at(h, d), load, bell(at(h, d))).x - midFoot,
        -0.05,
        -0.1,
      );
      return at(x, d);
    },
  };
}

/**
 * The single-leg Romanian deadlift: a dumbbell in each hand, standing on one
 * leg, knee soft; hinge forward as the free leg reaches back in line with
 * the trunk, hips square, and drive the hip through to stand. Seen from the
 * side of the free leg.
 */
function singleLegRdl(): Move {
  const toeOut = rad(8);
  const midFoot = midFootOf(toeOut);
  const foot = new Vec3(Math.cos(toeOut), 0, -Math.sin(toeOut));
  const ankle = new Vec3(0, BODY.ankle, -0.1);
  const load = 0.3;
  const at = (x: number, lean: number) => {
    const height = BODY.ankle + Math.sqrt((LEG - 0.03) ** 2 - x * x - (0.1 - BODY.hip) ** 2);
    const pelvis = new Vec3(x, height, 0);
    const { trunk, forward } = frameOf(lean);
    const free = pelvis
      .clone()
      .add(new Vec3(0, 0, BODY.hip))
      .addScaledVector(trunk, -0.998 * (BODY.thigh + BODY.shin));
    const shoulders = shouldersAt(pelvis, lean);
    const hands = SIDES.map((s, i) =>
      shoulders[i].clone().add(new Vec3(0.02, -ARM * 0.99, -0.02 * s)),
    ) as [Vec3, Vec3];
    const pose = poseFrom({
      pelvis,
      lean,
      ankles: [free, ankle],
      feet: [forward.clone(), foot],
      hands,
      elbowPole: mirror(new Vec3(-1, 0, 0.2)),
      kneePole: [forward.clone(), undefined],
    });
    pose.dumbbells = hands.map((h) => ({ at: h, axis: new Vec3(1, 0, 0) }));
    return pose;
  };
  return {
    kit: { dumbbells: true },
    film: { views: [0], middle: new Vec3(-0.1, 0, 0), room: { height: 1.85, width: 2.2 } },
    pose(depth) {
      const lean = lerp(rad(3), rad(80), ease(clamp01(depth)));
      const x = secant((h) => {
        const pose = at(h, lean);
        return centreOfMass(pose, load, held(pose)).x - midFoot;
      }, 0, -0.05);
      return at(x, lean);
    },
  };
}

/**
 * A split stance, the front foot flat, the back one on its toes behind or
 * up on a bench: the split squat and the Bulgarian split squat. Drop the
 * back knee straight down, the trunk tall, and drive up through the front
 * heel. Dumbbells hang at the sides.
 */
function splitSquat(bench: boolean, loaded = true): Move {
  const toeOut = rad(8);
  const front = new Vec3(0.34, BODY.ankle, 0.11);
  const back = bench ? new Vec3(-0.62, 0.46 + 0.05, -0.11) : new Vec3(-0.5, 0.15, -0.11);
  const backFoot = bench ? new Vec3(-1, -0.25, 0).normalize() : new Vec3(-0.35, -1, 0).normalize();
  const feet = [new Vec3(Math.cos(toeOut), 0, Math.sin(toeOut)), backFoot] as [Vec3, Vec3];
  const lean = rad(8);
  const at = (y: number) => {
    const pelvis = new Vec3(0, y, 0);
    const shoulders = shouldersAt(pelvis, lean);
    // The arms hang at the sides, holding dumbbells or nothing.
    const hands = SIDES.map((s, i) =>
      shoulders[i].clone().add(new Vec3(0.02, -ARM * 0.99, 0.04 * s)),
    ) as [Vec3, Vec3];
    const pose = poseFrom({
      pelvis,
      lean,
      ankles: [front, back],
      feet,
      hands,
      elbowPole: mirror(new Vec3(-1, 0, 0.1)),
      kneePole: [undefined, new Vec3(0.2, -1, 0)],
    });
    if (bench) pose.legs[1] = { ...pose.legs[1], planted: false };
    if (loaded) pose.dumbbells = hands.map((h) => ({ at: h, axis: new Vec3(1, 0, 0) }));
    pose.props = bench
      ? [
          { kind: "pad", from: new Vec3(-1.1, 0.46, 0), to: new Vec3(-0.55, 0.46, 0), ...PAD },
          rod(new Vec3(-0.65, 0.46 - PAD.thick, 0), new Vec3(-0.65, 0, 0)),
          rod(new Vec3(-1.0, 0.46 - PAD.thick, 0), new Vec3(-1.0, 0, 0)),
        ]
      : [];
    return pose;
  };
  const reachable = (y: number) =>
    Math.min(
      ...[front, back].map((a, i) => LEG - new Vec3(0, y, SIDES[i] * BODY.hip).distanceTo(a)),
    );
  const top = secant((y) => reachable(y) - 0.02, 0.85, 0.8);
  // Down until the back knee is just off the floor, or the front thigh level.
  let bottom = top;
  const deep = (y: number) => {
    const pose = at(y);
    return pose.legs[1].mid.y < 0.13 || pose.legs[0].root.y < pose.legs[0].mid.y;
  };
  while (bottom > 0.3 && !deep(bottom)) bottom -= 0.005;
  return {
    kit: loaded ? { dumbbells: true } : {},
    film: {
      views: [0],
      middle: new Vec3(bench ? -0.25 : -0.05, 0, 0),
      room: { height: 1.8, width: bench ? 2.1 : 1.8 },
    },
    pose: (depth) => at(lerp(top, bottom, ease(clamp01(depth)))),
  };
}

/**
 * The bodyweight squat. Arms reach straight forward at shoulder height as a
 * counterweight; feet a little wider than the hips, turned out. Down to below
 * parallel, chest up, heels down, the knees over the toes; balanced over
 * mid-foot all the way.
 */
function bodyweightSquat(): Move {
  const stance = 0.24;
  const toeOut = rad(25);
  const { feet, ankles, midFoot } = stand(stance, toeOut);
  const reach = 0.9995 * (BODY.thigh + BODY.shin);
  const topX = 0.05;
  const topY = BODY.ankle + Math.sqrt(reach ** 2 - topX ** 2 - (stance - BODY.hip) ** 2);
  const [bottomX, bottomY] = [-0.12, 0.34];
  const at = (pelvis: Vec3, lean: number) => {
    const shoulders = shouldersAt(pelvis, lean);
    const hands = shoulders.map((sh) => sh.clone().add(new Vec3(ARM * 0.98, -0.02, 0))) as [
      Vec3,
      Vec3,
    ];
    return poseFrom({ pelvis, lean, ankles, feet, hands, elbowPole: new Vec3(0, -1, 0) });
  };
  return {
    kit: {},
    film: { views: [0, 90], middle: new Vec3(midFoot, 0, 0), room: { height: 1.85, width: 1.6 } },
    pose(depth) {
      const d = clamp01(depth);
      const pelvis = new Vec3(
        lerp(topX, bottomX, Math.sin((d * Math.PI) / 2)),
        lerp(topY, bottomY, d),
        0,
      );
      // The trunk leans exactly as far as keeps the lifter over mid-foot.
      const lean = secant((l) => centreOfMass(at(pelvis, l)).x - midFoot, 0.1, 0.3);
      return at(pelvis, lean);
    },
  };
}

/**
 * A lunge from standing: a long step back (the reverse lunge) or forward
 * (the walking lunge), lower until the back knee nearly touches, and drive
 * through the front heel back to standing. The trunk stays upright.
 */
function lunge(forward: boolean): Move {
  const toeOut = rad(8);
  const flat = new Vec3(Math.cos(toeOut), 0, Math.sin(toeOut));
  const flatBack = new Vec3(Math.cos(toeOut), 0, -Math.sin(toeOut));
  const toes = new Vec3(-0.35, -1, 0).normalize();
  const step = 0.85;
  // The planted foot, and where the moving one starts and lands.
  const planted = new Vec3(forward ? 0 : 0.0, BODY.ankle, 0.11);
  const from = new Vec3(0, BODY.ankle, -0.11);
  const to = forward ? new Vec3(step, BODY.ankle, -0.11) : new Vec3(-step + 0.15, 0.15, -0.11);
  const lean = rad(5);
  return {
    kit: forward ? {} : { dumbbells: true },
    film: {
      views: [0],
      middle: new Vec3(forward ? 0.35 : -0.2, 0, 0),
      room: { height: 1.85, width: 2.1 },
    },
    pose(depth) {
      const d = clamp01(depth);
      const s = ease(Math.min(1, d / 0.55));
      const sink = ease((d - 0.35) / 0.65);
      const moving = mixed(from, to, s).add(new Vec3(0, 0.1 * Math.sin(Math.PI * s), 0));
      const [frontAnkle, backAnkle] = forward ? [moving, planted] : [planted, moving];
      const middleX = (frontAnkle.x + backAnkle.x) / 2 + (forward ? 0.04 : 0.06);
      const standY = BODY.ankle + Math.sqrt((LEG - 0.01) ** 2 - (BODY.hip - 0.11) ** 2) - 0.02;
      // Down until the back knee is just off the floor, both legs in reach.
      const at = (y: number) => {
        const pelvis = new Vec3(middleX, y, 0);
        const shoulders = shouldersAt(pelvis, lean);
        const hands = SIDES.map((sd, i) =>
          shoulders[i].clone().add(new Vec3(0.02, -ARM * 0.99, 0.04 * sd)),
        ) as [Vec3, Vec3];
        const backIs = forward ? 1 : 0;
        const pose = poseFrom({
          pelvis,
          lean,
          ankles: forward ? [moving, planted] : [planted, moving],
          feet: forward
            ? [flat, mixed(flatBack, toes, sink).normalize()]
            : [flat, mixed(flatBack, toes, s).normalize()],
          hands: forward
            ? (SIDES.map((sd, i) =>
              shoulders[i].clone().add(new Vec3(0.03, -ARM * 0.99, 0.08 * sd)),
            ) as [Vec3, Vec3])
            : hands,
          elbowPole: mirror(new Vec3(-1, 0, 0.1)),
          kneePole: [undefined, new Vec3(0.2, -1, 0)],
        });
        void backIs;
        if (!forward) pose.dumbbells = hands.map((h) => ({ at: h, axis: new Vec3(1, 0, 0) }));
        return pose;
      };
      const reach = (y: number) =>
        Math.min(
          LEG - new Vec3(middleX, y, BODY.hip).distanceTo(frontAnkle.clone().setZ(0.11)),
          LEG - new Vec3(middleX, y, -BODY.hip).distanceTo(backAnkle),
        );
      const high = Math.min(standY, secant((y) => reach(y) - 0.005, 0.85, 0.8));
      let low = high;
      while (low > 0.3 && at(
        low,
      ).legs[1].mid.y > 0.13 && at(low).legs[0].root.y > at(low).legs[0].mid.y) low -= 0.01;
      return at(lerp(high, Math.min(high, low), sink));
    },
  };
}

/**
 * The step-up: the whole foot on a knee-high box; stand up through that
 * foot, not pushing off the back one, and lower slowly on the same leg.
 */
function stepUp(): Move {
  const box = 0.48;
  const toeOut = rad(8);
  const flat = new Vec3(Math.cos(toeOut), 0, Math.sin(toeOut));
  const flatOther = new Vec3(Math.cos(toeOut), 0, -Math.sin(toeOut));
  const onBox = new Vec3(0.32, box + BODY.ankle, 0.11);
  const floor = new Vec3(-0.08, BODY.ankle, -0.11);
  const arrive = new Vec3(0.3, box + BODY.ankle + 0.02, -0.11);
  return {
    kit: { dumbbells: true },
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.15, 0, 0),
      room: { height: 2.15, width: 1.7 },
    },
    pose(depth) {
      const d = ease(clamp01(depth));
      const lift = ease((d - 0.55) / 0.45);
      const other = mixed(floor, arrive, lift).add(new Vec3(0, 0.12 * Math.sin(Math.PI * lift), 0));
      const lean = lerp(rad(18), rad(2), d);
      const start = new Vec3(0.06, 0, 0);
      start.y = BODY.ankle + Math.sqrt(
        (LEG - 0.01) ** 2 - (start.x - floor.x) ** 2 - (BODY.hip - 0.11) ** 2,
      ) - 0.03;
      const end = new Vec3(
        onBox.x - 0.02,
        onBox.y + Math.sqrt((LEG - 0.005) ** 2 - 0.02 ** 2 - (0.11 - BODY.hip) ** 2),
        0,
      );
      const pelvis = mixed(start, end, d);
      // Never further from either foot than the leg reaches.
      for (const [a, z] of [[onBox, BODY.hip], [other, -BODY.hip]] as [Vec3, number][]) {
        const hip = pelvis.clone().setZ(z);
        const far = hip.distanceTo(a);
        if (far > LEG) pelvis.addScaledVector(a.clone().sub(hip).normalize(), far - LEG);
      }
      const shoulders = shouldersAt(pelvis, lean);
      const hands = SIDES.map((s, i) =>
        shoulders[i].clone().add(new Vec3(0.02, -ARM * 0.99, 0.04 * s)),
      ) as [Vec3, Vec3];
      const pose = poseFrom({
        pelvis,
        lean,
        ankles: [onBox, other],
        feet: [flat, flatOther],
        hands,
        elbowPole: mirror(new Vec3(-1, 0, 0.1)),
        kneePole: [undefined, lift > 0 && lift < 1 ? new Vec3(1, 0.2, 0) : undefined],
      });
      pose.legs[0] = { ...pose.legs[0], planted: true };
      pose.legs[1] = { ...pose.legs[1], planted: lift < 0.02 || lift > 0.98 };
      pose.dumbbells = hands.map((h) => ({ at: h, axis: new Vec3(1, 0, 0) }));
      pose.props = [
        {
          kind: "pad",
          from: new Vec3(0.02, box, 0),
          to: new Vec3(0.62, box, 0),
          half: 0.3,
          thick: box,
        },
      ];
      return pose;
    },
  };
}

/**
 * Sitting on a leg machine, trunk at `lean`, hands on the handles by the
 * seat; the legs as given.
 */
function seatedFor(lean: number, seat: number) {
  const pelvis = new Vec3(0, seat + SIZE.thigh, 0);
  const shoulders = shouldersAt(pelvis, lean);
  const hands = SIDES.map((s, i) =>
    withinReach(shoulders[i], new Vec3(0.05, seat + 0.05, s * 0.3)),
  ) as [Vec3, Vec3];
  return (ankles: [Vec3, Vec3], feet: [Vec3, Vec3], kneePole: Vec3 | [Vec3, Vec3]) => {
    const pose = poseFrom({
      pelvis,
      lean,
      ankles,
      feet,
      hands,
      elbowPole: mirror(new Vec3(-0.5, -1, 0.3)),
      kneePole,
    });
    pose.props = seatProps(pose, { top: seat, from: -0.25, to: 0.32, back: true });
    pose.props.push(
      ...hands.map((h) =>
        rod(h.clone().add(new Vec3(-0.08, 0, 0)), h.clone().add(new Vec3(0.08, 0, 0))),
      ),
    );
    return pose;
  };
}

/**
 * The leg extension: knees in line with the pivot, the roller on the
 * shins; straighten the legs, squeeze, and lower slowly.
 */
function legExtension(): Move {
  const seat = 0.5;
  const sit = seatedFor(rad(-12), seat);
  const knee = new Vec3(BODY.thigh, seat + SIZE.thigh, 0);
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.2, 0, 0),
      room: { height: 1.65, width: 1.8 },
    },
    pose(depth) {
      const a = lerp(rad(5), rad(85), ease(clamp01(depth)));
      const shin = new Vec3(Math.sin(a), -Math.cos(a), 0);
      const ankles = SIDES.map((s) =>
        knee.clone().setZ(s * BODY.hip).addScaledVector(shin, BODY.shin * 0.999),
      ) as [Vec3, Vec3];
      const foot = turned(shin, UP, 75);
      const pose = sit(ankles, [foot, foot], UP);
      const front = new Vec3(Math.cos(a), Math.sin(a), 0);
      const roller = ankles[0]
        .clone()
        .setZ(0.16)
        .addScaledVector(front, SIZE.shin + 0.05)
        .addScaledVector(shin, -0.05);
      pose.props!.push(
        { kind: "ring", at: roller, normal: new Vec3(0, 0, 1), r: 0.05 },
        rod(knee.clone().setZ(0.2), roller),
        rod(knee.clone().setZ(0.2), new Vec3(knee.x, 0, 0.2)),
      );
      return pose;
    },
  };
}

/**
 * The seated leg curl: knees in line with the pivot, the thigh pad snug,
 * the lower pad above the heels; curl the heels down and back, and return
 * slowly to straight legs.
 */
function seatedLegCurl(): Move {
  const seat = 0.5;
  const sit = seatedFor(rad(-18), seat);
  const knee = new Vec3(BODY.thigh, seat + SIZE.thigh, 0);
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.25, 0, 0),
      room: { height: 1.65, width: 1.9 },
    },
    pose(depth) {
      const a = lerp(rad(85), rad(-15), ease(clamp01(depth)));
      const shin = new Vec3(Math.sin(a), -Math.cos(a), 0);
      const ankles = SIDES.map((s) =>
        knee.clone().setZ(s * BODY.hip).addScaledVector(shin, BODY.shin * 0.999),
      ) as [Vec3, Vec3];
      const foot = turned(shin, UP, 75);
      const pose = sit(ankles, [foot, foot], UP);
      const back = new Vec3(-Math.cos(a), -Math.sin(a), 0);
      const roller = ankles[0]
        .clone()
        .setZ(0.16)
        .addScaledVector(back, SIZE.shin + 0.05)
        .addScaledVector(shin, -0.05);
      const thighPad = knee.clone().add(new Vec3(-0.15, SIZE.thigh + 0.05, 0.16));
      pose.props!.push(
        { kind: "ring", at: roller, normal: new Vec3(0, 0, 1), r: 0.05 },
        rod(knee.clone().setZ(0.2), roller),
        { kind: "ring", at: thighPad, normal: new Vec3(0, 0, 1), r: 0.05 },
        rod(knee.clone().setZ(0.2), new Vec3(knee.x, 0, 0.2)),
      );
      return pose;
    },
  };
}

/**
 * The lying leg curl: face down, knees in line with the pivot, the pad
 * above the heels; curl as far as you can, hips down, and return slowly to
 * straight.
 */
function lyingLegCurl(): Move {
  const top = 0.62;
  const lean = Math.PI / 2;
  const pelvis = new Vec3(0, top + SIZE.trunk.side * 0.7, 0);
  const knee = new Vec3(-BODY.thigh, pelvis.y - 0.02, 0);
  const shoulders = shouldersAt(pelvis, lean);
  const hands = SIDES.map((s, i) =>
    withinReach(shoulders[i], new Vec3(shoulders[i].x + 0.3, top - 0.08, s * 0.3)),
  ) as [
    Vec3,
    Vec3,
  ];
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(-0.05, 0, 0),
      room: { height: 1.35, width: 2.2 },
    },
    pose(depth) {
      const a = lerp(rad(3), rad(118), ease(clamp01(depth)));
      const shin = new Vec3(-Math.cos(a), Math.sin(a), 0);
      const ankles = SIDES.map((s) =>
        knee.clone().setZ(s * BODY.hip).addScaledVector(shin, BODY.shin * 0.999),
      ) as [Vec3, Vec3];
      const foot = turned(shin, DOWN, 80);
      const pose = poseFrom({
        pelvis,
        lean,
        ankles,
        feet: [foot, foot],
        hands,
        elbowPole: mirror(new Vec3(0, -1, 0.5)),
        kneePole: DOWN,
      });
      const up = new Vec3(Math.sin(a), Math.cos(a), 0);
      const roller = ankles[0]
        .clone()
        .setZ(0.16)
        .addScaledVector(up, SIZE.shin + 0.05)
        .addScaledVector(shin, -0.04);
      pose.props = [
        {
          kind: "pad",
          from: new Vec3(knee.x + 0.04, top, 0),
          to: new Vec3(shoulders[0].x + 0.12, top, 0),
          ...PAD,
        },
        rod(new Vec3(knee.x + 0.15, top - PAD.thick, 0), new Vec3(knee.x + 0.15, 0, 0)),
        rod(new Vec3(shoulders[0].x, top - PAD.thick, 0), new Vec3(shoulders[0].x, 0, 0)),
        { kind: "ring", at: roller, normal: new Vec3(0, 0, 1), r: 0.05 },
        rod(knee.clone().setZ(0.2), roller),
        ...hands.map((h) => rod(h, new Vec3(h.x, 0, h.z))),
      ];
      return pose;
    },
  };
}

/**
 * The hip abduction and adduction machines: sitting back, knees bent, the
 * pads on the outside (abduction) or inside (adduction) of the knees; push
 * the knees out wide, or squeeze them together, and return slowly. From
 * the front.
 */
function hipMachine(out: boolean): Move {
  const seat = 0.5;
  const sit = seatedFor(rad(-20), seat);
  return {
    kit: {},
    film: {
      views: [90],
      lifts: true,
      middle: new Vec3(0, 0, 0),
      room: { height: 1.6, width: 1.6 },
    },
    pose(depth) {
      const d = ease(clamp01(depth));
      const open = rad(out ? lerp(4, 34, d) : lerp(34, 4, d));
      const knees = SIDES.map((s) =>
        new Vec3(
          Math.cos(open) * BODY.thigh,
          seat + SIZE.thigh + 0.04,
          s * (BODY.hip + Math.sin(open) * BODY.thigh),
        ),
      );
      const ankles = knees.map((k) =>
        k.clone().add(new Vec3(0.02, -BODY.shin * 0.999, 0)),
      ) as [Vec3, Vec3];
      const foot = AHEAD.clone();
      const pose = sit(ankles, [foot, foot], mirror(new Vec3(1, 0.2, 0.6)));
      const pads: Prop[] = SIDES.map((s, i) => {
        const k = pose.legs[i].mid;
        const off = (out ? 1 : -1) * s * (SIZE.thigh + 0.04);
        return rod(
          k.clone().add(new Vec3(-0.08, 0.06, off)),
          k.clone().add(new Vec3(-0.08, -0.12, off)),
        );
      });
      pose.props!.push(...pads);
      return pose;
    },
  };
}

/**
 * The cable kickback: ankle strap on a low pulley, hands on the frame,
 * hinged a little forward; kick the working leg straight back, and return
 * slowly with the knee coming forward under the hip.
 */
function cableKickback(): Move {
  const lean = rad(28);
  const toeOut = rad(8);
  const standingAnkle = new Vec3(0, BODY.ankle, -0.12);
  const pulley = new Vec3(0.75, 0.1, 0);
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.1, 0, 0),
      room: { height: 1.9, width: 2.1 },
    },
    pose(depth) {
      const d = ease(clamp01(depth));
      const pelvis = new Vec3(
        -0.06,
        BODY.ankle + Math.sqrt((LEG - 0.02) ** 2 - 0.06 ** 2 - 0.03 ** 2),
        0,
      );
      const hip = pelvis.clone().setZ(BODY.hip);
      // The working leg from under the hip, knee a little forward, to back and straight.
      const back = lerp(rad(-12), rad(38), d);
      const reach = lerp(LEG - 0.12, LEG, d);
      const ankle = hip.clone().add(new Vec3(-Math.sin(back) * reach, -Math.cos(back) * reach, 0));
      const shoulders = shouldersAt(pelvis, lean);
      const hands = SIDES.map((s, i) =>
        withinReach(shoulders[i], new Vec3(0.68, 1.2, s * 0.15)),
      ) as [Vec3, Vec3];
      const pose = poseFrom({
        pelvis,
        lean,
        ankles: [ankle, standingAnkle],
        feet: [new Vec3(0.3, -1, 0).normalize(), new Vec3(Math.cos(toeOut), 0, -Math.sin(toeOut))],
        hands,
        elbowPole: mirror(new Vec3(0, -1, 0.3)),
        kneePole: [new Vec3(1, 0, 0), undefined],
      });
      pose.legs[0] = { ...pose.legs[0], planted: false };
      pose.props = [
        ...cableProps(new Vec3(pulley.x + 0.08, 0, 0), pulley.y, ankle),
        rod(new Vec3(0.66, 1.2, 0.2), new Vec3(0.66, 1.2, -0.2)),
      ];
      return pose;
    },
  };
}

/**
 * A foot on its ball at `ball`, heel `heel` radians up from level (below 0,
 * the heel drops into a stretch): where the ankle is, and the way the foot
 * points.
 */
function onBall(ball: Vec3, heel: number, toeOut: number, side: number) {
  const level = new Vec3(Math.cos(toeOut), 0, side * Math.sin(toeOut));
  const foot = level
    .clone()
    .multiplyScalar(Math.cos(heel))
    .add(new Vec3(0, -Math.sin(heel), 0))
    .normalize();
  const top = UP.clone().addScaledVector(foot, -UP.dot(foot)).normalize();
  const ankle = ball
    .clone()
    .addScaledVector(foot, -(BODY.toe - 0.07))
    .addScaledVector(top, BODY.ankle);
  return { ankle, foot };
}

/**
 * The standing calf raise, on both feet or (`single`) one, the balls of the
 * feet on a step's edge, heels hanging; rise as high as you can, pause, and
 * lower slowly into a full stretch. On one foot, a hand holds a post.
 */
function calfRaise(single: boolean): Move {
  const step = 0.16;
  const toeOut = rad(8);
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.05, 0, 0),
      room: { height: 2.0, width: 1.5 },
    },
    pose(depth) {
      const heel = lerp(rad(-18), rad(32), ease(clamp01(depth)));
      const balls = SIDES.map((s) => new Vec3(0.14, step, s * 0.11));
      const [a, b] = SIDES.map((s, i) => onBall(balls[i], heel, toeOut, s));
      const ankles = [
        a.ankle,
        single ? new Vec3(-0.12, step + 0.3, -0.11) : b.ankle,
      ] as [Vec3, Vec3];
      const feet = [a.foot, single ? new Vec3(0.2, -1, 0).normalize() : b.foot] as [Vec3, Vec3];
      const pelvis = new Vec3(a.ankle.x - 0.03, 0, 0);
      pelvis.y = a.ankle.y + Math.sqrt((LEG - 0.005) ** 2 - 0.03 ** 2 - (0.11 - BODY.hip) ** 2);
      const shoulders = shouldersAt(pelvis, 0);
      const hands = single
        ? ([
          withinReach(shoulders[0], new Vec3(0.45, 1.2, 0.2)),
          shoulders[1].clone().add(new Vec3(0, -ARM * 0.99, -0.05)),
        ] as [Vec3, Vec3])
        : (SIDES.map((s, i) =>
          shoulders[i].clone().add(new Vec3(0.01, -ARM * 0.99, 0.05 * s)),
        ) as [Vec3, Vec3]);
      const pose = poseFrom({
        pelvis,
        lean: 0,
        ankles,
        feet,
        hands,
        elbowPole: mirror(new Vec3(-1, -0.2, 0.2)),
        kneePole: single ? [undefined, new Vec3(0.3, -1, 0)] : undefined,
      });
      pose.legs = pose.legs.map((leg, i) =>
        ({ ...leg, planted: !(single && i === 1) }),
      ) as [Leg, Leg];
      pose.props = [
        {
          kind: "pad",
          from: new Vec3(0.04, step, 0),
          to: new Vec3(0.55, step, 0),
          half: 0.3,
          thick: step,
        },
        ...(single ? [rod(new Vec3(0.48, 0, 0.25), new Vec3(0.48, 1.5, 0.25))] : []),
      ];
      return pose;
    },
  };
}

/**
 * The seated calf raise: the pad on the thighs, the balls of the feet on the
 * plate; press up onto the toes as high as you can and lower to a full
 * stretch.
 */
function seatedCalf(): Move {
  const seat = 0.5;
  const toeOut = rad(8);
  const pelvis = new Vec3(0, seat + SIZE.thigh, 0);
  const plate = 0.1;
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.2, 0, 0),
      room: { height: 1.55, width: 1.7 },
    },
    pose(depth) {
      const heel = lerp(rad(-18), rad(30), ease(clamp01(depth)));
      const ends = SIDES.map((s) => onBall(new Vec3(0.55, plate, s * 0.12), heel, toeOut, s));
      const shoulders = shouldersAt(pelvis, rad(10));
      const hands = SIDES.map((s, i) =>
        withinReach(shoulders[i], new Vec3(0.42, seat + 0.25, s * 0.2)),
      ) as [Vec3, Vec3];
      const pose = poseFrom({
        pelvis,
        lean: rad(10),
        ankles: [ends[0].ankle, ends[1].ankle],
        feet: [ends[0].foot, ends[1].foot],
        hands,
        elbowPole: mirror(new Vec3(-0.3, -1, 0.3)),
        kneePole: new Vec3(1, 1, 0),
      });
      pose.legs = pose.legs.map((leg) => ({ ...leg, planted: true })) as [Leg, Leg];
      const knee = pose.legs[0].mid;
      pose.props = [
        ...seatProps(pose, { top: seat, from: -0.22, to: 0.2 }),
        {
          kind: "pad",
          from: new Vec3(knee.x - 0.18, knee.y + SIZE.thigh + PAD.thick, 0),
          to: new Vec3(knee.x + 0.02, knee.y + SIZE.thigh + PAD.thick, 0),
          ...PAD,
        },
        rod(new Vec3(knee.x + 0.05, knee.y + SIZE.thigh + 0.03, 0), new Vec3(knee.x + 0.3, 0, 0)),
        {
          kind: "pad",
          from: new Vec3(0.5, plate, 0),
          to: new Vec3(0.75, plate, 0),
          half: 0.25,
          thick: plate,
        },
      ];
      return pose;
    },
  };
}

/**
 * The leg press: reclined on the seat, feet shoulder width in the middle of
 * the platform; lower until the knees are near the chest, lower back on the
 * pad, and press away without snapping the knees straight. As a calf press
 * (`calf`), the legs stay straight and only the ankles move.
 */
function legPress(calf: boolean): Move {
  const seat = 0.45;
  const lean = rad(-55);
  const pelvis = new Vec3(0, seat + SIZE.thigh, 0);
  const sled = new Vec3(Math.cos(rad(45)), Math.sin(rad(45)), 0);
  const across = new Vec3(-sled.y, sled.x, 0);
  const shoulders = shouldersAt(pelvis, lean);
  const hands = SIDES.map((s) => new Vec3(0.05, seat + 0.06, s * 0.3)) as [Vec3, Vec3];
  const rail = (along: number) => pelvis
    .clone()
    .addScaledVector(sled, along)
    .addScaledVector(across, -0.36);
  /** The platform `along` the sled from the hips, the heels `heel` off it. */
  const at = (along: number, heel: number) => {
    const base = pelvis.clone().addScaledVector(sled, along).addScaledVector(across, 0.06);
    const ankles = SIDES.map((s) =>
      base
        .clone()
        .setZ(s * 0.15)
        .addScaledVector(sled, -BODY.ankle)
        .addScaledVector(across, -0.02 - heel * 0.12),
    ) as [Vec3, Vec3];
    const foot = turned(across, sled, rad(0) + heel * 0);
    const tilted = across.clone().applyAxisAngle(new Vec3(0, 0, 1), heel * 0.6);
    const pose = poseFrom({
      pelvis,
      lean,
      ankles,
      feet: [calf ? tilted : foot, calf ? tilted : foot],
      hands: SIDES.map((s, i) => withinReach(shoulders[i], hands[i])) as [Vec3, Vec3],
      elbowPole: mirror(new Vec3(0, -1, 0.3)),
      kneePole: mirror(new Vec3(-0.2, 1, 0.25)),
    });
    pose.legs = pose.legs.map((leg) =>
      ({ ...leg, planted: true, top: sled.clone().negate() }),
    ) as [Leg, Leg];
    const plate = base.clone();
    pose.props = [
      ...seatProps(pose, { top: seat, from: -0.3, to: 0.15, back: true, past: 0.25 }),
      {
        kind: "pad",
        from: plate.clone().addScaledVector(across, -0.22),
        to: plate.clone().addScaledVector(across, 0.3),
        half: 0.3,
        thick: 0.05,
        up: sled.clone().negate(),
      },
      // The sled's rail under the platform, on a post to the floor.
      rod(rail(0.45), rail(1.45)),
      rod(rail(1.45), new Vec3(rail(1.45).x, 0, 0)),
      rod(
        plate.clone().addScaledVector(across, -0.2),
        plate.clone().addScaledVector(across, -0.36),
      ),
    ];
    return pose;
  };
  const reachAlong = (bend: number) =>
    secant((s) => {
      const p = pelvis
        .clone()
        .addScaledVector(sled, s)
        .addScaledVector(across, 0.06)
        .setZ(0.15)
        .addScaledVector(sled, -BODY.ankle)
        .addScaledVector(across, -0.02);
      return p.distanceTo(pelvis.clone().setZ(BODY.hip)) - (LEG - bend);
    }, 0.8, 0.75);
  const far = reachAlong(0.02);
  const near = reachAlong(0.5);
  return {
    kit: {},
    film: { views: [0], middle: new Vec3(0.3, 0, 0), room: { height: 1.65, width: 2.1 } },
    pose(depth) {
      const d = ease(clamp01(depth));
      return calf ? at(far, lerp(rad(-15), rad(30), d)) : at(lerp(far, near, d), 0);
    },
  };
}

/**
 * The hack squat: back flat on the pad, feet shoulder width mid-platform;
 * lower along the sled until the thighs are at least parallel, and press up
 * without locking the knees hard.
 */
function hackSquat(): Move {
  const toeOut = rad(15);
  const { feet, ankles } = stand(0.17, toeOut);
  const plat = ankles.map((a) => a.clone().add(new Vec3(0.18, 0, 0))) as [Vec3, Vec3];
  const lean = rad(-35);
  const { trunk } = frameOf(lean);
  const railOff = SIZE.trunk.side + PAD.thick + 0.025;
  const top0 = new Vec3(0.02, 0, 0);
  top0.y = BODY.ankle + Math.sqrt(
    (LEG - 0.02) ** 2 - (plat[0].x - top0.x) ** 2 - (0.17 - BODY.hip) ** 2,
  );
  /** A point on the rail, `along` it from the floor. */
  const rail = (along: number) => {
    const through = top0.clone().addScaledVector(frameOf(lean).forward, -railOff);
    const foot = through.clone().addScaledVector(trunk, -through.y / trunk.y);
    return foot.addScaledVector(trunk, along);
  };
  const at = (s: number) => {
    const top = new Vec3(0.02, 0, 0);
    top.y = BODY.ankle + Math.sqrt(
      (LEG - 0.02) ** 2 - (plat[0].x - top.x) ** 2 - (0.17 - BODY.hip) ** 2,
    );
    const pelvis = top.clone().addScaledVector(trunk, -s);
    const shoulders = shouldersAt(pelvis, lean);
    const hands = SIDES.map((sd, i) =>
      shoulders[i].clone().add(new Vec3(0.12, 0.05, 0.08 * sd)),
    ) as [Vec3, Vec3];
    const pose = poseFrom(
      { pelvis, lean, ankles: plat, feet, hands, elbowPole: mirror(new Vec3(0.5, -1, 0.4)) },
    );
    const T = SIZE.trunk;
    const low = pelvis.clone().addScaledVector(trunk, T.down);
    const high = pelvis
      .clone()
      .addScaledVector(trunk, BODY.torso + T.up)
      .addScaledVector(frameOf(lean).forward, -T.side);
    const along = high.clone().sub(low).normalize();
    const back = frameOf(lean).forward.clone();
    pose.props = [
      {
        kind: "pad",
        from: low.clone().addScaledVector(along, -0.05),
        to: high.clone().addScaledVector(along, 0.1),
        ...PAD,
        up: back,
      },
      {
        kind: "ring",
        at: shoulders[0].clone().add(new Vec3(0, 0.1, 0.02)),
        normal: new Vec3(0, 0, 1),
        r: 0.05,
      },
      // The rail behind the pad, along the line it slides, on a post.
      rod(rail(0), rail(1.75)),
      rod(rail(1.75), new Vec3(rail(1.75).x, 0, 0)),
      rod(
        low.clone().addScaledVector(back, -PAD.thick),
        low.clone().addScaledVector(back, -railOff),
      ),
      {
        kind: "pad",
        from: new Vec3(-0.05, 0.06, 0),
        to: new Vec3(0.55, 0.06, 0),
        half: 0.3,
        thick: 0.06,
      },
    ];
    return pose;
  };
  // Down until the thighs are a touch below parallel.
  let bottom = 0.2;
  while (bottom < 0.6 && at(
    bottom,
  ).legs[0].root.y > at(bottom).legs[0].mid.y - 0.01) bottom += 0.005;
  return {
    kit: {},
    film: { views: [0], middle: new Vec3(0, 0, 0), room: { height: 1.9, width: 2.1 } },
    pose: (depth) => at(lerp(0, bottom, ease(clamp01(depth)))),
  };
}

/**
 * The front squat: the bar on the front of the shoulders, elbows high; sit
 * down between the heels with the chest up, the bar staying over mid-foot,
 * and drive up keeping the elbows high. Upright — more than a back squat.
 */
function frontSquat(): Move {
  const stance = 0.2;
  const toeOut = rad(18);
  const { feet, ankles } = stand(stance, toeOut);
  const midFoot = midFootOf(toeOut);
  const topX = 0.06;
  const topY = BODY.ankle + Math.sqrt((LEG + 0.003) ** 2 - topX ** 2 - (stance - BODY.hip) ** 2);
  const [bottomX, bottomY] = [-0.08, 0.36];
  return {
    kit: { bar: "barbell" },
    film: { views: [0, 90], middle: new Vec3(midFoot, 0, 0), room: { height: 1.85, width: 2.4 } },
    pose(depth) {
      const d = clamp01(depth);
      const pelvis = new Vec3(
        lerp(topX, bottomX, Math.sin((d * Math.PI) / 2)),
        lerp(topY, bottomY, d),
        0,
      );
      // The bar in the rack of the shoulders, ahead of the neck.
      const barFrom = (lean: number) => {
        const { trunk, forward } = frameOf(lean);
        return pelvis
          .clone()
          .addScaledVector(trunk, BODY.torso + 0.02)
          .addScaledVector(forward, 0.13);
      };
      const lean = halve((l) => barFrom(l).x - midFoot, -0.3, 1.0);
      const bar = barFrom(lean);
      const { trunk, forward } = frameOf(lean);
      return poseFrom({
        pelvis,
        lean,
        ankles,
        feet,
        hands: handsOn(bar.clone().addScaledVector(forward, -0.03), 0.27),
        // Elbows high and forward, the upper arms near level.
        elbowPole: mirror(forward.clone().addScaledVector(trunk, 0.35).add(new Vec3(0, 0, 0.45))),
        bar,
      });
    },
  };
}

/**
 * The cable pull-through: back to a low pulley, the rope between the legs;
 * hinge the hips back, arms long, until the hamstrings stretch, and drive
 * the hips forward to stand tall. A hinge, not a squat.
 */
function cablePullThrough(): Move {
  const stance = 0.22;
  const toeOut = rad(15);
  const midFoot = midFootOf(toeOut);
  const { feet, ankles } = stand(stance, toeOut);
  const pulley = new Vec3(-1.0, 0.18, 0);
  const at = (x: number, d: number) => {
    const lean = lerp(rad(2), rad(68), d);
    const pelvis = standingHips(x, stance).add(new Vec3(0, -lerp(0.01, 0.07, d), 0));
    const shoulders = shouldersAt(pelvis, lean);
    // Arms long, hanging a little back toward the cable, hands together.
    const dir = new Vec3(-lerp(0.1, 0.3, d), -1, 0).normalize();
    const hands = SIDES.map((s, i) =>
      withinReach(shoulders[i], shoulders[i].clone().addScaledVector(dir, ARM).setZ(s * 0.03)),
    ) as [Vec3, Vec3];
    const pose = poseFrom(
      { pelvis, lean, ankles, feet, hands, elbowPole: mirror(new Vec3(1, 0, 0.3)) },
    );
    pose.props = [...cableProps(new Vec3(pulley.x, 0, 0), pulley.y, held(pose))];
    return pose;
  };
  return {
    kit: {},
    film: { views: [0], middle: new Vec3(-0.25, 0, 0), room: { height: 2.15, width: 2.2 } },
    pose(depth) {
      const d = ease(clamp01(depth));
      // Leaning back on the cable a little: balanced just behind mid-foot.
      const x = secant(
        (h) => centreOfMass(at(h, d), 0.15, held(at(h, d))).x - (midFoot - 0.03),
        -0.05,
        -0.1,
      );
      return at(x, d);
    },
  };
}

// ---- jumps ----

type Jump = { x: number; lift: number; bend: number; lean: number; arms: number };

/**
 * A body jumping: the feet `lift` off the ground at `x`, the hips `bend`
 * metres closer to the ankles than straight legs, leaning `lean`, the arms
 * swung `arms` degrees forward of hanging. On the ground the knees track the
 * toes; in the air they come up.
 */
function jumper(ground: number, { x, lift, bend, lean, arms }: Jump) {
  const toeOut = rad(10);
  const feet = mirror(new Vec3(Math.cos(toeOut), 0, Math.sin(toeOut)));
  const ankleY = ground + BODY.ankle + lift;
  const ankles = mirror(new Vec3(x, ankleY, 0.15));
  const dx = 0.04 + 0.35 * bend;
  const pelvis = new Vec3(
    x - dx,
    ankleY + Math.sqrt((LEG - bend) ** 2 - dx * dx - (0.15 - BODY.hip) ** 2),
    0,
  );
  const shoulders = shouldersAt(pelvis, rad(lean));
  const dir = turned(DOWN, AHEAD, arms);
  const limbs = SIDES.map((s, i) =>
    armFrom(
      shoulders[i],
      dir.clone().add(new Vec3(0, 0, 0.12 * s)),
      turned(dir, UP, 8).add(new Vec3(0, 0, 0.08 * s)),
    ),
  ) as [Limb, Limb];
  const pose = poseFrom({
    pelvis,
    lean: rad(lean),
    ankles,
    feet,
    hands: [limbs[0].end, limbs[1].end],
    elbowPole: DOWN,
    kneePole: lift > 0.02 ? new Vec3(1, 0.3, 0) : undefined,
  });
  pose.legs = pose.legs.map((leg) => ({ ...leg, planted: lift < 0.02 })) as [Leg, Leg];
  return withArms(pose, limbs);
}

/** The ground under `x`: the box's top on it, the floor elsewhere. */
const groundOf = (box: { from: number; to: number; top: number } | undefined, x: number) =>
  box && x > box.from - 0.05 && x < box.to + 0.05 ? box.top : 0;

/** A jumping film from its keys, in a loop of `cycle` seconds, on and off an optional box. */
function jumpFilm(
  keys: ({ t: number } & Jump)[],
  { cycle, box, room, middle }: {
    cycle: number;
    box?: { from: number; to: number; top: number };
    room: { height: number; width: number };
    middle: number;
  },
): Move {
  const motion = keyframes<keyof Jump>(keys);
  return {
    kit: {},
    film: { views: [0], cycle, middle: new Vec3(middle, 0, 0), room },
    pose(depth) {
      const k = motion(depth);
      const pose = jumper(groundOf(box, k.x), k);
      pose.props = box
        ? [
          {
            kind: "pad",
            from: new Vec3(box.from, box.top, 0),
            to: new Vec3(box.to, box.top, 0),
            half: 0.3,
            thick: box.top,
          },
        ]
        : [];
      return pose;
    },
  };
}

/**
 * The box jump: a foot from the box, dip and swing the arms back, jump and
 * land softly in a quarter squat on the box, stand up — then step down,
 * not jump.
 */
function boxJump(): Move {
  const box = { from: 0.42, to: 0.95, top: 0.5 };
  const on = 0.66;
  return jumpFilm(
    [
      { t: 0, x: 0, lift: 0, bend: 0.01, lean: 0, arms: 0 },
      { t: 0.12, x: 0, lift: 0, bend: 0.01, lean: 0, arms: 0 },
      { t: 0.24, x: 0, lift: 0, bend: 0.2, lean: 35, arms: -40 },
      { t: 0.34, x: 0.3, lift: 0.62, bend: 0.12, lean: 10, arms: 150 },
      { t: 0.42, x: on, lift: 0.04 - 0.0, bend: 0.12, lean: 25, arms: 70 },
      { t: 0.44, x: on, lift: 0, bend: 0.14, lean: 25, arms: 60 },
      { t: 0.58, x: on, lift: 0, bend: 0.01, lean: 0, arms: 0 },
      { t: 0.68, x: on, lift: 0, bend: 0.01, lean: 0, arms: 0 },
      { t: 0.8, x: 0.25, lift: 0.0, bend: 0.06, lean: 6, arms: 10 },
      { t: 0.9, x: 0, lift: 0, bend: 0.02, lean: 0, arms: 0 },
      { t: 1, x: 0, lift: 0, bend: 0.01, lean: 0, arms: 0 },
    ],
    { cycle: 4.2, box, room: { height: 2.3, width: 2.0 }, middle: 0.4 },
  );
}

/**
 * The broad jump: feet hip width, dip as the arms swing back, jump forward
 * as far as you can and land softly, knees bent, and stick it — then walk
 * back for the next.
 */
function broadJump(): Move {
  const far = 1.25;
  return jumpFilm(
    [
      { t: 0, x: 0, lift: 0, bend: 0.01, lean: 0, arms: 0 },
      { t: 0.1, x: 0, lift: 0, bend: 0.01, lean: 0, arms: 0 },
      { t: 0.24, x: 0, lift: 0, bend: 0.22, lean: 40, arms: -45 },
      { t: 0.36, x: far * 0.5, lift: 0.4, bend: 0.12, lean: 20, arms: 140 },
      { t: 0.46, x: far, lift: 0, bend: 0.22, lean: 30, arms: 70 },
      { t: 0.6, x: far, lift: 0, bend: 0.2, lean: 28, arms: 60 },
      { t: 0.7, x: far, lift: 0, bend: 0.01, lean: 0, arms: 0 },
      { t: 0.95, x: 0, lift: 0, bend: 0.03, lean: 0, arms: 0 },
      { t: 1, x: 0, lift: 0, bend: 0.01, lean: 0, arms: 0 },
    ],
    { cycle: 4.5, room: { height: 2.2, width: 2.6 }, middle: far / 2 },
  );
}

/**
 * The depth jump: step off a low box — not jump — land, and jump straight up
 * the instant you touch; land softly, and climb back on.
 */
function depthJump(): Move {
  const box = { from: -0.6, to: -0.12, top: 0.35 };
  const start = -0.36;
  return jumpFilm(
    [
      { t: 0, x: start, lift: 0, bend: 0.01, lean: 0, arms: 0 },
      { t: 0.1, x: start, lift: 0, bend: 0.01, lean: 0, arms: 0 },
      { t: 0.22, x: 0.1, lift: 0.0, bend: 0.03, lean: 5, arms: 15 },
      { t: 0.27, x: 0.2, lift: 0, bend: 0.2, lean: 30, arms: -30 },
      { t: 0.38, x: 0.2, lift: 0.5, bend: 0.03, lean: 0, arms: 128 },
      { t: 0.48, x: 0.2, lift: 0, bend: 0.18, lean: 25, arms: 50 },
      { t: 0.6, x: 0.2, lift: 0, bend: 0.01, lean: 0, arms: 0 },
      { t: 0.85, x: start, lift: 0, bend: 0.05, lean: 10, arms: 10 },
      { t: 1, x: start, lift: 0, bend: 0.01, lean: 0, arms: 0 },
    ],
    { cycle: 4.2, box, room: { height: 2.4, width: 1.9 }, middle: -0.1 },
  );
}

/**
 * The jump squat: squat to a quarter or half depth, jump as high as you
 * can, land softly and reset before the next.
 */
function jumpSquat(): Move {
  return jumpFilm(
    [
      { t: 0, x: 0, lift: 0, bend: 0.01, lean: 0, arms: 0 },
      { t: 0.15, x: 0, lift: 0, bend: 0.01, lean: 0, arms: 0 },
      { t: 0.35, x: 0, lift: 0, bend: 0.26, lean: 32, arms: -35 },
      { t: 0.5, x: 0, lift: 0.42, bend: 0.03, lean: 0, arms: 125 },
      { t: 0.64, x: 0, lift: 0, bend: 0.2, lean: 25, arms: 40 },
      { t: 0.85, x: 0, lift: 0, bend: 0.01, lean: 0, arms: 0 },
      { t: 1, x: 0, lift: 0, bend: 0.01, lean: 0, arms: 0 },
    ],
    { cycle: 3, room: { height: 2.45, width: 1.6 }, middle: 0 },
  );
}

/**
 * The med ball slam: the ball overhead, arms long, up on the toes; slam it
 * into the floor with the whole body, then squat down to pick it up and
 * reset.
 */
function medBallSlam(): Move {
  type Slam = Jump & { ball: number };
  const motion = keyframes<keyof Slam>([
    { t: 0, x: 0, lift: 0.04, bend: 0, lean: -5, arms: 175, ball: 0 },
    { t: 0.12, x: 0, lift: 0.04, bend: 0, lean: -5, arms: 175, ball: 0 },
    { t: 0.28, x: 0, lift: 0, bend: 0.14, lean: 55, arms: 25, ball: 0 },
    { t: 0.34, x: 0, lift: 0, bend: 0.14, lean: 55, arms: 15, ball: 1 },
    { t: 0.55, x: 0, lift: 0, bend: 0.36, lean: 45, arms: 30, ball: 1 },
    { t: 0.62, x: 0, lift: 0, bend: 0.36, lean: 45, arms: 30, ball: 0 },
    { t: 0.8, x: 0, lift: 0, bend: 0.05, lean: 5, arms: 100, ball: 0 },
    { t: 1, x: 0, lift: 0.04, bend: 0, lean: -5, arms: 175, ball: 0 },
  ]);
  const r = 0.13;
  return {
    kit: {},
    film: {
      views: [0],
      cycle: 3.6,
      middle: new Vec3(0.15, 0, 0),
      room: { height: 2.55, width: 1.7 },
    },
    pose(depth) {
      const k = motion(depth);
      const pose = jumper(0, k);
      pose.legs = pose.legs.map((leg) => ({ ...leg, planted: true })) as [Leg, Leg];
      // In the hands, or on the floor where it landed.
      const inHands = held(pose).addScaledVector(turned(DOWN, AHEAD, k.arms), r * 0.85);
      const onFloor = new Vec3(0.55, r, 0);
      const at = k.ball > 0.5 ? onFloor : inHands;
      pose.props = [{ kind: "ball", at, r }];
      return pose;
    },
  };
}

void hangingTo;
void standingHips;

/** The leg movements, by id. */
export const LEGS: Record<string, () => Move> = {
  front_squat: frontSquat,
  cable_pull_through: cablePullThrough,
  deadlift: () => deadlift("conventional"),
  speed_deadlift: () => deadlift("conventional"),
  sumo_deadlift: () => deadlift("sumo"),
  trap_bar_deadlift: () => deadlift("trap"),
  good_morning: goodMorning,
  hip_thrust: () => bridge(true),
  glute_bridge: () => bridge(false),
  back_ext: backExtension,
  nordic_curl: nordicCurl,
  kb_swing: kettlebellSwing,
  single_leg_rdl: singleLegRdl,
  bulgarian: () => splitSquat(true),
  split_squat: () => splitSquat(false),
  bw_split_squat: () => splitSquat(false, false),
  bw_squat: bodyweightSquat,
  reverse_lunge: () => lunge(false),
  walking_lunge: () => lunge(true),
  step_up: stepUp,
  leg_ext: legExtension,
  leg_curl: lyingLegCurl,
  seated_leg_curl: seatedLegCurl,
  hip_abduction: () => hipMachine(true),
  hip_adduction: () => hipMachine(false),
  cable_kickback: cableKickback,
  calf_raise: () => calfRaise(false),
  single_leg_calf_raise: () => calfRaise(true),
  seated_calf: seatedCalf,
  leg_press: () => legPress(false),
  leg_press_calf: () => legPress(true),
  hack_squat: hackSquat,
  box_jump: boxJump,
  broad_jump: broadJump,
  depth_jump: depthJump,
  jump_squat: jumpSquat,
  med_ball_slam: medBallSlam,
};
