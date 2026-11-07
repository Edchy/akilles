import {
  armFrom,
  balance,
  BAR_RADIUS,
  cableProps,
  chestAt,
  clamp01,
  ease,
  lerp,
  mirror,
  mixed,
  PAD,
  PLATE_5KG,
  rad,
  seatProps,
  secant,
  shouldersAt,
  standing,
  standingHips,
  turned,
  withArms,
  withinReach,
  type Move,
} from "@/motion/build";
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
import { benchBody, benchProps, onBench, shouldersOf } from "@/motion/push";
import { Vec3 } from "@/motion/vector";

/**
 * The pull family: pulldowns, rows and curls. Each follows its guide (see
 * `data/guides.ts`).
 */

const DOWN = new Vec3(0, -1, 0);
const AHEAD = new Vec3(1, 0, 0);

/** Up the spine and out of the chest, leaning `lean`. */
const frameOf = (lean: number) => ({
  trunk: new Vec3(Math.sin(lean), Math.cos(lean), 0),
  forward: new Vec3(Math.cos(lean), -Math.sin(lean), 0),
});

/** A line between two points. */
const rod = (from: Vec3, to: Vec3): Prop => ({ kind: "line", from, to });

/** A short handle upright in each hand. */
const handles = (hands: Vec3[]): Prop[] =>
  hands.map((h) => rod(h.clone().add(new Vec3(0, -0.06, 0)), h.clone().add(new Vec3(0, 0.06, 0))));

/** How far the elbow bends in a curl, 0 to 1: from almost straight to the top. */
const curlBend = (d: number) => lerp(8, 138, ease(d));

/**
 * A standing curl, the elbows pinned at the sides: with an EZ bar or, held
 * overhand, a straight bar (`reverse`); or a cable from a low pulley, on a
 * bar or, `rope`, a rope with the palms facing in.
 */
function standingCurl(kind: "ez" | "reverse" | "cable" | "rope"): Move {
  const bar = kind === "ez" || kind === "reverse";
  const pulley = new Vec3(0.55, 0.12, 0);
  return {
    kit: bar ? { bar: "barbell", plate: PLATE_5KG } : {},
    film: {
      views: bar ? [0, 90] : [0],
      lifts: true,
      middle: new Vec3(0.12, 0, 0),
      room: { height: 1.95, width: 1.7 },
    },
    pose(depth) {
      const d = clamp01(depth);
      const make = (x: number) => {
        const pelvis = standingHips(x, 0.15);
        const shoulders = shouldersAt(pelvis, 0);
        const arms = SIDES.map((s, i) => {
          const upper = new Vec3(0.09, -1, (kind === "rope" ? 0.02 : 0.05) * s);
          const fore = turned(DOWN, AHEAD, curlBend(d) + 4);
          return armFrom(
            shoulders[i],
            upper,
            fore.add(new Vec3(0, 0, kind === "rope" ? -0.1 * s : 0)),
          );
        }) as [Limb, Limb];
        return withArms(standing({ x }, [arms[0].end, arms[1].end]), arms);
      };
      const pose = make(balance(make, 0.25));
      const [a, b] = [pose.arms[0].end, pose.arms[1].end];
      if (bar) pose.bar = mixed(a, b, 0.5);
      else {
        const knot = mixed(a, b, 0.5).add(new Vec3(0.03, kind === "rope" ? -0.14 : 0, 0));
        pose.props = [
          ...cableProps(new Vec3(pulley.x + 0.08, 0, 0), pulley.y, knot),
          ...(kind === "rope" ? [rod(knot, a), rod(knot, b)] : [
            rod(a.clone().setZ(0.24), b.clone().setZ(-0.24)),
          ]),
        ];
      }
      return pose;
    },
  };
}

/**
 * Leaning chest down on an incline pad, standing behind it: the spider curl
 * and the chest-supported row. The pad runs along the front of the ▽.
 */
