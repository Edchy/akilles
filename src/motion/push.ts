import {
  BAR_RADIUS,
  cableProps,
  chestAt,
  clamp01,
  EDGE_TILT,
  ease,
  elbowUpright,
  lerp,
  mirror,
  mixed,
  PAD,
  PLATE_5KG,
  rad,
  seatProps,
  secant,
  smithProps,
  stand,
  standingHips,
  withinReach,
  type Move,
} from "@/motion/build";
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
 * The push family: presses lying, sitting and standing, flies, dips and
 * push-ups. Each follows its guide (see `data/guides.ts`); tests/motion.cjs
 * holds each to it.
 */

/** What a press is done with. */
type Hold = "barbell" | "smith" | "dumbbells" | "machine";

/**
 * Lying or sitting back against a pad tilted `incline` degrees from the floor
 * — 0 flat, 30 an incline bench, 80 an upright seat, below 0 a decline —
 * the seat `seat` metres up. The pad meets the back of the ▽, so the spine
 * leans a little more than the pad (see `EDGE_TILT`). Feet flat on the
 * floor, or, on a decline, hooked under a roller.
 */
export function benchBody(incline: number, seat: number) {
  const tilt = rad(incline) + EDGE_TILT;
  const lean = tilt - Math.PI / 2;
  const pelvis = new Vec3(0, seat + SIZE.thigh, 0);
  const decline = incline < 0;
  const upright = incline > 60;
  const toeOut = rad(upright ? 12 : 25);
  const feet = SIDES.map((s) => new Vec3(Math.cos(toeOut), 0, s * Math.sin(toeOut))) as [
    Vec3,
    Vec3,
  ];
  // Sitting up, the shins upright under the knees; lying back, the feet
  // planted ahead and wide; on a decline, the ankles under a roller.
  const ankles = SIDES.map((s) =>
    decline
      ? new Vec3(0.62, pelvis.y + 0.02, s * 0.12)
      : upright
        ? new Vec3(0.5, BODY.ankle, s * 0.2)
        : new Vec3(0.42, BODY.ankle, s * 0.3),
  ) as [Vec3, Vec3];
  return { lean, pelvis, feet, ankles, decline, upright, seat };
}

export type Body = ReturnType<typeof benchBody>;

/** A pose on the bench with the hands where given, elbows down and out by `flare`. */
export function onBench(
  body: Body,
  hands: [Vec3, Vec3],
  flare = 0.6,
  elbowPole?: Vec3 | [Vec3, Vec3],
) {
  const pose = poseFrom({
    pelvis: body.pelvis,
    lean: body.lean,
    ankles: body.ankles,
    feet: body.feet,
    hands,
    elbowPole: elbowPole ?? mirror(new Vec3(0, -1, flare)),
    kneePole: body.decline ? new Vec3(0.3, 1, 0) : undefined,
  });
  if (body.decline) pose.legs = pose.legs.map((leg) => ({ ...leg, foot: new Vec3(0, -1, 0) })) as [
    typeof pose.legs[0],
    typeof pose.legs[1],
  ];
  return pose;
}

/** The bench under a lifter in `pose`: its pad along the back, the seat, the decline's roller. */
export function benchProps(body: Body, pose: Pose): Prop[] {
  if (body.upright) {
    return seatProps(pose, { top: body.seat, from: -0.25, to: 0.22, back: true, past: 0.02 });
  }
  const props: Prop[] = [];
  const { low, high } = edgeOf(pose);
  const along = high.clone().sub(low).normalize();
  const flat = Math.abs(along.y) < 0.2;
  const start = flat ? low
    .clone()
    .addScaledVector(along, -0.42) : low
    .clone()
    .addScaledVector(along, -0.02);
  const end = high.clone().addScaledVector(along, 0.3);
  props.push({ kind: "pad", from: start, to: end, ...PAD, up: pose.forward.clone() });
  const leg = (p: Vec3) =>
    props.push({ kind: "line", from: p, to: new Vec3(p.x, 0, 0) });
  leg(mixed(start, end, 0.12).addScaledVector(pose.forward, -PAD.thick));
  leg(mixed(start, end, 0.85).addScaledVector(pose.forward, -PAD.thick));
  if (!flat && !body.decline) {
    props.push(
      { kind: "pad", from: new Vec3(-0.05, body.seat, 0), to: new Vec3(0.3, body.seat, 0), ...PAD },
    );
  }
  if (body.decline) {
    const roller = pose.legs[0].end.clone().add(new Vec3(0.03, -0.11, 0));
    props.push(
      {
        kind: "line",
        from: new Vec3(roller.x, roller.y, 0.18),
        to: new Vec3(roller.x, roller.y, -0.18),
      },
      { kind: "ring", at: roller.clone().setZ(0.16), normal: new Vec3(0, 0, 1), r: 0.05 },
      { kind: "line", from: roller.clone().setZ(0), to: new Vec3(roller.x - 0.1, 0, 0) },
    );
  }
  return props;
}

