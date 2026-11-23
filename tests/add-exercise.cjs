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
const { byId, EXERCISES } = load("@/data/exercises");
const tags = load("@/data/exercise-tags");
const kit = load("@/data/kit");

const names = (state, workoutId) => {
  const w = store.workoutById(state, workoutId);
  return w.exercises.map((e) => store.lookup(state, store.chosen(state, workoutId, e)).name);
};

/** A blank workout of your own, as the store once made one; for the setup below. */
const addWorkout = (s, id, name) => ({ ...s, workouts: [...s.workouts, { id, name, subtitle: "", exercises: [], cardio: { open: null, close: null }, warmup: null, mobility: null }] });

/** Move a slot within its workout; for the setup below. */
const moveEntry = (s, workoutId, from, to) => ({ ...s, workouts: s.workouts.map((w) => {
  if (w.id !== workoutId) return w;
  const exercises = [...w.exercises];
  exercises.splice(to, 0, ...exercises.splice(from, 1));
  return { ...w, exercises };
}) });

test("adding an exercise puts it at the bottom of the workout, in its own movement's slot", () => {
  const s = store.resetToDefault();
  const before = names(s, "push").length;
  const added = store.addExerciseToWorkout(s, "push", "pullup");
  const w = store.workoutById(added, "push");
  assert.equal(w.exercises.length, before + 1);
  const entry = w.exercises.at(-1);
  assert.equal(entry.pattern, "vertical_pull");
  assert.equal(store.chosen(added, "push", entry), "pullup");
});

test("one from the library joins your exercises on the way in", () => {
  const s = store.resetToDefault();
  const hidden = s.hidden[0];
  assert.ok(hidden, "the default pool hides something");
  const added = store.addExerciseToWorkout(s, "push", hidden);
  assert.ok(!added.hidden.includes(hidden));
  assert.ok(store.catalogue(added).some((e) => e.id === hidden));
});

test("an exercise the workout already has is refused", () => {
  const s = store.resetToDefault();
  const w = store.workoutById(s, "push");
  const already = store.chosen(s, "push", w.exercises[0]);
  assert.equal(store.addExerciseToWorkout(s, "push", already), s);
});