function chestDown(lean: number) {
  const pelvis = new Vec3(0, 0.84, 0);
  const toeOut = rad(10);
  const feet = mirror(new Vec3(Math.cos(toeOut), 0, Math.sin(toeOut)));
  const ankles = mirror(new Vec3(-0.33, BODY.ankle, 0.13));
  const { trunk, forward } = frameOf(lean);
  const T = SIZE.trunk;
  const low = pelvis.clone().addScaledVector(trunk, T.down);
  const high = pelvis
    .clone()
    .addScaledVector(trunk, BODY.torso - 0.06)
    .addScaledVector(forward, T.side * 0.88);
  const along = high.clone().sub(low).normalize();
  const pad: Prop[] = [
    {
      kind: "pad",
      from: low.clone().addScaledVector(along, -0.2),
      to: high.clone().addScaledVector(along, 0.04),
      ...PAD,
      thick: 0.09,
      up: forward.clone().negate(),
    },
    rod(
      mixed(low, high, 0.5).addScaledVector(forward, PAD.thick),
      new Vec3(mixed(low, high, 0.5).x + 0.25, 0, 0),
    ),
  ];
  const shoulders = shouldersAt(pelvis, lean);
  const pose = (hands: [Vec3, Vec3], elbowPole: Vec3 | [Vec3, Vec3]) => {
    const p = poseFrom({ pelvis, lean, ankles, feet, hands, elbowPole });
    p.props = [...pad];
    return p;
  };
  return { pose, shoulders };
}

/**
 * The spider curl: chest on an incline bench, arms hanging straight down;
 * curl up without moving the upper arms, and lower all the way down.
 */
function spiderCurl(): Move {
  const lean = rad(48);
  const { pose: at, shoulders } = chestDown(lean);
  return {
    kit: { dumbbells: true },
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.15, 0, 0),
      room: { height: 1.75, width: 1.6 },
    },
    pose(depth) {
      const d = clamp01(depth);
      const arms = SIDES.map((s, i) =>
        armFrom(shoulders[i], new Vec3(0, -1, 0.02 * s), turned(DOWN, AHEAD, curlBend(d) - 4)),
      ) as [Limb, Limb];
      const pose = withArms(at([arms[0].end, arms[1].end], DOWN), arms);
      pose.dumbbells = arms.map((arm) => ({ at: arm.end, axis: new Vec3(0, 0, 1) }));
      return pose;
    },
  };
}

/**
 * The chest-supported row: chest on the pad, arms hanging straight; row the
 * elbows back past the ribs, and lower slowly to a full stretch.
 */
function chestSupportedRow(): Move {
  const lean = rad(48);
  const { pose: at, shoulders } = chestDown(lean);
  return {
    kit: { dumbbells: true },
    film: {
      views: [0, 90],
      lifts: true,
      middle: new Vec3(0.15, 0, 0),
      room: { height: 1.75, width: 1.6 },
    },
    pose(depth) {
      const d = ease(clamp01(depth));
      const hands = SIDES.map((s, i) => {
        const hang = shoulders[i].clone().add(new Vec3(0.02, -0.59, 0.03 * s));
        const ribs = shoulders[i].clone().add(new Vec3(-0.22, -0.2, 0.05 * s));
        return withinReach(shoulders[i], mixed(hang, ribs, d));
      }) as [Vec3, Vec3];
      const pose = at(hands, mirror(new Vec3(-1, 0.6, 0.15)));
      pose.dumbbells = hands.map((h) => ({ at: h, axis: new Vec3(1, 0, 0) }));
      return pose;
    },
  };
}

/**
 * Sitting on a stool or a machine seat, the upper arms down a pad sloping
 * away in front — the preacher curl, and the machine curl on its lever:
 * curl up toward the shoulders and lower slowly until the arms are almost
 * straight.
 */
