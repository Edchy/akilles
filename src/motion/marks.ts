import { BODY, SIDES, SIZE } from "@/motion/figure";
import type { Moment } from "@/motion/film";
import type { Move } from "@/motion/moves";
import { Vec3 } from "@/motion/vector";

/**
 * Humbell's marks: how a movement's figure is drawn, after the Munich '72
 * pictograms. The pose is true in 3D (see `figure.ts`); the drawing is a flat
 * view of it with every part a plain shape in one ink on the family's field —
 * a circle for the head, the ▽ of the trunk, even bars for the limbs, a
 * quarter-round for each foot. A thin gap of the field round every part keeps
 * the parts apart where they overlap, and the far limbs are a tint of the ink.
 *
 * Equipment is drawn in line, behind the body. Equipment in front of the body
 * is see-through instead: an ink line on the field, a cut of the field where
 * it crosses the parts behind it — so from the side the bar reads as on the
 * back, where it is; a bar held in front crosses the thighs; and nothing
 * ever hides the lifter.
 */

/** The field, its one ink, and the ink's tint for the far side. */
export type FilmColors = { field: string; ink: string; tint: string };

/** One fill or stroke of an SVG path, in the order they are painted. */
export type Paint = {
  key: string;
  d: string;
  fill?: string;
  stroke?: string;
  width?: number;
  /** Painted only where it crosses the parts behind it: `Drawing.clips[clip]`. */
  clip?: number;
};

export type Drawing = {
  paints: Paint[];
  /** Outlines of parts of the body, each in one path, for clipping. */
  clips: string[];
};

// Sizes, in metres; the body's own are `SIZE`.
const GAP = 0.021;
/** How round the ▽'s corners are. */
const ROUND = 0.035;
/** A quarter-round: heel behind the ankle, length, height, and half its width. */
const FOOT = { back: 0.07, long: 0.27, high: 0.095, half: 0.042 };
const LINE = 0.017;
const HALO = LINE + 0.042;
const FLOOR = 0.012;
/**
 * A 2.2 m bar, drawn from just outside the neck, with a 10 kg plate (34 cm
 * across) on each side and its end a little ring.
 */
const BAR = { from: 0.24, half: 1.1, plateAt: 0.69, plate: 0.17, end: 0.03 };
/** A fixed bar to hang from, 1.1 m long. */
const FIXED = { half: 0.55 };
/** A kettlebell: the bell's middle below the handle, its radius, and the handle's. */
const KETTLEBELL = { drop: 0.125, bell: 0.1, wide: 0.06, handle: 0.015 };
/** A dumbbell: its heads' middles either side of the hand, and their radius. */
const DUMBBELL = { headAt: 0.1, head: 0.065, handle: 0.017 };

type Pt = [number, number];

const UP = new Vec3(0, 1, 0);
const f = (n: number) => n.toFixed(1);
const clamp = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi);

/**
 * A movement at one moment of its film, drawn to fill a box `width` by
 * `height` points: the floor near the bottom — in a box taller than the
 * lifter needs, a little below the middle — and the film's middle in the
 * middle (see `Move.film`).
 */