test("creating one makes it yours and puts it straight in", () => {
  const s = store.resetToDefault();
  const made = store.createExerciseInWorkout(s, "pull", {
    id: "custom_meadows_row",
    name: "Meadows row",
    patterns: ["horizontal_pull"],
    increment: 2.5,
  });
  assert.ok(made.custom.some((e) => e.name === "Meadows row"));
  assert.equal(names(made, "pull").at(-1), "Meadows row");
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

test("equipment and overlapping movement tags are searchable and filterable", () => {
  const all = store.everyExercise(store.resetToDefault());
  assert.ok(find.searchExercises(all, "kettlebell").some((e) => e.id === "kb_goblet_squat"));
  assert.ok(find.searchExercises(all, "hollow body").some((e) => e.id === "hollow_hold"));
  const multiple = all.find((e) => new Set(find.exerciseTags(e).filter((tag) => ["Push", "Pull", "Legs", "Core"].includes(tag))).size > 1);
  assert.ok(multiple, "at least one exercise belongs to multiple movement families");
});

test("bodyweight and no equipment are different: pull-ups still need a bar", () => {
  const pullup = byId("pullup");
  assert.ok(find.exerciseTags(pullup).includes("Bodyweight"));
  assert.ok(find.exerciseTags(pullup).includes("Pull-up bar"));
});

test("anatomy and movement search do not inherit a convenient workout slot", () => {
  const adduction = byId("hip_adduction");
  assert.ok(adduction.patterns.includes("hamstrings"), "existing slot compatibility stays intact");
  assert.ok(find.searchExercises([adduction], "inner thighs").length);
  assert.equal(find.searchExercises([adduction], "hamstrings").length, 0);
  assert.ok(find.searchExercises(EXERCISES, "resisting rotation").some((e) => e.id === "pallof_press"));
  assert.ok(find.searchExercises(EXERCISES, "kettlebell glutes").some((e) => e.id === "kb_goblet_squat"));
  assert.ok(find.searchExercises(EXERCISES, "bodyweight pull").some((e) => e.id === "pullup"));
});

test("explicit discovery tags describe a new movement without changing its slot", () => {
  const carry = { id: "custom_carry", name: "Suitcase walk", patterns: ["abs"], increment: 4,
    equipment: ["kettlebell"], movements: ["carry"], muscles: ["obliques", "forearms"] };
  assert.ok(find.searchExercises([carry], "kettlebell carry").length);
  assert.ok(find.searchExercises([carry], "forearms").length);
  assert.equal(find.searchExercises([carry], "trunk flexion").length, 0);
  assert.equal(carry.patterns.join(), "abs");
});

test("equipment requirements combine with AND; an anchor is not optional", () => {
  const exercise = { id: "custom_band_press", name: "Band press", patterns: ["horizontal_push"],
    increment: 1, equipment: ["resistance_band", "band_anchor"] };
  const created = store.createExerciseInWorkout(store.resetToDefault(), "push", exercise);
  assert.ok(find.searchExercises([exercise], "bands").length);
  assert.ok(!kit.fits(exercise, { gear: ["resistance_band"] }));
  assert.ok(kit.fits(exercise, { gear: ["resistance_band", "band_anchor"] }));
  assert.ok(kit.fits(exercise, kit.GYM));
  const storage = load("@/store/storage");
  const restored = storage.fromSaved(storage.toSaved(created));
  assert.equal(restored.custom.find((e) => e.id === exercise.id).equipment.join(), exercise.equipment.join());
});

test("the existing pool has valid discovery tags, distinct ball equipment and no false knee curls", () => {
  for (const exercise of EXERCISES) {
    assert.ok(tags.movementsOf(exercise).length, exercise.id);
    assert.ok(tags.musclesOf(exercise).length, exercise.id);
    for (const tag of tags.movementsOf(exercise)) assert.ok(tags.MOVEMENT_LABEL[tag], exercise.id);
    for (const tag of tags.musclesOf(exercise)) assert.ok(tags.MUSCLE_LABEL[tag], exercise.id);
  }
  assert.equal(tags.movementsOf(byId("hip_thrust")).join(), "hip_extension");
  assert.equal(tags.movementsOf(byId("db_rdl")).join(), "hinge");
  assert.equal(tags.movementsOf(byId("leg_press")).join(), "squat");
});

test("a blank workout is empty; twenty exercises can be added, reordered, copied and started", () => {
  let state = addWorkout(store.resetToDefault(), "twenty", "Long workout");
  let built = store.buildWorkout(store.setNextWorkout(state, "twenty"));
  assert.equal(built.active.items.length, 0);
  const ids = store.everyExercise(state).filter((e) => !e.restricted).slice(0, 20).map((e) => e.id);
  for (const id of ids) state = store.addExerciseToWorkout(state, "twenty", id);
  const before = store.workoutById(state, "twenty");
  assert.equal(before.exercises.length, 20);
  state = moveEntry(state, "twenty", 19, 0);
  assert.equal(store.workoutById(state, "twenty").exercises[0].id, before.exercises[19].id);
  state = store.copyWorkout(state, "twenty", "copy_twenty");
  assert.equal(store.workoutById(state, "copy_twenty").exercises.length, 20);
  built = store.buildWorkout(store.setNextWorkout(state, "copy_twenty"));
  assert.equal(built.active.items.length, 20);
  assert.equal(new Set(built.active.items.map((e) => e.exerciseId)).size, 20);
  for (let i = 0; i < 20; i++) assert.equal(store.goToCard(built, i).active.cursor, i);
  assert.equal(store.finishWorkout(built).log.length, 0, "browsing a large workout must not record training");
});

test("custom equipment and multiple movement tags survive saving and fit the right kit", () => {
  const storage = load("@/store/storage");
  const kit = load("@/data/kit");
  let state = store.createExerciseInWorkout(store.resetToDefault(), "push", {
    id: "custom_clean_press", name: "Kettlebell clean and press", patterns: ["vertical_push", "hinge"], equipment: ["kettlebell"], increment: 4,
  });
  state = storage.fromSaved(storage.toSaved(state));
  const exercise = store.everyExercise(state).find((e) => e.id === "custom_clean_press");
  assert.equal(kit.fits(exercise, { gear: [] }), false);
  assert.equal(kit.fits(exercise, { gear: ["kettlebell"] }), true);
});
