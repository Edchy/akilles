const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Exercise the real store, progression engine and save format without a native runtime.
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
const storage = load("@/store/storage");
const conditioning = load("@/data/conditioning");
const guides = load("@/data/guides");

const fresh = () => store.resetToDefault();
/** Through JSON, so values made inside the sandbox compare as plain ones. */
const plain = (value) => JSON.parse(JSON.stringify(value));
const workout = (state, id) => store.workoutById(state, id);
/** The conditioning blocks a workout would run, as plain data. */
const blocks = (state, id) => {
  const started = store.buildWorkout(store.setNextWorkout(state, id));
  // Through JSON, so arrays made inside the sandbox compare as plain ones.
  return JSON.parse(JSON.stringify(started.active.items
    .filter((it) => store.isConditioning(it))
    .map((it) => ({
      slot: it.slot,
      id: it.exerciseId,
      ...(it.course !== undefined ? { course: it.course } : {}),
      ...(it.minutes !== undefined ? { minutes: it.minutes } : {}),
    }))));
};

/** A routine of your own, made the way the catalogue makes one. */
const withRoutine = (state, id = "m_mine", name = "Mine") => store.createRoutine(state, id, name);

test("out of the box, every workout ends on the everyday stretch", () => {
  const state = fresh();
  for (const w of state.workouts) {
    assert.equal(store.mobilityPlan(state, w).id, "everyday");
  }
  assert.deepEqual(blocks(state, "legs"), [
    { slot: "Cardio · open", id: "treadmill", course: 1 },
    { slot: "Cardio · finish", id: "ski_erg", minutes: 5 },
    { slot: "Mobility", id: "everyday" },
  ]);
  const everyday = conditioning.mobilityById("everyday");
  assert.equal(everyday.moves[0].stretch, "couch");
  assert.equal(store.routineMinutes(everyday), 7);
});

test("every stretch has a photo and a guide, and so does every hold in the everyday stretch", () => {
  const photos = fs.readFileSync(path.resolve(__dirname, "../src/data/photos.ts"), "utf8");
  for (const s of conditioning.STRETCHES) {
    assert.match(photos, new RegExp(`\\n  ${s.id}: \\[require`), `${s.id} has no photo`);
    assert.ok(guides.guideFor(s.id), `${s.id} has no guide`);
  }
  for (const m of conditioning.mobilityById("everyday").moves) {
    assert.ok(conditioning.stretchById(conditioning.pictureOf(m)), `${m.name} is not in the library`);
  }
});

test("a workout's cardio length is its own", () => {
  let state = fresh();
  state = store.nudgeCardio(state, "legs", "open", 1);
  state = store.nudgeCardio(state, "legs", "open", 1);
  assert.equal(blocks(state, "legs")[0].course, 2);
  assert.equal(blocks(state, "push_a")[0].course, 1);

  // Switching to the clock measures the distance in minutes instead.
  state = store.setCardioMode(state, "legs", "close", "time");
  state = store.nudgeCardio(state, "legs", "close", 1);
  assert.deepEqual(blocks(state, "legs")[1], { slot: "Cardio · finish", id: "ski_erg", minutes: 6 });

  // A machine on the clock can be timed over a distance.
  state = store.setCardioMode(state, "push_a", "close", "distance");
  assert.deepEqual(blocks(state, "push_a")[1], { slot: "Cardio · finish", id: "ski_erg", course: 1000 });
});

test("cardio length stays on whole steps and within bounds", () => {
  let state = fresh();
  for (let i = 0; i < 5; i++) state = store.nudgeCardio(state, "legs", "open", -1);
  assert.equal(blocks(state, "legs")[0].course, 0.5);
  for (let i = 0; i < 10; i++) state = store.nudgeCardio(state, "legs", "close", -1);
  assert.equal(blocks(state, "legs")[1].minutes, 1);
  for (let i = 0; i < 100; i++) state = store.nudgeCardio(state, "legs", "close", 1);
  assert.equal(blocks(state, "legs")[1].minutes, 60);
});

test("blocks come out of a workout and go back in", () => {
  let state = fresh();
  state = store.setCardio(state, "push_a", "open", null);
  state = store.setMobility(state, "push_a", null);
  assert.deepEqual(blocks(state, "push_a"), [{ slot: "Cardio · finish", id: "ski_erg", minutes: 5 }]);
  assert.equal(blocks(state, "pull_a").length, 3);

  state = store.setCardio(state, "push_a", "open", undefined);
  state = store.setMobility(state, "push_a", undefined);
  assert.deepEqual(blocks(state, "push_a"), blocks(fresh(), "push_a"));
});

test("choosing a machine or routine changes only that workout", () => {
  let state = withRoutine(fresh());
  state = store.chooseCardio(state, "legs", "close", "row");
  state = store.setMobility(state, "legs", "m_mine");
  assert.equal(blocks(state, "legs")[1].id, "row");
  assert.equal(blocks(state, "legs")[2].id, "m_mine");
  assert.equal(blocks(state, "push_a")[1].id, "ski_erg");
  assert.equal(blocks(state, "push_a")[2].id, "everyday");
});