function padCurl(machine: boolean): Move {
  const body = benchBody(85, 0.55);
  const top = shouldersOf(body);
  const slope = rad(machine ? 40 : 48);
  const upper = new Vec3(Math.sin(slope), -Math.cos(slope), 0);
  const under = new Vec3(Math.cos(slope), Math.sin(slope), 0).negate();
  return {
    kit: machine ? {} : { bar: "barbell", plate: PLATE_5KG },
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.2, 0, 0),
      room: { height: 1.75, width: 1.75 },
    },
    pose(depth) {
      const d = clamp01(depth);
      const bend = lerp(15, 128, ease(d));
      const arms = SIDES.map((s) =>
        armFrom(
          top.clone().setZ(s * 0.17),
          upper.clone().add(new Vec3(0, 0, -0.02 * s)),
          turned(upper, new Vec3(-0.3, 1, 0), bend),
        ),
      ) as [Limb, Limb];
      const pose = withArms(onBench(body, [arms[0].end, arms[1].end]), arms);
      const r = SIZE.upperArm;
      const from = top.clone().addScaledVector(upper, 0.1).addScaledVector(under, r);
      const to = arms[0].mid.clone().setZ(0).addScaledVector(upper, 0.06).addScaledVector(under, r);
      // A thick, sloping pad between the arms and the body.
      const props: Prop[] = [
        ...seatProps(pose, { top: body.seat, from: -0.2, to: 0.2 }),
        { kind: "pad", from, to, ...PAD, thick: 0.15, up: under.clone().negate(), through: true },
        rod(mixed(from, to, 0.6).addScaledVector(under, PAD.thick), new Vec3(to.x + 0.05, 0, 0)),
      ];
      if (machine) {
        const pivot = arms[0].mid.clone().setZ(0);
        props.push(
          ...arms.map((arm) => rod(pivot.clone().setZ(arm.end.z), arm.end)),
          ...handles(arms.map((a) => a.end)),
        );
      } else {
        pose.bar = mixed(arms[0].end, arms[1].end, 0.5);
      }
      pose.props = props;
      return pose;
    },
  };
}

/**
 * The incline dumbbell curl: lying back on a bench at about 50°, the arms
 * hanging straight down; curl up without the elbows moving forward, and
 * lower all the way to a stretch.
 */
function inclineCurl(): Move {
  const body = benchBody(50, 0.46);
  const top = shouldersOf(body);
  return {
    kit: { dumbbells: true },
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(-0.1, 0, 0),
      room: { height: 1.7, width: 1.85 },
    },
    pose(depth) {
      const d = clamp01(depth);
      const arms = SIDES.map((s) =>
        armFrom(
          top.clone().setZ(s * BODY.shoulder),
          new Vec3(-0.05, -1, 0.04 * s),
          turned(DOWN, AHEAD, curlBend(d) - 4),
        ),
      ) as [Limb, Limb];
      const pose = withArms(onBench(body, [arms[0].end, arms[1].end]), arms);
      pose.dumbbells = arms.map((arm) => ({ at: arm.end, axis: new Vec3(0, 0, 1) }));
      pose.props = benchProps(body, pose);
      return pose;
    },
  };
}

/**
 * The concentration curl: sitting, leaning forward, the elbow braced against
 * the inside of the thigh; curl the dumbbell up toward the shoulder and
 * lower slowly to a straight arm. The other hand rests on its knee.
 */
function concentrationCurl(): Move {
  const body = benchBody(118, 0.46);
  // Feet wide, so the arm hangs between the knees.
  body.ankles = mirror(new Vec3(0.5, BODY.ankle, 0.3));
  const top = shouldersOf(body);
  const shoulder = top.clone().setZ(BODY.shoulder);
  const upper = new Vec3(0.22, -1, -0.22);
  return {
    kit: { dumbbells: true },
    film: {
      views: [90],
      lifts: true,
      middle: new Vec3(0.15, 0, 0),
      room: { height: 1.55, width: 1.6 },
    },
    pose(depth) {
      const d = clamp01(depth);
      const curl = armFrom(shoulder, upper, turned(DOWN, new Vec3(-0.3, 0, -1), curlBend(d) - 4));
      const base = onBench(body, [curl.end, new Vec3(0, 0, 0)]);
      const knee = base.legs[1].mid.clone().add(new Vec3(0.02, 0.07, 0));
      const pose = onBench(body, [curl.end, withinReach(base.arms[1].root, knee)]);
      pose.arms[0] = curl;
      pose.dumbbells = [{ at: curl.end, axis: new Vec3(1, 0, 0) }];
      pose.props = seatProps(pose, { top: body.seat, from: -0.3, to: 0.15 });
      return pose;
    },
  };
}

