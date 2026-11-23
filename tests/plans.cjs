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
const { PLANS } = load("@/data/plans");
const store = load("@/store/session");
const storage = load("@/store/storage");

const ids = (list) => list.map((w) => w.id).join();
const paused = (state) => state.removedWorkouts.map((r) => r.workout.id);

test("everyone starts on Push, pull, legs, with PPLPPL waiting", () => {
  const state = store.resetToDefault();
  assert.equal(store.loopInUse(state), "ppl");
  assert.equal(ids(state.workouts), "push,pull,legs");
  const plans = store.loopsOf(state);
  assert.equal(plans.map((p) => p.name).join("|"), "Push, pull, legs|Push, pull, legs, twice over");
  assert.equal(ids(plans[1].workouts), ids(PLANS.pplppl));
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

test("switching to PPLPPL keeps Push, pull, legs waiting as it was, and weights carry over", () => {
  let state = store.resetToDefault();
  state = store.setNextWorkout(store.renameWorkout(state, "push", { name: "My push" }), "pull");
  state = { ...state, history: { "db_bench:6-10": { exerciseId: "db_bench", weight: 30, rung: 1, downStreak: 0, deloads: 0 } } };
  const switched = store.switchLoop(state, "pplppl");
  assert.equal(store.loopInUse(switched), "pplppl");
  assert.equal(ids(switched.workouts), "push_a,pull_a,legs_a,push_b,pull_b,legs_b");
  assert.equal(paused(switched).length, 0, "nothing of the other plan is paused here");
  assert.equal(switched.nextWorkout, "push_a");
  assert.deepEqual(switched.history, state.history);
  // Its lifts and routines are in your lists, so nothing it names is missing.
  for (const w of PLANS.pplppl) for (const e of w.exercises) assert.ok(!switched.hidden.includes(e.options[0]), e.options[0]);
  for (const w of PLANS.pplppl) for (const r of [w.warmup, w.mobility]) assert.ok(!switched.hiddenConditioning.includes(r), r);
  const bench = store.buildWorkout(switched).active.items.find((it) => it.exerciseId === "db_bench");
  assert.equal(bench.weight, 30, "the same bench, the same weight");

  // And back: your own push, pull and legs, where you left off.
  const back = store.switchLoop(switched, "ppl");
  assert.equal(ids(back.workouts), "push,pull,legs");
  assert.equal(store.workoutById(back, "push").name, "My push");
  assert.equal(back.nextWorkout, "pull");
});

test("a plan of your own: added empty, used, filled on Plan, and kept when you switch away", () => {
  let state = store.newLoop(store.resetToDefault(), "travel", "Travel");
  assert.equal(store.loopInUse(state), "ppl", "a new plan waits until you use it");
  state = store.switchLoop(state, "travel");
  assert.equal(state.workouts.length, 0);
  assert.equal(store.upNext(state), undefined);
  assert.equal(store.buildWorkout(state), state, "nothing to start");
  assert.equal(store.skipWorkout(state), state);
  assert.equal(store.upcomingWorkouts(state, 3).length, 0);
  state = store.addWorkoutOfKind(state, "bw1", "bodyweight");
  assert.equal(store.upNext(state).id, "bw1");
  state = store.switchLoop(store.switchLoop(state, "pplppl"), "travel");
  assert.equal(ids(state.workouts), "bw1", "it comes back with its workout");
  assert.equal(store.loopsOf(state).map((p) => p.name).join("|"), "Push, pull, legs|Push, pull, legs, twice over|Travel");
});

test("plans can be renamed, and deleted when not in use; names stay unique", () => {
  let state = store.newLoop(store.resetToDefault(), "a", "Home");
  state = store.newLoop(state, "b", "Home");
  assert.equal(store.loopName(state, "b"), "Home 2");
  state = store.renameLoop(state, "ppl", "Gym");
  assert.equal(store.loopName(state, "ppl"), "Gym");
  assert.equal(store.renameLoop(state, "ppl", "  "), state, "a blank name is ignored");
  assert.equal(store.deleteLoop(state, "ppl"), state, "not the plan in use");
  state = store.deleteLoop(state, "pplppl");
  assert.equal(store.loopsOf(state).map((p) => p.name).join("|"), "Gym|Home|Home 2");
  // Down to the one in use, it keeps its name.
  state = store.deleteLoop(store.deleteLoop(state, "a"), "b");
  assert.equal(store.loopsOf(state).map((p) => p.name).join(), "Gym");
});

test("each PPLPPL day opens with its cardio and drills and ends on one stretch", () => {
  let state = store.switchLoop(store.resetToDefault(), "pplppl");
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

test("the first lift of each PPLPPL day climbs 6–10 over three sets; small muscles keep to 10–14", () => {
  const state = store.switchLoop(store.resetToDefault(), "pplppl");
  const built = store.buildWorkout(state);
  const reps = (id) => {
    const at = built.active.items.findIndex((it) => it.exerciseId === id);
    return store.currentPrescription({ ...built, active: { ...built.active, cursor: at } });
  };
  assert.deepEqual([reps("db_bench").reps, reps("db_bench").sets], [6, 3]);
  assert.equal(reps("lateral_raise").reps, 10);
  assert.equal(reps("hollow_hold").reps, 20);
});

test("no plan change in the middle of a workout", () => {
  const training = store.buildWorkout(store.resetToDefault());
  assert.equal(store.switchLoop(training, "pplppl"), training);
});

test("plans survive a save and a load, and a backup restores them", () => {
  let state = store.switchLoop(store.newLoop(store.resetToDefault(), "travel", "Travel"), "pplppl");
  state = store.inLoop(state, "travel", (s) => store.addWorkoutOfKind(s, "bw1", "bodyweight"));
  const again = storage.fromSaved(storage.toSaved(state));
  assert.equal(store.loopInUse(again), "pplppl");
  assert.equal(ids(again.workouts), ids(state.workouts));
  assert.equal(JSON.stringify(store.loopsOf(again)), JSON.stringify(store.loopsOf(state)));
});

test("a save from before plans becomes two: the one in use, and the other from its paused workouts", () => {
  const v22 = (state) => JSON.stringify({ version: 22, state: { ...state, loops: undefined } });
  // On Push, pull, legs, with PPLPPL never tried: PPLPPL arrives fresh.
  let old = store.addWorkoutOfKind(store.resetToDefault(), "mine", "full");
  let now = storage.fromSaved(v22(old));
  assert.equal(store.loopInUse(now), "ppl");
  assert.equal(ids(now.workouts), "push,pull,legs,mine", "your own stay with the plan in use");
  assert.equal(ids(store.loopsOf(now)[1].workouts), ids(PLANS.pplppl));
  // On PPLPPL, switched to the old way: Push, pull, legs comes back from paused.
  const pausedPpl = {
    ...old,
    workouts: PLANS.pplppl,
    nextWorkout: "pull_a",
    removedWorkouts: old.workouts.map((workout, at) => ({ workout, at: 6 + at })),
    planOrder: [...ids(PLANS.pplppl).split(","), ...ids(old.workouts).split(",")],
  };
  now = storage.fromSaved(v22(pausedPpl));
  assert.equal(store.loopInUse(now), "pplppl");
  assert.equal(now.nextWorkout, "pull_a");
  assert.equal(ids(now.removedWorkouts.map((r) => r.workout)), "mine", "your own stay, paused, with the plan in use");
  const ppl = store.loopsOf(now).find((p) => p.id === "ppl");
  assert.equal(ids(ppl.workouts), "push,pull,legs");
});

test("a save whose PPLPPL days named their own routines gets the day mobility and the everyday stretch", () => {
  const old = PLANS.pplppl.map((w) => ({ ...w, warmup: `pplppl_${w.kind}`, mobility: `pplppl_${w.kind}_end` }));
  const state = { ...store.resetToDefault(), loops: undefined, workouts: old, nextWorkout: "push_a", hiddenConditioning: ["pplppl_push"], mobilityEdits: { pplppl_pull: { name: "Mine" } } };
  const now = storage.fromSaved(JSON.stringify({ version: 22, state }));
  assert.equal(store.loopInUse(now), "pplppl");
  for (const w of now.workouts) {
    assert.equal(w.warmup, conditioning.WARMUP[w.kind], w.id);
    assert.equal(w.mobility, "everyday", w.id);
  }
  assert.ok(!now.hiddenConditioning.some((id) => id.startsWith("pplppl_")));
  assert.equal(Object.keys(now.mobilityEdits).length, 0);
});

test("Push, Pull and Legs saved on the general warm-up open on their own day's", () => {
  const old = store.resetToDefault().workouts.map((w) => ({ ...w, warmup: "warmup" }));
  const state = { ...store.resetToDefault(), loops: undefined, workouts: old };
  const now = storage.fromSaved(JSON.stringify({ version: 22, state }));
  assert.equal(now.workouts.map((w) => w.warmup).join(), "warmup_push,warmup_pull,warmup_legs");
});

test("where you trained before plans becomes each plan's own kit", () => {
  const home = { gear: ["dumbbells"], weights: { dumbbells: [10, 20] } };
  const base = { ...store.resetToDefault(), loops: undefined };
  // Away with nothing: the plan in use is trained with nothing; the other at home.
  let now = storage.fromSaved(JSON.stringify({ version: 22, state: { ...base, place: "away", kits: { usual: home, away: { gear: [] } } } }));
  assert.equal(store.kitOfLoop(now, "ppl").gear.length, 0);
  assert.equal(store.kitOfLoop(now, "pplppl").gear.join(), "dumbbells");
  assert.equal(now.place, undefined);
  assert.equal(now.kits, undefined);
  // At the gym: both plans at a full gym.
  now = storage.fromSaved(JSON.stringify({ version: 22, state: base }));
  assert.equal(store.kitOfLoop(now, "ppl"), undefined);
  assert.equal(store.kitOfLoop(now, "pplppl"), undefined);
});

test("saves before version 25: a PPLPPL day's first lift at four sets goes to three; any other count stays", () => {
  const state = store.switchLoop(store.resetToDefault(), "pplppl");
  const set = (w, sets) => ({ ...w, exercises: [{ ...w.exercises[0], sets }, ...w.exercises.slice(1)] });
  const old = { ...state, workouts: state.workouts.map((w) => (w.id === "push_a" ? set(w, 4) : w.id === "pull_a" ? set(w, 5) : w)) };
  const fixed = storage.toThreeSets(old);
  const first = (id) => fixed.workouts.find((w) => w.id === id).exercises[0];
  assert.equal(first("push_a").sets, undefined);
  assert.equal(first("pull_a").sets, 5);
  const built = store.buildWorkout(fixed);
  assert.equal(store.currentPrescription({ ...built, active: { ...built.active, cursor: built.active.items.findIndex((it) => it.exerciseId === "db_bench") } }).sets, 3);
});
