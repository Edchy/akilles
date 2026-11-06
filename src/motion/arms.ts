import {
  armFrom,
  balance,
  BAR_RADIUS,
  cableProps,
  chestAt,
  clamp01,
  ease,
  held,
  lerp,
  mirror,
  mixed,
  PLATE_5KG,
  rad,
  seatProps,
  shouldersAt,
  standing,
  standingHips,
  turned,
  withArms,
  withinReach,
  type Move,
} from "@/motion/build";
import { BODY, poseFrom, SIDES, SIZE, type Limb, type Pose, type Prop } from "@/motion/figure";
import {
  benchBody,
  benchProps,
  flyArms,
  machinePress,
  onBench,
  shouldersOf,
} from "@/motion/push";
import { Vec3 } from "@/motion/vector";

/**
 * Triceps and shoulders: pushdowns, extensions, kickbacks and dips; raises,
 * flies, face pulls and shrugs. Each follows its guide (see
 * `data/guides.ts`).
 */

const DOWN = new Vec3(0, -1, 0);
const UP = new Vec3(0, 1, 0);
const AHEAD = new Vec3(1, 0, 0);
const BACK = new Vec3(-1, 0, 0);

/** Up the spine and out of the chest, leaning `lean`. */
const frameOf = (lean: number) => ({
  trunk: new Vec3(Math.sin(lean), Math.cos(lean), 0),
  forward: new Vec3(Math.cos(lean), -Math.sin(lean), 0),
});

/** A standing pose whose arms are given whole, balanced over mid-foot. */
function standWith(
  options: Parameters<typeof standing>[0],
  arms: (shoulders: [Vec3, Vec3]) => [Limb, Limb],
  load = 0,
) {
  const make = (x: number) => {
    const pelvis = standingHips(x, options.stance ?? 0.15).add(
      new Vec3(0, -(options.bend ?? 0), 0),
    );
    const limbs = arms(shouldersAt(pelvis, options.lean ?? 0, options.shrug ?? 0));
    const pose = standing({ ...options, x }, [limbs[0].end, limbs[1].end]);
    return withArms(pose, limbs);
  };
  return make(balance(make, load, options.toeOut));
}

/**
 * The triceps pushdown, with a bar or, `rope`, a rope: from a high pulley,
 * elbows tucked at the sides and still; push down until the arms are
 * straight, then let the hands rise to chest height. With a rope, the hands
 * spread at the bottom.
 */
function pushdown(rope: boolean): Move {
  const lean = rad(12);
  const pulley = new Vec3(0.62, 2.05, 0);
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.2, 0, 0),
      room: { height: 2.2, width: 1.6 },
    },
    pose(depth) {
      const d = clamp01(depth);
      const pose = standWith({ lean }, (shoulders) => {
        const { trunk, forward } = frameOf(lean);
        const upper = turned(trunk.clone().negate(), forward, 12);
        const bend = lerp(118, 0, ease(d));
        return SIDES.map((s, i) => {
          const spread = rope ? 0.35 * d * s : -0.25 * s * (1 - d);
          const fore = turned(DOWN, AHEAD, bend).add(new Vec3(0, 0, spread));
          return armFrom(shoulders[i], upper, fore);
        }) as [Limb, Limb];
      });
      const [a, b] = [pose.arms[0].end, pose.arms[1].end];
      const knot = mixed(a, b, 0.5).add(new Vec3(0.02, rope ? 0.16 : 0, 0));
      pose.props = [
        ...cableProps(new Vec3(pulley.x + 0.08, 0, 0), pulley.y, knot),
        ...(rope
          ? [
              { kind: "line" as const, from: knot, to: a },
              { kind: "line" as const, from: knot, to: b },
            ]
          : [{ kind: "line" as const, from: a.clone().setZ(0.2), to: b.clone().setZ(-0.2) }]),
      ];
      return pose;
    },
  };
}

/**
 * The overhead triceps extension: one dumbbell held in both hands behind
 * the head, elbows pointing up by the head; straighten the arms overhead
 * and lower again to a deep stretch, the upper arms still.
 */
