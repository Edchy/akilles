/**
 * The figure on its stage: our little friend, drawn live, ink on paper.
 *
 * One model with a skeleton inside (model.ts) and each move as poses over a
 * rep (moves.ts): the phone draws every frame, so any side can be seen and
 * nothing is a video. The ink outline is a copy of the body a hair larger,
 * turned inside out and drawn in ink behind it — part of the model, so it
 * never wobbles the way a traced line does.
 *
 * Plain three.js: the app hands it an expo-gl context, a test page a canvas.
 */
import * as THREE from "three";

import { flatHand, gripHand, kitParts, stretches, type KitPiece, type Part } from "./kit";
import { MODEL, MODEL_DATA } from "./model";
import { MOVE_SAMPLES } from "./moves";

export type FigureMove = keyof typeof MOVE_SAMPLES;
export const FIGURE_MOVES = Object.keys(MOVE_SAMPLES) as FigureMove[];

export type StageColors = { paper: string; ink: string; shadow: string; glow: string };

/** How thick the ink is, in metres on the figure. */
const LINE = 0.0085;

// ---------------------------------------------------------------- the model

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** Base64 to bytes, without leaning on atob being there. */
export function decode(text: string): Uint8Array {
  const lookup = new Uint8Array(128);
  for (let i = 0; i < B64.length; i++) lookup[B64.charCodeAt(i)] = i;
  const pad = text.endsWith("==") ? 2 : text.endsWith("=") ? 1 : 0;
  const out = new Uint8Array((text.length * 3) / 4 - pad);
  let o = 0;
  for (let i = 0; i < text.length; i += 4) {
    const n =
      (lookup[text.charCodeAt(i)] << 18) |
      (lookup[text.charCodeAt(i + 1)] << 12) |
      (lookup[text.charCodeAt(i + 2)] << 6) |
      lookup[text.charCodeAt(i + 3)];
    if (o < out.length) out[o++] = (n >> 16) & 255;
    if (o < out.length) out[o++] = (n >> 8) & 255;
    if (o < out.length) out[o++] = n & 255;
  }
  return out;
}

/** The body's shape, read once and shared by every stage. */
let shape: THREE.BufferGeometry | null = null;
function bodyShape(): THREE.BufferGeometry {
  if (shape) return shape;
  const bytes = decode(MODEL_DATA);
  const n = MODEL.vertices;
  const take = (from: number, length: number) => bytes.slice(from, from + length).buffer;
  let at = 0;
  const packed = new Int16Array(take(at, n * 6));
  at += n * 6;
  const position = new Float32Array(n * 3);
  for (let i = 0; i < position.length; i++) position[i] = (packed[i] * MODEL.span) / 32767;
  const normal = new Int8Array(take(at, n * 3));
  at += n * 3;
  const skinIndex = new Uint8Array(take(at, n * 4));
  at += n * 4;
  const skinWeight = new Uint8Array(take(at, n * 4));
  at += n * 4;
  const index = MODEL.wide
    ? new Uint32Array(take(at, MODEL.indices * 4))
    : new Uint16Array(take(at, MODEL.indices * 2));

  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(position, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(normal, 3, true));
  g.setAttribute("skinIndex", new THREE.BufferAttribute(skinIndex, 4));
  g.setAttribute("skinWeight", new THREE.BufferAttribute(skinWeight, 4, true));
  g.setIndex(new THREE.BufferAttribute(index, 1));
  MODEL.groups.forEach((group, i) => g.addGroup(group.start, group.count, i));
  shape = g;
  return g;
}

/** Ink behind the body: the same shape pushed out along its normals, inside out. */
function inkLine(color: string, skinned: boolean, muscles?: object): THREE.Material {
  const m = new THREE.MeshBasicMaterial({ color, side: THREE.BackSide });
  m.onBeforeCompile = (shader) => {
    if (muscles) withMuscles(shader, muscles);
    shader.uniforms.line = { value: LINE };
    shader.vertexShader =
      "uniform float line;\n" +
      shader.vertexShader.replace(
        "#include <skinning_vertex>",
        `#include <skinning_vertex>\ntransformed += normalize(${skinned ? "objectNormal" : "normal"}) * line;`,
      );
  };
  return m;
}

// ---------------------------------------------------------------- the muscles

