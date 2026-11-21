const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// A plan edit made mid-workout reaches the workout: only the cards not yet
// touched follow, and nothing up to the one on screen moves.
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

/** A fresh session, on its first lift. */
function lifting() {
  const state = store.buildWorkout(store.resetToDefault());
  state.active.cursor = state.active.items.findIndex(store.isLift);
  return state;
}
const edit = (state, fn) => store.followPlan(state, fn(state));
const ids = (state) => state.active.items.map((it) => it.exerciseId);
const here = (state) => state.active.workoutId;
/** An exercise this workout doesn't have. */
const newcomer = (state) =>
  ["lateral_raise", "cable_fly", "face_pull"].find((id) => !ids(state).includes(id));

test("an exercise added to the plan joins the workout in progress", () => {
  const before = lifting();
  const id = newcomer(before);
  const after = edit(before, (s) => store.addExerciseToWorkout(s, here(s), id));
  assert.ok(ids(after).includes(id));
  assert.equal(after.active.items.length, before.active.items.length + 1);
  // The card on screen is still the one on screen.
  assert.equal(after.active.cursor, before.active.cursor);
  assert.equal(after.active.items[after.active.cursor], before.active.items[before.active.cursor]);
  assert.ok(ids(after).indexOf(id) > after.active.cursor);
});

test("on the Finish card, something added is the next thing", () => {
  const before = lifting();
  before.active.cursor = before.active.items.length;
  const id = newcomer(before);
  const after = edit(before, (s) => store.addExerciseToWorkout(s, here(s), id));
  assert.equal(after.active.items[after.active.cursor].exerciseId, id);
});

test("an untouched lift taken out of the plan leaves the workout; a touched one stays", () => {
  const before = lifting();
  const c = before.active.cursor;
  const later = before.active.items.slice(c + 1).filter(store.isLift);
  assert.ok(later.length >= 2);
  const [a, b] = later;
  // Something logged on b.
  const touched = {
    ...before,
    active: {
      ...before.active,
      items: before.active.items.map((it) => (it === b ? { ...it, logged: [8, ...it.logged.slice(1)] } : it)),
    },
  };
  let after = edit(touched, (s) => store.removeEntry(s, here(s), a.id));
  assert.equal(after.active.items.some((it) => it.id === a.id), false);
  after = edit(after, (s) => store.removeEntry(s, here(s), b.id));
  assert.ok(after.active.items.some((it) => it.id === b.id));
});

test("the card on screen never goes, even untouched", () => {
  const before = lifting();
  const on = before.active.items[before.active.cursor];
  const after = edit(before, (s) => store.removeEntry(s, here(s), on.id));
  assert.equal(after.active.items[after.active.cursor], on);
});

test("new sets reach a lift still ahead, not one already started", () => {
  const before = lifting();
  const c = before.active.cursor;
  const ahead = before.active.items.slice(c + 1).find(store.isLift);
  const sets = ahead.logged.length + 1;
  const after = edit(before, (s) => store.updateEntry(s, here(s), ahead.id, { sets }));
  assert.equal(after.active.items.find((it) => it.id === ahead.id).logged.length, sets);
  const on = before.active.items[c];
  const again = edit(before, (s) => store.updateEntry(s, here(s), on.id, { sets: on.logged.length + 1 }));
  assert.equal(again.active.items[c].logged.length, on.logged.length);
});

test("a change that isn't to the plan leaves the workout alone", () => {
  const before = lifting();
  const after = edit(before, (s) => ({ ...s }));
  assert.equal(after.active, before.active);
  // And a session action is never second-guessed.
  const tapped = store.tapSet(before, 0);
  assert.equal(store.followPlan(before, tapped), tapped);
});