/** The back of the ▽ (see `backEdge`). */
function edgeOf(pose: Pose) {
  const T = SIZE.trunk;
  return {
    low: pose.pelvis.clone().addScaledVector(pose.trunk, T.down),
    high: pose.pelvis
      .clone()
      .addScaledVector(pose.trunk, BODY.torso + T.up)
      .addScaledVector(pose.forward, -T.side),
  };
}

/** Where on the trunk `h` up the spine the chest's surface is, plus `out`. */
export const chestPoint = (body: Body, h: number, out: number) => {
  const trunk = new Vec3(Math.sin(body.lean), Math.cos(body.lean), 0);
  const forward = new Vec3(Math.cos(body.lean), -Math.sin(body.lean), 0);
  return body.pelvis.clone().addScaledVector(trunk, h).addScaledVector(forward, chestAt(h) + out);
};

/** The shoulder joints' middle. */
export const shouldersOf = (body: Body) =>
  body.pelvis.clone().addScaledVector(
    new Vec3(Math.sin(body.lean), Math.cos(body.lean), 0),
    BODY.torso,
  );

/** Arms straight up from the shoulders, the hands `grip` from the middle. */
export const overShoulders = (body: Body, grip: number) => {
  const reach = 0.998 * (BODY.upperArm + BODY.forearm);
  const s = shouldersOf(body);
  return new Vec3(s.x, s.y + Math.sqrt(reach ** 2 - (grip - BODY.shoulder) ** 2), 0);
};

/** Each forearm upright, seen from `seen`, where it can be. */
export function forearmsUpright(pose: Pose, seen: "side" | "front") {
  pose.arms = pose.arms.map((arm) => {
    const mid = elbowUpright(arm.root, arm.end, seen) ?? arm.mid;
    return { ...arm, mid };
  }) as [Limb, Limb];
}

/**
 * A barbell press on a bench: the bar from arms straight down to touch the
 * chest `touch` up the spine, the forearms upright under it, and back up —
 * over the shoulders or, on a Smith machine, straight up and down where it
 * touched.
 */
function barbellPress({
  incline,
  seat = 0.44,
  grip,
  touch,
  smith = false,
}: {
  incline: number;
  seat?: number;
  grip: number;
  touch: number;
  smith?: boolean;
}): Move {
  const body = benchBody(incline, seat);
  const bottom = chestPoint(body, touch, BAR_RADIUS);
  const over = overShoulders(body, grip);
  const top = smith ? topAbove(body, bottom, grip) : over;
  return {
    kit: smith ? { bar: "barbell", plate: PLATE_5KG } : { bar: "barbell" },
    film: filmFor(body),
    pose(depth) {
      const d = clamp01(depth);
      const bar = new Vec3(lerp(top.x, bottom.x, smith ? 1 : d * d), lerp(top.y, bottom.y, d), 0);
      const pose = onBench(
        body,
        [0, 1].map((i) => bar.clone().setZ(SIDES[i] * grip)) as [Vec3, Vec3],
      );
      pose.bar = bar;
      forearmsUpright(pose, "side");
      pose.props = [...benchProps(body, pose), ...(smith ? smithProps(bottom.x) : [])];
      return pose;
    },
  };
}

/** Arms straight with the hands straight above `p`: a Smith machine's top. */
function topAbove(body: Body, p: Vec3, grip: number) {
  const s = shouldersOf(body);
  const reach = 0.998 * (BODY.upperArm + BODY.forearm);
  const dx = p.x - s.x;
  return new Vec3(p.x, s.y + Math.sqrt(reach ** 2 - dx * dx - (grip - BODY.shoulder) ** 2), 0);
}

/**
 * How a lifter on a bench is filmed: lying, from the side; sitting, from the
 * side and front — with room up to the top of the press.
 */
function filmFor(body: Body): Move["film"] {
  const s = shouldersOf(body);
  const height = Math.max(1.5, s.y + 0.97);
  if (body.upright) {
    return { views: [0, 90], middle: new Vec3(0.12, 0, 0), room: { height, width: 1.5 } };
  }
  return { views: [0], middle: new Vec3(-0.12, 0, 0), room: { height, width: 1.85 } };
}

