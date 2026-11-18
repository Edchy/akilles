const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// What you have to train with decides what fills each slot: a gym changes nothing,
// and away a lift too light for the weight on hand gives way to a harder one.
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
const kit = load("@/data/kit");
const fill = load("@/lib/fill");
const guides = load("@/data/guides");
const prog = load("@/lib/progression");
const store = load("@/store/session");

const SCHEME = "6-12";
// Chains placed at the exercise itself, so these read as they always have:
// what a chain does is tested on its own (workout-order.cjs).
const fresh = () => ({ ...store.resetToDefault(), steps: { push_up: 3, pullup: 3 } });
const workout = (state, id) => state.workouts.find((w) => w.id === id);
const filled = (state, id, k, choices) => store.fillWorkout(state, workout(state, id), k, choices);
const withRecord = (state, id, weight, extra = {}) => ({
  ...state,
  history: {
    ...state.history,
    [store.key(id, SCHEME)]: { exerciseId: id, weight, rung: 0, downStreak: 0, deloads: 0, ...extra },
  },
});
const KB = (...weights) => ({ gear: ["kettlebell"], weights: { kettlebell: weights } });

test("every built-in exercise says what it needs", () => {
  const missing = exercises.EXERCISES.filter((e) => !kit.isListed(e.id)).map((e) => e.id);
  assert.equal(missing.length, 0, missing.join(", "));
});

test("at the gym every slot holds exactly what it holds today", () => {
  const state = fresh();
  for (const w of state.workouts) {
    const got = store.fillWorkout(state, w, kit.GYM);
    for (const e of w.exercises) assert.equal(got[e.id], store.chosen(state, w.id, e), `${w.id}/${e.id}`);
  }
});

test("with nothing but you, push day is push-ups, pike push-ups and bench dips", () => {
  const got = filled(fresh(), "push", kit.BODYWEIGHT);
  assert.equal(got["Horizontal press"], "push_up");
  assert.equal(got["Vertical press"], "pike_push_up");
  assert.ok(got["Bodyweight press"], "the second press has an equipment-free alternative");
  assert.equal(got["Triceps"], "bench_dip");
  for (const id of Object.values(got)) if (id) assert.ok(kit.fits({ id }, kit.BODYWEIGHT), id);
});

test("no exercise fills two slots of one workout", () => {
  for (const k of [kit.BODYWEIGHT, KB(10), { gear: ["dumbbells"] }]) {
    const state = fresh();
    for (const w of state.workouts) {
      const ids = Object.values(store.fillWorkout(state, w, k)).filter(Boolean);
      assert.equal(new Set(ids).size, ids.length, w.id);
    }
  }
});

test("a swap made away sticks while the kit has what it needs", () => {
  const state = fresh();
  const choices = { "push/Horizontal press": "db_bench" };
  const db = { gear: ["dumbbells"] };
  assert.equal(filled(state, "push", { gear: ["dumbbells", "bench"] }, choices)["Horizontal press"], "db_bench");
  // No bench: the pick can't be done, so the slot falls back.
  assert.notEqual(filled(state, "push", db, choices)["Horizontal press"], "db_bench");
});

test("ruled-out exercises never fill a slot", () => {
  const state = fresh();
  const got = store.fillWorkout(state, workout(state, "legs"), kit.GYM, state.choices, ["goblet_squat"]);
  assert.notEqual(got["Squat"], "goblet_squat");
  assert.ok(got["Squat"]);
});

test("one 10 kg kettlebell for someone with a 24 kg goblet squat: split squats stand in", () => {
  // The kettlebell goblet squat borrows the dumbbell number: 10 kg is far too light.
  const state = withRecord(withRecord(fresh(), "goblet_squat", 24), "split_squat", 10);
  const k = { gear: ["kettlebell", "dumbbells"], weights: { kettlebell: [10], dumbbells: [10] } };
  const got = filled(state, "legs", k);
  assert.notEqual(got["Squat"], "kb_goblet_squat");
  assert.equal(exercises.byId(got["Squat"]).patterns.includes("lunge"), true);
});

test("one 24 kg kettlebell for the same lifter: kettlebell goblet squats", () => {
  const state = withRecord(fresh(), "goblet_squat", 24);
  assert.equal(filled(state, "legs", KB(24))["Squat"], "kb_goblet_squat");
});

test("one 10 kg kettlebell and nothing else: a bodyweight split squat, not an easy squat", () => {
  const state = withRecord(fresh(), "goblet_squat", 24);
  assert.equal(filled(state, "legs", KB(10))["Squat"], "bw_split_squat");
});

test("with nothing better, a light lift still beats an empty slot", () => {
  const light = { ex: exercises.byId("kb_goblet_squat"), due: 24, known: true };
  assert.equal(fill.pick([light], [], KB(10)), "kb_goblet_squat");
});

test("with nothing to go on, the slot's own order stands, bodyweight lifts included", () => {
  const state = fresh();
  assert.equal(filled(state, "legs", kit.BODYWEIGHT)["Squat"], "bw_squat");
  assert.equal(filled(state, "pull", kit.GYM)["Abs"], store.chosen(state, "pull", workout(state, "pull").exercises.find((e) => e.id === "Abs")));
});