/**
 * A pulldown: sitting, thighs under the pad, leaning back slightly; from the
 * arms straight overhead, pull the bar — or a close-grip handle, or a
 * machine's handles — to the top of the chest, and let it rise until the
 * arms are straight again.
 */
function pulldown(kind: "wide" | "close" | "machine"): Move {
  const seat = 0.48;
  const grip = kind === "wide" ? 0.36 : kind === "close" ? 0.07 : 0.27;
  const pelvis = new Vec3(0, seat + SIZE.thigh, 0);
  const toeOut = rad(10);
  const feet = mirror(new Vec3(Math.cos(toeOut), 0, Math.sin(toeOut)));
  const ankles = mirror(new Vec3(0.48, BODY.ankle, 0.17));
  const pulley = new Vec3(0.12, 2.42, 0);
  return {
    kit: {},
    film: {
      views: [0, 90],
      lifts: true,
      middle: new Vec3(0.05, 0, 0),
      room: { height: 2.55, width: 1.8 },
    },
    pose(depth) {
      const d = ease(clamp01(depth));
      const lean = rad(lerp(-6, -17, d));
      const { trunk, forward } = frameOf(lean);
      const shoulders = shouldersAt(pelvis, lean);
      const h = BODY.torso + 0.01;
      const chest = pelvis
        .clone()
        .addScaledVector(trunk, h)
        .addScaledVector(forward, chestAt(h) + 0.05);
      const hands = SIDES.map((s, i) => {
        const up = withinReach(shoulders[i], new Vec3(pulley.x - 0.02, 3, s * grip), 0.995);
        const low =
          kind === "machine"
            ? shoulders[i].clone().add(new Vec3(0.12, -0.2, s * 0.12))
            : chest.clone().add(new Vec3(0, kind === "close" ? -0.08 : 0, s * grip));
        return withinReach(shoulders[i], mixed(up, low, d));
      }) as [Vec3, Vec3];
      const pose = poseFrom({
        pelvis,
        lean,
        ankles,
        feet,
        hands,
        elbowPole: kind === "wide" ? mirror(new Vec3(-0.1, -1, 1)) : mirror(
          new Vec3(0.3, -1, 0.35),
        ),
      });
      const middle = mixed(hands[0], hands[1], 0.5);
      const thighPad = pose.legs[0].mid.clone().setZ(0).add(new Vec3(-0.06, SIZE.thigh + 0.06, 0));
      const props: Prop[] = [
        { kind: "pad", from: new Vec3(-0.22, seat, 0), to: new Vec3(0.18, seat, 0), ...PAD },
        rod(new Vec3(0, seat - PAD.thick, 0), new Vec3(0, 0, 0)),
        { kind: "ring", at: thighPad.clone().setZ(0.2), normal: new Vec3(0, 0, 1), r: 0.055 },
        rod(thighPad.clone().setZ(0.24), thighPad.clone().setZ(-0.24)),
        rod(new Vec3(-0.45, 0, 0), new Vec3(-0.45, pulley.y + 0.05, 0)),
        rod(new Vec3(-0.45, pulley.y + 0.05, 0), new Vec3(pulley.x, pulley.y + 0.05, 0)),
      ];
      if (kind === "machine") {
        const pivot = new Vec3(-0.3, pulley.y - 0.15, 0);
        props.push(...hands.map((h) => rod(pivot.clone().setZ(h.z), h)), ...handles(hands));
      } else {
        const bar = kind === "wide" ? 0.5 : 0.1;
        props.push(rod(pulley, middle), rod(middle.clone().setZ(bar), middle.clone().setZ(-bar)));
      }
      pose.props = props;
      return pose;
    },
  };
}

