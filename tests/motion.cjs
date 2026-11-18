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

const { BODY, SIZE, anglesOf, centreOfMass } = load("@/motion/figure");
const { MOVES, DRAFTS, BAR_RADIUS, clearOfTrunk, sideOnDistance } = load("@/motion/moves");
const { filmOf } = load("@/motion/film");
const { draw } = load("@/motion/marks");

/** Every move, in the app or waiting for a look. */
const ALL = { ...MOVES, ...Object.fromEntries(Object.entries(DRAFTS).map(([id, make]) => [id, make()])) };

const DEPTHS = Array.from({ length: 41 }, (_, i) => i / 40);
const close = (a, b, tolerance, what) =>
  assert.ok(Math.abs(a - b) <= tolerance, `${what}: ${a.toFixed(4)} is not within ${tolerance} of ${b.toFixed(4)}`);

test("every exercise has a film or a source-checked reference demonstration", () => {
  const { EXERCISES } = load("@/data/exercises");
  const { CARDIO, STRETCHES } = load("@/data/conditioning");
  // The day warm-ups' opening and leg moves came after the films: a stretch
  // card shows its clay picture, or its words alone.
  // So did yoga's and kung fu's.
  const unfilmed = ["wide_stance", "side_stance", "leg_swing", "bodyweight_squat", "downward_dog", "low_lunge", "pigeon", "cobra", "knee_circles", "hamstring_bounce", "front_kick_swing", "scapular_pushup", "thread_needle"];
  const ids = [...EXERCISES, ...CARDIO, ...STRETCHES].map((e) => e.id).filter((id) => !unfilmed.includes(id));
  const { guideFor } = load("@/data/guides");
  for (const id of ids.filter((id) => !(id in MOVES))) {
    const guide = guideFor(id);
    assert.ok(guide?.reviewedOn, `${id}: no source check`);
    assert.ok(guide?.demonstration, `${id}: no reference demonstration`);
    assert.ok(guide.sources.some((source) => source.url === guide.demonstration.url), `${id}: demonstration must link to a cited source`);
  }
});

test("a film waiting to be reshot is a film", () => {
  const { RESHOOT } = load("@/motion/moves");
  for (const id of RESHOOT) assert.ok(id in MOVES, `${id} is not a film`);
});

