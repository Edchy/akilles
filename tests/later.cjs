const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Never wait: a lift you skip is put off, not dropped, and comes back once.
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

/** A fresh Push session, on its first lift. */
function lifting() {
  const state = store.buildWorkout(store.resetToDefault());
  state.active.cursor = state.active.items.findIndex(store.isLift);
  return state;
}
const order = (state) => state.active.items.map((item) => item.exerciseId).join(" ");
const lifts = (state) => state.active.items.filter(store.isLift).map((item) => item.exerciseId);

test("a skipped lift comes back after the other lifts, and the next one is on screen", () => {
  const before = lifting();
  const [first, second] = lifts(before);
  assert.equal(store.comesBack(before), true);
  const after = store.skipExercise(before);
  assert.equal(after.active.cursor, before.active.cursor);
  assert.equal(after.active.items[after.active.cursor].exerciseId, second);
  assert.equal(lifts(after).at(-1), first);
  // Nothing is lost, and the cardio and the stretch still close the session.
  assert.equal(after.active.items.length, before.active.items.length);
  assert.equal(store.isLift(after.active.items.at(-1)), false);
  assert.equal(after.active.items.some((item) => item.skipped), false);
});

test("it comes back once: skipped again, it is left out", () => {
  let state = store.skipExercise(lifting());
  const put = state.active.items.findIndex((item) => item.later);
  state = { ...state, active: { ...state.active, cursor: put } };
  assert.equal(store.comesBack(state), false);
  const before = order(state);
  state = store.skipExercise(state);
  assert.equal(order(state), before);
  assert.equal(state.active.items[put].skipped, true);
  assert.equal(state.active.cursor, put + 1);
});

test("the last lift has nowhere to go; cardio and the stretch are simply skipped", () => {
  let state = lifting();
  const last = state.active.items.findLastIndex(store.isLift);
  state = { ...state, active: { ...state.active, cursor: last } };
  assert.equal(store.comesBack(state), false);
  assert.equal(store.skipExercise(state).active.items[last].skipped, true);

  const opening = store.buildWorkout(store.resetToDefault());
  assert.equal(store.isLift(opening.active.items[0]), false);
  assert.equal(store.comesBack(opening), false);
  const skipped = store.skipExercise(opening);
  assert.equal(skipped.active.cursor, 1);
  assert.equal(order(skipped), order(opening));
});

test("sets already logged stay with a lift put off, and it still counts when done later", () => {
  let state = store.tapSet(lifting(), 0);
  const id = state.active.items[state.active.cursor].exerciseId;
  state = store.skipExercise(state);
  const back = state.active.items.find((item) => item.exerciseId === id);
  assert.equal(back.later, true);
  assert.notEqual(back.logged[0], null);
});
