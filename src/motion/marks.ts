import { BODY, SIZE } from "@/motion/figure";
import type { Moment } from "@/motion/film";
import type { Move } from "@/motion/moves";
import { Vec3 } from "@/motion/vector";

/**
 * Milo's marks: how a movement's figure is drawn, after the Munich '72
 * pictograms. The pose is true in 3D (see `figure.ts`); the drawing is a flat
 * view of it with every part a plain shape in one ink on the family's field —
 * a circle for the head, the ▽ of the trunk, even bars for the limbs, a
 * quarter-round for each foot. A thin gap of the field round every part keeps
 * the parts apart where they overlap, and the far limbs are a tint of the ink.
 *
 * Equipment is drawn in line, behind the body. A plate the body is behind is
 * see-through instead: an ink line on the field, a cut of the field where it
 * crosses the body — so from the side the bar reads as on the back, where it
 * is, and never hides the lifter.
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
  /** Painted only where it crosses the body (`Drawing.body`). */
  clipped?: boolean;
};

export type Drawing = {
  paints: Paint[];
  /** The body's outline, every part in one path, for clipping. */
  body: string;
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
  const { room, middle } = move.film;
  const scale = Math.min((height * 0.88) / room.height, width / room.width);
  const floorY = Math.min(height * 0.88, (height + room.height * scale) / 2 + height * 0.05);
  const angle = (turn * Math.PI) / 180;
  const toCamera = new Vec3(Math.sin(angle), 0, Math.cos(angle));
  const right = new Vec3(Math.cos(angle), 0, -Math.sin(angle));
  const at = (v: Vec3): Pt => [
    width / 2 + v.clone().sub(middle).dot(right) * scale,
    floorY - v.y * scale,
  ];
  const toward = (v: Vec3) => v.dot(toCamera);

  const parts: { depth: number; paints: Paint[] }[] = [];
  const outlines: string[] = [];
  const cuts: Paint[] = [];
  const shape = (key: string, d: string, fill: string, depth: number) => {
    outlines.push(d);
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
    const side = new Vec3().crossVectors(UP, leg.foot).normalize();
    const floor = new Vec3(leg.end.x, 0, leg.end.z);
    const profile: Pt[] = [[-FOOT.back, 0]];
    for (let k = 0; k <= 16; k++) {
      const t = (k / 16) * (Math.PI / 2);
      profile.push([-FOOT.back + FOOT.long * Math.sin(t), FOOT.high * Math.cos(t)]);
    }
    const foot: Pt[] = [];
    for (const [along, up] of profile) {
      for (const s of [-1, 1]) {
        const v = floor.clone().addScaledVector(leg.foot, along).addScaledVector(UP, up);
        foot.push(at(v.addScaledVector(side, s * FOOT.half)));
      }
    }
    const heel = floor.clone().addScaledVector(leg.foot, 0.06);
    shape(`foot${i}`, polygon(hull(foot)), color, relative(heel));
    const thigh = pill(at(leg.root), at(leg.mid), SIZE.thigh * scale);
    shape(`thigh${i}`, thigh, color, between(leg.root, leg.mid));
    const shin = pill(at(leg.mid), at(leg.end), SIZE.shin * scale);
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
  if (move.kit.bar && bar) {
    const along = (z: number) => bar.clone().add(new Vec3(0, 0, z));
    // Round things on the bar face along it: circles from the side, lines
    // face on, ellipses between.
    const disc = (z: number, r: number) =>
      ellipse(at(along(z)), r * Math.abs(Math.cos(angle)) * scale, r * scale);
    const cut = (key: string, d: string) =>
      cuts.push({ key, d, stroke: colors.field, width: LINE * scale, clipped: true });
    [1, -1].forEach((s, i) => {
      const ends = `M${pt(at(along(s * BAR.from)))}L${pt(at(along(s * BAR.half)))}`;
      line(`bar${i}`, ends, hands[i] - 0.004);
      const plate = toward(along(s * BAR.plateAt));
      line(`plate${i}`, disc(s * BAR.plateAt, BAR.plate), plate);
      if (plate > torsoDepth) {
        cut(`plate${i}-cut`, disc(s * BAR.plateAt, BAR.plate));
        line(`end${i}`, disc(s * BAR.half, BAR.end), plate);
        cut(`end${i}-cut`, disc(s * BAR.half, BAR.end));
      }
    });
  }

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
    line("pad", rounded(hull(box), 0.02 * scale), torsoDepth - 0.05, colors.field);
    bench.legs.forEach((x, i) => {
      const leg = `M${pt(at(new Vec3(x, under, 0)))}L${pt(at(new Vec3(x, 0, 0)))}`;
      line(`leg${i}`, leg, torsoDepth - 0.06);
    });
    const rail = [bench.from + 0.04, bench.to - 0.04].map((x) => pt(at(new Vec3(x, 0, 0))));
    line("rail", `M${rail[0]}L${rail[1]}`, torsoDepth - 0.06);
  }

  parts.sort((a, b) => a.depth - b.depth);
  const ground: Paint = {
    key: "floor",
    d: `M0,${f(floorY)}H${f(width)}`,
    stroke: colors.tint,
    width: FLOOR * scale,
  };
  return { paints: [ground, ...parts.flatMap((p) => p.paints), ...cuts], body: outlines.join("") };
}

// Every outline runs clockwise on screen, so all of them in one path still
// fill as their union — the body's outline for clipping.

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