function overheadExtension(): Move {
  return {
    kit: { dumbbells: true },
    film: { views: [0, 90], middle: new Vec3(0, 0, 0), room: { height: 2.25, width: 1.5 } },
    pose(depth) {
      const d = clamp01(depth);
      const pose = standWith(
        {},
        (shoulders) =>
          SIDES.map((s, i) => {
            const upper = new Vec3(0.12, 1, -0.32 * s);
            const fore = turned(upper, new Vec3(-0.3, -1, 0), lerp(4, 145, ease(d)));
            return armFrom(shoulders[i], upper, fore.add(new Vec3(0, 0, -0.08 * s)));
          }) as [Limb, Limb],
        0.12,
      );
      const [a, b] = [pose.arms[0], pose.arms[1]];
      const fore = a.end.clone().sub(a.mid).normalize();
      pose.dumbbells = [{ at: mixed(a.end, b.end, 0.5).addScaledVector(fore, 0.04), axis: fore }];
      return pose;
    },
  };
}

/**
 * The cable overhead extension: facing away from the pulley, one foot
 * forward, leaning into it; elbows up by the head, straighten the arms
 * overhead and lower behind the head to a deep stretch.
 */
function cableOverheadExtension(): Move {
  const lean = rad(28);
  const feet = mirror(new Vec3(1, 0, 0.12).normalize());
  const ankles = [new Vec3(0.32, BODY.ankle, 0.13), new Vec3(-0.3, BODY.ankle, -0.13)] as [
    Vec3,
    Vec3,
  ];
  const pulley = new Vec3(-0.85, 1.45, 0);
  return {
    kit: {},
    film: { views: [0], middle: new Vec3(-0.1, 0, 0), room: { height: 2.2, width: 2.1 } },
    pose(depth) {
      const d = clamp01(depth);
      const pelvis = new Vec3(0.02, 0.83, 0);
      const { trunk } = frameOf(lean);
      const shoulders = shouldersAt(pelvis, lean);
      const arms = SIDES.map((s, i) => {
        const upper = turned(trunk, AHEAD, 25).add(new Vec3(0, 0, -0.2 * s));
        const fore = turned(upper, new Vec3(-0.6, -1, 0), lerp(4, 140, ease(d)));
        return armFrom(shoulders[i], upper, fore);
      }) as [Limb, Limb];
      const pose = poseFrom({
        pelvis,
        lean,
        ankles,
        feet,
        hands: [arms[0].end, arms[1].end],
        elbowPole: UP,
      });
      withArms(pose, arms);
      const knot = mixed(arms[0].end, arms[1].end, 0.5).add(new Vec3(-0.12, -0.04, 0));
      pose.props = [
        ...cableProps(new Vec3(pulley.x - 0.08, 0, 0), pulley.y, knot),
        { kind: "line", from: knot, to: arms[0].end },
        { kind: "line", from: knot, to: arms[1].end },
      ];
      return pose;
    },
  };
}

/**
 * The skullcrusher: lying back, the arms straight up over the shoulders;
 * bend only at the elbows, lowering the bar toward the forehead, and
 * straighten back up. The upper arms stay still, tipped a little back.
 */
function skullcrusher(): Move {
  const body = benchBody(0, 0.44);
  const top = shouldersOf(body);
  const grip = 0.15;
  return {
    kit: { bar: "barbell", plate: PLATE_5KG },
    film: { views: [0], middle: new Vec3(-0.12, 0, 0), room: { height: 1.5, width: 1.85 } },
    pose(depth) {
      const d = clamp01(depth);
      const arms = SIDES.map((s) => {
        const shoulder = top.clone().setZ(s * BODY.shoulder);
        const upper = new Vec3(-0.18, 1, -0.06 * s);
        const fore = turned(upper, new Vec3(-1, -0.2, 0), lerp(3, 112, ease(d)));
        return armFrom(shoulder, upper, fore.add(new Vec3(0, 0, -0.02 * s)));
      }) as [Limb, Limb];
      const pose = onBench(body, [arms[0].end, arms[1].end]);
      withArms(pose, arms);
      pose.bar = mixed(arms[0].end, arms[1].end, 0.5);
      pose.props = benchProps(body, pose);
      void grip;
      return pose;
    },
  };
}

/**
 * The dumbbell kickback: hinged forward, knees soft, the upper arms level
 * with the body and still; straighten the arms back, squeeze, and return to
 * 90° at the elbow.
 */
