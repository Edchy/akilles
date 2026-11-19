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

const exercises = load("@/data/exercises");
const conditioning = load("@/data/conditioning");
const { guideFor } = load("@/data/guides");
const kit = load("@/data/kit");
const { PLANS, routinesOf } = load("@/data/plans");
const store = load("@/store/session");
const storage = load("@/store/storage");

const ids = (list) => list.map((w) => w.id).join();
const paused = (state) => state.removedWorkouts.map((r) => r.workout.id);

test("everyone starts on Push, pull, legs", () => {
  const state = store.resetToDefault();
  assert.equal(store.planOf(state), "ppl");
  assert.equal(ids(state.workouts), "push,pull,legs");
});

test("every PPLPPL lift, routine and machine is one the app knows", () => {
  for (const w of PLANS.pplppl) {
    for (const e of w.exercises) {
      for (const id of e.options) {
        const ex = exercises.byId(id);
        assert.ok(ex, `${w.id}/${id}`);
        assert.ok(ex.patterns.includes(e.pattern), `${w.id}/${id} is not ${e.pattern}`);
        assert.ok(guideFor(id), `${id} has no guide`);
        assert.ok(kit.isListed(id), `${id} has no equipment listed`);
      }
    }
    assert.ok(conditioning.cardioById(w.cardio.open.machine), w.id);
    assert.equal(conditioning.routineUse(conditioning.mobilityById(w.warmup)), "warmup", w.warmup);
    assert.equal(conditioning.routineUse(conditioning.mobilityById(w.mobility)), "end", w.mobility);
  }
  assert.equal(new Set(PLANS.pplppl.map((w) => w.name)).size, 6);
});

test("switching to PPLPPL pauses your workouts, keeps them, and starts at Push A", () => {
  let state = store.resetToDefault();
  state = store.renameWorkout ? store.renameWorkout(state, "push", "My push") : state;
  state = { ...state, history: { "db_bench:6-10": { exerciseId: "db_bench", weight: 30, rung: 1, downStreak: 0, deloads: 0 } } };
  const switched = store.switchPlan(state, "pplppl");
  assert.equal(store.planOf(switched), "pplppl");
  assert.equal(ids(switched.workouts), "push_a,pull_a,legs_a,push_b,pull_b,legs_b");
  assert.deepEqual([...paused(switched)], ["push", "pull", "legs"]);
  assert.equal(switched.nextWorkout, "push_a");
  assert.deepEqual(switched.history, state.history);
  // Its lifts and routines are in your lists, so nothing it names is missing.
  for (const w of PLANS.pplppl) for (const e of w.exercises) assert.ok(!switched.hidden.includes(e.options[0]), e.options[0]);
  for (const r of routinesOf("pplppl")) assert.ok(!switched.hiddenConditioning.includes(r), r);

  // And back: your own push, pull and legs, as you left them.
  const back = store.switchPlan(switched, "ppl");
  assert.equal(store.planOf(back), "ppl");
  assert.equal(ids(back.workouts), "push,pull,legs");
  assert.equal(store.workoutById(back, "push").name, store.workoutById(state, "push").name);
  assert.deepEqual([...paused(back)], ["push_a", "pull_a", "legs_a", "push_b", "pull_b", "legs_b"]);
});

test("each PPLPPL day opens with its cardio and drills and ends on one stretch", () => {
  let state = store.switchPlan(store.resetToDefault(), "pplppl");
  for (const w of PLANS.pplppl) {
    const built = store.buildWorkout(store.setNextWorkout(state, w.id));
    const items = built.active.items;
    assert.equal(items[0].exerciseId, w.cardio.open.machine, w.id);
    assert.ok(items.some((it) => it.exerciseId === w.warmup), `${w.id} has its drills`);
    assert.equal(items.at(-1).exerciseId, w.mobility, `${w.id} ends on its stretch`);
    // A pull-up is done at your step of its chain until you say where you are.
    const lifts = items.filter((it) => store.isLift(it)).map((it) => (it.chain ? "pullup" : it.exerciseId));
    assert.equal(lifts.join(), w.exercises.map((e) => e.options[0]).join(), w.id);
  }
});

test("the first lift of each PPLPPL day climbs 6–10 over four sets; small muscles keep to 10–14", () => {
  const state = store.switchPlan(store.resetToDefault(), "pplppl");
  const built = store.buildWorkout(state);
  const reps = (id) => {
    const at = built.active.items.findIndex((it) => it.exerciseId === id);
    return store.currentPrescription({ ...built, active: { ...built.active, cursor: at } });
  };
  assert.deepEqual([reps("db_bench").reps, reps("db_bench").sets], [6, 4]);
  assert.equal(reps("lateral_raise").reps, 10);
  assert.equal(reps("hollow_hold").reps, 20);
});

test("no plan change in the middle of a workout", () => {
  const training = store.buildWorkout(store.resetToDefault());
  assert.equal(store.switchPlan(training, "pplppl"), training);
});

test("a switched plan survives a save and a load", () => {
  const state = store.switchPlan(store.resetToDefault(), "pplppl");
  const again = storage.fromSaved(storage.toSaved(state));
  assert.equal(store.planOf(again), "pplppl");
  assert.equal(ids(again.workouts), ids(state.workouts));
});