export function draw(
  move: Move,
  { depth, turn }: Moment,
  colors: FilmColors,
  { width, height }: { width: number; height: number },
): Drawing {
  const pose = move.pose(depth);
  const { middle } = move.film;
  // The film's own room, or closer where the movement leaves it empty.
  const fit = (r: Move["film"]["room"]) => Math.min((height * 0.88) / r.height, width / r.width);
  const needed = neededBy(move);
  const room = fit(needed) > fit(move.film.room) ? needed : move.film.room;
  const scale = fit(room);
  const floorY = Math.min(height * 0.88, (height + room.height * scale) / 2 + height * 0.05);
  const angle = (turn * Math.PI) / 180;
  const toCamera = new Vec3(Math.sin(angle), 0, Math.cos(angle));
  const right = new Vec3(Math.cos(angle), 0, -Math.sin(angle));
  const at = (v: Vec3): Pt => [
    width / 2 + v.clone().sub(middle).dot(right) * scale,
    floorY - v.y * scale,
  ];
  const toward = (v: Vec3) => v.dot(toCamera);
  /** The edge of a disc of radius `r` round `c`, square to `normal`, as seen. */
  const ring = (c: Vec3, normal: Vec3, r: number) => {
    const n = normal.clone().normalize();
    const u = new Vec3().crossVectors(n, Math.abs(n.y) < 0.9 ? UP : new Vec3(1, 0, 0)).normalize();
    const v = new Vec3().crossVectors(n, u);
    const points: Pt[] = [];
    for (let k = 0; k < 32; k++) {
      const t = (k / 32) * 2 * Math.PI;
      const p = c.clone().addScaledVector(u, r * Math.cos(t)).addScaledVector(v, r * Math.sin(t));
      points.push(at(p));
    }
    return points;
  };

  const parts: { depth: number; paints: Paint[] }[] = [];
  const outlines: { d: string; depth: number }[] = [];
  const cuts: { paint: Paint; depth: number }[] = [];
  const shape = (key: string, d: string, fill: string, depth: number) => {
    outlines.push({ d, depth });
    parts.push({
      depth,
      paints: [
        { key: `${key}-gap`, d, stroke: colors.field, width: 2 * GAP * scale },
        { key, d, fill },
      ],
    });
  };
  // Equipment goes behind the whole body, nearest last.
  const line = (key: string, d: string, depth: number, fill?: string) =>
    parts.push({
      depth: depth - 100,
      paints: [
        { key: `${key}-gap`, d, fill, stroke: colors.field, width: HALO * scale },
        { key, d, stroke: colors.ink, width: LINE * scale },
      ],
    });

  // What the lifter sits, lies or leans on is solid, in the tint: it has
  // weight, and still stands back from the body.
  const slab = (key: string, d: string, depth: number) =>
    parts.push({
      depth: depth - 100,
      paints: [
        { key: `${key}-gap`, d, stroke: colors.field, width: HALO * scale },
        { key, d, fill: colors.tint },
      ],
    });

  // Depth is measured against the trunk where a part sits along it, not
  // against its middle, so a hand behind the neck stays behind however far
  // the lifter leans.
  const torsoDepth = toward(pose.pelvis.clone().addScaledVector(pose.trunk, 0.25));
  const axisDepth = (v: Vec3) => {
    const h = clamp(v.clone().sub(pose.pelvis).dot(pose.trunk), -0.1, BODY.torso + 0.1);
    return toward(pose.pelvis.clone().addScaledVector(pose.trunk, h));
  };
  const relative = (v: Vec3) => torsoDepth + toward(v) - axisDepth(v);
  const between = (a: Vec3, b: Vec3) => relative(a.clone().add(b).multiplyScalar(0.5));

  // The far limbs take the tint, blending as the lifter turns.
  const colorOf = (side: number) => {
    const facing = toCamera.dot(pose.across) * (side === 0 ? 1 : -1);
    return mix(colors.tint, colors.ink, clamp((-facing - 0.05) / 0.5, 0, 1));
  };

  // The ▽: its point sharp face on; side on it narrows to a wedge, its
  // point lifted by an arched back.
  const T = SIZE.trunk;
  const shoulders = pose.pelvis.clone().addScaledVector(pose.trunk, BODY.torso);
  const across = Math.abs(right.dot(pose.across));
  const half = (T.side + (T.front - T.side) * across) * scale;
  const [hx, hy] = at(pose.pelvis);
  const [sx, sy] = at(shoulders);
  const spine = Math.hypot(sx - hx, sy - hy);
  const [nx, ny] = spine > 1e-6 ? [(hy - sy) / spine, (sx - hx) / spine] : [1, 0];
  const [tx, ty] = at(shoulders.clone().addScaledVector(pose.trunk, T.up));
  const point = pose.pelvis
    .clone()
    .addScaledVector(pose.trunk, T.down)
    .addScaledVector(pose.forward, (pose.arch ?? 0) * (1 - across));
  const torso: Pt[] = [
    [tx + nx * half, ty + ny * half],
    [tx - nx * half, ty - ny * half],
    at(point),
  ];
  shape("torso", rounded(torso, ROUND * scale), colors.ink, torsoDepth);

  shape("head", circle(at(pose.head), SIZE.head * scale), colors.ink, relative(pose.head) + 0.03);

  pose.legs.forEach((leg, i) => {
    const color = colorOf(i);
    // The foot's top and side, and its sole under the heel: on the floor
    // standing; hanging, pointed.
    const up = leg.top ?? UP;
    const top = up.clone().addScaledVector(leg.foot, -up.dot(leg.foot)).normalize();
    const side = new Vec3().crossVectors(top, leg.foot).normalize();
    const sole = leg.end.clone().addScaledVector(top, -BODY.ankle);
    const profile: Pt[] = [[-FOOT.back, 0]];
    for (let k = 0; k <= 16; k++) {
      const t = (k / 16) * (Math.PI / 2);
      profile.push([-FOOT.back + FOOT.long * Math.sin(t), FOOT.high * Math.cos(t)]);
    }
    const foot: Pt[] = [];
    for (const [along, up] of profile) {
      for (const s of [-1, 1]) {
        const v = sole.clone().addScaledVector(leg.foot, along).addScaledVector(top, up);
        foot.push(at(v.addScaledVector(side, s * FOOT.half)));
      }
    }
    const heel = sole.clone().addScaledVector(leg.foot, 0.06);
    // Off the floor, the foot is pointed: the shin simply runs on to the toes
    // and ends round, as a pictogram's gymnast does.
    const pointed = !(leg.planted ?? leg.end.y < BODY.ankle + 0.05);
    if (!pointed) shape(`foot${i}`, polygon(hull(foot)), color, relative(heel));
    const thigh = pill(at(leg.root), at(leg.mid), SIZE.thigh * scale);
    shape(`thigh${i}`, thigh, color, between(leg.root, leg.mid));
    const toes = pointed ? leg.end.clone().addScaledVector(leg.foot, FOOT.long / 2) : leg.end;
    const shin = pill(at(leg.mid), at(toes), SIZE.shin * scale);
    shape(`shin${i}`, shin, color, between(leg.mid, leg.end) + 0.002);
  });

  const hands: number[] = [];
  pose.arms.forEach((arm, i) => {
    const color = colorOf(i);
    const upper = pill(at(arm.root), at(arm.mid), SIZE.upperArm * scale);
    shape(`upperArm${i}`, upper, color, between(arm.root, arm.mid));
    const fore = pill(at(arm.mid), at(arm.end), SIZE.forearm * scale);
    shape(`forearm${i}`, fore, color, between(arm.mid, arm.end) + 0.002);
    hands[i] = relative(arm.end);
  });

  const bar = pose.bar;
  const kind = move.kit.bar;
  if (kind && bar) {
    const along = (z: number) => bar.clone().add(new Vec3(0, 0, z));
    const span = (a: number, b: number) => `M${pt(at(along(a)))}L${pt(at(along(b)))}`;
    // Round things on the bar face along it: circles from the side, lines
    // face on, ellipses between.
    const disc = (z: number, r: number) =>
      ellipse(at(along(z)), r * Math.abs(Math.cos(angle)) * scale, r * scale);
    const cut = (key: string, d: string, depth: number) =>
      cuts.push({ paint: { key, d, stroke: colors.field, width: LINE * scale }, depth });
    const half = kind === "barbell" ? BAR.half : FIXED.half;
    // A bar across the back shows from the shoulders out: whole, it would
    // show through the neck. Held in front, it's whole, and between the
    // hands it cuts across whatever it passes in front of.
    const barDepth = relative(bar);
    const from = barDepth < torsoDepth - 0.01 ? BAR.from : 0;
    if (barDepth > torsoDepth + 0.01) {
      const grips = pose.arms.map((arm) => arm.end.z - bar.z);
      const [lo, hi] = [Math.min(...grips) + SIZE.forearm, Math.max(...grips) - SIZE.forearm];
      if (hi > lo) cut("bar-cut", span(lo, hi), barDepth);
    }
    [1, -1].forEach((s, i) => {
      line(`bar${i}`, span(s * from, s * half), hands[i] - 0.004);
      // A plate, or a fixed bar's end, nearer than the trunk is see-through,
      // with the bar's end a little ring.
      const plate = toward(along(s * (kind === "barbell" ? BAR.plateAt : half)));
      const r = move.kit.plate ?? BAR.plate;
      if (kind === "barbell") line(`plate${i}`, disc(s * BAR.plateAt, r), plate);
      if (plate > torsoDepth) {
        if (kind === "barbell") cut(`plate${i}-cut`, disc(s * BAR.plateAt, r), plate);
        line(`end${i}`, disc(s * half, BAR.end), plate);
        cut(`end${i}-cut`, disc(s * half, BAR.end), plate);
      }
    });
  }

  // Dumbbells: solid, like the body — two round heads and the handle between,
  // the far one in the tint — so a held weight reads at any size.
  const dumbbells = pose.dumbbells ?? [];
  dumbbells.forEach(({ at: middle, axis }, i) => {
    const end = (side: number) => middle.clone().addScaledVector(axis, side * DUMBBELL.headAt);
    const heads = [1, -1].map((side) => polygon(ring(end(side), axis, DUMBBELL.head)));
    const handle = pill(at(end(-1)), at(end(1)), DUMBBELL.handle * scale);
    const color = dumbbells.length === 2 ? colorOf(i) : colors.ink;
    // Over the forearm that holds it.
    const [a, b] = pose.arms;
    const arm = a.end.distanceTo(middle) <= b.end.distanceTo(middle) ? a : b;
    const over = between(arm.mid, arm.end) + 0.003;
    shape(`dumbbell${i}`, heads.join("") + handle, color, Math.max(relative(middle) + 0.01, over));
  });

  // Props: lines, pads and rings in line; balls and kettlebells solid.
  const propCut = (key: string, d: string, depth: number) => {
    if (depth > torsoDepth + 0.01) {
      cuts.push({ paint: { key, d, stroke: colors.field, width: LINE * scale }, depth });
    }
  };
  (pose.props ?? []).forEach((prop, i) => {
    const key = `prop${i}`;
    if (prop.kind === "line") {
      const d = `M${pt(at(prop.from))}L${pt(at(prop.to))}`;
      const depth = between(prop.from, prop.to);
      line(key, d, depth);
      propCut(`${key}-cut`, d, depth);
    } else if (prop.kind === "ring") {
      const d = polygon(ring(prop.at, prop.normal, prop.r));
      const depth = relative(prop.at);
      line(key, d, depth);
      propCut(`${key}-cut`, d, depth);
    } else if (prop.kind === "pad") {
      const along = prop.to.clone().sub(prop.from);
      const across = (prop.across ?? new Vec3(0, 0, 1)).clone().normalize();
      const up = prop.up ?? new Vec3().crossVectors(across, along).normalize();
      if (up.y < 0 && !prop.up) up.negate();
      const box: Pt[] = [];
      for (const end of [prop.from, prop.to]) {
        for (const h of [0, -prop.thick]) {
          for (const w of [-prop.half, prop.half]) {
            box.push(at(end.clone().addScaledVector(up, h).addScaledVector(across, w)));
          }
        }
      }
      const d = rounded(hull(box), 0.02 * scale);
      // Behind the body, a pad covers what's behind it; well in front, it's an outline.
      const depth = between(prop.from, prop.to);
      slab(key, d, Math.min(depth, torsoDepth - 0.05));
      if (prop.through) {
        const paint = { key: `${key}-cut`, d, stroke: colors.field, width: LINE * scale };
        cuts.push({ paint, depth: torsoDepth + 0.02 });
      } else if (depth > torsoDepth + 0.15) propCut(`${key}-cut`, d, depth);
    } else if (prop.kind === "ball") {
      shape(key, circle(at(prop.at), prop.r * scale), colors.ink, relative(prop.at) + 0.01);
    } else {
      // The bell, and the handle's loop above it, always seen face on.
      const down = prop.down.clone().normalize();
      const cross = new Vec3().crossVectors(down, toCamera);
      const side = (cross.length() < 1e-3 ? right.clone() : cross).normalize();
      const bell = prop.at.clone().addScaledVector(down, KETTLEBELL.drop);
      const corner = (s: number, h: number) =>
        at(prop.at.clone().addScaledVector(side, s * KETTLEBELL.wide).addScaledVector(down, h));
      const r = KETTLEBELL.handle * scale;
      const handle =
        pill(corner(-1, 0), corner(1, 0), r) +
        pill(corner(-1, 0), corner(-1, KETTLEBELL.drop), r) +
        pill(corner(1, 0), corner(1, KETTLEBELL.drop), r);
      const d = circle(at(bell), KETTLEBELL.bell * scale) + handle;
      shape(key, d, colors.ink, relative(bell) + 0.01);
    }
  });

  // A bench: its pad in outline over the field, two legs, a rail on the floor.
  const bench = move.kit.bench;
  if (bench) {
    const under = bench.top - bench.pad;
    const box: Pt[] = [];
    for (const x of [bench.from, bench.to]) {
      for (const y of [under, bench.top]) {
        for (const z of [-bench.half, bench.half]) box.push(at(new Vec3(x, y, z)));
      }
    }
    slab("pad", rounded(hull(box), 0.02 * scale), torsoDepth - 0.05);
    bench.legs.forEach((x, i) => {
      const leg = `M${pt(at(new Vec3(x, under, 0)))}L${pt(at(new Vec3(x, 0, 0)))}`;
      line(`leg${i}`, leg, torsoDepth - 0.06);
    });
    const rail = [bench.from + 0.04, bench.to - 0.04].map((x) => pt(at(new Vec3(x, 0, 0))));
    line("rail", `M${rail[0]}L${rail[1]}`, torsoDepth - 0.06);
  }

  parts.sort((a, b) => a.depth - b.depth);
  // Each cut shows only over the parts behind it.
  const clips: string[] = [];
  const over: Paint[] = [];
  for (const { paint, depth } of cuts) {
    const behind = outlines
      .filter((o) => o.depth < depth)
      .map((o) => o.d)
      .join("");
    if (!behind) continue;
    if (!clips.includes(behind)) clips.push(behind);
    over.push({ ...paint, clip: clips.indexOf(behind) });
  }
  const ground: Paint = {
    key: "floor",
    d: `M0,${f(floorY)}H${f(width)}`,
    stroke: colors.tint,
    width: FLOOR * scale,
  };
  return { paints: [ground, ...parts.flatMap((p) => p.paints), ...over], clips };
}