function kickback(): Move {
  const lean = rad(62);
  const { trunk } = frameOf(lean);
  return {
    kit: { dumbbells: true },
    film: { views: [0], lifts: true, middle: new Vec3(0, 0, 0), room: { height: 1.8, width: 1.7 } },
    pose(depth) {
      const d = clamp01(depth);
      const pose = standWith(
        { lean, bend: 0.07 },
        (shoulders) =>
          SIDES.map((s, i) => {
            const upper = trunk.clone().negate().add(new Vec3(0, 0, -0.02 * s));
            const fore = turned(DOWN, BACK, lerp(30, 95, ease(d)));
            return armFrom(shoulders[i], upper, fore);
          }) as [Limb, Limb],
        0.2,
      );
      pose.dumbbells = pose.arms.map((arm) => {
        const fore = arm.end.clone().sub(arm.mid).normalize();
        return { at: arm.end, axis: new Vec3().crossVectors(fore, new Vec3(0, 0, 1)).normalize() };
      });
      return pose;
    },
  };
}

/**
 * The seated dip machine: the handles at the sides, just below the chest;
 * push down until the arms are straight, and let the handles rise slowly
 * until the elbows reach 90°. The elbows point straight back.
 */
function seatedDip(): Move {
  const body = benchBody(84, 0.5);
  const s = shouldersOf(body);
  return machinePress({
    incline: 84,
    seat: 0.5,
    start: new Vec3(s.x + 0.05, s.y - 0.24, 0),
    finish: new Vec3(s.x + 0.07, s.y - 0.58, 0),
    pivot: new Vec3(s.x + 0.62, s.y - 0.36, 0),
    grip: [0.31, 0.27],
    elbowPole: mirror(new Vec3(-1, 0, 0.15)),
  });
}

/**
 * The bench dip: hands on the edge of a bench behind, fingers forward, feet
 * flat ahead; bend the elbows straight back until the upper arms are level,
 * and push back up to straight arms. The body stays close to the bench.
 */
function benchDip(): Move {
  const top = 0.46;
  const hands = mirror(new Vec3(-0.05, top + 0.02, 0.22));
  const reach = 0.985 * (BODY.upperArm + BODY.forearm);
  const toeOut = rad(10);
  const feet = mirror(new Vec3(Math.cos(toeOut), 0, Math.sin(toeOut)));
  const ankles = mirror(new Vec3(0.62, BODY.ankle, 0.14));
  const lean = rad(4);
  const at = (drop: number) => {
    const shoulders = new Vec3(
      0.02,
      hands[0].y + Math.sqrt(reach ** 2 - 0.03 ** 2 - 0.07 ** 2) - drop,
      0,
    );
    const { trunk } = frameOf(lean);
    const pelvis = shoulders.clone().addScaledVector(trunk, -BODY.torso);
    const pose = poseFrom({
      pelvis,
      lean,
      ankles,
      feet,
      hands,
      elbowPole: mirror(new Vec3(-1, 0, 0.1)),
    });
    pose.props = [
      {
        kind: "pad",
        from: new Vec3(-0.6, top, 0),
        to: new Vec3(-0.02, top, 0),
        half: 0.2,
        thick: 0.065,
      },
      { kind: "line", from: new Vec3(-0.12, top - 0.065, 0), to: new Vec3(-0.12, 0, 0) },
      { kind: "line", from: new Vec3(-0.5, top - 0.065, 0), to: new Vec3(-0.5, 0, 0) },
    ];
    return pose;
  };
  let drop = 0.2;
  for (let i = 0; i < 40; i++) {
    const arm = at(drop).arms[0];
    drop += (arm.root.y - arm.mid.y) * 0.6;
  }
  return {
    kit: {},
    film: { views: [0], middle: new Vec3(0.05, 0, 0), room: { height: 1.45, width: 1.8 } },
    pose: (depth) => at(lerp(0, drop, clamp01(depth))),
  };
}

/**
 * The rear delt fly: hinged forward, knees soft, the dumbbells hanging;
 * sweep the arms out wide, thumbs a little down, elbows soft, and lower
 * under control. From the front, where the sweep shows.
 */
function rearDeltFly(): Move {
  const lean = rad(60);
  return {
    kit: { dumbbells: true },
    film: {
      views: [90, 0],
      lifts: true,
      middle: new Vec3(0, 0, 0),
      room: { height: 1.8, width: 1.9 },
    },
    pose(depth) {
      const d = clamp01(depth);
      const pose = standWith(
        { lean, bend: 0.07 },
        (shoulders) => flyArmsOf(
          shoulders,
          new Vec3(0.12, -1, 0.05),
          new Vec3(0.15, -0.05, 1),
          d,
          15,
        ),
        0.12,
      );
      pose.dumbbells = pose.arms.map((arm) => ({ at: arm.end, axis: new Vec3(1, 0, 0) }));
      return pose;
    },
  };
}

