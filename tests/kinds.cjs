const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// The real starting-weight rules, store and exercise list, without a native runtime.
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

const { byId } = load("@/data/exercises");
const kinds = load("@/data/kinds");
const store = load("@/store/session");

const lifts = (state, w) => w.exercises.map((e) => store.chosen(state, w.id, e));
const families = load("@/data/families");

test("a new workout of each kind arrives named, filled and balanced", () => {
  let state = store.resetToDefault();
  for (const kind of kinds.KIND_ORDER) state = store.addWorkoutOfKind(state, `w_${kind}`, kind);
  const made = (kind) => state.workouts.find((w) => w.id === `w_${kind}`);
  assert.equal(made("push").name, "Push 2", "Klay's own Push is already there");
  assert.equal(made("full").name, "Full body");
  assert.equal(made("free").name, "Empty");
  assert.equal(made("free").exercises.length, 0);
  for (const kind of ["push", "pull", "legs", "full"]) {
    const w = made(kind);
    assert.equal(w.kind, kind);
    assert.ok(w.exercises.length >= 4 && w.exercises.length <= 6, `${kind}: ${w.exercises.length}`);
    // Ready to train: everything it uses is in your catalogue, and nothing in it argues with its kind.
    for (const id of lifts(state, w)) {
      assert.ok(!state.hidden.includes(id), `${kind} ${id} hidden`);
      assert.ok(kinds.fitsKind(kind, byId(id)), `${kind} ${id} does not fit`);
    }
    assert.equal(store.balanceNotes(state, w).length, 0, `${kind} is balanced`);
    // Cardio, warm-up and stretch fill themselves.
    assert.equal(w.cardio, undefined);
    assert.equal(w.mobility, undefined);
  }
  const full = new Set(lifts(state, made("full")).map((id) => families.familyOf(byId(id))));
  for (const f of ["push", "pull", "legs"]) assert.ok(full.has(f), `full body has ${f}`);
});

test("what fits a kind: by any movement an exercise counts as, core everywhere", () => {
  assert.ok(kinds.fitsKind("pull", byId("face_pull")), "a face pull is a row too");
  assert.ok(!kinds.fitsKind("pull", byId("bench")));
  assert.ok(kinds.fitsKind("push", byId("lateral_raise")));
  for (const kind of kinds.KIND_ORDER) assert.ok(kinds.fitsKind(kind, byId("plank")), `${kind} takes core`);
  for (const id of ["bench", "lat_pulldown", "goblet_squat"]) {
    assert.ok(kinds.fitsKind("full", byId(id)));
    assert.ok(kinds.fitsKind("free", byId(id)));
  }
});

test("workouts from before kinds read as one, and a copy keeps it", () => {
  assert.equal(kinds.kindOf({ id: "push" }), "push");
  assert.equal(kinds.kindOf({ id: "full_b" }), "full");
  assert.equal(kinds.kindOf({ id: "w_123" }), "free", "your own old workouts guide nothing");
  const state = store.copyWorkout(store.resetToDefault(), "pull", "copy");
  assert.equal(state.workouts.find((w) => w.id === "copy").kind, "pull");
});