/** Clear space kept above the highest point, and either side of the widest. */
const HEADROOM = 1.06;
const ELBOW_ROOM = 1.08;
/** How many moments of a rep, and of a turn, are measured. */
const MEASURED = { depths: 8, turns: 3 };

const rooms = new WeakMap<Move, Move["film"]["room"]>();

/**
 * The room a film needs, through every rep and turn: the height of the
 * lifter and whatever they hold or sit on, and the width of everything. A
 * film is drawn this close where its own room (see `Move.film`) leaves the
 * picture empty — never further off — so a wall, a tower or a cable may run
 * out of the top, as they run out of sight in a gym. Measured once, when the
 * film is first drawn.
 */
function neededBy(move: Move) {
  const known = rooms.get(move);
  if (known) return known;
  const { middle, views } = move.film;
  let top = 0;
  let reach = 0;
  const measure = (depth: number, turn: number) => {
    const pose = move.pose(depth);
    const angle = (turn * Math.PI) / 180;
    const right = new Vec3(Math.cos(angle), 0, -Math.sin(angle));
    /** Something round `v`, `r` across; `high`: it counts for the height too. */
    const hold = (v: Vec3, r = 0, high = true) => {
      reach = Math.max(reach, Math.abs(v.clone().sub(middle).dot(right)) + r);
      if (high) top = Math.max(top, v.y + r);
    };
    const offset = (v: Vec3, along: Vec3, by: number) => v.clone().addScaledVector(along, by);
    hold(pose.head, SIZE.head);
    const shoulders = offset(pose.pelvis, pose.trunk, BODY.torso + SIZE.trunk.up);
    for (const s of SIDES) hold(offset(shoulders, pose.across, s * SIZE.trunk.front));
    hold(offset(pose.pelvis, pose.trunk, SIZE.trunk.down));
    for (const leg of pose.legs) {
      for (const joint of [leg.root, leg.mid, leg.end]) hold(joint, SIZE.thigh);
      hold(offset(leg.end, leg.foot, FOOT.long), FOOT.half);
    }
    for (const arm of pose.arms) {
      for (const joint of [arm.root, arm.mid, arm.end]) hold(joint, SIZE.upperArm);
    }
    for (const { at, axis } of pose.dumbbells ?? []) {
      for (const s of SIDES) hold(offset(at, axis, s * DUMBBELL.headAt), DUMBBELL.head);
    }
    const kind = move.kit.bar;
    if (kind && pose.bar) {
      const z = new Vec3(0, 0, 1);
      for (const s of SIDES) {
        hold(offset(pose.bar, z, s * (kind === "barbell" ? BAR.half : FIXED.half)), BAR.end);
        if (kind === "barbell") {
          const plate = offset(pose.bar, z, s * BAR.plateAt);
          const r = move.kit.plate ?? BAR.plate;
          hold(plate, r * Math.abs(Math.cos(angle)));
          hold(offset(plate, UP, r));
        }
      }
    }
    for (const prop of pose.props ?? []) {
      if (prop.kind === "line") {
        hold(prop.from, 0, false);
        hold(prop.to, 0, false);
      } else if (prop.kind === "pad") {
        // A pad as tall as the lifter is a wall: it may run out of the top.
        const wall = Math.abs(prop.to.y - prop.from.y) > 1.2;
        hold(prop.from, prop.thick, !wall);
        hold(prop.to, prop.thick, !wall);
      } else if (prop.kind === "kettlebell") {
        hold(offset(prop.at, prop.down.clone().normalize(), KETTLEBELL.drop), KETTLEBELL.bell);
      } else hold(prop.at, prop.r);
    }
    const bench = move.kit.bench;
    if (bench) for (const x of [bench.from, bench.to]) hold(new Vec3(x, bench.top, 0));
  };
  views.forEach((view, i) => {
    for (let k = 0; k <= MEASURED.depths; k++) measure(k / MEASURED.depths, view);
    // Turning to the next view, at the start of the rep.
    const next = views[(i + 1) % views.length];
    for (let k = 1; k < MEASURED.turns; k++) {
      measure(0, view + ((next - view) * k) / MEASURED.turns);
    }
  });
  const needed = { height: top * HEADROOM, width: 2 * reach * ELBOW_ROOM };
  rooms.set(move, needed);
  return needed;
}