test("swapping mid-session is for today only", () => {
  let state = store.buildWorkout(store.setNextWorkout(fresh(), "legs"));
  state = store.swapConditioning(state, "row");
  assert.equal(state.active.items[0].exerciseId, "row");
  assert.equal(state.active.items[0].minutes, 5);
  assert.equal(state.active.items[0].course, undefined);
  assert.equal(workout(state, "legs").cardio, undefined);

  state = withRoutine(state);
  state = { ...state, active: { ...state.active, cursor: state.active.items.length - 1 } };
  state = store.swapConditioning(state, "m_mine");
  assert.equal(state.active.items.at(-1).exerciseId, "m_mine");
  assert.equal(workout(state, "legs").mobility, undefined);
});

test("editing the everyday stretch keeps the changes beside it, and putting it back undoes them", () => {
  let state = fresh();
  const everyday = () => conditioning.mobilityById("everyday");
  const before = everyday().moves.map((m) => m.id);

  state = store.addHold(state, "everyday", { stretch: "calf_wall" }, "h_calf");
  state = store.addHold(state, "everyday", { name: "  Neck rolls " }, "h_neck");
  assert.deepEqual(plain(everyday().moves.slice(-2).map((m) => [m.name, m.seconds, !!m.perSide, m.stretch ?? null])), [
    ["Calf stretch", 30, true, "calf_wall"],
    ["Neck rolls", 45, false, null],
  ]);

  state = store.nudgeHold(state, "everyday", "couch", 1);
  state = store.setHoldSides(state, "everyday", "h_calf", false);
  state = store.moveHold(state, "everyday", 0, 2);
  state = store.removeHold(state, "everyday", "figure_four");
  assert.equal(everyday().moves.find((m) => m.id === "couch").seconds, 75);
  assert.equal(everyday().moves.find((m) => m.id === "h_calf").perSide, undefined);
  assert.equal(everyday().moves[1].id, "couch");
  assert.equal(everyday().moves.some((m) => m.id === "figure_four"), false);
  assert.equal(store.isRoutineEdited(state, "everyday"), true);
  // The session that runs next is dealt the edited routine.
  assert.equal(store.buildWorkout(state).active.items.at(-1).moves.length, before.length + 1);

  // Survives a save, then goes back to how it shipped.
  state = storage.fromSaved(storage.toSaved(state));
  assert.equal(everyday().moves.length, before.length + 1);
  state = store.resetRoutine(state, "everyday");
  assert.deepEqual(plain(everyday().moves.map((m) => m.id)), plain(before));
  assert.equal(store.isRoutineEdited(state, "everyday"), false);
});

test("holds stay within their bounds, and the last one stays", () => {
  let state = withRoutine(fresh());
  for (let i = 0; i < 20; i++) state = store.nudgeHold(state, "m_mine", "couch", -1);
  assert.equal(conditioning.mobilityById("m_mine").moves[0].seconds, 15);
  for (let i = 0; i < 20; i++) state = store.nudgeHold(state, "m_mine", "couch", 1);
  assert.equal(conditioning.mobilityById("m_mine").moves[0].seconds, 180);
  for (const m of conditioning.mobilityById("m_mine").moves) state = store.removeHold(state, "m_mine", m.id);
  assert.equal(conditioning.mobilityById("m_mine").moves.length, 1);
  // A routine of your own is changed in place; the built-in is untouched.
  assert.deepEqual(plain(state.mobilityEdits), {});
  assert.equal(conditioning.mobilityById("everyday").moves.length, 6);
});

test("a workout can get a copy of its routine, leaving the others alone", () => {
  let state = store.copyRoutineFor(fresh(), "legs", "m_legs");
  assert.equal(store.mobilityPlan(state, workout(state, "legs")).name, "Legs stretch");
  state = store.addHold(state, "m_legs", { stretch: "calf_wall" });
  assert.equal(store.mobilityPlan(state, workout(state, "legs")).moves.length, 7);
  assert.equal(store.mobilityPlan(state, workout(state, "push_a")).moves.length, 6);
  assert.deepEqual(plain(store.workoutsUsing(state, "m_legs").map((w) => w.id)), ["legs"]);
  assert.equal(store.workoutsUsing(state, "everyday").length, 4);
});

test("a removed machine falls back, and comes back when restored", () => {
  let state = fresh();
  state = store.chooseCardio(state, "legs", "close", "row");
  state = store.setCardioMode(state, "legs", "close", "distance");
  state = store.removeConditioning(state, "row");
  assert.deepEqual(blocks(state, "legs")[1], { slot: "Cardio · finish", id: "ski_erg", minutes: 5 });
  state = store.restoreConditioning(state, "row");
  assert.deepEqual(blocks(state, "legs")[1], { slot: "Cardio · finish", id: "row", course: 1000 });
});