/**
 * The straight-arm pulldown: a high pulley, hinged slightly forward; arms
 * straight, sweep the bar down to the thighs and let it rise to head height
 * under control.
 */
function straightArmPulldown(): Move {
  const lean = rad(25);
  const pulley = new Vec3(0.95, 2.1, 0);
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.25, 0, 0),
      room: { height: 2.25, width: 1.9 },
    },
    pose(depth) {
      const d = ease(clamp01(depth));
      const make = (x: number) => {
        const pelvis = standingHips(x, 0.15).add(new Vec3(0, -0.04, 0));
        const shoulders = shouldersAt(pelvis, lean);
        const angle = lerp(135, 18, d);
        const arms = SIDES.map((s, i) => {
          const dir = turned(DOWN, AHEAD, angle).add(new Vec3(0, 0, 0.04 * s));
          return armFrom(shoulders[i], dir, turned(dir, new Vec3(0, 1, 0), 6));
        }) as [Limb, Limb];
        return withArms(standing({ x, bend: 0.04, lean }, [arms[0].end, arms[1].end]), arms);
      };
      const pose = make(balance(make));
      const middle = mixed(pose.arms[0].end, pose.arms[1].end, 0.5);
      pose.props = [
        ...cableProps(new Vec3(pulley.x + 0.08, 0, 0), pulley.y, middle),
        rod(middle.clone().setZ(0.3), middle.clone().setZ(-0.3)),
      ];
      return pose;
    },
  };
}

/**
 * The seated cable row: sitting tall, knees soft, feet on the platform, arms
 * straight; pull the handle to the belly button, squeezing the shoulder
 * blades, and let it go forward until the shoulders reach. The trunk only
 * rocks a little.
 */
function cableRow(): Move {
  const seat = 0.36;
  const pelvis = new Vec3(0, seat + SIZE.thigh, 0);
  const ankles = mirror(new Vec3(0.74, 0.3, 0.13));
  const feet = mirror(new Vec3(0.2, 1, 0).normalize());
  const pulley = new Vec3(1.05, 0.62, 0);
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.4, 0, 0),
      room: { height: 1.45, width: 1.95 },
    },
    pose(depth) {
      const d = ease(clamp01(depth));
      const lean = rad(lerp(16, -6, d));
      const { trunk, forward } = frameOf(lean);
      const shoulders = shouldersAt(pelvis, lean);
      const navel = pelvis
        .clone()
        .addScaledVector(trunk, 0.17)
        .addScaledVector(forward, chestAt(0.17) + 0.05);
      const hands = SIDES.map((s, i) => {
        const reach = withinReach(
          shoulders[i],
          shoulders[i].clone().add(new Vec3(0.7, -0.2, -0.13 * s)),
          0.995,
        );
        return withinReach(shoulders[i], mixed(reach, navel.clone().setZ(s * 0.07), d));
      }) as [Vec3, Vec3];
      const pose = poseFrom({
        pelvis,
        lean,
        ankles,
        feet,
        hands,
        elbowPole: mirror(new Vec3(-1, -0.5, 0.2)),
        kneePole: new Vec3(0, 1, 0),
      });
      pose.legs = pose.legs.map((leg) =>
        ({ ...leg, planted: true, top: new Vec3(-1, 0.2, 0) }),
      ) as [
        Leg,
        Leg,
      ];
      const middle = mixed(hands[0], hands[1], 0.5).add(new Vec3(0.04, 0, 0));
      pose.props = [
        { kind: "pad", from: new Vec3(-0.35, seat, 0), to: new Vec3(0.3, seat, 0), ...PAD },
        rod(new Vec3(-0.6, 0, 0), new Vec3(1.2, 0, 0)),
        rod(new Vec3(-0.05, seat - PAD.thick, 0), new Vec3(-0.05, 0, 0)),
        {
          kind: "pad",
          from: new Vec3(0.86, 0.05, 0),
          to: new Vec3(0.86, 0.48, 0),
          half: 0.18,
          thick: 0.05,
          up: new Vec3(-1, 0, 0),
        },
        ...cableProps(new Vec3(pulley.x + 0.08, 0, 0), pulley.y, middle),
        rod(middle.clone().setZ(0.09), middle.clone().setZ(-0.09)),
      ];
      return pose;
    },
  };
}

