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

const { BODY, anglesOf } = load("@/motion/figure");
const { MOVES } = load("@/motion/moves");
const { momentAt, FILM_SECONDS, STILL_SECONDS } = load("@/motion/film");
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

const MOMENTS = Array.from({ length: 400 }, (_, i) => momentAt((i / 400) * FILM_SECONDS));

test("the film loops without a seam: it starts and ends standing, side on", () => {
  assert.deepEqual({ ...momentAt(0) }, { depth: 0, turn: 0 });
  const end = momentAt(FILM_SECONDS - 1e-6);
  close(end.depth, 0, 1e-3, "the depth at the end");
  close(end.turn, 0, 1e-3, "the turn at the end");
});

test("the film shows a rep from the side and one from the front, and turns only standing", () => {
  assert.ok(MOMENTS.some((m) => m.turn === 0 && m.depth === 1), "the bottom, from the side");
  assert.ok(MOMENTS.some((m) => m.turn === 90 && m.depth === 1), "the bottom, from the front");
  for (const m of MOMENTS) {
    if (m.turn === 0 || m.turn === 90) continue;
    assert.equal(m.depth, 0, `turning ${m.turn.toFixed(0)}° mid-rep`);
  }
  assert.deepEqual({ ...momentAt(STILL_SECONDS) }, { depth: 1, turn: 0 });
});

const COLORS = { field: "#F08A24", ink: "#13325B", tint: "#8A5E40" };

test("every moment of every film draws: a body, and no part lost", () => {
  for (const [id, move] of Object.entries(MOVES)) {
    for (const m of MOMENTS) {
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

test("from the side, the bar on the back shows through the body", () => {
  const bottom = { depth: 1, turn: 0 };
  const { paints } = draw(MOVES.back_squat, bottom, COLORS, { width: 360, height: 240 });
  const cuts = paints.filter((p) => p.clipped).map((p) => p.key);
  assert.deepEqual([...cuts].sort(), ["end0-cut", "plate0-cut"]);
  // ...and the plate's line is under the body, the cut over it.
  const order = paints.map((p) => p.key);
  assert.ok(order.indexOf("plate0") < order.indexOf("torso"));
  assert.ok(order.indexOf("plate0-cut") > order.indexOf("head"));
});
