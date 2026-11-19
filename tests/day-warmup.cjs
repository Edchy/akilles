const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Every day opens with its warm-up, right after the cardio: moves for what
// that day works — shoulders and chest, the back and lats, or the legs.
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
const conditioning = load("@/data/conditioning");
const guides = load("@/data/guides");

const fresh = () => store.resetToDefault();
const plain = (value) => JSON.parse(JSON.stringify(value));
const started = (state, id) => store.buildWorkout(store.setNextWorkout(state, id)).active.items;
const warmupOf = (state, id) => started(state, id).find((it) => it.slot === store.WARMUP_SLOT);
/** The workouts with no warm-up of their own, so each takes its day's. */
const byDay = (state) => ({ ...state, workouts: state.workouts.map(({ warmup: _own, ...w }) => w) });

test("the easy plan opens every day on the same warm-up, straight after the cardio", () => {
  const items = started(fresh(), "push");
  assert.equal(items[1].slot, "Warm-up");
  assert.equal(items[1].exerciseId, "warmup");
  assert.equal(items[2].exerciseId, "db_bench");
  assert.equal(warmupOf(fresh(), "pull").exerciseId, "warmup");
  assert.equal(warmupOf(fresh(), "legs").exerciseId, "warmup");
  const preview = store.workoutPreview(fresh(), store.workoutById(fresh(), "push"));
  assert.deepEqual(plain(preview.slice(0, 2).map((r) => r.name)), ["Treadmill", "Warm-up"]);
  const moves = conditioning.mobilityById("warmup").moves;
  assert.deepEqual(plain(moves.map((m) => [m.stretch, m.reps])), [["cat_cow", 8], ["worlds_greatest", 3], ["arm_circles", 20], ["bodyweight_squat", 10]]);
  assert.ok(store.routineMinutes(conditioning.mobilityById("warmup")) <= 5);
});

test("a workout with no warm-up of its own opens with its day's", () => {
  const state = byDay(fresh());
  assert.equal(warmupOf(state, "push").exerciseId, "warmup_push");
  assert.equal(warmupOf(state, "pull").exerciseId, "warmup_pull");
  assert.equal(warmupOf(state, "legs").exerciseId, "warmup_legs");
});

test("each opens on the wide stance and the side stance, then the day's own moves", () => {
  const moves = (id) => plain(conditioning.mobilityById(id).moves.map((m) => m.id));
  assert.deepEqual(moves("warmup_push"), ["arm_circles", "band_external_rotation", "band_pull_apart", "scapular_pushup", "chest_opener"]);
  assert.deepEqual(moves("warmup_pull"), ["arm_circles", "cat_cow", "thread_needle", "lat_wall", "band_pull_apart"]);
  assert.deepEqual(moves("warmup_legs"), ["wide_stance", "side_stance", "leg_swing", "bodyweight_squat", "worlds_greatest"]);
  for (const id of Object.values(conditioning.WARMUP)) {
    const routine = conditioning.mobilityById(id);
    assert.ok(store.routineMinutes(routine) <= 6, `${id} is short`);
    for (const m of routine.moves) assert.ok(guides.guideFor(m.stretch), `${m.stretch} has a guide`);
  }
});

test("the day is what its lifts mostly are", () => {
  // Legs with two presses added is still mostly legs.
  let state = store.addExerciseToWorkout(byDay(fresh()), "legs", "db_shoulder");
  assert.equal(warmupOf(state, "legs").exerciseId, "warmup_legs");
  state = store.addExerciseToWorkout(state, "legs", "db_bench");
  state = store.addExerciseToWorkout(state, "legs", "dips");
  state = store.addExerciseToWorkout(state, "legs", "machine_chest");
  state = store.addExerciseToWorkout(state, "legs", "ohp");
  assert.equal(store.warmupDay(state, store.workoutById(state, "legs")), "push");
});

test("away from a gym the band moves become ones that need nothing", () => {
  const routine = conditioning.awayVersion(conditioning.mobilityById("warmup_push"));
  assert.equal(routine.id, "warmup_push:away");
  assert.deepEqual(plain(routine.moves.map((m) => m.id)), ["arm_circles", "wall_slide", "prone_y_raise", "scapular_pushup", "chest_opener"]);
  assert.deepEqual(plain(conditioning.mobilityById("warmup_push:away")), plain(routine));
  // Nothing to swap: the routine as it is.
  const legs = conditioning.mobilityById("warmup_legs");
  assert.equal(conditioning.awayVersion(legs), legs);
});

test("the warm-up can be taken out, put back, or swapped for another", () => {
  let state = store.setWarmup(fresh(), "push", null);
  assert.equal(warmupOf(state, "push"), undefined);
  state = store.setWarmup(state, "push", undefined);
  assert.equal(warmupOf(state, "push").exerciseId, "warmup_push");
  state = store.setWarmup(state, "pull", "warmup_legs");
  assert.equal(warmupOf(state, "pull").exerciseId, "warmup_legs");
});

test("an old save that chose the shoulder warm-up gets the day's warm-up instead", () => {
  const state = store.setWarmup(fresh(), "push", "shoulder_warmup");
  assert.equal(warmupOf(state, "push").exerciseId, "warmup_push");
  // A session started with it still reads.
  assert.equal(conditioning.mobilityById("shoulder_warmup").moves.length, 3);
  assert.equal(conditioning.mobilityById("shoulder_warmup_away").moves.length, 3);
});

test("a move done for reps steps a rep at a time, within 5 to 30", () => {
  let state = fresh();
  const move = (id) => conditioning.mobilityById("warmup_push").moves.find((m) => m.id === id);
  state = store.nudgeHold(state, "warmup_push", "band_pull_apart", 1);
  assert.equal(move("band_pull_apart").reps, 16);
  assert.equal(move("band_pull_apart").seconds, 48);
  for (let i = 0; i < 40; i++) state = store.nudgeHold(state, "warmup_push", "band_pull_apart", -1);
  assert.equal(move("band_pull_apart").reps, 5);
  // A hold on the clock still steps by fifteen seconds.
  state = store.nudgeHold(state, "warmup_push", "chest_opener", 1);
  assert.equal(move("chest_opener").seconds, 45);
  assert.equal(move("chest_opener").reps, undefined);
});

test("a warm-up copied for one workout is that workout's alone", () => {
  let state = store.setWarmup(fresh(), "legs", "warmup_push");
  state = store.copyRoutineFor(state, "push", "m_push", "warmup");
  assert.equal(warmupOf(state, "push").exerciseId, "m_push");
  assert.equal(warmupOf(state, "legs").exerciseId, "warmup_push");
  assert.equal(started(state, "push").at(-1).exerciseId, "everyday");
});