/**
 * The machine row: seated, chest on the pad, the handles in line with the
 * lower chest; pull the elbows back, and return until the arms are
 * straight.
 */
function machineRow(): Move {
  const body = benchBody(95, 0.5);
  const s = shouldersOf(body);
  const { trunk, forward } = frameOf(body.lean);
  const h = 0.32;
  const chest = body.pelvis.clone().addScaledVector(trunk, h).addScaledVector(forward, chestAt(h));
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.2, 0, 0),
      room: { height: 1.75, width: 1.8 },
    },
    pose(depth) {
      const d = ease(clamp01(depth));
      const shoulders = mirror(new Vec3(0, 0, BODY.shoulder)).map((v) => v.add(s)) as [Vec3, Vec3];
      const hands = SIDES.map((sd, i) => {
        const reach = withinReach(shoulders[i], new Vec3(s.x + 0.7, chest.y, sd * 0.24), 0.995);
        const back = new Vec3(chest.x - 0.08, chest.y, sd * 0.3);
        return withinReach(shoulders[i], mixed(reach, back, d));
      }) as [Vec3, Vec3];
      const pose = onBench(body, hands, 0.3, mirror(new Vec3(-1, -0.2, 0.25)));
      const padX = chest.x + 0.02;
      const pivot = new Vec3(s.x + 0.75, 0.3, 0);
      pose.props = [
        ...seatProps(pose, { top: body.seat, from: -0.25, to: 0.2 }),
        {
          kind: "pad",
          from: new Vec3(padX, chest.y - 0.18, 0),
          to: new Vec3(padX, s.y - 0.06, 0),
          ...PAD,
          up: new Vec3(-1, 0, 0),
        },
        rod(new Vec3(padX + PAD.thick, chest.y - 0.1, 0), new Vec3(pivot.x, chest.y - 0.1, 0)),
        rod(new Vec3(pivot.x, 0, 0), new Vec3(pivot.x, chest.y + 0.1, 0)),
        ...hands.map((hand) => rod(new Vec3(pivot.x, pivot.y, hand.z), hand)),
        ...handles(hands),
      ];
      return pose;
    },
  };
}

/**
 * The one-arm dumbbell row: hand and knee on a bench, back flat; pull the
 * dumbbell toward the hip, elbow close, and lower to a straight arm and a
 * stretch. Seen from the side of the working arm.
 */