/**
 * A dumbbell press on a bench: from the chest, the dumbbells beside it and
 * the forearms upright under them, up and a little in until the arms are
 * straight over the shoulders. `turn`: the Arnold press, from palms facing
 * you, elbows in front, to palms forward, elbows out.
 */
function dumbbellPress({
  incline,
  seat = 0.44,
  low,
  turn = false,
}: {
  incline: number;
  seat?: number;
  /**
   * The bottom: each dumbbell `out` from the middle, `up` the spine, `ahead`
   * of the chest's surface.
   */
  low: { out: number; up: number; ahead: number };
  turn?: boolean;
}): Move {
  const body = benchBody(incline, seat);
  const narrow = BODY.shoulder + 0.02;
  const top = overShoulders(body, narrow);
  const trunk = new Vec3(Math.sin(body.lean), Math.cos(body.lean), 0);
  return {
    kit: { dumbbells: true },
    film: filmFor(body),
    pose(depth) {
      const d = clamp01(depth);
      const bottom = chestPoint(body, low.up, low.ahead - (turn ? 0 : 0));
      const middle = new Vec3(lerp(top.x, bottom.x, d * d), lerp(top.y, bottom.y, d), 0);
      const out = lerp(narrow, low.out, d);
      const hands = SIDES.map((s) => middle.clone().setZ(s * out)) as [Vec3, Vec3];
      const pose = poseFrom({
        pelvis: body.pelvis,
        lean: body.lean,
        ankles: body.ankles,
        feet: body.feet,
        hands,
        elbowPole: turn
          ? mirror(new Vec3(lerp(0.2, 1.2, d), -1, lerp(0.8, 0.05, d)))
          : mirror(new Vec3(0, -1, 0.6)),
      });
      if (!turn) forearmsUpright(pose, "side");
      // Palms forward: the handles across; the Arnold's turn takes the
      // palms from facing back to forward, the dumbbells upright between.
      pose.dumbbells = hands.map((at, i) => {
        if (!turn) return { at, axis: new Vec3(0, 0, 1) };
        const a = (Math.PI / 2) * d;
        return {
          at,
          axis: trunk
            .clone()
            .multiplyScalar(Math.sin(a))
            .add(new Vec3(0, 0, Math.cos(a) * SIDES[i])),
        };
      });
      pose.props = benchProps(body, pose);
      return pose;
    },
  };
}

/**
 * A machine press: the handles on levers that swing about a pivot, from
 * `start` (beside the chest, or the shoulders) out to arms straight at
 * `finish`, the seat and back pad under the lifter.
 */
export function machinePress({
  incline,
  seat,
  start,
  finish,
  pivot,
  grip,
  elbowPole,
  views = [0],
}: {
  incline: number;
  seat: number;
  start: Vec3;
  finish: Vec3;
  pivot: Vec3;
  grip: [number, number];
  /** The way the elbows point, if not down and out. */
  elbowPole?: Vec3 | [Vec3, Vec3];
  views?: number[];
}): Move {
  const body = benchBody(incline, seat);
  const radius = start.distanceTo(pivot);
  const [a0, raw] = [start, finish].map((p) => Math.atan2(p.y - pivot.y, p.x - pivot.x));
  // The short way round.
  const a1 = a0 + Math.atan2(Math.sin(raw - a0), Math.cos(raw - a0));
  return {
    kit: {},
    film: { ...filmFor(body), views },
    pose(depth) {
      const d = clamp01(depth);
      // The lever's sweep: 1 at the start, 0 with the arms straight.
      const a = lerp(a1, a0, d);
      const hand = pivot.clone().add(new Vec3(Math.cos(a) * radius, Math.sin(a) * radius, 0));
      const out = lerp(grip[1], grip[0], d);
      const top = shouldersOf(body);
      const hands = SIDES.map((s) =>
        withinReach(top.clone().setZ(s * BODY.shoulder), hand.clone().setZ(s * out)),
      ) as [Vec3, Vec3];
      const pose = onBench(body, hands, 0.5, elbowPole);
      const levers: Prop[] = hands.flatMap((h) => [
        { kind: "line" as const, from: pivot.clone().setZ(h.z), to: h },
        {
          kind: "line" as const,
          from: h.clone().add(new Vec3(0, -0.06, 0)),
          to: h.clone().add(new Vec3(0, 0.06, 0)),
        },
      ]);
      // A post behind the back pad, and a beam out to the levers' pivot.
      // A pivot ahead of the lifter stands on its own post.
      const ahead = pivot.x > body.pelvis.x + 0.3;
      const post = ahead ? pivot.x : Math.min(pivot.x, body.pelvis.x - 0.42);
      const frame: Prop[] = [
        { kind: "line", from: new Vec3(post, 0, 0), to: new Vec3(post, pivot.y, 0) },
        { kind: "line", from: new Vec3(post, pivot.y, 0), to: pivot.clone().setZ(0) },
        { kind: "line", from: pivot.clone().setZ(grip[0]), to: pivot.clone().setZ(-grip[0]) },
      ];
      pose.props = [...benchProps(body, pose), ...frame, ...levers];
      return pose;
    },
  };
}