/** `flyArms` as limbs. */
function flyArmsOf(shoulders: [Vec3, Vec3], from: Vec3, to: Vec3, t: number, soft: number) {
  const { mids, hands } = flyArms(shoulders, from, to, t, rad(soft));
  return SIDES.map((_, i) => ({ root: shoulders[i], mid: mids[i], end: hands[i] })) as [Limb, Limb];
}

/**
 * The reverse fly machine: sitting tall facing the pad, the handles at
 * shoulder height, arms long; sweep the arms back and out until they line
 * up with the body, and return slowly to the front.
 */
function reverseFlyMachine(): Move {
  const body = benchBody(88, 0.5);
  const s = shouldersOf(body);
  const shoulders = mirror(new Vec3(0, 0, BODY.shoulder)).map((v) => v.add(s)) as [Vec3, Vec3];
  return {
    kit: {},
    film: {
      views: [90],
      lifts: true,
      middle: new Vec3(0, 0, 0),
      room: { height: 1.8, width: 1.9 },
    },
    pose(depth) {
      const d = clamp01(depth);
      const arms = flyArmsOf(shoulders, new Vec3(1, -0.05, -0.22), new Vec3(-0.05, -0.05, 1), d, 8);
      const pose = onBench(body, [arms[0].end, arms[1].end]);
      withArms(pose, arms);
      const chest = s.x + 0.24;
      pose.props = [
        ...seatProps(pose, { top: body.seat, from: -0.22, to: 0.22 }),
        {
          kind: "pad",
          from: new Vec3(chest, body.seat + 0.25, 0),
          to: new Vec3(chest, s.y - 0.02, 0),
          half: 0.14,
          thick: 0.065,
          up: BACK.clone(),
        },
        {
          kind: "line",
          from: new Vec3(chest + 0.065, body.seat + 0.25, 0),
          to: new Vec3(chest + 0.25, 0, 0),
        },
        ...arms.flatMap((arm) => [
          {
            kind: "line" as const,
            from: s.clone().add(new Vec3(0, 0.3, 0)),
            to: arm.end.clone().add(new Vec3(0, 0.08, 0)),
          },
          {
            kind: "line" as const,
            from: arm.end.clone().add(new Vec3(0, -0.07, 0)),
            to: arm.end.clone().add(new Vec3(0, 0.08, 0)),
          },
        ]),
      ];
      return pose;
    },
  };
}

/**
 * The cable rear delt fly: two pulleys at shoulder height, cables crossed, a
 * handle in each hand; arms long, sweep out and back into a T, and return
 * slowly, crossing in front.
 */
function cableRearDeltFly(): Move {
  const height = 1.42;
  return {
    kit: {},
    film: {
      views: [90],
      lifts: true,
      middle: new Vec3(0, 0, 0),
      room: { height: 2.2, width: 2.6 },
    },
    pose(depth) {
      const d = clamp01(depth);
      const pose = standWith({}, (shoulders) =>
        flyArmsOf(shoulders, new Vec3(1, -0.05, -0.3), new Vec3(-0.08, -0.05, 1), d, 8),
      );
      // Each hand holds the cable from the far pulley.
      pose.props = SIDES.flatMap((s, i) =>
        cableProps(new Vec3(0.6, 0, -s * 1.2), height, pose.arms[i].end),
      );
      return pose;
    },
  };
}

/**
 * The face pull: the rope at face height; pull toward the forehead,
 * splitting the rope, elbows high and wide, to finish with the hands beside
 * the ears; then return to straight arms.
 */