function dumbbellRow(kettlebell = false): Move {
  const top = 0.46;
  const lean = rad(78);
  const { trunk } = frameOf(lean);
  // The far knee on the bench under the hip; the near foot on the floor.
  const pelvis = new Vec3(0, top + BODY.thigh - 0.04, 0);
  const knee = pelvis.clone().add(new Vec3(0.03, -BODY.thigh + 0.003, -BODY.hip));
  const farAnkle = new Vec3(knee.x - Math.sqrt(BODY.shin ** 2 - 0.02 ** 2), top + 0.075, -BODY.hip);
  void knee;
  const nearAnkle = new Vec3(0.2, BODY.ankle, BODY.hip + 0.2);
  const shoulders = shouldersAt(pelvis, lean);
  const benchHand = new Vec3(shoulders[1].x + 0.03, top + 0.04, -0.17);
  return {
    kit: kettlebell ? {} : { dumbbells: true },
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.15, 0, 0),
      room: { height: 1.4, width: 1.85 },
    },
    pose(depth) {
      const d = ease(clamp01(depth));
      const hang = shoulders[0].clone().add(new Vec3(0.03, -0.585, 0.03));
      const hip = shoulders[0].clone().addScaledVector(trunk, -0.32).add(new Vec3(0, -0.06, 0.04));
      const hand = withinReach(shoulders[0], mixed(hang, hip, d));
      const pose = poseFrom({
        pelvis,
        lean,
        ankles: [nearAnkle, farAnkle],
        feet: [new Vec3(0.98, 0, 0.2).normalize(), new Vec3(-1, -0.3, 0).normalize()],
        hands: [hand, withinReach(shoulders[1], benchHand)],
        elbowPole: [new Vec3(-0.6, 1, 0.05), new Vec3(0.5, 0, -0.3)],
        kneePole: [new Vec3(1, 0, 0.3), new Vec3(0, -1, 0)],
      });
      pose.legs[1] = { ...pose.legs[1], planted: false };
      if (!kettlebell) pose.dumbbells = [{ at: hand, axis: new Vec3(1, 0, 0) }];
      pose.props = [
        ...(kettlebell ? [{ kind: "kettlebell" as const, at: hand, down: new Vec3(0, -1, 0) }] : []),
        { kind: "pad", from: new Vec3(-0.55, top, -0.12), to: new Vec3(0.75, top, -0.12), ...PAD },
        rod(new Vec3(-0.4, top - PAD.thick, -0.12), new Vec3(-0.4, 0, -0.12)),
        rod(new Vec3(0.6, top - PAD.thick, -0.12), new Vec3(0.6, 0, -0.12)),
      ];
      return pose;
    },
  };
}

/**
 * The T-bar row: straddling the bar, hinged to about 45°, back flat, knees
 * bent; pull the handle to the lower chest, elbows back, and lower to
 * straight arms without standing up. The bar's far end is on the floor.
 */
function tBarRow(): Move {
  const lean = rad(48);
  const load = 0.4;
  return {
    kit: {},
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.05, 0, 0),
      room: { height: 1.75, width: 2.3 },
    },
    pose(depth) {
      const d = ease(clamp01(depth));
      const make = (x: number) => {
        const pelvis = standingHips(x, 0.2).add(new Vec3(0, -0.1, 0));
        const shoulders = shouldersAt(pelvis, lean);
        const { trunk, forward } = frameOf(lean);
        const ribs = pelvis
          .clone()
          .addScaledVector(trunk, 0.3)
          .addScaledVector(forward, chestAt(0.3) + 0.04);
        const hands = SIDES.map((s, i) => {
          const hang = shoulders[i].clone().add(new Vec3(0.03, -0.58, -0.1 * s));
          return withinReach(shoulders[i], mixed(hang, ribs.clone().setZ(s * 0.08), d));
        }) as [Vec3, Vec3];
        return standing(
          { x, stance: 0.2, toeOut: rad(15), bend: 0.1, lean },
          hands,
          mirror(new Vec3(-1, 0.2, 0.3)),
        );
      };
      const pose = make(balance(make, load, rad(15)));
      const handle = mixed(pose.arms[0].end, pose.arms[1].end, 0.5);
      const end = new Vec3(-1.05, 0.03, 0);
      const along = handle.clone().sub(end).normalize();
      const plate = handle.clone().addScaledVector(along, -0.12);
      pose.props = [
        rod(end, handle.clone().addScaledVector(along, 0.06)),
        rod(handle.clone().setZ(0.1), handle.clone().setZ(-0.1)),
        { kind: "ring", at: plate, normal: along, r: 0.115 },
      ];
      return pose;
    },
  };
}

/**
 * The inverted row: hanging under a bar at waist height, body straight,
 * heels down; pull the chest to the bar, elbows back, and lower to straight
 * arms. The body pivots on the heels as one piece.
 */