/**
 * The plane in which a fly sweeps each arm: from `open`, the arms wide, to
 * `closed`, the hands together — both directions from the shoulder, for side
 * 0. The elbows stay softly bent, `soft`, all the way.
 */
export function flyArms(
  shoulders: [Vec3, Vec3],
  open: Vec3,
  closed: Vec3,
  t: number,
  soft = rad(20),
): { mids: [Vec3, Vec3]; hands: [Vec3, Vec3] } {
  const [mids, hands] = [[], []] as unknown as [[Vec3, Vec3], [Vec3, Vec3]];
  SIDES.forEach((s, i) => {
    const a = new Vec3(open.x, open.y, open.z * s).normalize();
    const b = new Vec3(closed.x, closed.y, closed.z * s).normalize();
    const angle = a.angleTo(b);
    const n = new Vec3().crossVectors(a, b).normalize();
    const dir = a.clone().applyAxisAngle(n, angle * t);
    const toward = new Vec3().crossVectors(n, dir);
    const fore = dir.clone().multiplyScalar(Math.cos(soft)).addScaledVector(toward, Math.sin(soft));
    mids[i] = shoulders[i].clone().addScaledVector(dir, BODY.upperArm);
    hands[i] = mids[i].clone().addScaledVector(fore, BODY.forearm);
  });
  return { mids, hands };
}

/**
 * A dumbbell fly on a bench: from the dumbbells over the chest, palms
 * facing, the arms open wide to a stretch, the elbows soft and fixed, and
 * sweep back together as if hugging a barrel. With `cables`, the hands hold
 * cables from low pulleys either side instead.
 */
function benchFly(incline: number, cables = false): Move {
  const body = benchBody(incline, 0.44);
  const trunk = new Vec3(Math.sin(body.lean), Math.cos(body.lean), 0);
  const forward = new Vec3(Math.cos(body.lean), -Math.sin(body.lean), 0);
  const top = shouldersOf(body);
  const shoulders = mirror(new Vec3(0, 0, BODY.shoulder)).map((v) => v.add(top)) as [Vec3, Vec3];
  // Open: out to the side, a little below the shoulders and toward the hips.
  const open = new Vec3(0, 0, 1).addScaledVector(forward, -0.18).addScaledVector(trunk, -0.25);
  // Closed: up over the chest, the hands just apart.
  const closed = forward.clone().addScaledVector(new Vec3(0, 0, 1), -0.12);
  return {
    kit: cables ? {} : { dumbbells: true },
    film: {
      views: cables ? [90] : [0, 90],
      middle: new Vec3(-0.12, 0, 0),
      room: { height: 1.55, width: cables ? 2.3 : 1.9 },
    },
    pose(depth) {
      const d = ease(clamp01(depth) * 0.999 + 0.0005);
      const { mids, hands } = flyArms(shoulders, open, closed, 1 - clamp01(depth));
      void d;
      const pose = onBench(body, hands);
      pose.arms = pose.arms.map((arm, i) => ({ ...arm, mid: mids[i] })) as [Limb, Limb];
      pose.props = benchProps(body, pose);
      if (cables) {
        SIDES.forEach((s, i) => {
          pose.props!.push(...cableProps(new Vec3(top.x, 0, s * 1.0), 0.15, hands[i]));
        });
      } else {
        pose.dumbbells = hands.map((at) => ({ at, axis: trunk.clone() }));
      }
      return pose;
    },
  };
}

/**
 * The pec deck: sitting tall against the pad, the arms at chest height,
 * elbows soft, sweep together in front and open slowly to a stretch. From
 * the front, where the sweep shows.
 */
