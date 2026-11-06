import {
  BAR_RADIUS,
  chestAt,
  clearOfTrunk,
  elbowUpright,
  halve,
  handsOn,
  held,
  lerp,
  PLATE_5KG,
  rad,
  secant,
  sideOnDistance,
  smithProps,
  stand,
  standingHips,
  type Bench,
  type Move,
} from "@/motion/build";
import {
  anglesOf,
  BODY,
  centreOfMass,
  poseFrom,
  SIDES,
  SIZE,
  type Limb,
  type Pose,
} from "@/motion/figure";
import { ARMS } from "@/motion/arms";
import { CARDIO } from "@/motion/cardio";
import { CORE } from "@/motion/core";
import { LEGS } from "@/motion/legs";
import { PULL } from "@/motion/pull";
import { STRETCHES } from "@/motion/stretch";
import { PUSH } from "@/motion/push";
import { Vec3 } from "@/motion/vector";

export { BAR_RADIUS, clearOfTrunk, sideOnDistance, type Bench, type Move };

/**
 * The high-bar back squat. Feet a little wider than the hips, toes turned out
 * 20°. The bar sits on the upper back, a little above and behind the shoulder
 * joints, hands wide on it. Down, the hips go back first and then mostly
 * down, to just below parallel; the bar travels straight up and down over the
 * middle of the foot.
 */