/**
 * The muscles a move works glow softly red, and swell a hair as they work (or,
 * in a stretch, the muscle being stretched). Each is a few capsules round the
 * resting body: a line, how far round it reaches, and which way it faces (a
 * lat is on the back, a biceps the front). "quads_L" is one side only.
 */
type Capsule = { a: THREE.Vector3; b: THREE.Vector3; radius: number; facing?: THREE.Vector3 };
type Muscle =
  | "lats" | "upper_back" | "biceps" | "forearms" | "chest" | "triceps" | "shoulders" | "rear_delts"
  | "abs" | "erectors" | "glutes" | "hamstrings" | "quads" | "hip_flexors";
type MuscleKey = Muscle | `${Muscle}_L` | `${Muscle}_R`;

const MOVE_MUSCLES: Record<FigureMove, Partial<Record<MuscleKey, number>>> = {
  pullup: { lats: 1, upper_back: 0.8, biceps: 0.7, forearms: 0.4 },
  push_up: { chest: 1, triceps: 0.8, shoulders: 0.6, abs: 0.4 },
  goblet_squat: { quads: 1, glutes: 0.9, abs: 0.4 },
  deadlift: { glutes: 1, hamstrings: 0.9, erectors: 0.8, quads: 0.5, forearms: 0.3 },
  kb_swing: { glutes: 1, hamstrings: 0.9, erectors: 0.5, abs: 0.4 },
  lat_pulldown: { lats: 1, upper_back: 0.7, biceps: 0.6, forearms: 0.3 },
  band_pull_apart: { rear_delts: 1, upper_back: 0.9 },
  couch: { hip_flexors_L: 1, quads_L: 0.8, glutes_L: 0.5 },
};

function musclesAt(): Record<Muscle, (Capsule & { side?: "L" | "R" })[]> {
  const at = (name: string) => {
    const b = MODEL.bones.find((x) => x.name === name)!;
    return new THREE.Vector3(b.head[0], b.head[1], b.head[2]);
  };
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const along = (a: THREE.Vector3, b: THREE.Vector3, t: number) => a.clone().lerp(b, t);
  const chest = at("chest");
  const top = at("clavL"); // the top of the chest, between the shoulders
  const hips = at("hips");
  const front = v(0, 0, 1);
  const back = v(0, 0, -1);
  const sides = (["L", "R"] as const).map((side) => ({
    side,
    sign: side === "L" ? 1 : -1,
    shoulder: at(`upper${side}`),
    elbow: at(`fore${side}`),
    wrist: at(`hand${side}`),
    hip: at(`thigh${side}`),
    knee: at(`shin${side}`),
  }));
  const each = (f: (s: (typeof sides)[number]) => Capsule) => sides.map((s) => ({ ...f(s), side: s.side }));
  const thigh = (s: (typeof sides)[number], z: number) => [along(s.hip, s.knee, 0.15).add(v(0, 0, z)), along(s.hip, s.knee, 0.88).add(v(0, 0, z))];
  return {
    lats: each(({ sign, shoulder }) => ({
      a: v(shoulder.x * 0.72, top.y - 0.07, -0.055),
      b: v(shoulder.x * 0.42, hips.y + 0.13, -0.06),
      radius: 0.085,
      facing: v(sign * 0.6, 0, -1).normalize(),
    })),
    upper_back: [{ a: v(0, top.y, -0.075), b: v(0, chest.y - 0.04, -0.075), radius: 0.075, facing: back }],
    biceps: each(({ shoulder, elbow }) => ({ a: along(shoulder, elbow, 0.18), b: along(shoulder, elbow, 0.85), radius: 0.05, facing: front })),
    triceps: each(({ shoulder, elbow }) => ({ a: along(shoulder, elbow, 0.2), b: along(shoulder, elbow, 0.9), radius: 0.05, facing: back })),
    forearms: each(({ elbow, wrist }) => ({ a: along(elbow, wrist, 0.1), b: along(elbow, wrist, 0.85), radius: 0.045 })),
    shoulders: each(({ sign, shoulder, elbow }) => ({
      a: shoulder.clone().add(v(0, 0, 0.02)), b: along(shoulder, elbow, 0.25).add(v(0, 0, 0.02)), radius: 0.06,
      facing: v(sign * 0.4, 0, 1).normalize(),
    })),
    rear_delts: each(({ sign, shoulder, elbow }) => ({
      a: shoulder.clone().add(v(0, 0, -0.02)), b: along(shoulder, elbow, 0.25).add(v(0, 0, -0.02)), radius: 0.06,
      facing: v(sign * 0.4, 0, -1).normalize(),
    })),
    chest: each(({ shoulder }) => ({
      a: v(shoulder.x * 0.2, top.y - 0.05, 0.08), b: v(shoulder.x * 0.75, top.y - 0.06, 0.07), radius: 0.07, facing: front,
    })),
    abs: [{ a: v(0, chest.y - 0.03, 0.09), b: v(0, hips.y + 0.03, 0.09), radius: 0.08, facing: front }],
    erectors: [{ a: v(0, chest.y, -0.08), b: v(0, hips.y + 0.05, -0.08), radius: 0.065, facing: back }],
    glutes: each(({ hip }) => ({ a: v(hip.x * 0.85, hips.y - 0.02, -0.06), b: v(hip.x * 1.05, hips.y - 0.13, -0.05), radius: 0.085, facing: back })),
    hamstrings: each((s) => { const [a, b] = thigh(s, -0.03); return { a, b, radius: 0.07, facing: back }; }),
    quads: each((s) => { const [a, b] = thigh(s, 0.035); return { a, b, radius: 0.075, facing: front }; }),
    hip_flexors: each(({ hip, knee }) => ({
      a: v(hip.x * 0.8, hips.y, 0.07), b: along(hip, knee, 0.35).add(v(0, 0, 0.06)), radius: 0.06, facing: front,
    })),
  };
}

