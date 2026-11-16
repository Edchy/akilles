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

test("Push's triceps and abs open at 10 reps", () => {
  const state = store.buildWorkout(store.resetToDefault());
  const reps = (id) => {
    const at = state.active.items.findIndex((it) => it.exerciseId === id);
    return store.currentPrescription({ ...state, active: { ...state.active, cursor: at } }).reps;
  };
  assert.equal(reps("pushdown"), 10);
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
  assert.equal(restored.history["pushdown:6-12"].weight, 25);
  assert.equal(restored.history["pushdown:6-12"].rung, 0);
  assert.equal(restored.history["pushdown:6-12"].reloading, false);
  // Untouched: a big lift, and a range already inside 10–14.
  assert.equal(restored.history["db_bench:6-12"].rung, 2);
  assert.equal(restored.history["pushdown:10-12"].rung, 1);
});