test("a lift never done is never judged by a guess", () => {
  // No record and no twin: the 32 kg bell is used, and the first set tells.
  assert.equal(filled(fresh(), "legs", KB(32))["Squat"], "kb_goblet_squat");
});

test("too heavy to do well: the slot gives way or sits out", () => {
  const state = withRecord(fresh(), "db_shoulder", 12);
  assert.notEqual(filled(state, "push", KB(32))["Vertical press"], "kb_press");
  assert.equal(filled(state, "push", KB(12))["Vertical press"], "kb_press");
});

test("with only some weights, a step up goes to the next one there is", () => {
  const st = { exerciseId: "kb_goblet_squat", weight: 12, rung: 3, downStreak: 0, deloads: 0 };
  const top = prog.ladderOf(exercises.byId("kb_goblet_squat"), SCHEME)[3];
  const after = prog.applyResult(st, SCHEME, [top, top, top], Date.now(), [12, 20]);
  assert.equal(after.weight, 20);
  assert.equal(after.rung, 0);
});

test("topped out at the heaviest bell, the lift stays at the top and counts as outgrown", () => {
  const st = { exerciseId: "kb_goblet_squat", weight: 10, rung: 3, downStreak: 0, deloads: 0 };
  const top = prog.ladderOf(exercises.byId("kb_goblet_squat"), SCHEME)[3];
  const after = prog.applyResult(st, SCHEME, [top, top, top], Date.now(), [10]);
  assert.equal(after.weight, 10);
  assert.equal(after.rung, 3);
  assert.equal(after.maxed, true);
  // A pair of 8s too: far too light for the 24 kg dumbbell goblet squat, but
  // a split squat has never been done, so it gets its chance.
  const k = { gear: ["kettlebell", "dumbbells"], weights: { kettlebell: [10], dumbbells: [8] } };
  const state = withRecord(
    { ...fresh(), history: { [store.key("kb_goblet_squat", SCHEME)]: after } },
    "goblet_squat",
    24,
  );
  assert.equal(fill.fitOf({ ex: exercises.byId("kb_goblet_squat"), due: 10, maxed: true, known: true }, k), "outgrown");
  assert.equal(exercises.byId(filled(state, "legs", k)["Squat"]).patterns.includes("lunge"), true);
});

test("with any weight on hand, a step up is one increment as always", () => {
  const st = { exerciseId: "goblet_squat", weight: 20, rung: 3, downStreak: 0, deloads: 0 };
  const top = prog.ladderOf(exercises.byId("goblet_squat"), SCHEME)[3];
  assert.equal(prog.applyResult(st, SCHEME, [top, top, top], Date.now()).weight, 22.5);
});

// ---- places ----

const lifts = (state) => state.active.items.filter((it) => !it.kind || it.kind === "lift");

test("your usual place is a gym, and a workout there is built exactly as before", () => {
  const state = fresh();
  assert.equal(store.placeOf(state), "usual");
  const built = store.buildWorkout(state);
  const push = workout(state, "push");
  assert.deepEqual(
    lifts(built).map((it) => it.exerciseId).join(),
    push.exercises.map((e) => store.chosen(state, "push", e)).join(),
  );
  assert.ok(built.active.items.some((it) => it.kind === "cardio"));
});

test("away with nothing: the same workout comes next, with what can be done anywhere", () => {
  const state = store.setPlace(fresh(), "away", kit.BODYWEIGHT);
  assert.equal(store.upNext(state).id, "push");
  const built = store.buildWorkout(state);
  const ids = lifts(built).map((it) => it.exerciseId);
  assert.ok(ids.includes("push_up"));
  for (const id of ids) assert.ok(kit.fits({ id }, kit.BODYWEIGHT), id);
  // No machines, no band: a walk or jog outside opens it, the warm-up needs
  // nothing, nothing closes it but the stretch.
  const cardio = built.active.items.filter((it) => it.kind === "cardio");
  assert.equal(cardio.map((it) => it.exerciseId).join(), "outdoor");
  assert.equal(cardio[0].minutes, 5);
  const warmup = built.active.items.find((it) => it.slot === store.WARMUP_SLOT);
  assert.equal(warmup.exerciseId, "warmup_push:away");
  assert.ok(built.active.items.some((it) => it.slot === store.MOBILITY_SLOT));
  // Skipping rope is one swap away; the gym's machines aren't.
  const opening = { ...built, active: { ...built.active, cursor: built.active.items.indexOf(cardio[0]) } };
  assert.equal(store.conditioningPool(opening, cardio[0]).map((o) => o.id).join(), "outdoor,skipping,jumping_jacks");
  // What sits out is said, not hidden.
  assert.deepEqual(
    store.sittingOut(state, workout(state, "push")).map((e) => e.slot).join(),
    "",
  );
});

test("the preview shows what you will actually do here", () => {
  const state = store.setPlace(fresh(), "away", kit.BODYWEIGHT);
  const names = store.workoutPreview(state, workout(state, "push")).map((r) => r.name);
  assert.ok(names.includes(exercises.byId("push_up").name));
  assert.ok(!names.includes(exercises.byId("db_bench").name));
});