function pecDeck(): Move {
  const body = benchBody(82, 0.48);
  const top = shouldersOf(body);
  const shoulders = mirror(new Vec3(0, 0, BODY.shoulder)).map((v) => v.add(top)) as [Vec3, Vec3];
  const open = new Vec3(-0.2, -0.12, 1);
  const closed = new Vec3(1, -0.12, -0.18);
  return {
    kit: {},
    film: {
      views: [90, 0],
      lifts: true,
      middle: new Vec3(0, 0, 0),
      room: { height: 1.75, width: 1.7 },
    },
    pose(depth) {
      const { mids, hands } = flyArms(shoulders, open, closed, clamp01(depth));
      const pose = onBench(body, hands);
      pose.arms = pose.arms.map((arm, i) => ({ ...arm, mid: mids[i] })) as [Limb, Limb];
      const pivotY = top.y + 0.25;
      pose.props = [
        ...benchProps(body, pose),
        ...SIDES.flatMap((s, i) => [
          {
            kind: "line" as const,
            from: new Vec3(top.x - 0.1, pivotY, s * 0.18),
            to: hands[i].clone().add(new Vec3(0, 0.12, 0)),
          },
          {
            kind: "line" as const,
            from: hands[i].clone().add(new Vec3(0, -0.07, 0)),
            to: hands[i].clone().add(new Vec3(0, 0.12, 0)),
          },
        ]),
        {
          kind: "line",
          from: new Vec3(top.x - 0.1, pivotY, 0.18),
          to: new Vec3(top.x - 0.1, pivotY, -0.18),
        },
        { kind: "line", from: new Vec3(top.x - 0.1, pivotY, 0), to: new Vec3(top.x - 0.25, 0, 0) },
      ];
      return pose;
    },
  };
}

/**
 * The cable crossover: pulleys high either side, a split stance, leaning a
 * little forward; soft elbows, the hands sweep down and together in front of
 * the hips, then open slowly back to a stretch. From the front.
 */
function cableCrossover(): Move {
  const lean = rad(15);
  const feet = mirror(new Vec3(1, 0, 0.15).normalize());
  const ankles = [
    new Vec3(0.3, BODY.ankle, 0.13),
    new Vec3(-0.3, BODY.ankle, -0.13),
  ] as [Vec3, Vec3];
  const at = (x: number, t: number) => {
    const pelvis = new Vec3(x, 0.86, 0);
    const trunk = new Vec3(Math.sin(lean), Math.cos(lean), 0);
    const top = pelvis.clone().addScaledVector(trunk, BODY.torso);
    const shoulders = mirror(new Vec3(0, 0, BODY.shoulder)).map((v) => v.add(top)) as [Vec3, Vec3];
    const open = new Vec3(-0.15, 0.45, 1);
    const closed = new Vec3(0.75, -1, -0.22);
    const { mids, hands } = flyArms(shoulders, open, closed, t);
    const pose = poseFrom({ pelvis, lean, ankles, feet, hands, elbowPole: new Vec3(0, -1, 0) });
    pose.arms = pose.arms.map((arm, i) => ({ ...arm, mid: mids[i] })) as [Limb, Limb];
    pose.props = SIDES.flatMap((s, i) => cableProps(new Vec3(-0.1, 0, s * 1.15), 2.0, hands[i]));
    return pose;
  };
  return {
    kit: {},
    film: {
      views: [90],
      lifts: true,
      middle: new Vec3(0, 0, 0),
      room: { height: 2.2, width: 2.6 },
    },
    pose: (depth) => at(0, clamp01(depth)),
  };
}

/**
 * The dip: locked out on the parallel bars, shoulders down; leaning a little
 * forward, lower until the upper arms are level, and push back up. The hands
 * stay where they are and the body balances over them, knees bent behind.
 */
