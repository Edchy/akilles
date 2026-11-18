const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Exercise the real store, progression engine and save format without a native runtime.
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

const pullDay = (state) => store.buildWorkout(store.setNextWorkout(state, "pull"));
const chainItem = (state, id) => state.active.items.findIndex((it) => it.chain === id);

test("the first time, a chain is built at its start and asks where you are", () => {
  const built = pullDay(store.resetToDefault());
  const at = chainItem(built, "pullup");
  assert.ok(at >= 0, "Pull has the pull-up chain");
  const item = built.active.items[at];
  assert.equal(item.exerciseId, "dead_hang");
  assert.equal(item.placing, true);
  // The pulldown is still there beside it, and nothing is in twice.
  const ids = built.active.items.filter(store.isLift).map((it) => it.exerciseId);
  assert.ok(ids.includes("lat_pulldown"));
  assert.equal(new Set(ids).size, ids.length);
});

test("your answer, Easier or Harder is your step everywhere from then on", () => {
  let state = pullDay(store.resetToDefault());
  state = store.goToCard(state, chainItem(state, "pullup"));
  state = store.goToStep(state, 2);
  const item = state.active.items[state.active.cursor];
  assert.equal(item.exerciseId, "pullup_negative");
  assert.equal(item.placing, undefined);
  assert.equal(state.steps.pullup, 2);
  const here = store.stepHere(state);
  assert.equal(here.chain.id, "pullup");
  assert.equal(here.at, 2);
  // A workout of your own with a pull-up in it is done at the same step.
  let own = store.addWorkoutOfKind({ ...store.resetToDefault(), steps: state.steps }, "mine", "free");
  own = store.addExerciseToWorkout(own, "mine", "pullup");
  own = store.buildWorkout(store.setNextWorkout(own, "mine"));
  const mine = own.active.items[chainItem(own, "pullup")];
  assert.equal(mine.exerciseId, "pullup_negative");
  assert.equal(mine.placing, undefined);
  // Steps stop at the ends.
  assert.equal(store.goToStep(state, 9).steps.pullup, 3);
  assert.equal(store.goToStep(state, -1).steps.pullup, 0);
});

test("a step is owned at the top of its ladder, on target, and then the next is offered", () => {
  let state = { ...store.resetToDefault(), steps: { push_up: 2 } };
  state = store.buildWorkout(store.setNextWorkout(state, "push"));
  state = store.goToCard(state, chainItem(state, "push_up"));
  const item = state.active.items[state.active.cursor];
  assert.equal(item.exerciseId, "knee_push_up");
  assert.equal(store.stepHere(state).owned, false);
  const k = store.key("knee_push_up", item.scheme);
  const owned = { ...state, history: { ...state.history, [k]: { exerciseId: "knee_push_up", weight: 0, rung: 0, downStreak: 0, deloads: 0, maxed: true, lastPerformed: { weight: 0, reps: [12, 12, 12], target: 12 } } } };
  assert.equal(store.stepHere(owned).owned, true);
});