function facePull(): Move {
  const pulley = new Vec3(1.05, 1.62, 0);
  return {
    kit: {},
    film: {
      views: [0, 90],
      lifts: true,
      middle: new Vec3(0.2, 0, 0),
      room: { height: 2.15, width: 2.2 },
    },
    pose(depth) {
      const d = clamp01(depth);
      const lean = rad(-4);
      const make = (x: number) => {
        const pelvis = standingHips(x, 0.15);
        const shoulders = shouldersAt(pelvis, lean);
        const hands = SIDES.map((s, i) => {
          const straight = withinReach(
            shoulders[i],
            shoulders[i].clone().add(new Vec3(0.6, 0.12, -0.12 * s)),
          );
          const ears = shoulders[i].clone().add(new Vec3(0.02, 0.24, 0.1 * s));
          return mixed(straight, ears, ease(d));
        }) as [Vec3, Vec3];
        return standing({ x, lean }, hands, mirror(new Vec3(-0.1, lerp(-0.6, 0.15, d), 1)));
      };
      const pose = make(balance(make));
      const knot = mixed(
        pose.arms[0].end,
        pose.arms[1].end,
        0.5,
      ).add(new Vec3(lerp(0.12, 0.3, d), 0, 0));
      pose.props = [
        ...cableProps(new Vec3(pulley.x + 0.08, 0, 0), pulley.y, knot),
        { kind: "line", from: knot, to: pose.arms[0].end },
        { kind: "line", from: knot, to: pose.arms[1].end },
      ];
      return pose;
    },
  };
}

/**
 * The cable lateral raise, one arm: standing side-on to a low pulley, the
 * handle in the far hand; raise the arm out to the side to shoulder height,
 * elbow soft, and lower slowly back across the body. From the front.
 */
function cableLateralRaise(): Move {
  return {
    kit: {},
    film: {
      views: [90],
      lifts: true,
      middle: new Vec3(0, 0, -0.15),
      room: { height: 2.1, width: 2.0 },
    },
    pose(depth) {
      const d = clamp01(depth);
      const pose = standWith({ lean: rad(4) }, (shoulders) => {
        const [raise] = flyArmsOf(shoulders, new Vec3(0.12, -1, -0.28), new Vec3(0.2, 0, 1), d, 12);
        const hang = armFrom(shoulders[1], new Vec3(0.05, -1, -0.12), new Vec3(0.1, -1, -0.05));
        return [raise, hang];
      });
      pose.props = cableProps(new Vec3(0.15, 0, -0.62), 0.12, pose.arms[0].end);
      return pose;
    },
  };
}

/**
 * The machine lateral raise: seated, the shoulders in line with the pivot,
 * the pads on the outside of the upper arms; elbows bent, raise the arms to
 * shoulder height and lower slower than they rose. From the front.
 */
function machineLateralRaise(): Move {
  const body = benchBody(86, 0.5);
  const s = shouldersOf(body);
  const shoulders = mirror(new Vec3(0, 0, BODY.shoulder)).map((v) => v.add(s)) as [Vec3, Vec3];
  return {
    kit: {},
    film: {
      views: [90],
      lifts: true,
      middle: new Vec3(0, 0, 0),
      room: { height: 1.75, width: 1.8 },
    },
    pose(depth) {
      const d = clamp01(depth);
      const lift = lerp(12, 88, ease(d));
      const arms = SIDES.map((sd, i) => {
        const upper = new Vec3(0.05, -Math.cos(rad(lift)), sd * Math.sin(rad(lift)));
        return armFrom(shoulders[i], upper, new Vec3(1, 0, 0));
      }) as [Limb, Limb];
      const pose = onBench(body, [arms[0].end, arms[1].end]);
      withArms(pose, arms);
      // Each pad on the outside of the upper arm, square to it.
      const pads: Prop[] = arms.map((arm, i) => {
        const off = new Vec3(0, Math.sin(rad(lift)), SIDES[i] * Math.cos(rad(lift)));
        const r = SIZE.upperArm + 0.03;
        return {
          kind: "line",
          from: mixed(arm.root, arm.mid, 0.35).addScaledVector(off, r),
          to: arm.mid.clone().addScaledVector(off, r),
        };
      });
      pose.props = [
        ...seatProps(pose, { top: body.seat, from: -0.25, to: 0.22, back: true }),
        ...pads,
      ];
      return pose;
    },
  };
}

/**
 * The front raise: dumbbells in front of the thighs, palms down; raise to
 * shoulder height, elbows soft, and lower slowly. No lean back.
 */
function frontRaise(): Move {
  return {
    kit: { dumbbells: true },
    film: {
      views: [0, 90],
      lifts: true,
      middle: new Vec3(0.1, 0, 0),
      room: { height: 1.95, width: 1.6 },
    },
    pose(depth) {
      const d = clamp01(depth);
      const pose = standWith(
        {},
        (shoulders) =>
          SIDES.map((s, i) => {
            const lift = lerp(8, 90, ease(d));
            const upper = new Vec3(Math.sin(rad(lift)), -Math.cos(rad(lift)), -0.04 * s);
            const fore = turned(upper, UP, 12);
            return armFrom(shoulders[i], upper, fore);
          }) as [Limb, Limb],
        0.12,
      );
      pose.dumbbells = pose.arms.map((arm) => ({ at: arm.end, axis: new Vec3(0, 0, 1) }));
      return pose;
    },
  };
}