test("one 12 kg kettlebell: the weight is the bell, and topping out keeps it there", () => {
  let state = withRecord(fresh(), "db_shoulder", 12);
  state = store.setPlace(state, "away", KB(12));
  const built = store.buildWorkout(state);
  const press = lifts(built).find((it) => it.exerciseId === "kb_press");
  assert.ok(press, "the kettlebell press fills the vertical press");
  // It borrows the dumbbell number, and the bell on hand is the weight.
  assert.equal(press.weight, 12);
});

test("back at the gym, the gym lifts are where you left them", () => {
  let state = withRecord(fresh(), "db_bench", 22.5);
  state = store.setPlace(state, "away", kit.BODYWEIGHT);
  state = store.buildWorkout(state);
  state = store.finishWorkout(state);
  state = store.setPlace(state, "usual");
  assert.equal(state.history[store.key("db_bench", SCHEME)].weight, 22.5);
  assert.equal(store.kitAt(state, "away").gear.length, 0, "the away kit is remembered");
});

test("the place can't change in the middle of a workout", () => {
  const state = store.buildWorkout(fresh());
  assert.equal(store.setPlace(state, "away", kit.BODYWEIGHT), state);
});

test("a swap away offers only what the place has", () => {
  let state = store.setPlace(fresh(), "away", { gear: ["dumbbells"] });
  state = store.buildWorkout(state);
  const at = state.active.items.findIndex((it) => it.slot === "Horizontal press");
  state = { ...state, active: { ...state.active, cursor: at } };
  const pool = store.currentPool(state);
  assert.ok(pool.length > 0);
  for (const id of pool) assert.ok(kit.fits({ id }, { gear: ["dumbbells"] }), id);
});

// The promise shown after a set must match the result saved at Finish.
const finishedPress = (weights, extra = {}, reps = 12) => {
  let state = withRecord(fresh(), "kb_press", 12, { rung: 3, ...extra });
  state = store.setPlace(state, "away", KB(...weights));
  state = store.buildWorkout(state);
  const at = state.active.items.findIndex((it) => it.exerciseId === "kb_press");
  assert.ok(at >= 0);
  return { ...state, active: { ...state.active, cursor: at, items: state.active.items.map((it, i) =>
    i === at ? { ...it, logged: it.logged.map(() => reps) } : it,
  ) } };
};

test("the verdict and saved progression use the same sparse rack", () => {
  const state = finishedPress([12, 20]);
  assert.equal(store.nextTime(state).fact, "Up to 20 kg next time.");
  assert.equal(store.finishWorkout(state).history[store.key("kb_press", SCHEME)].weight, 20);
});

test("the verdict never promises a heavier bell when already at the heaviest", () => {
  const state = finishedPress([12]);
  assert.match(store.nextTime(state).fact, /again next time.*top/);
  assert.equal(store.finishWorkout(state).history[store.key("kb_press", SCHEME)].weight, 12);
});

test("a bottom-rung miss chooses an available lighter bell, even off the usual increments", () => {
  const state = finishedPress([10, 12], { rung: 0, downStreak: 1 }, 4);
  assert.equal(store.nextTime(state).fact, "Lighter next time: 10 kg.");
  const finished = store.finishWorkout(state);
  assert.equal(finished.history[store.key("kb_press", SCHEME)].weight, 10);
  const next = store.buildWorkout({ ...finished, nextWorkout: "push" });
  assert.equal(lifts(next).find((it) => it.exerciseId === "kb_press").weight, 10);
});

test("with no lighter bell, the failed weight cannot be prescribed again, even as an explicit choice", () => {
  const state = finishedPress([12], { rung: 0, downStreak: 1 }, 4);
  assert.match(store.nextTime(state).fact, /None here/);
  let finished = store.finishWorkout(state);
  const rec = finished.history[store.key("kb_press", SCHEME)];
  assert.equal(rec.lighterThan, 12);
  finished = { ...finished, nextWorkout: "push", choices: { ...finished.choices, "push/Vertical press": "kb_press" } };
  const storage = load("@/store/storage");
  finished = storage.fromSaved(storage.toSaved(finished));
  const next = store.buildWorkout(finished);
  assert.ok(!lifts(next).some((it) => it.exerciseId === "kb_press"));
  // Taking a lighter bell next time makes this exercise usable again.
  const lighterKit = store.setPlace(finished, "away", KB(8, 12));
  const available = store.buildWorkout(lighterKit);
  assert.equal(lifts(available).find((it) => it.exerciseId === "kb_press").weight, 8);
});

test("changing kit before the lighter session cannot round back to the failed weight", () => {
  const failed = finishedPress([10, 12], { rung: 0, downStreak: 1 }, 4);
  const finished = store.finishWorkout(failed);
  const nextPlace = store.setPlace({ ...finished, nextWorkout: "push" }, "away", KB(12));
  const next = store.buildWorkout(nextPlace);
  assert.ok(!lifts(next).some((it) => it.exerciseId === "kb_press"));
});