function invertedRow(): Move {
  const barY = 0.85;
  const grip = 0.3;
  const bar = new Vec3(0, barY, 0);
  const hands = SIDES.map((s) => bar.clone().setZ(s * grip)) as [Vec3, Vec3];
  const legs = 0.995 * (BODY.thigh + BODY.shin);
  const reach = 0.995 * (BODY.upperArm + BODY.forearm);
  const heelY = 0.075;
  /** The body `angle` up from the floor, its shoulders under the bar at the bottom. */
  const lineAt = (heelX: number, angle: number) => {
    const dir = new Vec3(-Math.cos(angle), Math.sin(angle), 0);
    const heel = new Vec3(heelX, heelY, 0);
    const pelvis = heel.clone().addScaledVector(dir, legs);
    return { heel, pelvis, lean: angle - Math.PI / 2 };
  };
  // At the top the chest — 36 cm up the spine — touches the bar; that sets
  // how high the body rises and where the heels go. At the bottom the arms
  // are straight.
  const h = 0.36;
  const chestFrom = (angle: number) => {
    const dir = new Vec3(-Math.cos(angle), Math.sin(angle), 0);
    const out = new Vec3(Math.sin(angle), Math.cos(angle), 0);
    return dir.multiplyScalar(legs + h).addScaledVector(out, chestAt(h) + BAR_RADIUS);
  };
  const high = secant((a) => heelY + chestFrom(a).y - barY, 0.4, 0.45);
  const heelX = -chestFrom(high).x;
  const shoulderAt = (angle: number) =>
    new Vec3(
      heelX - Math.cos(angle) * (legs + BODY.torso),
      heelY + Math.sin(angle) * (legs + BODY.torso),
      BODY.shoulder,
    );
  const low = secant((a) => shoulderAt(a).distanceTo(hands[0]) - reach, high - 0.2, high - 0.25);
  const at = (angle: number) => {
    const { heel, pelvis, lean } = lineAt(heelX, angle);
    const pose = poseFrom({
      pelvis,
      lean,
      ankles: SIDES.map((s) => heel.clone().setZ(s * 0.12)) as [Vec3, Vec3],
      feet: mirror(new Vec3(Math.sin(angle), Math.cos(angle), 0)),
      hands,
      elbowPole: mirror(new Vec3(0.4, -1, 0.35)),
      kneePole: new Vec3(0, 1, 0),
      bar,
    });
    pose.legs = pose.legs.map((leg) =>
      ({ ...leg, planted: true, top: new Vec3(-Math.cos(angle), Math.sin(angle), 0) }),
    ) as [Leg, Leg];
    pose.props = SIDES.map((s) => rod(new Vec3(0, barY, s * 0.55), new Vec3(0, 0, s * 0.55)));
    return pose;
  };
  return {
    kit: { bar: "fixed" },
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.35, 0, 0),
      room: { height: 1.2, width: 2.3 },
    },
    pose: (depth) => at(lerp(low, high, ease(clamp01(depth)))),
  };
}

/** The pulling movements, by id. */
export const PULL: Record<string, () => Move> = {
  lat_pulldown: () => pulldown("wide"),
  close_grip_pulldown: () => pulldown("close"),
  machine_pulldown: () => pulldown("machine"),
  straight_arm_pulldown: straightArmPulldown,
  cable_row: cableRow,
  chest_supported_row: chestSupportedRow,
  machine_row: machineRow,
  db_row: () => dumbbellRow(),
  kb_row: () => dumbbellRow(true),
  tbar_row: tBarRow,
  inverted_row: invertedRow,
  cable_curl: () => standingCurl("cable"),
  cable_hammer_curl: () => standingCurl("rope"),
  ez_bar_curl: () => standingCurl("ez"),
  reverse_curl: () => standingCurl("reverse"),
  spider_curl: spiderCurl,
  preacher_curl: () => padCurl(false),
  machine_curl: () => padCurl(true),
  incline_db_curl: inclineCurl,
  concentration_curl: concentrationCurl,
};

