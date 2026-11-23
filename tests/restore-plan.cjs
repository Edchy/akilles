const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// A built-in plan restored to how Klay made it: edits gone, growth and weights kept.
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

const store = load("@/store/session");
const DAY = 24 * 60 * 60 * 1000;
const t0 = Date.UTC(2026, 10, 1);
const begin = () => store.applyPlan(store.resetToDefault(), { home: null, time: "long", easy: [], lifter: { experience: "new" } }, t0);
const ids = (s, id) => store.workoutById(s, id).exercises.map((e) => e.id).join();

function train(state, now) {
  state = store.buildWorkout(state, now);
  while (!store.isComplete(state)) {
    const it = state.active.items[state.active.cursor];
    if (!store.isLift(it)) { state = store.skipExercise(state); continue; }
    for (let i = 0; i < it.logged.length; i++) state = store.tapSet(state, i);
    state = store.completeExercise(state);
  }
  return store.finishWorkout(state, now);
}

test("a plan as Klay made it has nothing to restore", () => {
  const s = begin();
  for (const id of ["ppl", "pplppl", "kettlebell_flow"]) assert.equal(store.canRestore(s, id), false, id);
});

test("restoring undoes renames, removed exercises and swaps, and keeps your weights", () => {
  let s = train(begin(), t0 + DAY);
  const before = ids(s, "push");
  const weights = JSON.stringify(s.history);
  s = store.renameLoop(s, "ppl", "Mine");
  s = store.removeEntry(s, "push", store.workoutById(s, "push").exercises[0].id);
  assert.equal(store.canRestore(s, "ppl"), true);
  assert.ok(store.restoreChanges(s, "ppl").some((c) => c.workout === "Push"));
  s = store.restoreLoop(s, "ppl");
  assert.equal(ids(s, "push"), before);
  assert.equal(store.loopName(s, "ppl"), "Push, pull, legs");
  assert.equal(JSON.stringify(s.history), weights);
  assert.equal(store.canRestore(s, "ppl"), false);
});

test("restoring Push, pull, legs keeps what growth has added", () => {
  let s = begin();
  for (let d = 1; d <= 14; d++) s = train(s, t0 + d * 1.5 * DAY);
  s = store.acceptGrowth(s, "lift", t0 + 22 * DAY);
  const grown = ids(s, "push");
  assert.equal(store.canRestore(s, "ppl"), false, "growth is not an edit");
  for (const e of store.workoutById(s, "push").exercises.slice(1)) s = store.removeEntry(s, "push", e.id);
  s = store.restoreLoop(s, "ppl");
  assert.equal(ids(s, "push"), grown);
});

test("a waiting plan restores without touching the one in use", () => {
  let s = begin();
  s = store.renameLoop(s, "pplppl", "Heavy days");
  const inUse = JSON.stringify(s.workouts);
  s = store.restoreLoop(s, "pplppl");
  assert.equal(store.loopName(s, "pplppl"), "Push, pull, legs, advanced");
  assert.equal(JSON.stringify(s.workouts), inUse);
  assert.equal(store.loopInUse(s), "ppl");
});