function dips(): Move {
  const barY = 1.2;
  const grip = 0.25;
  const hands = SIDES.map((s) => new Vec3(0, barY, s * grip)) as [Vec3, Vec3];
  // Locked out, but with room for the body to shift over the hands.
  const reach = 0.985 * (BODY.upperArm + BODY.forearm);
  /** Shoulders `drop` below the top, leaning `lean`, shifted `x`. */
  const at = (x: number, drop: number, lean: number) => {
    const top = new Vec3(x, barY + Math.sqrt(reach ** 2 - (grip - BODY.shoulder) ** 2) - drop, 0);
    const trunk = new Vec3(Math.sin(lean), Math.cos(lean), 0);
    const pelvis = top.clone().addScaledVector(trunk, -BODY.torso);
    // Thighs a little forward, knees bent, feet behind.
    const knee = new Vec3(Math.sin(rad(15)), -Math.cos(rad(15)), 0).multiplyScalar(BODY.thigh);
    const shin = new Vec3(
      -Math.sin(rad(55)),
      -Math.cos(rad(55)),
      0,
    ).multiplyScalar(BODY.shin * 0.998);
    const ankles = SIDES.map((s) =>
      pelvis.clone().add(knee).add(shin).add(new Vec3(0, 0, s * BODY.hip)),
    ) as [Vec3, Vec3];
    const pose = poseFrom({
      pelvis,
      lean,
      ankles,
      feet: mirror(new Vec3(-0.5, -1, 0).normalize()),
      hands,
      elbowPole: mirror(new Vec3(-1, 0, 0.25)),
      kneePole: new Vec3(1, 0, 0),
    });
    pose.props = SIDES.flatMap((s) => [
      {
        kind: "line" as const,
        from: new Vec3(-0.35, barY, s * grip),
        to: new Vec3(0.35, barY, s * grip),
      },
      {
        kind: "line" as const,
        from: new Vec3(0.3, barY, s * grip),
        to: new Vec3(0.3, 0, s * grip),
      },
      {
        kind: "line" as const,
        from: new Vec3(-0.3, barY, s * grip),
        to: new Vec3(-0.3, 0, s * grip),
      },
    ]);
    return pose;
  };
  /** The upper arms level at the bottom: how far the shoulders drop. */
  const lowest = (lean: number) => {
    let drop = 0.3;
    for (let i = 0; i < 30; i++) {
      const pose = at(0, drop, lean);
      const arm = pose.arms[0];
      drop += (arm.root.y - arm.mid.y) * 0.6;
    }
    return drop;
  };
  const leans = [rad(10), rad(28)];
  const drops = [0, lowest(leans[1])];
  const balanced = (drop: number, lean: number) =>
    secant((x) => centreOfMass(at(x, drop, lean)).x, 0, 0.02);
  const xs = [balanced(drops[0], leans[0]), balanced(drops[1], leans[1])];
  return {
    kit: {},
    film: { views: [0, 90], middle: new Vec3(0, 0, 0), room: { height: 2.35, width: 1.5 } },
    pose(depth) {
      const d = clamp01(depth);
      const lean = lerp(leans[0], leans[1], d);
      const drop = lerp(drops[0], drops[1], d);
      return at(balanced(drop, lean), drop, lean);
    },
  };
}

/**
 * The push-up: hands just wider than the shoulders, the body in one straight
 * line from the heels; lower until the chest is a fist from the floor,
 * elbows about 45° from the sides, and push the floor away. The body pivots
 * on the toes as one piece.
 */
function pushUp(): Move {
  const toes = 0;
  const ankleY = 0.15;
  const feet = mirror(new Vec3(-0.25, -1, 0).normalize());
  const legs = 0.995 * (BODY.thigh + BODY.shin);
  const reach = 0.998 * (BODY.upperArm + BODY.forearm);
  const grip = 0.25;
  /** The body at `angle` above the floor. */
  const line = (angle: number) => {
    const dir = new Vec3(Math.cos(angle), Math.sin(angle), 0);
    const ankle = new Vec3(toes + 0.04, ankleY, 0);
    const pelvis = ankle.clone().addScaledVector(dir, legs);
    const shoulders = pelvis.clone().addScaledVector(dir, BODY.torso);
    return { dir, ankle, pelvis, shoulders };
  };
  // At the top the arms are straight and upright under the shoulders.
  const handY = 0.03;
  const top = secant(
    (a) => line(a).shoulders.y - handY - Math.sqrt(reach ** 2 - (grip - BODY.shoulder) ** 2),
    0.3,
    0.35,
  );
  const handX = line(top).shoulders.x;
  // At the bottom the chest is a fist — 10 cm — off the floor.
  const chest = (a: number) => {
    const { pelvis, dir } = line(a);
    const forward = new Vec3(Math.sin(a), -Math.cos(a), 0);
    return pelvis.clone().addScaledVector(dir, 0.36).addScaledVector(forward, chestAt(0.36)).y;
  };
  const bottom = secant((a) => chest(a) - 0.1, 0.1, 0.12);
  const at = (angle: number) => {
    const { dir, ankle, pelvis } = line(angle);
    const pose = poseFrom({
      pelvis,
      lean: Math.PI / 2 - angle,
      ankles: SIDES.map((s) => ankle.clone().setZ(s * 0.1)) as [Vec3, Vec3],
      feet,
      hands: SIDES.map((s) => new Vec3(handX, handY, s * grip)) as [Vec3, Vec3],
      elbowPole: mirror(new Vec3(-0.6, 0.3, 0.75)),
      kneePole: new Vec3(0, -1, 0),
    });
    void dir;
    return pose;
  };
  return {
    kit: {},
    film: { views: [0], middle: new Vec3(0.75, 0, 0), room: { height: 0.9, width: 1.95 } },
    pose: (depth) => at(lerp(top, bottom, clamp01(depth))),
  };
}

