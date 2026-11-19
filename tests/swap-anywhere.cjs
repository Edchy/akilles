const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Two built-in plans: Push, pull, legs to start, and PPLPPL to switch to in Settings.
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

// "Any exercise": a swap can reach the whole library, not only the same kind.
const store = load("@/store/session");

test("in Plan, a swap outside the kind re-types the slot and keeps its sets", () => {
  let s = store.resetToDefault();
  const legs = store.workoutById(s, "legs");
  const hinge = legs.exercises.find((e) => e.pattern === "hinge");
  s = store.updateEntry(s, "legs", hinge.id, { sets: 4 });
  s = store.swapInPlan(s, "legs", hinge.id, "bulgarian");
  const entry = store.workoutById(s, "legs").exercises.find((e) => e.id === hinge.id);
  assert.equal(store.chosen(s, "legs", entry), "bulgarian");
  assert.equal(entry.pattern, "lunge");
  assert.equal(entry.sets, 4);
  // Its relatives are what the next swap offers.
  const pool = store.poolFor(s, "legs", entry);
  assert.ok(pool.length > 1 && pool.every((id) => store.lookup(s, id).patterns.includes("lunge")), pool.join());
});

test("in Plan, an exercise already in the workout can't be swapped in twice", () => {
  const s = store.resetToDefault();
  const push = store.workoutById(s, "push");
  const [first, second] = push.exercises;
  const other = store.chosen(s, "push", second);
  assert.equal(store.swapInPlan(s, "push", first.id, other), s);
});

test("for today, any exercise can stand in, and the plan is untouched", () => {
  let s = store.buildWorkout(store.setNextWorkout(store.resetToDefault(), "push"));
  const at = s.active.items.findIndex(store.isLift);
  s = { ...s, active: { ...s.active, cursor: at } };
  const before = JSON.stringify(store.workoutById(s, "push"));
  s = store.swapForSession(s, "goblet_squat");
  assert.equal(s.active.items[at].exerciseId, "goblet_squat");
  assert.equal(JSON.stringify(store.workoutById(s, "push")), before);
  assert.ok(store.swapAnywhere(s).length > 100);
});