test("balance is a word, never a rule", () => {
  let state = store.addWorkoutOfKind(store.resetToDefault(), "f", "full");
  const strip = (pattern) => {
    const w = state.workouts.find((x) => x.id === "f");
    return { ...state, workouts: state.workouts.map((x) => (x.id === "f" ? { ...w, exercises: w.exercises.filter((e) => !pattern.includes(e.pattern)) } : x)) };
  };
  const noLegs = strip(["squat", "hinge"]);
  assert.deepEqual([...store.balanceNotes(noLegs, noLegs.workouts.find((w) => w.id === "f"))], ["No legs exercise yet. A full body day has one of each."]);
  const onlyLegs = strip(["horizontal_push", "vertical_push", "horizontal_pull", "vertical_pull"]);
  assert.match(store.balanceNotes(onlyLegs, onlyLegs.workouts.find((w) => w.id === "f"))[0], /^No pressing or pulling exercise yet/);
  // Past eight lifts, any kind gets the gentle word, and can still be trained.
  for (const id of ["leg_ext", "seated_leg_curl", "calf_raise", "hip_thrust", "bulgarian"]) state = store.addExerciseToWorkout(state, "legs", id);
  const legs = state.workouts.find((w) => w.id === "legs");
  assert.match(store.balanceNotes(state, legs).at(-1), /^That's a long one: 10 exercises/);
  assert.ok(store.buildWorkout(store.setNextWorkout(state, "legs")).active);
});

test("a workout's shape comes from its kind, else from what is in it", () => {
  const { familyOfLifts } = kinds;
  // The kind decides, whatever is in it.
  assert.equal(familyOfLifts("full", ["push", "legs", "pull"]), "full");
  assert.equal(familyOfLifts("pull", ["push", "push", "pull"]), "pull");
  // Without one: a family with more than half wins.
  assert.equal(familyOfLifts("free", ["push", "push", "push", "core"]), "push");
  // No majority across push, pull and legs: full body.
  assert.equal(familyOfLifts("free", ["push", "legs", "pull"]), "full");
  assert.equal(familyOfLifts("free", ["push", "pull", "core", "core"]), "full");
  // No majority, but only one of the three: still that one, not full body.
  assert.equal(familyOfLifts("free", ["push", "core"]), "push");
  assert.equal(familyOfLifts("free", []), undefined);

  // Klay's own full-body days are full, and Push stays push.
  let state = store.resetToDefault();
  state = store.addWorkoutOfKind(state, "fb", "full");
  assert.equal(store.workoutFamily(state, store.workoutById(state, "fb")), "full");
  assert.equal(store.workoutFamily(state, store.workoutById(state, "push")), "push");
  // An Empty workout filled with one of each reads as full body.
  state = store.addWorkoutOfKind(state, "mine", "free");
  for (const id of ["db_bench", "goblet_squat", "cable_row"]) state = store.addExerciseToWorkout(state, "mine", id);
  assert.equal(store.workoutFamily(state, store.workoutById(state, "mine")), "full");
});

test("swap for today always has somewhere to go, and works after a set too", () => {
  // A workout of one push-up, and a catalogue with no other press in it.
  let state = store.addWorkoutOfKind(store.resetToDefault(), "home", "free");
  state = store.addExerciseToWorkout(state, "home", "push_up");
  state = { ...state, hidden: [...state.hidden, ...["db_bench", "bench", "machine_chest_press", "incline_db"].filter((id) => !state.hidden.includes(id))] };
  // The push-up chain at the push-up itself.
  state = store.buildWorkout(store.setNextWorkout({ ...state, steps: { push_up: 3 } }, "home"));
  state = store.goToCard(state, state.active.items.findIndex((it) => it.exerciseId === "push_up"));
  const pool = store.currentPool(state);
  assert.ok(pool.length > 1, "the library is in reach");
  assert.equal(pool[0], "push_up");
  // A set in, and the swap still goes through, fresh from set one.
  const other = pool.find((id) => id !== "push_up" && !store.currentTaken(state).has(id));
  state = store.tapSet(state, 0);
  const swapped = store.swapForSession(state, other);
  const item = swapped.active.items[swapped.active.cursor];
  assert.equal(item.exerciseId, other);
  assert.ok(item.logged.every((r) => r === null));
});

test("yoga and kung fu routines come with Klay, made of moves the library has", () => {
  const c = load("@/data/conditioning");
  const yoga = c.mobilityById("yoga");
  const kungFu = c.mobilityById("kung_fu");
  assert.ok(yoga && kungFu);
  assert.equal(c.routineUse(yoga), "end");
  assert.equal(c.routineUse(kungFu), "warmup");
  for (const m of [...yoga.moves, ...kungFu.moves]) assert.ok(c.stretchById(m.stretch), `${m.name} is in All moves`);
  // On offer from the start, beside the day warm-ups and the everyday stretch.
  const pool = c.mobilityPool([]).map((r) => r.id);
  for (const id of ["everyday", "warmup_push", "yoga", "kung_fu"]) assert.ok(pool.includes(id), id);
});

test("a removed routine shows as removed, workouts fall back, and it puts back", () => {
  let state = store.setMobility(store.resetToDefault(), "push", "yoga");
  assert.equal(store.mobilityPlan(state, store.workoutById(state, "push")).id, "yoga");
  state = store.removeConditioning(state, "yoga");
  assert.ok(store.hiddenConditioningList(state).some((r) => r.id === "yoga" && r.kind === "mobility"));
  // Push gets Klay's usual stretch instead.
  assert.equal(store.mobilityPlan(state, store.workoutById(state, "push")).id, "everyday");
  state = store.restoreConditioning(state, "yoga");
  assert.ok(!store.hiddenConditioningList(state).some((r) => r.id === "yoga"));
  // And its old place comes back with it.
  assert.equal(store.mobilityPlan(state, store.workoutById(state, "push")).id, "yoga");
});


test("Bodyweight is ready with no equipment even when the saved place is the gym", () => {
  let state = store.addWorkoutOfKind(store.resetToDefault(), "away", "bodyweight");
  const workout = store.workoutById(state, "away");
  const { needsOf } = load("@/data/kit");
  assert.equal(workout.name, "Bodyweight");
  assert.equal(store.workoutFamily(state, workout), "full");
  assert.equal(workout.exercises.length, 5);
  for (const id of lifts(state, workout)) {
    const ex = byId(id);
    assert.equal(needsOf(ex).length, 0, `${id} must need no equipment`);
    assert.ok(ex.holds || ex.timed || ex.unloaded, `${id} must never prescribe an added weight`);
    assert.ok(kinds.fitsKind("bodyweight", ex));
    assert.ok(!state.hidden.includes(id));
  }
  for (const where of ["open", "close"]) assert.equal(store.cardioPlan(state, workout, where), null);
  assert.ok(store.warmupPlan(state, workout));
  assert.equal(store.mobilityPlan(state, workout).id, "everyday");
  const active = store.buildWorkout(store.setNextWorkout(state, "away")).active;
  assert.equal(active.items.length, 7);
  assert.equal(active.items[0].kind, "mobility");
  assert.equal(active.items.at(-1).exerciseId, "everyday");
  assert.ok(!active.items.some((item) => item.kind === "cardio"));
  const activeLifts = active.items.filter((item) => !item.kind || item.kind === "lift");
  assert.equal(activeLifts.length, 5);
  assert.ok(activeLifts.every((item) => item.sets === 2));
  assert.ok(!kinds.fitsKind("bodyweight", byId("pullup")), "bodyweight pull-ups still require equipment");
  assert.ok(!kinds.fitsKind("bodyweight", byId("goblet_squat")));
  state = store.copyWorkout(state, "away", "away_copy");
  const copy = store.workoutById(state, "away_copy");
  assert.equal(copy.kind, "bodyweight");
  assert.equal(store.cardioPlan(state, copy, "open"), null);
});


test("the first Bodyweight template gets routine defaults back once on reload", () => {
  const storage = load("@/store/storage");
  let state = store.addWorkoutOfKind(store.resetToDefault(), "away", "bodyweight");
  state = store.setWarmup(state, "away", null);
  state = store.setMobility(state, "away", null);
  const restored = storage.fromSaved(JSON.stringify({ version: 18, state }));
  const workout = store.workoutById(restored, "away");
  assert.ok(store.warmupPlan(restored, workout));
  assert.equal(store.mobilityPlan(restored, workout).id, "everyday");
  assert.equal(store.cardioPlan(restored, workout, "open"), null);
  // Subsequent removals are deliberate edits and survive saving.
  const edited = store.setMobility(store.setWarmup(restored, "away", null), "away", null);
  const again = storage.fromSaved(storage.toSaved(edited));
  assert.equal(store.warmupPlan(again, store.workoutById(again, "away")), null);
  assert.equal(store.mobilityPlan(again, store.workoutById(again, "away")), null);
});