test("every bone keeps its length at every depth", () => {
  for (const [id, move] of Object.entries(ALL)) {
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

/** Heel and toe along the floor from the ankle, for a foot turned out `toeOut` degrees. */
const footSpan = (toeOut) => [-BODY.heel, BODY.toe].map((x) => x * Math.cos((toeOut * Math.PI) / 180));
const midFoot = (toeOut) => ((BODY.toe - BODY.heel) / 2) * Math.cos((toeOut * Math.PI) / 180);
const shoulderOf = (arm) => arm.root;
const bend = (arm) =>
  180 - (arm.root.clone().sub(arm.mid).angleTo(arm.end.clone().sub(arm.mid)) * 180) / Math.PI;
/** How far the bar is clear of a leg, seen from the side: it runs across the body. */
const clearOfLegs = (p) =>
  Math.min(
    ...p.legs.flatMap((l) => [
      sideOnDistance(p.bar, l.root, l.mid) - SIZE.thigh,
      sideOnDistance(p.bar, l.mid, l.end) - SIZE.shin,
    ]),
  ) - BAR_RADIUS;

test("the barbell curl: elbows pinned, from the thighs to the chest, never rocking", () => {
  const curl = ALL.bb_curl;
  const start = curl.pose(0);
  for (const d of DEPTHS) {
    const p = curl.pose(d);
    p.legs.forEach((leg, i) => close(leg.end.distanceTo(start.legs[i].end), 0, 1e-9, `ankle ${i}`));
    // Standing tall and still: only the forearms move.
    close(p.pelvis.distanceTo(start.pelvis), 0, 1e-9, `the hips at ${d}`);
    const a = anglesOf(p);
    assert.ok(a.lean < 1, `the trunk leans ${a.lean.toFixed(1)}° at ${d}`);
    a.knees.forEach((k) => assert.ok(k < 8, `a knee bends ${k.toFixed(1)}° at ${d}`));
    p.arms.forEach((arm, i) => {
      close(arm.mid.distanceTo(start.arms[i].mid), 0, 1e-9, `elbow ${i} pinned at ${d}`);
      const out = (Math.atan2(arm.mid.x - arm.root.x, arm.root.y - arm.mid.y) * 180) / Math.PI;
      assert.ok(out >= 0 && out < 12, `upper arm ${i} is ${out.toFixed(1)}° from the side`);
    });
    // The bar passes clear of the thighs and the chest.
    assert.ok(clearOfLegs(p) > -1e-3, `the bar in the thighs at ${d}`);
    assert.ok(clearOfTrunk(p, p.bar) > BAR_RADIUS, `the bar in the chest at ${d}`);
    // Lifter and a bar of 40% of their weight balance over the foot.
    const [heel, toe] = footSpan(10);
    const balance = centreOfMass(p, 0.4).x;
    assert.ok(balance > heel + 0.05 && balance < toe - 0.05, `off balance at ${d}: ${balance.toFixed(3)}`);
    close(balance, midFoot(10), 0.08, `the balance at ${d}`);
  }
  // Straight arms with the bar resting on the thighs; at the top, the elbows bent right up.
  start.arms.forEach((arm) => close(arm.root.distanceTo(arm.end), 0.6, 0.01, "arms straight"));
  close(clearOfLegs(start), 0, 1e-3, "the bar on the thighs");
  curl.pose(1).arms.forEach((arm) => assert.ok(bend(arm) >= 130, `elbow bent ${bend(arm)}°`));
});

test("the bent-over row: a still, flat back at 45°, the bar from under the shoulders to the ribs", () => {
  const row = ALL.bb_row;
  const start = row.pose(0);
  for (const d of DEPTHS) {
    const p = row.pose(d);
    p.legs.forEach((leg, i) => close(leg.end.distanceTo(start.legs[i].end), 0, 1e-9, `ankle ${i}`));
    // The torso never rises.
    close(p.pelvis.distanceTo(start.pelvis), 0, 1e-9, `the hips at ${d}`);
    const a = anglesOf(p);
    close(a.lean, 45, 0.5, `the trunk at ${d}`);
    a.knees.forEach((k) => assert.ok(k > 15 && k < 35, `a knee bends ${k.toFixed(1)}°: not soft`));
    assert.ok(clearOfLegs(p) > 0, `the bar in the legs at ${d}`);
    assert.ok(clearOfTrunk(p, p.bar) > BAR_RADIUS - 1e-3, `the bar in the body at ${d}`);
    const [heel, toe] = footSpan(12);
    const balance = centreOfMass(p, 0.7).x;
    assert.ok(balance > heel + 0.05 && balance < toe - 0.05, `off balance at ${d}: ${balance.toFixed(3)}`);
  }
  // Arms straight, the bar right under the shoulders and lifter and bar over mid-foot.
  start.arms.forEach((arm) => {
    close(arm.root.distanceTo(arm.end), 0.6, 0.01, "arms straight at the start");
    close(arm.end.x, shoulderOf(arm).x, 1e-3, "the bar under the shoulders");
  });
  close(centreOfMass(start, 0.7).x, midFoot(12), 0.005, "balanced over mid-foot");
  // The top: the bar against the lower ribs, the elbows back past the body.
  const top = row.pose(1);
  close(clearOfTrunk(top, top.bar), BAR_RADIUS, 2e-3, "the bar against the lower ribs");
  top.arms.forEach((arm, i) => {
    const back = arm.mid.clone().sub(arm.root).dot(top.forward);
    assert.ok(back < -0.15, `elbow ${i} only ${(-back * 100).toFixed(0)} cm back`);
  });
});

test("the pull-up: from a dead hang to the chin over the bar, hanging balanced", () => {
  const pull = ALL.pullup;
  const start = pull.pose(0);
  const bar = start.bar;
  for (const d of DEPTHS) {
    const p = pull.pose(d);
    p.arms.forEach((arm, i) => close(arm.end.distanceTo(start.arms[i].end), 0, 1e-9, `hand ${i} on the bar`));
    close(centreOfMass(p).x, bar.x, 0.005, `the body's weight under the bar at ${d}`);
    // Nothing passes through the bar, and the feet stay off the floor.
    const head = Math.hypot(p.head.x - bar.x, p.head.y - bar.y) - SIZE.head - BAR_RADIUS;
    assert.ok(head > 0, `the head in the bar at ${d}`);
    assert.ok(clearOfTrunk(p, bar) > BAR_RADIUS - 1e-3, `the chest in the bar at ${d}`);
    p.legs.forEach((leg) => assert.ok(leg.end.y > BODY.ankle + 0.15, "a foot near the floor"));
    // Long and still: no kick, at most a slight lean back and hollow.
    const a = anglesOf(p);
    assert.ok(a.lean <= 25, `leaning ${a.lean.toFixed(1)}° at ${d}`);
    a.knees.forEach((k) => assert.ok(k < 10, `a knee bends ${k.toFixed(1)}° at ${d}`));
    a.hips.forEach((h) => assert.ok(h < 15, `the hips bend ${h.toFixed(1)}° at ${d}`));
    // Seen from the front, the forearms upright under the hands once bent.
    p.arms.forEach((arm, i) => {
      if (bend(arm) > 20) close(arm.mid.z, arm.end.z, 1e-3, `forearm ${i} upright at ${d}`);
    });
  }
  // A full hang: arms straight, the head under the bar.
  start.arms.forEach((arm) => close(arm.root.distanceTo(arm.end), 0.6, 0.01, "a full hang"));
  assert.ok(start.head.y < bar.y - 0.25, "the head under the bar");
  // The chin over the bar.
  const top = pull.pose(1);
  assert.ok(top.head.y - SIZE.head > bar.y, "the chin over the bar");
});

const heldBy = (p) => p.arms[0].end.clone().add(p.arms[1].end).multiplyScalar(0.5);

test("the dumbbell curls: elbows pinned, palms turning up — or, hammer, staying in", () => {
  for (const id of ["db_curl", "hammer_curl"]) {
    const curl = ALL[id];
    const start = curl.pose(0);
    for (const d of DEPTHS) {
      const p = curl.pose(d);
      p.arms.forEach((arm, i) => close(arm.mid.distanceTo(start.arms[i].mid), 0, 1e-9, `${id} elbow`));
      close(p.pelvis.distanceTo(start.pelvis), 0, 1e-9, `${id} hips still`);
      const [heel, toe] = footSpan(10);
      const balance = centreOfMass(p, 0.3, heldBy(p)).x;
      assert.ok(balance > heel + 0.05 && balance < toe - 0.05, `${id} off balance at ${d}`);
      // The dumbbells hang clear of the thighs.
      p.dumbbells.forEach((db, i) => {
        const leg = p.legs[i];
        const off = Math.abs(db.at.z) - 0.065 - (Math.abs(leg.root.z) + SIZE.thigh);
        assert.ok(off > -0.01, `${id} dumbbell ${i} in the thigh at ${d}`);
      });
    }
    start.arms.forEach((arm) => close(arm.root.distanceTo(arm.end), 0.6, 0.015, `${id} arms straight`));
    const top = curl.pose(1);
    top.arms.forEach((arm) => assert.ok(bend(arm) >= 130, `${id} elbow bent ${bend(arm)}°`));
    const across = Math.abs(top.dumbbells[0].axis.z);
    if (id === "db_curl") close(across, 1, 1e-6, "palms up at the top");
    else close(across, 0, 1e-6, "palms in at the top");
  }
});

test("the goblet squat: below parallel, chest up, heels down, balanced", () => {
  const squat = ALL.goblet_squat;
  const start = squat.pose(0);
  for (const d of DEPTHS) {
    const p = squat.pose(d);
    p.legs.forEach((leg, i) => close(leg.end.distanceTo(start.legs[i].end), 0, 1e-9, `ankle ${i}`));
    close(centreOfMass(p, 0.2, p.dumbbells[0].at).x, midFoot(25), 0.005, `balance at ${d}`);
    const a = anglesOf(p);
    assert.ok(a.lean <= 40, `the trunk leans ${a.lean.toFixed(1)}° at ${d}`);
    a.ankles.forEach((k) => assert.ok(k <= 42, `shin leans ${k.toFixed(1)}° at ${d}`));
    assert.ok(clearOfTrunk(p, p.dumbbells[0].at) > 0.06, `the dumbbell in the chest at ${d}`);
  }
  squat.pose(1).legs.forEach((leg) => assert.ok(leg.root.y < leg.mid.y, "below parallel"));
});

test("the Romanian deadlifts: knees soft and still, the weight on the legs, balanced", () => {
  for (const [id, thick, load] of [["rdl", BAR_RADIUS, 0.8], ["db_rdl", 0.06, 0.4]]) {
    const rdl = ALL[id];
    for (const d of DEPTHS) {
      const p = rdl.pose(d);
      anglesOf(p).knees.forEach((k) => close(k, 18, 1.5, `${id} knees at ${d}`));
      const w = heldBy(p);
      const gap = Math.min(
        ...p.legs.flatMap((l) => [
          sideOnDistance(w, l.root, l.mid) - SIZE.thigh,
          sideOnDistance(w, l.mid, l.end) - SIZE.shin,
        ]),
      ) - thick;
      close(gap, 0, 0.006, `${id} weight on the legs at ${d}`);
      close(centreOfMass(p, load, w).x, midFoot(8), 0.015, `${id} balance at ${d}`);
      p.arms.forEach((arm) => close(arm.root.distanceTo(arm.end), 0.6, 0.015, `${id} arms straight`));
    }
    assert.ok(anglesOf(rdl.pose(1)).lean >= 60, `${id}: a big stretch`);
    assert.ok(anglesOf(rdl.pose(0)).lean < 1, `${id}: standing tall`);
  }
});

test("the dumbbell bench: forearms upright, pressed up and a little in", () => {
  const press = ALL.db_bench;
  for (const d of DEPTHS) {
    press.pose(d).arms.forEach((arm, i) => close(arm.mid.x, arm.end.x, 1e-3, `forearm ${i} at ${d}`));
  }
  const [top, bottom] = [press.pose(0), press.pose(1)];
  assert.ok(Math.abs(bottom.arms[0].end.z) - Math.abs(top.arms[0].end.z) > 0.1, "in at the top");
  top.arms.forEach((arm) => close(arm.root.distanceTo(arm.end), 0.6, 0.01, "arms straight at the top"));
});

test("the lateral raise: to shoulder height, no shrug, a slight lean", () => {
  const raise = ALL.lateral_raise;
  const start = raise.pose(0);
  for (const d of DEPTHS) {
    const p = raise.pose(d);
    p.arms.forEach((arm, i) => close(arm.root.distanceTo(start.arms[i].root), 0, 1e-9, "no shrug"));
    close(anglesOf(p).lean, 10, 0.5, `the lean at ${d}`);
  }
  raise.pose(1).arms.forEach((arm) => close(arm.mid.y, arm.root.y, 0.03, "elbows at shoulder height"));
});

const FILMS = Object.entries(ALL).map(([id, move]) => {
  const film = filmOf(move.film);
  const moments = Array.from({ length: 400 }, (_, i) => film.momentAt((i / 400) * film.seconds));
  return { id, move, film, moments };
});

// A film that goes round — a stride, a jump — loops on its own; these are
// for reps.
const REPS = FILMS.filter(({ move }) => !move.film.cycle);

test("each film loops without a seam, standing in its first view", () => {
  for (const { id, move, film } of REPS) {
    const first = move.film.views[0];
    assert.deepEqual({ ...film.momentAt(0) }, { depth: 0, turn: first });
    const end = film.momentAt(film.seconds - 1e-6);
    close(end.depth, 0, 1e-3, `${id}: the depth at the end`);
    close(end.turn, first, 1e-3, `${id}: the turn at the end`);
  }
});

test("each film shows the bottom from every view, and turns only standing", () => {
  assert.deepEqual([...MOVES.back_squat.film.views], [0, 90]);
  for (const { id, move, film, moments } of REPS) {
    const views = move.film.views;
    for (const v of views) {
      assert.ok(moments.some((m) => m.turn === v && m.depth === 1), `${id}: the bottom at ${v}°`);
    }
    for (const m of moments) {
      if (views.includes(m.turn)) continue;
      assert.equal(m.depth, 0, `${id}: turning ${m.turn.toFixed(0)}° mid-rep`);
    }
    assert.deepEqual({ ...film.momentAt(film.still) }, { depth: 1, turn: views[0] });
  }
});

test("a film played twice comes to rest at the bottom of a rep, not mid-turn", () => {
  for (const { id, move, film } of REPS) {
    const rest = film.restsAt(2);
    assert.ok(rest > 2 * film.seconds, id);
    assert.deepEqual({ ...film.momentAt(rest) }, { depth: 1, turn: move.film.views[0] }, id);
  }
});

test("a film that goes round comes back to where it started", () => {
  for (const { id, move, film } of FILMS.filter(({ move }) => move.film.cycle)) {
    const [a, b] = [move.pose(0), move.pose(1)];
    close(a.pelvis.distanceTo(b.pelvis), 0, 1e-6, `${id}: the hips at the loop`);
    a.arms.forEach((arm, i) => close(arm.end.distanceTo(b.arms[i].end), 0, 1e-6, `${id}: hand ${i}`));
    a.legs.forEach((leg, i) => close(leg.end.distanceTo(b.legs[i].end), 0, 1e-6, `${id}: foot ${i}`));
    assert.ok(film.restsAt(2) > 2 * film.seconds, id);
  }
});

const COLORS = { field: "#F08A24", ink: "#13325B", tint: "#8A5E40" };

test("every moment of every film draws: a body, and no part lost", () => {
  for (const { id, move, moments } of FILMS) {
    for (const m of moments) {
      const { paints, clips } = draw(move, m, COLORS, { width: 360, height: 240 });
      const at = `${id} at depth ${m.depth.toFixed(2)}, turn ${m.turn.toFixed(0)}°`;
      for (const p of [...paints, ...clips.map((d) => ({ key: "clip", d }))]) {
        assert.ok(!/NaN|Infinity/.test(p.d), `${p.key} of ${at}: ${p.d}`);
      }
      for (const p of paints) assert.ok(p.clip === undefined || clips[p.clip], `${p.key}'s clip`);
      const keys = paints.map((p) => p.key);
      // Off the floor, a foot is pointed and drawn as the end of the shin.
      const leg = move.pose(m.depth).legs[0];
      const standing = leg.planted ?? leg.end.y < BODY.ankle + 0.05;
      const parts = ["torso", "head", "thigh0", "shin1", "upperArm1", "forearm0"];
      for (const part of standing ? [...parts, "foot0"] : parts) {
        assert.ok(keys.includes(part), `${part} missing from ${at}`);
      }
      assert.equal(new Set(keys).size, keys.length, `a key twice in ${at}`);
    }
  }
});

test("from the side, the near plate shows through the body", () => {
  for (const id of ["back_squat", "bench", "bb_row", "bb_curl"]) {
    const bottom = { depth: 1, turn: 0 };
    const { paints } = draw(ALL[id], bottom, COLORS, { width: 360, height: 240 });
    const cuts = paints.filter((p) => p.clip !== undefined).map((p) => p.key);
    assert.deepEqual([...cuts].sort(), ["end0-cut", "plate0-cut"], id);
    // ...the plate's line under the body, the cut over it.
    const order = paints.map((p) => p.key);
    assert.ok(order.indexOf("plate0") < order.indexOf("torso"), id);
    assert.ok(order.indexOf("plate0-cut") > order.indexOf("head"), id);
  }
});

test("a bar held in front cuts across the body; one on the back doesn't", () => {
  const cutsOf = (id, moment) =>
    draw(ALL[id], moment, COLORS, { width: 360, height: 240 }).paints.filter((p) => p.key === "bar-cut");
  assert.equal(cutsOf("bb_curl", { depth: 0, turn: 90 }).length, 1, "the curl bar across the thighs");
  assert.equal(cutsOf("bb_curl", { depth: 1, turn: 90 }).length, 1, "the curl bar across the chest");
  assert.equal(cutsOf("pullup", { depth: 1, turn: 90 }).length, 1, "the pull-up bar across the neck");
  assert.equal(cutsOf("back_squat", { depth: 1, turn: 90 }).length, 0, "the squat bar on the back");
});
