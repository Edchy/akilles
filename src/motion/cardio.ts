import {
  armFrom,
  chestAt,
  keyframes,
  mirror,
  mixed,
  rad,
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
import { Vec3 } from "@/motion/vector";

/**
 * The cardio machines, each a film that goes round: a stride, a stroke, a
 * turn of the pedals. Each follows its guide (see `data/guides.ts`).
 */

const DOWN = new Vec3(0, -1, 0);
const UP = new Vec3(0, 1, 0);
const AHEAD = new Vec3(1, 0, 0);
const ACROSS = new Vec3(0, 0, 1);
const LEG = 0.998 * (BODY.thigh + BODY.shin);
const ARM = 0.995 * (BODY.upperArm + BODY.forearm);
const TAU = 2 * Math.PI;

const rod = (from: Vec3, to: Vec3): Prop => ({ kind: "line", from, to });
const along = (a: number) => new Vec3(Math.sin(a), Math.cos(a), 0);

/** The direction `degrees` forward of straight down, in the side-on plane. */
const swung = (degrees: number) => turned(DOWN, AHEAD, degrees);

/** A pose leaning `lean`, its knees put where given. */
function posed(
  pelvis: Vec3,
  lean: number,
  rest: Omit<Parameters<typeof poseFrom>[0], "pelvis" | "lean">,
  knees?: Vec3[],
) {
  const pose = poseFrom({ ...rest, pelvis, lean });
  if (knees) pose.legs = pose.legs.map((leg, i) => ({ ...leg, mid: knees[i] })) as [Leg, Leg];
  return pose;
}

/** The pose's feet flat on what they stand on, or not. */
function planted(pose: Pose, flat: [boolean, boolean]) {
  pose.legs = pose.legs.map((leg, i) => ({ ...leg, planted: flat[i] })) as [Leg, Leg];
  return pose;
}

/**
 * The treadmill: an easy run, upright, the arms swinging — not holding the
 * rails. One stride a turn.
 */
function treadmill(): Move {
  const belt = 0.14;
  const lean = rad(7);
  /** One leg, `p` of the way round its stride: thigh angle, knee bend. */
  const leg = (p: number) => {
    const thigh = 28 * Math.sin(TAU * p);
    const swing = Math.max(0, Math.cos(TAU * p));
    const bend = 14 + 82 * swing ** 1.5;
    return { thigh: swung(thigh), shin: swung(thigh - bend), bend };
  };
  return {
    kit: {},
    film: {
      views: [0],
      cycle: 0.8,
      middle: new Vec3(0.05, 0, 0),
      room: { height: 2.05, width: 2.0 },
    },
    pose(t) {
      const ps = [t, t + 0.5];
      const shape = ps.map(leg);
      const rel = shape.map(({ thigh, shin }) =>
        thigh.clone().multiplyScalar(BODY.thigh).addScaledVector(shin, BODY.shin),
      );
      const lowest = Math.min(...rel.map((r) => r.y));
      const pelvis = new Vec3(0, belt + BODY.ankle - lowest, 0);
      const knees = SIDES.map((s, i) =>
        pelvis.clone().setZ(s * BODY.hip).addScaledVector(shape[i].thigh, BODY.thigh),
      );
      const ankles = knees.map((k, i) => k.clone().addScaledVector(shape[i].shin, BODY.shin));
      const onBelt = ankles.map((a) => a.y < belt + BODY.ankle + 0.02) as [boolean, boolean];
      const feet = shape.map(({ shin }, i) =>
        onBelt[i] ? AHEAD.clone() : new Vec3(-shin.y, shin.x, 0).normalize(),
      ) as [Vec3, Vec3];
      // Each arm swings with the opposite leg, elbow bent at a right angle.
      const top = pelvis.clone().addScaledVector(along(lean), BODY.torso);
      const arms = SIDES.map((s, i) => {
        const a = 32 * Math.sin(TAU * ps[1 - i]);
        return armFrom(top.clone().setZ(s * BODY.shoulder), swung(a), swung(a + 88));
      }) as [Limb, Limb];
      const pose = posed(
        pelvis,
        lean,
        {
          ankles: ankles as [Vec3, Vec3],
          feet,
          hands: [arms[0].end, arms[1].end],
          elbowPole: DOWN,
        },
        knees,
      );
      withArms(pose, arms);
      planted(pose, onBelt);
      pose.props = [
        {
          kind: "pad",
          from: new Vec3(-0.8, belt, 0),
          to: new Vec3(0.75, belt, 0),
          half: 0.32,
          thick: belt,
        },
        rod(new Vec3(0.75, belt, 0.33), new Vec3(0.92, 1.25, 0.33)),
        rod(new Vec3(0.92, 1.25, 0.33), new Vec3(0.92, 1.25, -0.33)),
        rod(new Vec3(0.92, 1.12, 0.33), new Vec3(0.45, 1.05, 0.33)),
        {
          kind: "pad",
          from: new Vec3(0.86, 1.25, 0),
          to: new Vec3(1.0, 1.42, 0),
          half: 0.3,
          thick: 0.04,
        },
      ];
      return pose;
    },
  };
}

/**
 * Pedalling, seated at `seat` with the trunk at `lean`: each foot on its
 * pedal round the crank, the knee a little bent at the bottom.
 */
function pedalling(
  t: number,
  { seat, lean, crank, r }: { seat: Vec3; lean: number; crank: Vec3; r: number },
) {
  const pelvis = seat.clone().add(new Vec3(0, SIZE.trunk.side * 0.55, 0));
  const ankles = SIDES.map((s, i) => {
    const a = TAU * t + i * Math.PI;
    const pedal = crank.clone().add(new Vec3(Math.cos(a) * r, Math.sin(a) * r, s * 0.15));
    return pedal.add(new Vec3(-0.09, 0.05, 0));
  });
  const feet = mirror(new Vec3(1, -0.25, 0).normalize());
  return { pelvis, ankles: ankles as [Vec3, Vec3], feet, lean };
}

/** The bike's frame: seat, crank, flywheel and bars. */
function bikeFrame(seat: Vec3, crank: Vec3, r: number, ankles: Vec3[], bars?: Vec3): Prop[] {
  const pedals = ankles.map((a) => a.clone().add(new Vec3(0.09, -0.05, 0)));
  const props: Prop[] = [
    {
      kind: "pad",
      from: seat.clone().add(new Vec3(-0.12, 0, 0)),
      to: seat.clone().add(new Vec3(0.1, 0, 0)),
      half: 0.1,
      thick: 0.05,
    },
    rod(seat.clone().add(new Vec3(-0.01, -0.05, 0)), crank),
    rod(crank, new Vec3(crank.x - 0.45, 0, 0)),
    rod(new Vec3(crank.x - 0.6, 0, 0), new Vec3(crank.x + 0.7, 0, 0)),
    { kind: "ring", at: crank.clone(), normal: ACROSS.clone(), r: 0.06 },
    ...pedals.map((p) => rod(crank.clone().setZ(p.z), p)),
  ];
  if (bars) {
    props.push(
      rod(crank, new Vec3(crank.x + 0.45, 0, 0)),
      rod(crank.clone().add(new Vec3(0.3, 0.2, 0)), bars.clone().setZ(0)),
      rod(bars.clone().setZ(0.24), bars.clone().setZ(-0.24)),
    );
  }
  void r;
  return props;
}

/**
 * The bike: seat high enough that the knee is slightly bent at the bottom,
 * hands on the bars, a steady cadence. One turn of the pedals a turn.
 */
function bike(): Move {
  const seat = new Vec3(-0.05, 0.92, 0);
  const crank = new Vec3(0.22, 0.33, 0);
  const r = 0.17;
  const bars = new Vec3(0.62, 1.12, 0);
  return {
    kit: {},
    film: {
      views: [0],
      cycle: 1.0,
      middle: new Vec3(0.2, 0, 0),
      room: { height: 1.85, width: 1.9 },
    },
    pose(t) {
      const { pelvis, ankles, feet, lean } = pedalling(t, { seat, lean: rad(28), crank, r });
      const top = pelvis.clone().addScaledVector(along(lean), BODY.torso);
      const hands = SIDES.map((s) =>
        withinReach(top.clone().setZ(s * BODY.shoulder), bars.clone().setZ(s * 0.22)),
      ) as [Vec3, Vec3];
      const pose = poseFrom({
        pelvis,
        lean,
        ankles,
        feet,
        hands,
        elbowPole: mirror(new Vec3(-0.3, -1, 0.3)),
        kneePole: new Vec3(1, 0.5, 0),
      });
      planted(pose, [false, false]);
      pose.props = [
        ...bikeFrame(seat, crank, r, ankles, bars),
        { kind: "ring", at: new Vec3(0.68, 0.36, 0), normal: ACROSS.clone(), r: 0.26 },
      ];
      return pose;
    },
  };
}

/**
 * The assault bike: pushing and pulling the handles while pedalling, the
 * arms and legs in turn — each hand pushes as the other leg does.
 */
function assaultBike(): Move {
  const seat = new Vec3(-0.08, 0.9, 0);
  const crank = new Vec3(0.2, 0.33, 0);
  const r = 0.17;
  const pivot = new Vec3(0.62, 0.42, 0);
  const lever = 0.86;
  return {
    kit: {},
    film: {
      views: [0],
      cycle: 1.1,
      middle: new Vec3(0.25, 0, 0),
      room: { height: 1.85, width: 2.0 },
    },
    pose(t) {
      const { pelvis, ankles, feet, lean } = pedalling(t, { seat, lean: rad(12), crank, r });
      const top = pelvis.clone().addScaledVector(along(lean), BODY.torso);
      const handles = SIDES.map((s, i) => {
        const a = rad(-20 + 13 * Math.cos(TAU * t + i * Math.PI));
        return pivot.clone().addScaledVector(along(a), lever).setZ(s * 0.26);
      });
      const hands = SIDES.map((s, i) =>
        withinReach(top.clone().setZ(s * BODY.shoulder), handles[i]),
      ) as [Vec3, Vec3];
      const pose = poseFrom({
        pelvis,
        lean,
        ankles,
        feet,
        hands,
        elbowPole: mirror(new Vec3(-0.4, -1, 0.5)),
        kneePole: new Vec3(1, 0.5, 0),
      });
      planted(pose, [false, false]);
      pose.props = [
        ...bikeFrame(seat, crank, r, ankles),
        rod(crank, new Vec3(0.75, 0, 0)),
        rod(crank, pivot),
        { kind: "ring", at: new Vec3(0.86, 0.62, 0), normal: ACROSS.clone(), r: 0.36 },
        ...handles.map((h, i) => rod(pivot.clone().setZ(h.z), hands[i])),
      ];
      return pose;
    },
  };
}

/**
 * The elliptical: standing tall on the pedals, the whole foot on them as
 * they go round, pushing and pulling the handles.
 */
function elliptical(): Move {
  const centre = new Vec3(0.05, 0.3, 0);
  const [a, b] = [0.24, 0.07];
  const pelvis = new Vec3(0.02, 1.1, 0);
  const pivot = new Vec3(0.62, 0.38, 0);
  return {
    kit: {},
    film: {
      views: [0],
      cycle: 1.2,
      middle: new Vec3(0.15, 0, 0),
      room: { height: 2.1, width: 1.9 },
    },
    pose(t) {
      const pedals = SIDES.map((s, i) => {
        const p = TAU * t + i * Math.PI;
        return centre.clone().add(new Vec3(a * Math.cos(p), b * Math.sin(p), s * 0.13));
      });
      const ankles = pedals.map((p) =>
        p.clone().add(new Vec3(-0.03, BODY.ankle, 0)),
      ) as [Vec3, Vec3];
      const lean = rad(4);
      const top = pelvis.clone().addScaledVector(along(lean), BODY.torso);
      const handles = SIDES.map((s, i) => {
        const angle = rad(-24 - 12 * Math.cos(TAU * t + i * Math.PI));
        return pivot.clone().addScaledVector(along(angle), 1.0).setZ(s * 0.26);
      });
      const hands = SIDES.map((s, i) =>
        withinReach(top.clone().setZ(s * BODY.shoulder), handles[i]),
      ) as [Vec3, Vec3];
      const pose = poseFrom({
        pelvis,
        lean,
        ankles,
        feet: mirror(AHEAD.clone()),
        hands,
        elbowPole: mirror(new Vec3(-0.3, -1, 0.4)),
        kneePole: new Vec3(1, 0.2, 0),
      });
      planted(pose, [true, true]);
      pose.props = [
        ...pedals.map((p): Prop => ({
          kind: "pad",
          from: p.clone().add(new Vec3(-0.15, 0, 0)),
          to: p.clone().add(new Vec3(0.18, 0, 0)),
          half: 0.06,
          thick: 0.04,
        })),
        ...pedals.map((p) => rod(p.clone().add(new Vec3(0.18, -0.02, 0)), pivot.clone().setZ(p.z))),
        ...handles.map((h, i) => rod(pivot.clone().setZ(h.z), hands[i])),
        rod(new Vec3(-0.45, 0, 0), new Vec3(0.85, 0, 0)),
        rod(pivot, new Vec3(0.8, 0, 0)),
        rod(new Vec3(-0.35, 0, 0), centre.clone().add(new Vec3(-0.3, -0.05, 0))),
      ];
      return pose;
    },
  };
}

/**
 * The stair climber: standing tall, hands light on the rails, stepping
 * through the whole foot at a steady rhythm. One step with each foot a turn.
 */
function stair(): Move {
  const rise = 0.2;
  const tread = 0.28;
  return {
    kit: {},
    film: {
      views: [0],
      cycle: 1.4,
      middle: new Vec3(0.1, 0, 0),
      room: { height: 2.25, width: 1.8 },
    },
    pose(t) {
      // The stairs roll down a step every half turn; each foot climbs onto the
      // next step in turn, and the body stays put.
      const k = (t * 2) % 1;
      const roll = rise * k;
      const step = (n: number) => new Vec3(n * tread, 0.25 + n * rise - roll, 0);
      const lead = Math.floor(t * 2) % 2;
      const lift = Math.min(1, k / 0.45);
      const ease = (1 - Math.cos(Math.PI * lift)) / 2;
      const ankles = SIDES.map((s, i) => {
        if (i === lead) {
          // From one step to the one two higher, over the edge between.
          const from = step(0);
          const to = step(2);
          return mixed(from, to, ease)
            .add(new Vec3(0.04, BODY.ankle + 0.1 * Math.sin(Math.PI * lift), s * 0.11));
        }
        return step(1).add(new Vec3(0.04, BODY.ankle, s * 0.11));
      }) as [Vec3, Vec3];
      const lean = rad(6);
      const high = Math.max(...ankles.map((a) => a.y));
      const low = Math.min(...ankles.map((a) => a.y));
      const pelvis = new Vec3(0.02, 0, 0);
      pelvis.y = Math.min(high + 0.5, low + Math.sqrt((LEG * 0.995) ** 2 - 0.12 ** 2));
      const top = pelvis.clone().addScaledVector(along(lean), BODY.torso);
      const hands = SIDES.map((s) =>
        withinReach(top.clone().setZ(s * BODY.shoulder), new Vec3(0.28, pelvis.y + 0.05, s * 0.3)),
      ) as [Vec3, Vec3];
      const flat = ankles.map((_, i) => i !== lead || lift >= 1) as [boolean, boolean];
      const pose = poseFrom({
        pelvis,
        lean,
        ankles,
        feet: mirror(AHEAD.clone()),
        hands,
        elbowPole: mirror(new Vec3(-0.3, -1, 0.4)),
        kneePole: new Vec3(1, 0.1, 0),
      });
      planted(pose, flat);
      const steps: Prop[] = [-1, 0, 1, 2, 3].map((n) => {
        const s = step(n);
        return rod(new Vec3(s.x - 0.1, s.y, 0), new Vec3(s.x + tread - 0.1, s.y, 0));
      });
      pose.props = [
        ...steps,
        rod(new Vec3(-0.5, 0, 0), new Vec3(0.75, 0, 0)),
        rod(new Vec3(-0.45, 0, 0), new Vec3(0.75, 1.2, 0)),
        ...SIDES.map((s) =>
          rod(new Vec3(0.05, pelvis.y + 0.05, s * 0.3), new Vec3(0.6, pelvis.y + 0.05, s * 0.3)),
        ),
      ];
      return pose;
    },
  };
}

/**
 * The rower: legs first, then the lean back, then the arms; back the other
 * way — arms, body, knees. One long stroke a turn.
 */
function rower(): Move {
  const rail = 0.2;
  const seatY = rail + 0.1;
  const ankle = new Vec3(0.62, seatY + 0.02, 0);
  const foot = new Vec3(0.5, 0.86, 0).normalize();
  const wheel = new Vec3(1.0, 0.5, 0);
  const motion = keyframes<"seat" | "lean" | "pull">([
    { t: 0, seat: 0.12, lean: 26, pull: 0 },
    { t: 0.22, seat: -0.2, lean: 18, pull: 0 },
    { t: 0.33, seat: -0.22, lean: -20, pull: 0.15 },
    { t: 0.44, seat: -0.22, lean: -22, pull: 1 },
    { t: 0.52, seat: -0.22, lean: -22, pull: 1 },
    { t: 0.62, seat: -0.22, lean: -20, pull: 0 },
    { t: 0.72, seat: -0.18, lean: 26, pull: 0 },
    { t: 1, seat: 0.12, lean: 26, pull: 0 },
  ]);
  return {
    kit: {},
    film: {
      views: [0],
      cycle: 2.6,
      middle: new Vec3(0.2, 0, 0),
      room: { height: 1.35, width: 2.3 },
    },
    pose(t) {
      const k = motion(t);
      const lean = rad(k.lean);
      const pelvis = new Vec3(k.seat, seatY + SIZE.trunk.side * 0.55, 0);
      const trunk = along(lean);
      const forward = new Vec3(Math.cos(lean), -Math.sin(lean), 0);
      const top = pelvis.clone().addScaledVector(trunk, BODY.torso);
      const ribs = pelvis
        .clone()
        .addScaledVector(trunk, 0.3)
        .addScaledVector(forward, chestAt(0.3) + 0.06);
      const hands = SIDES.map((s) => {
        const shoulder = top.clone().setZ(s * BODY.shoulder);
        const out = withinReach(shoulder, new Vec3(2, wheel.y + 0.05, s * 0.12), 0.99);
        return withinReach(shoulder, mixed(out, ribs.clone().setZ(s * 0.12), k.pull));
      }) as [Vec3, Vec3];
      const ankles = mirror(ankle.clone().setZ(0.13));
      const pose = poseFrom({
        pelvis,
        lean,
        ankles,
        feet: [foot, foot],
        hands,
        elbowPole: mirror(new Vec3(-0.3, 0, 1)),
        kneePole: UP,
      });
      pose.legs = pose.legs.map((leg) =>
        ({ ...leg, planted: true, top: new Vec3(-foot.y, foot.x, 0) }),
      ) as [
        Leg,
        Leg,
      ];
      const handle = hands[0].clone().setZ(0);
      pose.props = [
        rod(new Vec3(-0.75, rail, 0), new Vec3(1.0, rail, 0)),
        rod(new Vec3(-0.7, rail, 0), new Vec3(-0.7, 0, 0)),
        rod(new Vec3(0.95, rail, 0), new Vec3(0.95, 0, 0)),
        {
          kind: "pad",
          from: new Vec3(k.seat - 0.13, seatY, 0),
          to: new Vec3(k.seat + 0.12, seatY, 0),
          half: 0.12,
          thick: 0.05,
        },
        {
          kind: "pad",
          from: ankle.clone().addScaledVector(foot, -0.08).add(new Vec3(0.06, -0.05, 0)),
          to: ankle.clone().addScaledVector(foot, 0.22).add(new Vec3(0.06, -0.05, 0)),
          half: 0.2,
          thick: 0.03,
          up: new Vec3(-foot.y, foot.x, 0),
        },
        { kind: "ring", at: wheel.clone(), normal: ACROSS.clone(), r: 0.22 },
        rod(handle.clone().setZ(0.14), handle.clone().setZ(-0.14)),
        rod(handle, wheel.clone().add(new Vec3(-0.15, 0.05, 0))),
      ];
      return pose;
    },
  };
}

/**
 * The ski-erg: hands high, arms long; hinge at the hips and drive the
 * handles down past the pockets, and stand back up tall. The hips do the
 * work.
 */
function skiErg(): Move {
  const column = 0.72;
  const motion = keyframes<"lean" | "bend" | "arms">([
    { t: 0, lean: 4, bend: 0.01, arms: 155 },
    { t: 0.1, lean: 8, bend: 0.02, arms: 150 },
    { t: 0.32, lean: 48, bend: 0.11, arms: 30 },
    { t: 0.42, lean: 52, bend: 0.12, arms: -12 },
    { t: 0.5, lean: 50, bend: 0.12, arms: -10 },
    { t: 0.75, lean: 15, bend: 0.04, arms: 110 },
    { t: 1, lean: 4, bend: 0.01, arms: 155 },
  ]);
  return {
    kit: {},
    film: {
      views: [0],
      cycle: 1.8,
      middle: new Vec3(0.2, 0, 0),
      room: { height: 2.45, width: 1.8 },
    },
    pose(t) {
      const k = motion(t);
      const lean = rad(k.lean);
      const toeOut = rad(8);
      const ankles = mirror(new Vec3(0, BODY.ankle, 0.17));
      const feet = mirror(new Vec3(Math.cos(toeOut), 0, Math.sin(toeOut)));
      // The hips back as the trunk leans, to stay over the feet.
      const x = 0.03 - 0.3 * Math.sin(lean) * 0.6;
      const pelvis = new Vec3(x, 0, 0);
      pelvis.y = BODY.ankle + Math.sqrt((LEG - k.bend) ** 2 - x * x - (0.17 - BODY.hip) ** 2);
      const top = pelvis.clone().addScaledVector(along(lean), BODY.torso);
      const dir = swung(k.arms);
      const arms = SIDES.map((s) =>
        armFrom(
          top.clone().setZ(s * BODY.shoulder),
          dir.clone().add(new Vec3(0, 0, -0.05 * s)),
          turned(dir, UP, 6).add(new Vec3(0, 0, -0.05 * s)),
        ),
      ) as [Limb, Limb];
      const pose = withArms(
        poseFrom(
          { pelvis, lean, ankles, feet, hands: [arms[0].end, arms[1].end], elbowPole: DOWN },
        ),
        arms,
      );
      pose.props = [
        {
          kind: "pad",
          from: new Vec3(column, 0, 0),
          to: new Vec3(column, 2.25, 0),
          half: 0.12,
          thick: 0.12,
          up: AHEAD.clone(),
          across: ACROSS.clone(),
        },
        {
          kind: "pad",
          from: new Vec3(-0.45, 0.03, 0),
          to: new Vec3(column, 0.03, 0),
          half: 0.35,
          thick: 0.03,
        },
        ...arms.map((arm, i) => rod(new Vec3(column - 0.06, 2.15, SIDES[i] * 0.12), arm.end)),
      ];
      return pose;
    },
  };
}

/** The cardio machines, by id. */
export const CARDIO: Record<string, () => Move> = {
  treadmill,
  row: rower,
  ski_erg: skiErg,
  bike,
  assault_bike: assaultBike,
  elliptical,
  stair,
};
