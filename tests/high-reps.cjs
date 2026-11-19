const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Small muscles climb 10 → 12 → 14 in any slot; presses that hit triceps keep their six.
const modules = new Map();
function load(name) {
  if (name === "@react-native-async-storage/async-storage") return {};
  if (!name.startsWith("@/")) return require(name);
  const filename = path.resolve(__dirname, "../src", name.slice(2)) + ".ts";
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  vm.runInNewContext(outputText, { module, exports: module.exports, require: load, process, console, Date }, { filename });
  return module.exports;
}

const exercises = load("@/data/exercises");
const split = load("@/data/split");
const prog = load("@/lib/progression");
const store = load("@/store/session");
const storage = load("@/store/storage");

const ladder = (id, scheme = "6-12") => [...prog.ladderOf(exercises.byId(id), scheme)];

test("triceps, biceps, shoulders, calves and core climb 10, 12, 14", () => {
  for (const id of ["pushdown", "skullcrusher", "bench_dip", "db_curl", "lateral_raise", "face_pull", "calf_raise", "machine_crunch", "hanging_leg_raise"]) {
    assert.deepEqual(ladder(id), [10, 12, 14], id);
    assert.deepEqual(ladder(id, "volume"), [10, 12, 14], `${id} on 8–12`);
  }
  // A range inside 10–14 is kept as you set it.
  assert.deepEqual(ladder("pushdown", "10-12"), [10, 12]);
  assert.deepEqual(ladder("pushdown", "12-14"), [12, 14]);
});

test("dips, close-grip bench and chin-ups still go down to six; planks keep their seconds", () => {
  for (const id of ["dips", "close_grip_bench", "chinup", "db_bench", "db_shoulder"]) {
    assert.deepEqual(ladder(id), [6, 8, 10, 12], id);
  }
  assert.deepEqual(ladder("plank"), [30, 40, 50, 60]);
  assert.deepEqual(ladder("side_plank"), [30, 40, 50, 60]);
});

test("the range buttons stay within 10–14 for a small muscle", () => {
  const bounds = prog.repBounds(exercises.byId("pushdown"));
  assert.deepEqual({ ...bounds }, { min: 10, max: 14 });
  assert.equal(split.rangeScheme(8, 16, bounds), "10-14");
  assert.equal(split.rangeScheme(10, 12, bounds), "10-12");
  assert.equal(split.rangeScheme(5, 13), "6-12");
});

test("Push's dips open at 6 and its abs at 10", () => {
  const state = store.buildWorkout(store.resetToDefault());
  const reps = (id) => {
    const at = state.active.items.findIndex((it) => it.exerciseId === id);
    return store.currentPrescription({ ...state, active: { ...state.active, cursor: at } }).reps;
  };
  assert.equal(reps("dips"), 6);
  assert.equal(reps("dead_bug"), 10);
  assert.equal(reps("db_bench"), 6);
});

test("an old save keeps the weight and starts a small muscle's ladder again at 10", () => {
  const base = store.resetToDefault();
  const record = (exerciseId, weight, rung, extra = {}) => ({ exerciseId, weight, rung, downStreak: 0, deloads: 0, ...extra });
  const old = {
    ...base,
    history: {
      "pushdown:6-12": record("pushdown", 25, 2, { reloading: true, climbs: 0 }),
      "db_bench:6-12": record("db_bench", 22.5, 2),
      "pushdown:10-12": record("pushdown", 30, 1),
    },
  };
  const restored = storage.fromSaved(JSON.stringify({ version: 12, state: old }));
  // Version 22 then moves 6–12 to 6–10, keeping what each record aims at.
  assert.equal(restored.history["pushdown:6-10"].weight, 25);
  assert.equal(restored.history["pushdown:6-10"].rung, 0);
  assert.equal(restored.history["pushdown:6-10"].reloading, false);
  // Untouched: a big lift, and a range already inside 10–14.
  assert.equal(restored.history["db_bench:6-10"].rung, 2);
  assert.equal(restored.history["pushdown:10-12"].rung, 1);
});

test("isolation work and swings climb 10–14, a deadlift 4–8, in a 6–10 slot", () => {
  for (const id of ["leg_ext", "single_leg_ext", "cable_fly", "pec_deck", "leg_curl", "hip_abduction", "kb_swing", "straight_arm_pulldown"]) {
    assert.deepEqual(ladder(id, "6-10"), [10, 12, 14], id);
  }
  assert.deepEqual(ladder("deadlift", "6-10"), [4, 6, 8]);
  assert.deepEqual(ladder("hollow_hold", "6-10"), [20, 30, 40]);
  assert.deepEqual(ladder("turkish_get_up", "6-10"), [1, 2]);
  // Big lifts that can still go to six keep the slot's range.
  for (const id of ["db_bench", "db_rdl", "goblet_squat", "dips", "double_kb_press"]) {
    assert.deepEqual(ladder(id, "6-10"), [6, 8, 10], id);
  }
  // A hamstring curl is isolation; a Romanian deadlift that counts as hamstrings is not.
  assert.deepEqual({ ...prog.repBounds(exercises.byId("leg_curl")) }, { min: 10, max: 14 });
  assert.deepEqual({ ...prog.repBounds(exercises.byId("db_rdl")) }, { min: 6, max: 12 });
});

test("version 22 moves 6–12 to 6–10 and keeps what each record aims at", () => {
  const base = store.resetToDefault();
  const record = (exerciseId, weight, rung, extra = {}) => ({ exerciseId, weight, rung, downStreak: 0, deloads: 0, ...extra });
  const old = {
    ...base,
    workouts: base.workouts.map((w) => ({ ...w, exercises: w.exercises.map((e) => ({ ...e, scheme: "6-12" })) })),
    history: {
      "db_bench:6-12": record("db_bench", 22.5, 3, { lastTrainedAt: 2 }),
      "db_shoulder:6-12": record("db_shoulder", 14, 1),
      "leg_curl:6-12": record("leg_curl", 40, 3),
      "deadlift:6-12": record("deadlift", 100, 1),
      "db_bench:volume": record("db_bench", 20, 1),
      "db_bench:6-10": record("db_bench", 20, 0, { lastTrainedAt: 1 }),
    },
  };
  const restored = storage.fromSaved(JSON.stringify({ version: 21, state: old }));
  for (const w of restored.workouts) for (const e of w.exercises) assert.equal(e.scheme, "6-10", `${w.id}/${e.id}`);
  // 12 on 6–12 is past the new top: it sits on 10, so the next clean session adds weight.
  assert.deepEqual([restored.history["db_bench:6-10"].weight, restored.history["db_bench:6-10"].rung], [22.5, 2]);
  assert.equal(restored.history["db_bench:6-12"], undefined);
  assert.equal(restored.history["db_shoulder:6-10"].rung, 1);
  // A leg curl on 12 reps goes onto 10–14 at 12; a deadlift on 8 onto 4–8 at 8.
  assert.equal(restored.history["leg_curl:6-10"].rung, 1);
  assert.equal(restored.history["deadlift:6-10"].rung, 2);
  // A range of your own is left as it is.
  assert.equal(restored.history["db_bench:volume"].rung, 1);
  // The new lifts start in the library.
  for (const id of ["double_kb_press", "turkish_get_up", "single_leg_ext"]) assert.ok(restored.hidden.includes(id), id);
});