const MAX_CAPSULES = 12;

/** Uniforms shared by the body and its ink, so both swell together. */
function muscleUniforms(move: FigureMove) {
  const places = musclesAt();
  const list = (Object.entries(MOVE_MUSCLES[move]) as [MuscleKey, number][])
    .flatMap(([key, weight]) => {
      const [muscle, only] = key.split("_").length > 1 && /_(L|R)$/.test(key)
        ? [key.slice(0, -2) as Muscle, key.slice(-1)]
        : [key as Muscle, undefined];
      return places[muscle].filter((c) => !only || c.side === only).map((c) => ({ ...c, weight }));
    })
    .slice(0, MAX_CAPSULES);
  const pad = <T,>(items: T[], empty: T) => [...items, ...Array(MAX_CAPSULES - items.length).fill(empty)];
  return {
    mA: { value: pad(list.map((c) => c.a), new THREE.Vector3()) },
    mB: { value: pad(list.map((c) => c.b), new THREE.Vector3(0, 1, 0)) },
    mF: {
      value: pad(
        list.map((c) => (c.facing ? new THREE.Vector4(c.facing.x, c.facing.y, c.facing.z, 1) : new THREE.Vector4())),
        new THREE.Vector4(),
      ),
    },
    mR: { value: pad(list.map((c) => c.radius), 1) },
    mW: { value: pad(list.map((c) => c.weight), 0) },
    working: { value: 0 },
    swell: { value: 0 },
  };
}

const MUSCLE_GLSL = `
uniform vec3 mA[${MAX_CAPSULES}];
uniform vec3 mB[${MAX_CAPSULES}];
uniform vec4 mF[${MAX_CAPSULES}];
uniform float mR[${MAX_CAPSULES}];
uniform float mW[${MAX_CAPSULES}];
uniform float working;
uniform float swell;
float muscleAt(vec3 p, vec3 n) {
  float g = 0.0;
  for (int i = 0; i < ${MAX_CAPSULES}; i++) {
    if (mW[i] <= 0.0) continue;
    vec3 ab = mB[i] - mA[i];
    float t = clamp(dot(p - mA[i], ab) / dot(ab, ab), 0.0, 1.0);
    float d = length(p - (mA[i] + ab * t)) / mR[i];
    float m = 1.0 - smoothstep(0.45, 1.0, d);
    if (mF[i].w > 0.0) m *= smoothstep(-0.15, 0.5, dot(n, mF[i].xyz));
    g = max(g, m * mW[i]);
  }
  return g;
}
`;

