const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// The filmed movements are worked out, not drawn: check every one against a
// coach's ranges at many depths, so nothing wrong can reach the screen.
const modules = new Map();
function load(name) {
  if (!name.startsWith("@/")) return require(name);
  const filename = path.resolve(__dirname, "../src", name.slice(2)) + ".ts";
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  vm.runInNewContext(outputText, { module, exports: module.exports, require: load, process, console }, { filename });
  return module.exports;
}

const { BODY, SIZE, anglesOf } = load("@/motion/figure");
const { MOVES } = load("@/motion/moves");
const { filmOf, STILL_SECONDS } = load("@/motion/film");
const { draw } = load("@/motion/marks");

const DEPTHS = Array.from({ length: 41 }, (_, i) => i / 40);
const close = (a, b, tolerance, what) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${what}: ${a.toFixed(4)} is not within ${tolerance} of ${b.toFixed(4)}`);

test("every bone keeps its length at every depth", () => {
  for (const [id, move] of Object.entries(MOVES)) {
    for (const d of DEPTHS) {
      const p = move.pose(d);
      for (const leg of p.legs) {
        close(leg.root.distanceTo(leg.mid), BODY.thigh, 1e-4, `${id} thigh at ${d}`);
        close(leg.mid.distanceTo(leg.end), BODY.shin, 1e-4, `${id} shin at ${d}`);
      }
      for (const arm of p.arms) {
        close(arm.root.distanceTo(arm.mid), BODY.upperArm, 1e-4, `${id} upper arm at ${d}`);
        close(arm.mid.distanceTo(arm.end), BODY.forearm, 1e-4, `${id} forearm at ${d}`);
      }
    }
  }
});

test("the back squat: feet flat, bar over mid-foot, knees over the toes", () => {
  const squat = MOVES.back_squat;
  const start = squat.pose(0);
  for (const d of DEPTHS) {
    const p = squat.pose(d);
    p.legs.forEach((leg, i) => {
      // The feet never move.
      close(leg.end.distanceTo(start.legs[i].end), 0, 1e-9, `ankle ${i} at ${d}`);
      // Once bent, the knee is over the line of the foot, seen from above:
      // it neither caves in nor bows out.
      const knee = leg.mid.clone().sub(leg.end).setY(0);
      if (knee.dot(leg.foot) > 0.1) {
        const off = knee.clone().addScaledVector(leg.foot, -knee.dot(leg.foot)).length();
        assert.ok(off < 0.035, `knee ${i} at ${d} is ${(off * 100).toFixed(1)} cm off the line of its foot`);
      }
    });
    // The bar goes straight up and down over the middle of the foot.
    const midFoot = ((BODY.toe - BODY.heel) / 2) * Math.cos((20 * Math.PI) / 180);
    close(p.bar.x, midFoot, 0.005, `bar over mid-foot at ${d}`);

    const a = anglesOf(p);
    assert.ok(a.lean <= 45, `trunk leans ${a.lean.toFixed(1)}° at ${d}`);
    a.knees.forEach((k) => assert.ok(k <= 140, `knee bends ${k.toFixed(1)}° at ${d}`));
    a.hips.forEach((h) => assert.ok(h <= 130, `hip bends ${h.toFixed(1)}° at ${d}`));
    a.ankles.forEach((k) => assert.ok(k <= 40, `shin leans ${k.toFixed(1)}° at ${d}`));
  }

  const top = anglesOf(start);
  assert.ok(top.lean < 12, `standing, the trunk leans ${top.lean.toFixed(1)}°`);
  top.knees.forEach((k) => assert.ok(k < 8, `standing, a knee is bent ${k.toFixed(1)}°`));

  // Just below parallel: the hip joints under the knees.
  const bottom = squat.pose(1);
  bottom.legs.forEach((leg) => assert.ok(leg.root.y < leg.mid.y, "the bottom is above parallel"));
});

test("the bench press: arched on the bench, forearms upright, elbows at 45°", () => {
  const bench = MOVES.bench;
  const pad = bench.kit.bench.top;
  const T = SIZE.trunk;
  const start = bench.pose(0);
  for (const d of DEPTHS) {
    const p = bench.pose(d);
    p.legs.forEach((leg, i) => {
      close(leg.end.distanceTo(start.legs[i].end), 0, 1e-9, `ankle ${i} at ${d}`);
    });
    anglesOf(p).knees.forEach((k) => assert.ok(k > 70 && k < 110, `a knee bends ${k.toFixed(1)}°`));
    // The seat, the upper back and the head on the bench; the lower back off it.
    close(p.pelvis.y - SIZE.thigh, pad, 1e-6, `the seat at ${d}`);
    const shoulders = p.pelvis.clone().addScaledVector(p.trunk, BODY.torso);
    const back = shoulders.clone().addScaledVector(p.trunk, T.up).addScaledVector(p.forward, -T.side);
    const into = (pad - back.y) * 100;
    assert.ok(into >= 0 && into < 8, `the upper back at ${d} is ${into.toFixed(1)} cm into the pad`);
    close(p.head.y - SIZE.head, pad, 1e-6, `the head at ${d}`);
    p.arms.forEach((arm, i) => close(arm.mid.x, arm.end.x, 1e-3, `forearm ${i} upright at ${d}`));
    assert.ok(p.arch >= 0.05, `the lower back at ${d} is only ${p.arch.toFixed(3)} m off the pad`);
  }

  // The top: arms straight, the bar over the shoulder joints.
  const top = bench.pose(0);
  const shoulders = top.pelvis.clone().addScaledVector(top.trunk, BODY.torso);
  close(top.bar.x, shoulders.x, 1e-6, "the bar over the shoulders at the top");
  for (const arm of top.arms) {
    close(arm.root.distanceTo(arm.end), BODY.upperArm + BODY.forearm, 0.01, "arms straight at the top");
  }

  // The bottom: the bar on the low chest, the forearms upright under it, the
  // elbows 45° from the sides.
  const bottom = bench.pose(1);
  bottom.arms.forEach((arm, i) => {
    close(arm.mid.x, arm.end.x, 1e-3, `forearm ${i} upright, seen from the side`);
    close(arm.mid.z, arm.end.z, 1e-3, `forearm ${i} upright, seen from the feet`);
    const out = Math.abs(arm.mid.z - arm.root.z);
    const tuck = (Math.atan2(out, arm.mid.x - arm.root.x) * 180) / Math.PI;
    assert.ok(Math.abs(tuck - 45) < 2, `elbow ${i} is ${tuck.toFixed(0)}° from the side`);
  });
  const low = bottom.bar.x - shoulders.x;
  assert.ok(low > 0.12 && low < 0.25, `the bar touches ${(low * 100).toFixed(0)} cm below the shoulders`);
  const corner = shoulders.clone().addScaledVector(bottom.trunk, T.up).addScaledVector(bottom.forward, T.side);
  const point = bottom.pelvis
    .clone()
    .addScaledVector(bottom.trunk, T.down)
    .addScaledVector(bottom.forward, bottom.arch);
  const chest = corner.y + ((point.y - corner.y) * (bottom.bar.x - corner.x)) / (point.x - corner.x);
  close(bottom.bar.y - chest, 0.022, 1e-3, "the bar resting on the chest");
});

const FILMS = Object.entries(MOVES).map(([id, move]) => {
  const film = filmOf(move.film.views);
  const moments = Array.from({ length: 400 }, (_, i) => film.momentAt((i / 400) * film.seconds));
  return { id, move, film, moments };
});

test("each film loops without a seam, standing in its first view", () => {
  for (const { id, move, film } of FILMS) {
    const first = move.film.views[0];
    assert.deepEqual({ ...film.momentAt(0) }, { depth: 0, turn: first });
    const end = film.momentAt(film.seconds - 1e-6);
    close(end.depth, 0, 1e-3, `${id}: the depth at the end`);
    close(end.turn, first, 1e-3, `${id}: the turn at the end`);
  }
});

test("each film shows the bottom from every view, and turns only standing", () => {
  assert.deepEqual([...MOVES.back_squat.film.views], [0, 90]);
  for (const { id, move, film, moments } of FILMS) {
    const views = move.film.views;
    for (const v of views) {
      assert.ok(moments.some((m) => m.turn === v && m.depth === 1), `${id}: the bottom at ${v}°`);
    }
    for (const m of moments) {
      if (views.includes(m.turn)) continue;
      assert.equal(m.depth, 0, `${id}: turning ${m.turn.toFixed(0)}° mid-rep`);
    }
    assert.deepEqual({ ...film.momentAt(STILL_SECONDS) }, { depth: 1, turn: views[0] });
  }
});

const COLORS = { field: "#F08A24", ink: "#13325B", tint: "#8A5E40" };

test("every moment of every film draws: a body, and no part lost", () => {
  for (const { id, move, moments } of FILMS) {
    for (const m of moments) {
      const { paints, body } = draw(move, m, COLORS, { width: 360, height: 240 });
      const at = `${id} at depth ${m.depth.toFixed(2)}, turn ${m.turn.toFixed(0)}°`;
      for (const p of paints) assert.ok(!/NaN|Infinity/.test(p.d), `${p.key} of ${at}: ${p.d}`);
      assert.ok(body.length > 0, at);
      const keys = paints.map((p) => p.key);
      for (const part of ["torso", "head", "thigh0", "shin1", "foot0", "upperArm1", "forearm0"]) {
        assert.ok(keys.includes(part), `${part} missing from ${at}`);
      }
      assert.equal(new Set(keys).size, keys.length, `a key twice in ${at}`);
    }
  }
});

test("from the side, the near plate shows through the body", () => {
  for (const id of ["back_squat", "bench"]) {
    const bottom = { depth: 1, turn: 0 };
    const { paints } = draw(MOVES[id], bottom, COLORS, { width: 360, height: 240 });
    const cuts = paints.filter((p) => p.clipped).map((p) => p.key);
    assert.deepEqual([...cuts].sort(), ["end0-cut", "plate0-cut"], id);
    // ...the plate's line under the body, the cut over it.
    const order = paints.map((p) => p.key);
    assert.ok(order.indexOf("plate0") < order.indexOf("torso"), id);
    assert.ok(order.indexOf("plate0-cut") > order.indexOf("head"), id);
  }
});