/**
 * The upright row: the bar in front of the thighs, hands about shoulder
 * width; pull up along the body, elbows leading, to chest height, and lower
 * under control to straight arms.
 */
function uprightRow(): Move {
  const grip = 0.2;
  const load = 0.3;
  const atHeight = (pose: Pose, y: number) => {
    // The front of the body at height `y`: the thighs low, the chest high.
    const h = y - pose.pelvis.y;
    const front = h > -0.05 ? chestAt(Math.min(h, BODY.torso)) : SIZE.thigh;
    return pose.pelvis.x + front + BAR_RADIUS + 0.015;
  };
  return {
    kit: { bar: "barbell", plate: PLATE_5KG },
    film: {
      views: [0, 90],
      lifts: true,
      middle: new Vec3(0.05, 0, 0),
      room: { height: 1.95, width: 2.3 },
    },
    pose(depth) {
      const d = clamp01(depth);
      const make = (x: number) => {
        const base = standing({ x }, mirror(new Vec3(0.1, 0.8, grip)));
        const s = base.arms[0].root;
        const low = s.y - Math.sqrt(
          (0.995 * (BODY.upperArm + BODY.forearm)) ** 2 - (grip - BODY.shoulder) ** 2 - 0.1 ** 2,
        );
        const y = lerp(low + 0.02, s.y - 0.12, ease(d));
        const bar = new Vec3(atHeight(base, y), y, 0);
        const hands = SIDES.map((sd) => bar.clone().setZ(sd * grip)) as [Vec3, Vec3];
        const pose = standing(
          { x },
          hands.map((h, i) => withinReach(base.arms[i].root, h)) as [Vec3, Vec3],
          mirror(new Vec3(-0.3, 1, 1.1)),
        );
        pose.bar = mixed(pose.arms[0].end, pose.arms[1].end, 0.5);
        return pose;
      };
      const make0 = (x: number) => make(x);
      return make(balance(make0, load));
    },
  };
}

/**
 * The shrug, with dumbbells at the sides or, `bar`, a bar in front of the
 * thighs: arms long, just hooks; shrug straight up toward the ears and lower
 * all the way to a stretch.
 */
function shrug(bar: boolean): Move {
  return {
    kit: bar ? { bar: "barbell" } : { dumbbells: true },
    film: {
      views: [0, 90],
      lifts: true,
      middle: new Vec3(0.05, 0, 0),
      room: { height: 1.95, width: bar ? 2.3 : 1.5 },
    },
    pose(depth) {
      const up = lerp(0, 0.08, ease(clamp01(depth)));
      const pose = standWith(
        { shrug: up },
        (shoulders) =>
          SIDES.map((s, i) =>
            bar
              ? armFrom(shoulders[i], new Vec3(0.2, -1, 0.07 * s), new Vec3(0.2, -1, 0.07 * s))
              : armFrom(shoulders[i], new Vec3(0, -1, 0.15 * s), new Vec3(0, -1, 0.15 * s)),
          ) as [Limb, Limb],
        bar ? 0.6 : 0.4,
      );
      if (bar) pose.bar = held(pose);
      else pose.dumbbells = pose.arms.map((arm) => ({ at: arm.end, axis: new Vec3(1, 0, 0) }));
      return pose;
    },
  };
}

/** The triceps and shoulder movements, by id. */
export const ARMS: Record<string, () => Move> = {
  pushdown: () => pushdown(false),
  rope_pushdown: () => pushdown(true),
  overhead_ext: overheadExtension,
  cable_overhead_ext: cableOverheadExtension,
  skullcrusher,
  kickback,
  seated_dip: seatedDip,
  bench_dip: benchDip,
  rear_delt_fly: rearDeltFly,
  reverse_fly_machine: reverseFlyMachine,
  cable_rear_delt_fly: cableRearDeltFly,
  face_pull: facePull,
  cable_lateral_raise: cableLateralRaise,
  machine_lateral_raise: machineLateralRaise,
  front_raise: frontRaise,
  upright_row: uprightRow,
  db_shrug: () => shrug(false),
  bb_shrug: () => shrug(true),
};
