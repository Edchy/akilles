const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Days that press open with the shoulder warm-up, right after the cardio.
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
const { MOVES } = load("@/motion/moves");

const fresh = () => store.resetToDefault();
const plain = (value) => JSON.parse(JSON.stringify(value));
const started = (state, id) => store.buildWorkout(store.setNextWorkout(state, id)).active.items;
const warmupOf = (state, id) => started(state, id).find((it) => it.slot === store.WARMUP_SLOT);

test("Push opens with the shoulder warm-up, straight after the cardio; Pull and Legs don't", () => {
  const items = started(fresh(), "push");
  assert.equal(items[1].slot, "Warm-up");
  assert.equal(items[1].exerciseId, "shoulder_warmup");
  assert.equal(items[2].exerciseId, "db_bench");
  assert.equal(warmupOf(fresh(), "pull"), undefined);
  assert.equal(warmupOf(fresh(), "legs"), undefined);
  const preview = store.workoutPreview(fresh(), store.workoutById(fresh(), "push"));
  assert.deepEqual(plain(preview.slice(0, 2).map((r) => r.name)), ["Treadmill", "Shoulder warm-up"]);
});

test("a press added to any day brings the warm-up with it", () => {
  const state = store.addExerciseToWorkout(fresh(), "legs", "db_shoulder");
  assert.equal(warmupOf(state, "legs").exerciseId, "shoulder_warmup");
});

test("the warm-up can be taken out, put back, or added to a day that doesn't press", () => {
  let state = store.setWarmup(fresh(), "push", null);
  assert.equal(warmupOf(state, "push"), undefined);
  state = store.setWarmup(state, "push", undefined);
  assert.equal(warmupOf(state, "push").exerciseId, "shoulder_warmup");
  state = store.setWarmup(state, "pull", "shoulder_warmup");
  assert.equal(warmupOf(state, "pull").exerciseId, "shoulder_warmup");
  assert.equal(warmupOf(state, "legs"), undefined);
});

test("ball on the wall, then band pull-aparts and external rotations done for reps", () => {
  const routine = conditioning.mobilityById("shoulder_warmup");
  assert.deepEqual(plain(routine.moves.map((m) => [m.id, m.reps ?? null, !!m.perSide])), [
    ["ball_shoulder", null, true],
    ["band_pull_apart", 15, false],
    ["band_external_rotation", 12, true],
  ]);
  assert.equal(store.routineMinutes(routine), 3);
  for (const m of routine.moves) {
    assert.ok(guides.guideFor(m.id), `${m.id} has a guide`);
    assert.ok(m.id in MOVES, `${m.id} has a film`);
  }
});

test("a move done for reps steps a rep at a time, within 5 to 30", () => {
  let state = fresh();
  const move = () => conditioning.mobilityById("shoulder_warmup").moves.find((m) => m.id === "band_pull_apart");
  state = store.nudgeHold(state, "shoulder_warmup", "band_pull_apart", 1);
  assert.equal(move().reps, 16);
  assert.equal(move().seconds, 48);
  for (let i = 0; i < 40; i++) state = store.nudgeHold(state, "shoulder_warmup", "band_pull_apart", -1);
  assert.equal(move().reps, 5);
  // A stretch held on the clock still steps by fifteen seconds.
  state = store.nudgeHold(state, "shoulder_warmup", "ball_shoulder", 1);
  const ball = conditioning.mobilityById("shoulder_warmup").moves.find((m) => m.id === "ball_shoulder");
  assert.equal(ball.seconds, 60);
  assert.equal(ball.reps, undefined);
});

test("a warm-up copied for one workout is that workout's alone", () => {
  let state = store.setWarmup(fresh(), "legs", "shoulder_warmup");
  state = store.copyRoutineFor(state, "push", "m_push", "warmup");
  assert.equal(warmupOf(state, "push").exerciseId, "m_push");
  assert.equal(conditioning.mobilityById("m_push").name, "Push warm-up");
  assert.equal(warmupOf(state, "legs").exerciseId, "shoulder_warmup");
  assert.equal(started(state, "push").at(-1).exerciseId, "everyday");
});