/** Where muscles work, the body swells a little; the ink follows it. */
function withMuscles(shader: THREE.WebGLProgramParametersWithUniforms, uniforms: object, glow?: string) {
  Object.assign(shader.uniforms, uniforms);
  // The swell is per point of the body; the glow is worked out for every
  // pixel, from where that pixel sits on the resting body, so it is smooth.
  shader.vertexShader =
    MUSCLE_GLSL +
    (glow ? "varying vec3 vRest;\nvarying vec3 vRestNormal;\n" : "") +
    shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
transformed += normalize(normal) * swell * muscleAt(position, normalize(normal));
${glow ? "vRest = position;\nvRestNormal = normal;" : ""}`,
    );
  if (glow) {
    shader.uniforms.glow = { value: new THREE.Color(glow) };
    shader.fragmentShader =
      MUSCLE_GLSL +
      "uniform vec3 glow;\nvarying vec3 vRest;\nvarying vec3 vRestNormal;\n" +
      shader.fragmentShader.replace(
        "#include <color_fragment>",
        `#include <color_fragment>
float lit = clamp(muscleAt(vRest, normalize(vRestNormal)) * working, 0.0, 1.0);
diffuseColor.rgb = mix(diffuseColor.rgb, glow, lit * 0.75);`,
      );
  }
}

// ---------------------------------------------------------------- a rep

type Move = (typeof MOVE_SAMPLES)[FigureMove];

/** Where in the rep, 0 to 1, at a time in seconds: the move's phases, eased. */
function rhythm(move: Move, time: number): number {
  const { start, phases } = move.rhythm;
  const total = phases.reduce((sum, [seconds]) => sum + seconds, 0);
  let t = time % total;
  let from: number = start;
  for (const [seconds, to] of phases) {
    if (t < seconds) {
      const x = t / seconds;
      return from + (to - from) * x * x * (3 - 2 * x);
    }
    t -= seconds;
    from = to;
  }
  return from;
}

// ---------------------------------------------------------------- the stage

export type Stage = {
  /** Draw the moment `time` seconds in, seen from `yaw` radians round the figure (0 is the front). */
  render: (
    renderer: THREE.WebGLRenderer,
    time: number,
    yaw: number,
    /** A closer look, for checking: where to look and from how far. */
    close?: { at: [number, number, number]; distance: number },
  ) => void;
  resize: (aspect: number) => void;
  dispose: () => void;
};

export function createStage(name: FigureMove, colors: StageColors, aspect: number): Stage {
  const move = MOVE_SAMPLES[name];
  const scene = new THREE.Scene();
  const geometry = bodyShape();
  const paper = new THREE.MeshBasicMaterial({ color: colors.paper });
  const ink = new THREE.MeshBasicMaterial({ color: colors.ink });
  const line = inkLine(colors.ink, false);
  const muscles = muscleUniforms(name);
  const skin = new THREE.MeshBasicMaterial({ color: colors.paper });
  skin.onBeforeCompile = (shader) => withMuscles(shader, muscles, colors.glow);
  const made: THREE.BufferGeometry[] = [];

  /** Parts as paper with an ink line, or solid ink. */
  const draw = (parts: Part[]) => {
    const group = new THREE.Group();
    for (const { geometry: g, ink: solid } of parts) {
      made.push(g);
      if (solid) group.add(new THREE.Mesh(g, ink));
      else group.add(new THREE.Mesh(g, paper), new THREE.Mesh(g, line));
    }
    return group;
  };

  // The skeleton, in its resting pose: no bone turned, each where it sits.
  const bones = MODEL.bones.map(() => new THREE.Bone());
  const heads: readonly (readonly number[])[] = MODEL.bones.map((b) => b.head);
  MODEL.bones.forEach((b, i) => {
    const parent = b.parent >= 0 ? heads[b.parent] : [0, 0, 0];
    bones[i].position.set(b.head[0] - parent[0], b.head[1] - parent[1], b.head[2] - parent[2]);
    if (b.parent >= 0) bones[b.parent].add(bones[i]);
  });
  const root = bones[0];
  const skeleton = new THREE.Skeleton(bones);

  const body = new THREE.SkinnedMesh(geometry, [skin, ink, ink]);
  body.add(root);
  body.updateMatrixWorld(true);
  body.bind(skeleton);
  const outline = new THREE.SkinnedMesh(geometry, inkLine(colors.ink, true, muscles));
  outline.bind(skeleton, body.matrixWorld);
  body.frustumCulled = outline.frustumCulled = false;
  scene.add(body, outline);

  // The hands: clean mittens on the hand bones, each in its own frame.
  (["L", "R"] as const).forEach((side) => {
    const bone = bones[MODEL.bones.findIndex((b) => b.name === `hand${side}`)];
    const f = MODEL.hands[side];
    const spec = move.hands[side];
    const hand = draw(spec.shape === "grip" ? gripHand(spec.rod) : flatHand());
    hand.matrixAutoUpdate = false;
    hand.matrix.makeBasis(
      new THREE.Vector3(f[0], f[1], f[2]),
      new THREE.Vector3(f[3], f[4], f[5]),
      new THREE.Vector3(f[6], f[7], f[8]),
    );
    bone.add(hand);
  });

  const mix = (a: readonly number[], b: readonly number[], f: number, i: number) => a[i] + (b[i] - a[i]) * f;
  const qa = new THREE.Quaternion();
  const qb = new THREE.Quaternion();

  // The equipment: still pieces placed once, moving ones every frame.
  const moving: { group: THREE.Group; stretch: boolean }[] = [];
  for (const piece of move.kit as readonly (KitPiece & { at?: readonly number[] })[]) {
    const group = draw(kitParts(piece));
    if (piece.at) place(group, piece.at, false);
    else moving.push({ group, stretch: stretches(piece.kind) });
    scene.add(group);
  }

  // A soft shadow on the floor.
  const [sx, sz, rx, rz] = move.shadow;
  const floor = new THREE.Mesh(new THREE.CircleGeometry(1, 48), new THREE.MeshBasicMaterial({ color: colors.shadow }));
  floor.rotation.x = -Math.PI / 2;
  floor.scale.set(rx, rz, 1);
  floor.position.set(sx, 0.001, sz);
  scene.add(floor);

  const camera = new THREE.PerspectiveCamera(22, aspect, 0.1, 50);
  const target = new THREE.Vector3(...move.view.centre);
  let distance = 6;
  const fit = (a: number) => {
    camera.aspect = a;
    camera.updateProjectionMatrix();
    const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    // All of it in view, from any side: its height, and how far round it reaches.
    distance = Math.max(move.view.half / half, move.view.radius / (half * a)) * 1.04;
  };
  fit(aspect);

  const samples = move.samples;
  const world = bones.map(() => new THREE.Quaternion());
  const inverse = new THREE.Quaternion();

  function place(group: THREE.Object3D, t: readonly number[], stretch: boolean, t2?: readonly number[], f = 0) {
    const b = t2 ?? t;
    group.position.set(mix(t, b, f, 0), mix(t, b, f, 1), mix(t, b, f, 2));
    qa.fromArray(t, 3);
    qb.fromArray(b, 3);
    group.quaternion.slerpQuaternions(qa, qb, f);
    if (stretch) group.scale.set(1, mix(t, b, f, 7), 1);
  }

  const pose = (u: number) => {
    const x = Math.min(Math.max(u, 0), 1) * (samples.length - 1);
    const i = Math.min(Math.floor(x), samples.length - 2);
    const f = x - i;
    const a = samples[i];
    const b = samples[i + 1];
    root.position.set(mix(a.root, b.root, f, 0), mix(a.root, b.root, f, 1), mix(a.root, b.root, f, 2));
    MODEL.bones.forEach((bone, k) => {
      qa.fromArray(a.q, k * 4);
      qb.fromArray(b.q, k * 4);
      world[k].slerpQuaternions(qa, qb, f);
      if (bone.parent < 0) bones[k].quaternion.copy(world[k]);
      else bones[k].quaternion.copy(inverse.copy(world[bone.parent]).invert().multiply(world[k]));
    });
    moving.forEach(({ group, stretch }, k) => place(group, a.k[k], stretch, b.k[k], f));
  };

  const tilt = THREE.MathUtils.degToRad(7);
  return {
    render(renderer, time, yaw, close) {
      const u = rhythm(move, time);
      pose(u);
      // Working all through the rep, hardest at its working end; a swell of a few millimetres.
      muscles.working.value = 0.35 + 0.65 * u;
      muscles.swell.value = 0.006 * u;
      const look = close ? new THREE.Vector3(...close.at) : target;
      const far = close?.distance ?? distance;
      camera.position.set(
        look.x + Math.sin(yaw) * Math.cos(tilt) * far,
        look.y + Math.sin(tilt) * far,
        look.z + Math.cos(yaw) * Math.cos(tilt) * far,
      );
      camera.lookAt(look);
      renderer.render(scene, camera);
    },
    resize: fit,
    dispose() {
      made.forEach((g) => g.dispose());
      floor.geometry.dispose();
      (floor.material as THREE.Material).dispose();
      [paper, ink, skin, line, outline.material as THREE.Material].forEach((m) => m.dispose());
    },
  };
}