test("version 9 saves move the shared cardio into every workout", () => {
  const old = {
    ...fresh(),
    choices: {
      "conditioning/Cardio · open": "treadmill",
      "conditioning/Cardio · finish": "row",
      "conditioning/Mobility": "hips",
      "legs/Squat": "back_squat",
    },
    courses: { treadmill: 1.5 },
    hiddenConditioning: [...fresh().hiddenConditioning, "spine", "quick"],
  };
  delete old.mobilityEdits;
  const restored = storage.fromSaved(JSON.stringify({ version: 9, state: old }));
  assert.equal(typeof restored, "object");
  assert.equal(restored.courses, undefined);
  assert.deepEqual(Object.keys(restored.choices), ["legs/Squat"]);
  assert.equal(restored.hiddenConditioning.some((id) => conditioning.RETIRED_MOBILITY.includes(id)), false);
  assert.deepEqual(JSON.parse(JSON.stringify(restored.mobilityEdits)), {});
  for (const w of restored.workouts) {
    assert.deepEqual(JSON.parse(JSON.stringify(w.cardio)), {
      open: { machine: "treadmill", course: 1.5 },
      close: { machine: "row" },
    });
    // A retired built-in routine gives way to the everyday stretch.
    assert.equal(w.mobility, undefined);
  }
  assert.equal(store.mobilityPlan(restored, workout(restored, "pull_a")).id, "everyday");
  assert.deepEqual(blocks(restored, "push_a")[0], { slot: "Cardio · open", id: "treadmill", course: 1.5 });
});

test("version 9 saves keep a routine of your own on every workout", () => {
  const mine = { id: "custom_couch", name: "Couch only", subtitle: "", moves: [{ id: "c", name: "Couch stretch", seconds: 60, perSide: true }] };
  const old = {
    ...fresh(),
    customMobility: [mine],
    choices: { "conditioning/Mobility": "custom_couch" },
    courses: {},
  };
  const restored = storage.fromSaved(JSON.stringify({ version: 9, state: old }));
  for (const w of restored.workouts) {
    assert.equal(w.mobility, "custom_couch");
    assert.equal(w.cardio, undefined);
  }
  assert.equal(blocks(restored, "legs")[2].id, "custom_couch");
});

test("per-workout blocks survive a save and reload", () => {
  let state = fresh();
  state = store.nudgeCardio(state, "legs", "open", 1);
  state = store.setMobility(state, "pull_b", null);
  const restored = storage.fromSaved(storage.toSaved(state));
  assert.deepEqual(blocks(restored, "legs"), blocks(state, "legs"));
  assert.deepEqual(blocks(restored, "pull_b"), blocks(state, "pull_b"));
});

test("a session in progress on a retired routine is dealt the everyday stretch", () => {
  const started = store.buildWorkout(fresh());
  const items = started.active.items.map((it) =>
    store.isMobility(it) ? { ...it, exerciseId: "hips", moves: [true, false, false, false, false] } : it,
  );
  const old = { ...started, active: { ...started.active, items } };
  const restored = storage.fromSaved(JSON.stringify({ version: 9, state: old }));
  const mobility = restored.active.items.at(-1);
  assert.equal(mobility.exerciseId, "everyday");
  assert.deepEqual(JSON.parse(JSON.stringify(mobility.moves)), [false, false, false, false, false, false]);
});

test("a weight changed and then skipped is not carried to next time", () => {
  const run = (log) => {
    let state = store.buildWorkout(fresh());
    const at = state.active.items.findIndex((it) => it.exerciseId === "db_bench");
    const opened = state.active.items[at].weight;
    state = { ...state, active: { ...state.active, cursor: at } };
    state = store.editWeight(state, opened + 10);
    log(state.active.items, at);
    state = store.finishWorkout(state);
    const next = store.buildWorkout(store.setNextWorkout(state, "push_a"));
    return { opened, next: next.active.items.find((it) => it.exerciseId === "db_bench").weight };
  };
  // Trained at the new weight: it carries.
  const trained = run((items, at) => { items[at].logged = items[at].logged.map(() => 6); });
  assert.equal(trained.next, trained.opened + 10);
  // Skipped, with something else trained so the session counts: it does not.
  const skipped = run((items, at) => {
    items[at].skipped = true;
    items.find((it, j) => j !== at && !store.isConditioning(it)).logged[0] = 6;
  });
  assert.equal(skipped.next, skipped.opened);
  // Never reached at all: the same.
  const untouched = run((items, at) => {
    items.find((it, j) => j !== at && !store.isConditioning(it)).logged[0] = 6;
  });
  assert.equal(untouched.next, untouched.opened);
});

test("the button that moves on names what comes next, and nothing after the last", () => {
  let state = store.buildWorkout(fresh());
  const at = (cursor) => ({ ...state, active: { ...state.active, cursor } });
  const items = state.active.items;
  assert.equal(store.nextItemName(at(0)), "Dumbbell bench press");
  assert.equal(store.nextItemName(at(items.length - 3)), "Ski-erg");
  assert.equal(store.nextItemName(at(items.length - 2)), "Everyday stretch");
  assert.equal(store.nextItemName(at(items.length - 1)), null);
});
