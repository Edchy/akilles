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
const find = load("@/lib/find-exercise");

const names = (state, workoutId) => {
  const w = store.workoutById(state, workoutId);
  return w.exercises.map((e) => store.lookup(state, store.chosen(state, workoutId, e)).name);
};

test("adding an exercise puts it at the bottom of the workout, in its own movement's slot", () => {
  const s = store.resetToDefault();
  const before = names(s, "push_a").length;
  const added = store.addExerciseToWorkout(s, "push_a", "pullup");
  const w = store.workoutById(added, "push_a");
  assert.equal(w.exercises.length, before + 1);
  const entry = w.exercises.at(-1);
  assert.equal(entry.pattern, "vertical_pull");
  assert.equal(store.chosen(added, "push_a", entry), "pullup");
});

test("one from the library joins your exercises on the way in", () => {
  const s = store.resetToDefault();
  const hidden = s.hidden[0];
  assert.ok(hidden, "the default pool hides something");
  const added = store.addExerciseToWorkout(s, "push_a", hidden);
  assert.ok(!added.hidden.includes(hidden));
  assert.ok(store.catalogue(added).some((e) => e.id === hidden));
});

test("an exercise the workout already has is refused", () => {
  const s = store.resetToDefault();
  const w = store.workoutById(s, "push_a");
  const already = store.chosen(s, "push_a", w.exercises[0]);
  assert.equal(store.addExerciseToWorkout(s, "push_a", already), s);
});

test("creating one makes it yours and puts it straight in", () => {
  const s = store.resetToDefault();
  const made = store.createExerciseInWorkout(s, "pull_a", {
    id: "custom_meadows_row",
    name: "Meadows row",
    patterns: ["horizontal_pull"],
    increment: 2.5,
  });
  assert.ok(made.custom.some((e) => e.name === "Meadows row"));
  assert.equal(names(made, "pull_a").at(-1), "Meadows row");
});

test("search finds what people type, best first", () => {
  const all = store.everyExercise(store.resetToDefault());
  const first = (q) => find.searchExercises(all, q)[0]?.name;
  assert.equal(first("pull ups"), "Pull-up");
  assert.equal(first("Pullups"), "Pull-up");
  assert.match(first("squats"), /squat/i);
  assert.match(first("leg press"), /^Leg press/);
  assert.ok(find.searchExercises(all, "chest").length >= 4, "a muscle finds its exercises");
  assert.equal(find.searchExercises(all, "zzzz").length, 0);
  assert.ok(find.hasName(all, "pull-up"));
  assert.ok(find.hasName(all, "pull ups"), "a plural is the same exercise");
  assert.ok(!find.hasName(all, "meadows row"));
});

test("search leaves out the speed lifts that belong only to the power day", () => {
  const all = store.everyExercise(store.resetToDefault());
  assert.ok(all.every((e) => !e.restricted));
});