function backSquat(smith = false): Move {
  const stance = 0.21;
  const toeOut = (20 * Math.PI) / 180;
  const grip = 0.36;
  const barUp = 0.05;
  const barBack = 0.11;

  const { feet, ankles, midFoot } = stand(stance, toeOut);

  // Standing: the hips a touch ahead of the ankles and the knees all but
  // locked. The bottom: hip joints a few centimetres below the knees.
  const topX = 0.08;
  const reach = 0.9995 * (BODY.thigh + BODY.shin);
  const spread = stance - BODY.hip;
  const topY = BODY.ankle + Math.sqrt(reach * reach - topX * topX - spread * spread);
  const bottomX = -0.15;
  const bottomY = 0.37;

  // On a Smith machine the feet are a little in front of the bar.
  const barX = smith ? midFoot - 0.1 : midFoot;

  return {
    kit: { bar: "barbell" },
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
      const lean = halve((l) => barFrom(l).x - barX, -0.2, 1.2);
      const bar = barFrom(lean);
      const trunk = new Vec3(Math.sin(lean), Math.cos(lean), 0);
      const forward = new Vec3(Math.cos(lean), -Math.sin(lean), 0);
      const pose = poseFrom({
        pelvis,
        lean,
        ankles,
        feet,
        hands: handsOn(bar, grip),
        // Elbows down and a little back, under the bar.
        elbowPole: trunk.clone().negate().addScaledVector(forward, -0.5),
        bar,
      });
      if (smith) pose.props = smithProps(barX);
      return pose;
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
function benchPress(dumbbells = false): Move {
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
  // The top: arms straight, the bar over the shoulder joints — dumbbells
  // pressed a little in, over the shoulders themselves.
  const reach = 0.998 * (BODY.upperArm + BODY.forearm);
  const narrow = BODY.shoulder + 0.01;
  const out = dumbbells ? narrow - BODY.shoulder : along;
  const top = new Vec3(shoulders.x, shoulders.y + Math.sqrt(reach * reach - out * out), 0);

  const toeOut = (25 * Math.PI) / 180;
  const feet = SIDES.map((s) => new Vec3(Math.cos(toeOut), 0, s * Math.sin(toeOut))) as [
    Vec3,
    Vec3,
  ];
  const ankles = SIDES.map((s) => new Vec3(0.4, BODY.ankle, s * 0.3)) as [Vec3, Vec3];

  return {
    kit: dumbbells ? { dumbbells, bench } : { bar: "barbell", bench },
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
        hands: handsOn(bar, dumbbells ? lerp(narrow, grip, d) : grip),
        elbowPole: new Vec3(0, -1, 0),
        bar: dumbbells ? undefined : bar,
      });
      if (dumbbells) {
        pose.dumbbells = pose.arms.map((arm) => ({ at: arm.end, axis: new Vec3(0, 0, 1) }));
      }
      // The forearms upright all the way down.
      pose.arms = pose.arms.map((arm) => {
        const mid = elbowUpright(arm.root, arm.end, "side") ?? arm.mid;
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
 * The barbell curl. Standing tall, the elbows pinned at the sides a little
 * ahead of the hips: only the forearms move, from straight arms with the bar
 * resting on the thighs to the bar in front of the chest. Lifter and bar
 * balance over the middle of the foot, and nothing rocks.
 */
function barbellCurl(): Move {
  const { feet, ankles, midFoot } = stand(0.15, rad(10));
  const grip = 0.2;
  /** How far out each elbow is: against the sides. */
  const tuck = 0.165;
  /** The bar weighs this share of the lifter. */
  const load = 0.4;
  const topBend = rad(140);

  const reach = 0.9995 * (BODY.thigh + BODY.shin);
  const spread = 0.15 - BODY.hip;
  // Each bone's length seen from the side, less what it runs across the body.
  const upper = Math.sqrt(BODY.upperArm ** 2 - (BODY.shoulder - tuck) ** 2);
  const fore = Math.sqrt(BODY.forearm ** 2 - (grip - tuck) ** 2);
  /** The hips `x` ahead of the ankles, upper arms `out` from upright, elbows bent `bend`. */
  const curl = (x: number, out: number, bend: number) => {
    const pelvis = new Vec3(x, BODY.ankle + Math.sqrt(reach ** 2 - x * x - spread ** 2), 0);
    const elbow = pelvis
      .clone()
      .add(new Vec3(upper * Math.sin(out), BODY.torso - upper * Math.cos(out), 0));
    const bar = elbow
      .clone()
      .add(new Vec3(fore * Math.sin(out + bend), -fore * Math.cos(out + bend), 0));
    const pose = poseFrom({
      pelvis,
      lean: 0,
      ankles,
      feet,
      hands: handsOn(bar, grip),
      elbowPole: new Vec3(0, -1, 0),
      bar,
    });
    pose.arms = pose.arms.map((arm, i) => {
      const mid = elbow.clone().add(new Vec3(0, 0, SIDES[i] * tuck));
      return { ...arm, mid };
    }) as [Limb, Limb];
    return pose;
  };
  /** How far the bar, arms straight, is clear of the front of the thighs. */
  const clear = (pose: Pose) =>
    Math.min(...pose.legs.map((l) => sideOnDistance(pose.bar!, l.root, l.mid))) -
    SIZE.thigh -
    BAR_RADIUS;

  // The arms just far enough forward that, straight, the bar rests on the
  // thighs; the lifter just far enough back to balance halfway up.
  let x = 0;
  let out = 0;
  for (let i = 0; i < 4; i++) {
    out = halve((o) => clear(curl(x, o, 0)), 0, 0.5);
    x = halve((h) => centreOfMass(curl(h, out, topBend / 2), load).x - midFoot, -0.2, 0.2);
  }

  return {
    kit: { bar: "barbell", plate: PLATE_5KG },
    film: {
      views: [0, 90],
      lifts: true,
      middle: new Vec3(midFoot, 0, 0),
      room: { height: 1.85, width: 2.4 },
    },
    pose(depth) {
      return curl(x, out, topBend * Math.min(Math.max(depth, 0), 1));
    },
  };
}

/**
 * The bent-over barbell row. Hinged with the trunk at 45°, back flat, knees
 * soft; the trunk never moves. From straight arms, the bar hanging under the
 * shoulders, the elbows drive straight back and the bar comes up to the
 * lower ribs.
 * Lifter and bar balance over the middle of the foot.
 */
function barbellRow(): Move {
  const { feet, ankles, midFoot } = stand(0.17, rad(12));
  const grip = 0.25;
  const lean = rad(45);
  const knees = 25;
  const load = 0.7;
  const trunk = new Vec3(Math.sin(lean), Math.cos(lean), 0);
  const forward = new Vec3(Math.cos(lean), -Math.sin(lean), 0);
  // The elbows go straight back, close to the body.
  const elbowPole = forward.clone().negate();
  const reach = 0.998 * (BODY.upperArm + BODY.forearm);
  const hang = Math.sqrt(reach ** 2 - (grip - BODY.shoulder) ** 2);

  const row = (pelvis: Vec3, bar: Vec3) =>
    poseFrom({ pelvis, lean, ankles, feet, hands: handsOn(bar, grip), elbowPole, bar });
  /** Arms straight, the bar hangs right under the shoulders. */
  const hanging = (pelvis: Vec3) =>
    pelvis.clone().addScaledVector(trunk, BODY.torso).add(new Vec3(0, -hang, 0));
  /** With the hips `x` from the ankles, as high as leaves the knees bent just so. */
  const hips = (x: number) => {
    const bent = (y: number) => knees - anglesOf(row(new Vec3(x, y, 0), new Vec3())).knees[0];
    return new Vec3(x, secant(bent, 0.85, 0.9), 0);
  };
  const back = secant((x) => {
    const pelvis = hips(x);
    return centreOfMass(row(pelvis, hanging(pelvis)), load).x - midFoot;
  }, -0.2, -0.25);
  const pelvis = hips(back);
  const bottom = hanging(pelvis);
  // The top: the bar against the lower ribs.
  const ribs = 0.3;
  const top = pelvis
    .clone()
    .addScaledVector(trunk, ribs)
    .addScaledVector(forward, chestAt(ribs) + BAR_RADIUS);

  return {
    kit: { bar: "barbell", plate: PLATE_5KG },
    film: {
      views: [0],
      lifts: true,
      middle: new Vec3(0.02, 0, 0),
      room: { height: 1.6, width: 1.9 },
    },
    pose(depth) {
      const d = Math.min(Math.max(depth, 0), 1);
      // Up first, then in to the ribs.
      const bar = new Vec3(
        lerp(bottom.x, top.x, d * d),
        lerp(bottom.y, top.y, Math.sin((d * Math.PI) / 2)),
        0,
      );
      return row(pelvis, bar);
    },
  };
}

/**
 * The pull-up. From a dead hang under the bar, arms straight, the shoulders
 * pull down and the elbows drive towards the ribs until the chin is over the
 * bar and the chest at it. The body stays long — a slight lean back, the legs
 * a touch ahead, feet pointed — so it hangs balanced under the bar the whole
 * way, never swinging. With a shoulder-width `grip` — underhand — it's the
 * chin-up, the elbows down and in.
 */
function pullUp(grip = 0.28): Move {
  const height = 2.25;
  const leanBack = rad(20);
  const bar = new Vec3(0, height, 0);
  const hands = handsOn(bar, grip);
  const reach = 0.998 * (BODY.upperArm + BODY.forearm);
  const legs = 0.998 * (BODY.thigh + BODY.shin);
  const bottom = height - Math.sqrt(reach ** 2 - (grip - BODY.shoulder) ** 2);
  // The chin a centimetre over the bar.
  const top =
    height +
    0.01 +
    SIZE.head -
    BODY.neck * Math.cos(leanBack) -
    0.015 * Math.sin(leanBack);

  /** Turned `by` from `a` towards `b`, in their plane: both unit, at right angles. */
  const turned = (a: Vec3, b: Vec3, by: number) =>
    a.clone().multiplyScalar(Math.cos(by)).addScaledVector(b, Math.sin(by));
  /** The shoulders at `shoulders`, leaning back `back`, legs `pike` ahead of the trunk's line. */
  const hang = (shoulders: Vec3, back: number, pike: number) => {
    const lean = -back;
    const trunk = new Vec3(Math.sin(lean), Math.cos(lean), 0);
    const forward = new Vec3(Math.cos(lean), -Math.sin(lean), 0);
    const pelvis = shoulders.clone().addScaledVector(trunk, -BODY.torso);
    const down = turned(trunk.clone().negate(), forward, pike);
    // Pointed feet: 50° past where they'd be standing.
    const foot = turned(down, turned(forward, trunk, pike), rad(40));
    const ankles = SIDES.map((s) =>
      pelvis.clone().add(new Vec3(0, 0, s * BODY.hip)).addScaledVector(down, legs),
    ) as [Vec3, Vec3];
    const feet = [foot, foot] as [Vec3, Vec3];
    const kneePole = turned(forward, trunk, pike);
    const pose = poseFrom({ pelvis, lean, ankles, feet, hands, elbowPole: forward, kneePole, bar });
    // The elbows come down towards the ribs straight under the hands, the
    // forearms upright seen from the front.
    pose.arms = pose.arms.map((arm) => {
      const mid = elbowUpright(arm.root, arm.end, "front") ?? arm.mid;
      return { ...arm, mid };
    }) as [Limb, Limb];
    return pose;
  };
  /** The legs as far ahead as keeps the body's weight right under the bar. */
  const balanced = (shoulders: Vec3, back: number) => {
    const ahead = (pike: number) => centreOfMass(hang(shoulders, back, pike)).x - bar.x;
    return hang(shoulders, back, secant(ahead, 0, 0.2));
  };

  // At the top, the shoulders as far back as brings the chest to the bar.
  const behind = halve(
    (x) => clearOfTrunk(balanced(new Vec3(-x, top, 0), leanBack), bar) - BAR_RADIUS,
    0,
    0.4,
  );

  return {
    kit: { bar: "fixed" },
    film: {
      // From the front: from the side, hanging, an arm hides the head.
      views: [90],
      lifts: true,
      middle: new Vec3(0, 0, 0),
      room: { height: 2.55, width: 1.35 },
    },
    pose(depth) {
      const d = Math.min(Math.max(depth, 0), 1);
      // Back early, so the face clears the bar on the way up.
      const back = Math.sin((d * Math.PI) / 2);
      return balanced(new Vec3(-behind * back, lerp(bottom, top, d), 0), leanBack * back);
    },
  };
}

/**
 * The dumbbell curl — or, `hammer`, the hammer curl. Standing tall, the
 * dumbbells at the sides, elbows pinned: only the forearms move. In a curl
 * the palms turn from facing in to facing up on the way; in a hammer curl
 * they face in throughout.
 */
function dumbbellCurl(hammer: boolean): Move {
  const { feet, ankles, midFoot } = stand(0.15, rad(10));
  const tuck = 0.2;
  const grip = 0.24;
  const out = rad(4);
  const load = 0.3;
  const topBend = rad(140);
  const upper = Math.sqrt(BODY.upperArm ** 2 - (BODY.shoulder - tuck) ** 2);
  const fore = Math.sqrt(BODY.forearm ** 2 - (grip - tuck) ** 2);
  const curl = (x: number, bend: number) => {
    const pelvis = standingHips(x, 0.15);
    const elbow = pelvis
      .clone()
      .add(new Vec3(upper * Math.sin(out), BODY.torso - upper * Math.cos(out), 0));
    const a = out + bend;
    const hand = elbow.clone().add(new Vec3(fore * Math.sin(a), -fore * Math.cos(a), 0));
    const hands = handsOn(hand, grip);
    const pose = poseFrom({ pelvis, lean: 0, ankles, feet, hands, elbowPole: new Vec3(0, -1, 0) });
    pose.arms = pose.arms.map((arm, i) => {
      const mid = elbow.clone().add(new Vec3(0, 0, SIDES[i] * tuck));
      return { ...arm, mid };
    }) as [Limb, Limb];
    // Facing in, the handle runs front to back, square to the forearm.
    const facingIn = new Vec3(Math.cos(a), Math.sin(a), 0);
    const turn = hammer ? 0 : (bend / topBend) * (Math.PI / 2);
    const axis = facingIn.multiplyScalar(Math.cos(turn)).add(new Vec3(0, 0, Math.sin(turn)));
    pose.dumbbells = hands.map((at) => ({ at, axis }));
    return pose;
  };
  // The lifter just far enough back to balance halfway up.
  const x = secant((h) => {
    const pose = curl(h, topBend / 2);
    return centreOfMass(pose, load, held(pose)).x - midFoot;
  }, 0, -0.05);

  return {
    kit: { dumbbells: true },
    film: {
      views: [0, 90],
      lifts: true,
      middle: new Vec3(midFoot, 0, 0),
      room: { height: 1.85, width: 1.6 },
    },
    pose(depth) {
      return curl(x, topBend * Math.min(Math.max(depth, 0), 1));
    },
  };
}

/**
 * The goblet squat. A dumbbell held upright against the chest, cupped under
 * its top end, elbows under it; feet a little wider than the hips, turned
 * out. Down between the knees to below parallel, chest up, heels down, the
 * knees over the toes; lifter and dumbbell balanced over mid-foot.
 */
function gobletSquat(kettlebell = false): Move {
  const stance = 0.24;
  const toeOut = rad(25);
  const { feet, ankles, midFoot } = stand(stance, toeOut);
  const load = 0.2;
  const reach = 0.9995 * (BODY.thigh + BODY.shin);
  const topX = 0.05;
  const topY = BODY.ankle + Math.sqrt(reach ** 2 - topX ** 2 - (stance - BODY.hip) ** 2);
  const [bottomX, bottomY] = [-0.12, 0.34];
  /** Where on the trunk the dumbbell sits: the middle of the chest. */
  const chest = BODY.torso - 0.14;
  const at = (pelvis: Vec3, lean: number) => {
    const trunk = new Vec3(Math.sin(lean), Math.cos(lean), 0);
    const forward = new Vec3(Math.cos(lean), -Math.sin(lean), 0);
    const middle = pelvis
      .clone()
      .addScaledVector(trunk, chest)
      .addScaledVector(forward, chestAt(chest) + 0.075);
    const hands = SIDES.map((s) => middle.clone().add(new Vec3(0, 0.07, s * 0.05))) as [Vec3, Vec3];
    const pose = poseFrom({ pelvis, lean, ankles, feet, hands, elbowPole: new Vec3(0, -1, 0) });
    // A kettlebell held by the horns, the bell under the hands.
    if (kettlebell) {
      const at = middle.clone().add(new Vec3(-0.01, 0.07, 0));
      pose.props = [{ kind: "kettlebell", at, down: trunk.clone().negate() }];
    } else pose.dumbbells = [{ at: middle, axis: new Vec3(0, 1, 0) }];
    return pose;
  };
  const weightOf = (pose: Pose) =>
    kettlebell ? pose.arms[0].end.clone().add(new Vec3(0, -0.1, 0)) : pose.dumbbells![0].at;

  return {
    kit: kettlebell ? {} : { dumbbells: true },
    film: { views: [0, 90], middle: new Vec3(midFoot, 0, 0), room: { height: 1.85, width: 1.6 } },
    pose(depth) {
      const d = Math.min(Math.max(depth, 0), 1);
      const pelvis = new Vec3(
        lerp(topX, bottomX, Math.sin((d * Math.PI) / 2)),
        lerp(topY, bottomY, d),
        0,
      );
      // The trunk leans exactly as far as balances lifter and dumbbell.
      const lean = secant((l) => {
        const pose = at(pelvis, l);
        return centreOfMass(pose, load, weightOf(pose)).x - midFoot;
      }, 0.1, 0.3);
      return at(pelvis, lean);
    },
  };
}

/**
 * The Romanian deadlift, with a barbell or two dumbbells. Knees soft and
 * staying so; the hips push back and the trunk hinges, back flat, to a big
 * stretch, the weight sliding down the legs, never drifting from them. The
 * lifter stays balanced over mid-foot.
 */
function romanianDeadlift(dumbbells: boolean): Move {
  const { feet, ankles, midFoot } = stand(0.15, rad(8));
  const knees = 18;
  const deepest = rad(65);
  const load = dumbbells ? 0.4 : 0.8;
  const grip = dumbbells ? 0.13 : 0.24;
  /** What touches the legs: the bar, or a dumbbell's head. */
  const thick = dumbbells ? 0.06 : BAR_RADIUS;
  const reach = 0.998 * (BODY.upperArm + BODY.forearm);
  const hang = Math.sqrt(reach ** 2 - (grip - BODY.shoulder) ** 2);

  /** Leaning `lean`, hips at `pelvis`, the arms swung `swing` forward of hanging straight down. */
  const hinge = (pelvis: Vec3, lean: number, swing: number) => {
    const trunk = new Vec3(Math.sin(lean), Math.cos(lean), 0);
    const weight = pelvis
      .clone()
      .addScaledVector(trunk, BODY.torso)
      .add(new Vec3(hang * Math.sin(swing), -hang * Math.cos(swing), 0));
    const hands = handsOn(weight, grip);
    const pose = poseFrom({
      pelvis,
      lean,
      ankles,
      feet,
      hands,
      elbowPole: new Vec3(-1, 0, 0),
      bar: dumbbells ? undefined : weight,
    });
    if (dumbbells) pose.dumbbells = hands.map((at) => ({ at, axis: new Vec3(0, 0, 1) }));
    return pose;
  };
  const legsClear = (pose: Pose) => {
    const w = held(pose);
    return (
      Math.min(
        ...pose.legs.flatMap((l) => [
          sideOnDistance(w, l.root, l.mid) - SIZE.thigh,
          sideOnDistance(w, l.mid, l.end) - SIZE.shin,
        ]),
      ) - thick
    );
  };
  /** Hips `x` from the ankles, leaning `lean`: knees soft, the weight on the legs. */
  const settle = (x: number, lean: number) => {
    const y = secant(
      (h) => knees - anglesOf(hinge(new Vec3(x, h, 0), lean, 0)).knees[0],
      0.85,
      0.9,
    );
    const pelvis = new Vec3(x, y, 0);
    const swing = halve((a) => legsClear(hinge(pelvis, lean, a)), -0.6, 0.6);
    return hinge(pelvis, lean, swing);
  };
  // Worked out at a few leans, in between drawn from them.
  const STEPS = 12;
  const table = Array.from({ length: STEPS + 1 }, (_, i) => {
    const lean = (deepest * i) / STEPS;
    const x = secant((h) => {
      const pose = settle(h, lean);
      return centreOfMass(pose, load, held(pose)).x - midFoot;
    }, -0.05, -0.1);
    const pose = settle(x, lean);
    const w = held(pose);
    const shoulders = pose.pelvis.clone().addScaledVector(pose.trunk, BODY.torso);
    return { pelvis: pose.pelvis, lean, swing: Math.atan2(w.x - shoulders.x, shoulders.y - w.y) };
  });

  return {
    kit: dumbbells ? { dumbbells } : { bar: "barbell" },
    film: { views: [0], middle: new Vec3(-0.05, 0, 0), room: { height: 1.85, width: 1.9 } },
    pose(depth) {
      const t = Math.min(Math.max(depth, 0), 1) * STEPS;
      const i = Math.min(Math.floor(t), STEPS - 1);
      const [a, b] = [table[i], table[i + 1]];
      const f = t - i;
      const pelvis = a.pelvis.clone().addScaledVector(b.pelvis.clone().sub(a.pelvis), f);
      return hinge(pelvis, lerp(a.lean, b.lean, f), lerp(a.swing, b.swing, f));
    },
  };
}

/**
 * The lateral raise, seen from the front. Standing with a slight lean
 * forward, dumbbells at the sides, elbows soft: the arms rise out to the
 * sides to shoulder height, a little ahead of the body, and lower slower
 * than they rose. The shoulders never shrug.
 */
function lateralRaise(): Move {
  const { feet, ankles, midFoot } = stand(0.15, rad(10));
  const lean = rad(10);
  const ahead = rad(15);
  const soft = rad(15);
  const load = 0.15;
  const raise = (x: number, lift: number) => {
    const pelvis = standingHips(x, 0.15);
    const trunk = new Vec3(Math.sin(lean), Math.cos(lean), 0);
    const top = pelvis.clone().addScaledVector(trunk, BODY.torso);
    const arms = SIDES.map((s) => {
      const shoulder = top.clone().add(new Vec3(0, 0, s * BODY.shoulder));
      const dir = new Vec3(
        Math.sin(lift) * Math.sin(ahead),
        -Math.cos(lift),
        s * Math.sin(lift) * Math.cos(ahead),
      );
      const front = new Vec3(1, 0, 0).addScaledVector(dir, -dir.x).normalize();
      const elbow = shoulder.clone().addScaledVector(dir, BODY.upperArm);
      const fore = dir.clone().multiplyScalar(Math.cos(soft));
      fore.addScaledVector(front, Math.sin(soft));
      return { elbow, hand: elbow.clone().addScaledVector(fore, BODY.forearm), front };
    });
    const hands = arms.map((a) => a.hand) as [Vec3, Vec3];
    const pose = poseFrom({ pelvis, lean, ankles, feet, hands, elbowPole: new Vec3(0, -1, 0) });
    pose.arms = pose.arms.map((arm, i) => ({ ...arm, mid: arms[i].elbow })) as [Limb, Limb];
    pose.dumbbells = arms.map((a) => ({ at: a.hand, axis: a.front }));
    return pose;
  };
  const [low, high] = [rad(10), rad(90)];
  const x = secant((h) => {
    const pose = raise(h, (low + high) / 2);
    return centreOfMass(pose, load, held(pose)).x - midFoot;
  }, 0, -0.05);

  return {
    kit: { dumbbells: true },
    film: {
      views: [90],
      lifts: true,
      middle: new Vec3(0, 0, 0),
      room: { height: 1.85, width: 1.9 },
    },
    pose(depth) {
      return raise(x, lerp(low, high, Math.min(Math.max(depth, 0), 1)));
    },
  };
}

/** Each move built the first time it's asked for, then kept. */
function lazily(makers: Record<string, () => Move>) {
  const moves: Record<string, Move> = {};
  for (const [id, make] of Object.entries(makers)) {
    let move: Move | undefined;
    Object.defineProperty(moves, id, { enumerable: true, get: () => (move ??= make()) });
  }
  return moves;
}

/**
 * Every movement Milo can film, by its id — built only when first shown, so
 * the app pays for none at start. Ask `id in MOVES` to know if one exists.
 */
export const MOVES: Record<string, Move> = lazily({
  back_squat: () => backSquat(),
  smith_squat: () => backSquat(true),
  speed_squat: () => backSquat(),
  bench: () => benchPress(),
  db_bench: () => benchPress(true),
  pullup: () => pullUp(),
  chinup: () => pullUp(0.2),
  bb_row: barbellRow,
  bb_curl: barbellCurl,
  db_curl: () => dumbbellCurl(false),
  hammer_curl: () => dumbbellCurl(true),
  goblet_squat: () => gobletSquat(),
  kb_goblet_squat: () => gobletSquat(true),
  rdl: () => romanianDeadlift(false),
  db_rdl: () => romanianDeadlift(true),
  lateral_raise: lateralRaise,
  ...PUSH,
  ...ARMS,
  ...PULL,
  ...LEGS,
  ...CORE,
  ...CARDIO,
  ...STRETCHES,
});

/**
 * Movements filmed but not yet shown in the app: each waits for a look on a
 * sheet of its family before it moves into `MOVES`. Built only when asked
 * for, so the app never pays for them.
 */
export const DRAFTS: Record<string, () => Move> = {};