/**
 * The standing overhead press: the bar on the front of the shoulders, grip
 * just outside them; braced, glutes tight, press straight up past the face,
 * then push the head through so the bar finishes over the middle of the
 * foot, arms straight. Bar and lifter balanced over mid-foot throughout.
 */
function overheadPress(): Move {
  const { feet, ankles, midFoot } = stand(0.15, rad(10));
  const grip = 0.25;
  const load = 0.5;
  const reach = 0.998 * (BODY.upperArm + BODY.forearm);
  const at = (x: number, lean: number, bar: Vec3) => {
    const pelvis = standingHips(x, 0.15);
    const hands = SIDES.map((s) => bar.clone().setZ(s * grip)) as [Vec3, Vec3];
    const pose = poseFrom({
      pelvis,
      lean,
      ankles,
      feet,
      hands,
      elbowPole: mirror(new Vec3(0.5, -1, 0.4)),
      bar,
    });
    return pose;
  };
  /** The rack: the bar on the front of the shoulders, the lifter leaning back `lean`. */
  const rack = (x: number, lean: number) => {
    const pelvis = standingHips(x, 0.15);
    const trunk = new Vec3(Math.sin(lean), Math.cos(lean), 0);
    const forward = new Vec3(Math.cos(lean), -Math.sin(lean), 0);
    const h = BODY.torso + 0.02;
    return pelvis
      .clone()
      .addScaledVector(trunk, h)
      .addScaledVector(forward, chestAt(h) + BAR_RADIUS + 0.01);
  };
  const lowLean = rad(-6);
  const lowX = secant((x) => {
    const bar = rack(x, lowLean);
    return centreOfMass(at(x, lowLean, bar), load, bar).x - midFoot;
  }, 0, 0.02);
  const bottom = rack(lowX, lowLean);
  /** The top: arms straight, the bar over the shoulders, over mid-foot. */
  const overhead = (x: number) => {
    const pelvis = standingHips(x, 0.15);
    const s = pelvis.clone().add(new Vec3(0, BODY.torso, 0));
    return new Vec3(s.x, s.y + Math.sqrt(reach ** 2 - (grip - BODY.shoulder) ** 2), 0);
  };
  const topX = secant((x) => {
    const bar = overhead(x);
    return centreOfMass(at(x, 0, bar), load, bar).x - midFoot;
  }, 0, 0.02);
  const top = overhead(topX);
  return {
    kit: { bar: "barbell", plate: PLATE_5KG },
    film: { views: [0, 90], middle: new Vec3(midFoot, 0, 0), room: { height: 2.25, width: 2.4 } },
    pose(depth) {
      const d = clamp01(depth);
      // Straight up past the face, then the body comes under it.
      const bar = new Vec3(
        lerp(top.x, bottom.x, ease(Math.min(1, d * 1.6))),
        lerp(top.y, bottom.y, d),
        0,
      );
      const pose = at(lerp(topX, lowX, d), lerp(0, lowLean, d), bar);
      forearmsUpright(pose, "side");
      return pose;
    },
  };
}

/**
 * The kettlebell press, one arm: the bell racked at the shoulder, resting on
 * the back of the forearm; glutes tight, press straight up until the biceps
 * is by the ear, and lower back to the rack. The other arm hangs by the
 * side.
 */
function kettlebellPress(): Move {
  const { feet, ankles, midFoot } = stand(0.15, rad(10));
  const pelvis = standingHips(-0.02, 0.15);
  const shoulder = pelvis.clone().add(new Vec3(0, BODY.torso, BODY.shoulder));
  const reach = 0.998 * (BODY.upperArm + BODY.forearm);
  const rackAt = shoulder.clone().add(new Vec3(0.12, 0.06, -0.08));
  const topAt = shoulder.clone().add(new Vec3(0, Math.sqrt(reach ** 2 - 0.05 ** 2), -0.05));
  const hang = pelvis.clone().add(new Vec3(0.02, BODY.torso - reach * 0.99, -BODY.shoulder - 0.06));
  return {
    kit: {},
    film: { views: [90, 0], middle: new Vec3(midFoot, 0, 0), room: { height: 2.2, width: 1.5 } },
    pose(depth) {
      const d = clamp01(depth);
      // Up the line of the arm: out over the shoulder first, then straight up.
      const t = 1 - d;
      const hand = new Vec3(
        lerp(rackAt.x, topAt.x, ease(t)),
        lerp(rackAt.y, topAt.y, t),
        lerp(rackAt.z, topAt.z, ease(Math.min(1, t * 1.5))),
      );
      const pose = poseFrom({
        pelvis,
        lean: 0,
        ankles,
        feet,
        hands: [hand, hang],
        elbowPole: [new Vec3(0.3, -1, 0.15), new Vec3(-0.2, -1, -0.2)],
      });
      const down = new Vec3(lerp(-0.85, -0.3, d), lerp(-0.25, -0.7, d), lerp(0, 0.55, d));
      pose.props = [{ kind: "kettlebell", at: hand, down }];
      return pose;
    },
  };
}

