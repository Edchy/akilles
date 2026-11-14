const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Exercise the real store without a native runtime.
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
const ids = (s) => s.workouts.map((w) => w.id);
const paused = (s) => s.removedWorkouts.map((r) => r.workout.id);

test("a paused workout leaves the loop and comes back where it sat, exactly as it was", () => {
  const s = store.resetToDefault();
  const legs = store.workoutById(s, "legs");
  const out = store.pauseWorkout(s, "legs");
  assert.ok(!ids(out).includes("legs"));
  assert.deepEqual([...paused(out)], ["legs"]);
  const back = store.resumeWorkout(out, "legs");
  assert.deepEqual([...ids(back)], [...ids(s)]);
  assert.equal(JSON.stringify(store.workoutById(back, "legs")), JSON.stringify(legs));
});

test("a workout you made pauses too, choices and all", () => {
  let s = store.resetToDefault();
  s = store.addWorkout(s, "w_mine", "Full body");
  s = store.addExerciseToWorkout(s, "w_mine", "back_squat", "s1");
  s = store.chooseExercise(s, "w_mine", "s1", "goblet_squat");
  const out = store.pauseWorkout(s, "w_mine");
  assert.deepEqual([...paused(out)], ["w_mine"]);
  assert.equal(out.choices["w_mine/s1"], "goblet_squat");
  const back = store.resumeWorkout(out, "w_mine");
  assert.equal(ids(back).at(-1), "w_mine");
  assert.equal(store.chosen(back, "w_mine", store.workoutById(back, "w_mine").exercises[0]), "goblet_squat");
});

test("pausing the next workout moves next on; the last workout cannot be paused", () => {
  let s = store.resetToDefault();
  const next = store.upNext(s).id;
  s = store.pauseWorkout(s, next);
  assert.notEqual(store.upNext(s).id, next);
  for (const id of ids(s).slice(1)) s = store.pauseWorkout(s, id);
  assert.equal(s.workouts.length, 1);
  assert.equal(store.canPauseWorkout(s), false);
  assert.equal(store.pauseWorkout(s, s.workouts[0].id), s);
});

test("only a paused workout can be deleted, and its choices go with it", () => {
  let s = store.resetToDefault();
  s = store.chooseExercise(s, "legs", s.workouts.find((w) => w.id === "legs").exercises[0].id, "back_squat");
  assert.equal(store.deleteWorkout(s, "legs"), s, "a running workout is not deleted");
  const gone = store.deleteWorkout(store.pauseWorkout(s, "legs"), "legs");
  assert.ok(!ids(gone).includes("legs"));
  assert.equal(paused(gone).length, 0);
  assert.ok(Object.keys(gone.choices).every((k) => !k.startsWith("legs/")));
});

test("a copy has the same exercises and choices, its own name, and goes at the bottom", () => {
  let s = store.resetToDefault();
  const legs = store.workoutById(s, "legs");
  s = store.chooseExercise(s, "legs", legs.exercises[0].id, "back_squat");
  const copied = store.copyWorkout(s, "legs", "w_copy");
  const copy = store.workoutById(copied, "w_copy");
  assert.equal(ids(copied).at(-1), "w_copy");
  assert.equal(copy.name, "Legs 2");
  assert.equal(copy.subtitle, legs.subtitle);
  assert.equal(JSON.stringify(copy.exercises), JSON.stringify(legs.exercises));
  assert.equal(store.chosen(copied, "w_copy", copy.exercises[0]), "back_squat");
  assert.equal(store.copyWorkout(copied, "legs", "w_again").workouts.at(-1).name, "Legs 3");

  // Its own from here on: changing the copy leaves the original alone.
  const changed = store.chooseExercise(copied, "w_copy", copy.exercises[0].id, "goblet_squat");
  assert.equal(store.chosen(changed, "legs", legs.exercises[0]), "back_squat");
});

test("a paused workout can be copied into the loop", () => {
  const s = store.pauseWorkout(store.resetToDefault(), "legs");
  const copied = store.copyWorkout(s, "legs", "w_copy");
  assert.equal(store.workoutById(copied, "w_copy").name, "Legs 2");
  assert.deepEqual([...paused(copied)], ["legs"]);
});


test("Plan preserves positions across multiple pauses, reordering and resuming", () => {
  let s = store.resetToDefault();
  const original = [...ids(s)];
  s = store.pauseWorkout(s, original[0]);
  s = store.pauseWorkout(s, original[1]);
  assert.deepEqual([...store.planWorkouts(s).map((w) => w.id)], original);
  s = store.movePlanWorkout(s, 2, 0);
  const expected = [original[2], original[0], original[1]];
  assert.deepEqual([...store.planWorkouts(s).map((w) => w.id)], expected);
  s = store.resumeWorkout(s, original[1]);
  s = store.resumeWorkout(s, original[0]);
  assert.deepEqual([...ids(s)], expected);
});

test("a save from before Plan ordering reconstructs paused workouts in place", () => {
  let s = store.resetToDefault();
  const original = [...ids(s)];
  s = store.pauseWorkout(s, original[0]);
  s = store.pauseWorkout(s, original[1]);
  delete s.planOrder;
  assert.deepEqual([...store.planWorkouts(s).map((w) => w.id)], original);
});