// Every outline runs clockwise on screen, so any of them in one path still
// fill as their union — an outline for clipping.

const pt = ([x, y]: Pt) => `${f(x)},${f(y)}`;

function circle(c: Pt, r: number) {
  return ellipse(c, r, r);
}

function ellipse([x, y]: Pt, rx: number, ry: number) {
  // Edge on, a line: an arc between two points that round to the same one
  // isn't drawn at all.
  if (rx < 0.5) return `M${f(x)},${f(y - ry)}L${f(x)},${f(y + ry)}`;
  const arc = `A${f(rx)},${f(ry)} 0 1 1 `;
  return `M${f(x + rx)},${f(y)}${arc}${f(x - rx)},${f(y)}${arc}${f(x + rx)},${f(y)}Z`;
}

/** A bar of even width with round ends, from a to b. */
function pill(a: Pt, b: Pt, r: number) {
  const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
  if (length < 1e-6) return circle(a, r);
  const nx = ((b[1] - a[1]) / length) * r;
  const ny = (-(b[0] - a[0]) / length) * r;
  const arc = `A${f(r)},${f(r)} 0 0 1 `;
  return (
    `M${f(a[0] + nx)},${f(a[1] + ny)}L${f(b[0] + nx)},${f(b[1] + ny)}` +
    `${arc}${f(b[0] - nx)},${f(b[1] - ny)}L${f(a[0] - nx)},${f(a[1] - ny)}` +
    `${arc}${f(a[0] + nx)},${f(a[1] + ny)}Z`
  );
}