/** Every pushing movement, by id. */
export const PUSH: Record<string, () => Move> = {
  incline_bench: () => barbellPress({ incline: 30, grip: 0.3, touch: 0.43 }),
  decline_bench: () => barbellPress({ incline: -15, seat: 0.55, grip: 0.31, touch: 0.33 }),
  close_grip_bench: () => barbellPress({ incline: 0, grip: 0.2, touch: 0.34 }),
  smith_bench: () => barbellPress({ incline: 0, grip: 0.3, touch: 0.35, smith: true }),
  smith_incline_press: () => barbellPress({ incline: 30, grip: 0.3, touch: 0.43, smith: true }),
  incline_db_press: () => dumbbellPress({ incline: 30, low: { out: 0.33, up: 0.42, ahead: 0.0 } }),
  db_shoulder: () =>
    dumbbellPress({ incline: 82, seat: 0.48, low: { out: 0.34, up: 0.62, ahead: -0.13 } }),
  arnold_press: () =>
    dumbbellPress(
      { incline: 82, seat: 0.48, low: { out: 0.13, up: 0.58, ahead: 0.04 }, turn: true },
    ),
  smith_shoulder_press: () => smithShoulderPress(),
  machine_chest: () => {
    const body = benchBody(80, 0.5);
    const start = chestPoint(body, 0.36, 0.06);
    const s = shouldersOf(body);
    const finish = new Vec3(s.x + 0.56, start.y + 0.02, 0);
    return machinePress({
      incline: 80,
      seat: 0.5,
      start,
      finish,
      pivot: new Vec3((start.x + finish.x) / 2 - 0.05, start.y + 0.95, 0),
      grip: [0.28, 0.22],
    });
  },
  incline_machine_press: () => {
    const body = benchBody(65, 0.5);
    const start = chestPoint(body, 0.42, 0.06);
    const s = shouldersOf(body);
    const finish = new Vec3(s.x + 0.38, s.y + 0.44, 0);
    return machinePress({
      incline: 65,
      seat: 0.5,
      start,
      finish,
      pivot: new Vec3(start.x - 0.55, start.y + 0.75, 0),
      grip: [0.29, 0.22],
    });
  },
  machine_shoulder: () => {
    const body = benchBody(82, 0.5);
    const s = shouldersOf(body);
    const start = s.clone().add(new Vec3(0.06, 0.06, 0));
    const finish = new Vec3(s.x + 0.06, s.y + 0.57, 0);
    return machinePress({
      incline: 82,
      seat: 0.5,
      start,
      finish,
      pivot: new Vec3(s.x - 0.75, s.y + 0.32, 0),
      grip: [0.33, 0.22],
    });
  },
  db_fly: () => benchFly(0),
  incline_db_fly: () => benchFly(30),
  cable_fly: () => benchFly(30, true),
  pec_deck: pecDeck,
  cable_crossover: cableCrossover,
  dips,
  push_up: pushUp,
  ohp: overheadPress,
  kb_press: kettlebellPress,
};

/**
 * The Smith machine shoulder press: sitting tall under the bar, which comes
 * down just in front of the face to chin height and presses straight up.
 */
function smithShoulderPress(): Move {
  const body = benchBody(82, 0.48);
  const s = shouldersOf(body);
  const x = s.x + 0.2;
  const grip = 0.27;
  const bottom = new Vec3(x, s.y + 0.1, 0);
  const top = topAbove(body, bottom, grip);
  return {
    kit: { bar: "barbell", plate: PLATE_5KG },
    film: filmFor(body),
    pose(depth) {
      const d = clamp01(depth);
      const bar = new Vec3(x, lerp(top.y, bottom.y, d), 0);
      const pose = onBench(body, SIDES.map((sd) => bar.clone().setZ(sd * grip)) as [Vec3, Vec3]);
      pose.bar = bar;
      forearmsUpright(pose, "side");
      pose.props = [...benchProps(body, pose), ...smithProps(x)];
      return pose;
    },
  };
}