function clockwise(points: Pt[]) {
  let area = 0;
  points.forEach(([x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length];
    area += x * ny - nx * y;
  });
  return area >= 0 ? points : [...points].reverse();
}

function polygon(points: Pt[]) {
  return `M${clockwise(points).map(pt).join("L")}Z`;
}

/** A polygon with each corner rounded off. */
function rounded(points: Pt[], r: number) {
  const ps = clockwise(points);
  let d = "";
  ps.forEach((p, i) => {
    const unit = (q: Pt): Pt => {
      const l = Math.hypot(q[0] - p[0], q[1] - p[1]) || 1;
      return [(q[0] - p[0]) / l, (q[1] - p[1]) / l];
    };
    const ua = unit(ps[(i + ps.length - 1) % ps.length]);
    const ub = unit(ps[(i + 1) % ps.length]);
    const halfAngle = Math.acos(clamp(ua[0] * ub[0] + ua[1] * ub[1], -1, 1)) / 2;
    const t = r / Math.tan(halfAngle);
    const a: Pt = [p[0] + ua[0] * t, p[1] + ua[1] * t];
    const b: Pt = [p[0] + ub[0] * t, p[1] + ub[1] * t];
    d += `${i === 0 ? "M" : "L"}${pt(a)}Q${pt(p)} ${pt(b)}`;
  });
  return `${d}Z`;
}

/** The smallest convex outline round some points. */
function hull(points: Pt[]) {
  const sorted = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const turn = (o: Pt, a: Pt, b: Pt) =>
    (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const chain = (ps: Pt[]) => {
    const out: Pt[] = [];
    for (const p of ps) {
      while (out.length >= 2 && turn(out[out.length - 2], out[out.length - 1], p) <= 0) out.pop();
      out.push(p);
    }
    return out.slice(0, -1);
  };
  return [...chain(sorted), ...chain(sorted.reverse())];
}

/** `a` laid over `b` at `share`, as an opaque hex colour. */
export function mix(a: string, b: string, share: number) {
  const ch = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  const out = [0, 1, 2].map((i) => Math.round(ch(a, i) * share + ch(b, i) * (1 - share)));
  return `#${out.map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}
