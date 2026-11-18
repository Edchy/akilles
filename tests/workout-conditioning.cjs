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
    { slot: "Warm-up", id: "warmup_legs" },
    { slot: "Cardio · finish", id: "ski_erg", minutes: 5 },
    { slot: "Mobility", id: "everyday" },
  ]);
  const everyday = conditioning.mobilityById("everyday");
  assert.equal(everyday.moves[0].stretch, "couch");
  assert.equal(store.routineMinutes(everyday), 7);
});

/** The day warm-ups' stances: free-exercise-db shows them only with a weight in hand. */
const NO_PHOTO = ["wide_stance", "side_stance", "downward_dog", "low_lunge", "pigeon", "cobra", "knee_circles", "hamstring_bounce", "front_kick_swing", "scapular_pushup", "thread_needle"];

test("every stretch has a photo and a guide, and so does every hold in the everyday stretch", () => {
  const photos = fs.readFileSync(path.resolve(__dirname, "../src/data/photos.ts"), "utf8");
  // No photo matches these.
  const filmOnly = ["ball_shoulder", "wall_slide", "prone_y_raise", ...NO_PHOTO];
  for (const s of conditioning.STRETCHES) {
    if (!filmOnly.includes(s.id)) {
      assert.match(photos, new RegExp(`\\n  ${s.id}: \\[require`), `${s.id} has no photo`);
    }
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
  assert.equal(blocks(state, "push")[0].course, 1);

  // Switching to the clock measures the distance in minutes instead.
  state = store.setCardioMode(state, "legs", "close", "time");
  state = store.nudgeCardio(state, "legs", "close", 1);
  assert.deepEqual(blocks(state, "legs")[2], { slot: "Cardio · finish", id: "ski_erg", minutes: 6 });

  // A machine on the clock can be timed over a distance.
  state = store.setCardioMode(state, "push", "close", "distance");
  // Its warm-up sits between the two cardio blocks.
  assert.deepEqual(blocks(state, "push")[2], { slot: "Cardio · finish", id: "ski_erg", course: 1000 });
});

test("cardio length stays on whole steps and within bounds", () => {
  let state = fresh();
  for (let i = 0; i < 5; i++) state = store.nudgeCardio(state, "legs", "open", -1);
  assert.equal(blocks(state, "legs")[0].course, 0.5);
  for (let i = 0; i < 10; i++) state = store.nudgeCardio(state, "legs", "close", -1);
  assert.equal(blocks(state, "legs")[2].minutes, 1);
  for (let i = 0; i < 100; i++) state = store.nudgeCardio(state, "legs", "close", 1);
  assert.equal(blocks(state, "legs")[2].minutes, 60);
});

test("blocks come out of a workout and go back in", () => {
  let state = fresh();
  state = store.setCardio(state, "push", "open", null);
  state = store.setMobility(state, "push", null);
  assert.deepEqual(blocks(state, "push"), [
    { slot: "Warm-up", id: "warmup_push" },
    { slot: "Cardio · finish", id: "ski_erg", minutes: 5 },
  ]);
  assert.equal(blocks(state, "pull").length, 4);

  state = store.setCardio(state, "push", "open", undefined);
  state = store.setMobility(state, "push", undefined);
  assert.deepEqual(blocks(state, "push"), blocks(fresh(), "push"));
});

test("choosing a machine or routine changes only that workout", () => {
  let state = withRoutine(fresh());
  state = store.chooseCardio(state, "legs", "close", "row");
  state = store.setMobility(state, "legs", "m_mine");
  assert.equal(blocks(state, "legs")[2].id, "row");
  assert.equal(blocks(state, "legs")[3].id, "m_mine");
  assert.equal(blocks(state, "push")[2].id, "ski_erg");
  assert.equal(blocks(state, "push")[3].id, "everyday");
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
  assert.equal(store.mobilityPlan(state, workout(state, "push")).moves.length, 6);
  assert.deepEqual(plain(store.workoutsUsing(state, "m_legs").map((w) => w.id)), ["legs"]);
  assert.equal(store.workoutsUsing(state, "everyday").length, 2);
});

test("a removed machine falls back, and comes back when restored", () => {
  let state = fresh();
  state = store.chooseCardio(state, "legs", "close", "row");
  state = store.setCardioMode(state, "legs", "close", "distance");
  state = store.removeConditioning(state, "row");
  assert.deepEqual(blocks(state, "legs")[2], { slot: "Cardio · finish", id: "ski_erg", minutes: 5 });
  state = store.restoreConditioning(state, "row");
  assert.deepEqual(blocks(state, "legs")[2], { slot: "Cardio · finish", id: "row", course: 1000 });
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
  assert.equal(store.mobilityPlan(restored, workout(restored, "pull")).id, "everyday");
  assert.deepEqual(blocks(restored, "push")[0], { slot: "Cardio · open", id: "treadmill", course: 1.5 });
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
  assert.equal(blocks(restored, "legs")[3].id, "custom_couch");
});

test("per-workout blocks survive a save and reload", () => {
  let state = fresh();
  state = store.nudgeCardio(state, "legs", "open", 1);
  state = store.setMobility(state, "push", null);
  const restored = storage.fromSaved(storage.toSaved(state));
  assert.deepEqual(blocks(restored, "legs"), blocks(state, "legs"));
  assert.deepEqual(blocks(restored, "push"), blocks(state, "push"));
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
    const next = store.buildWorkout(store.setNextWorkout(state, "push"));
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
  assert.equal(store.nextItemName(at(0)), "Push mobility");
  assert.equal(store.nextItemName(at(1)), "DB bench press");
  assert.equal(store.nextItemName(at(items.length - 3)), "Ski-erg");
  assert.equal(store.nextItemName(at(items.length - 2)), "Everyday stretch");
  assert.equal(store.nextItemName(at(items.length - 1)), null);
});

test("the cardio on screen can run longer today only, or be kept for every time", () => {
  let state = store.buildWorkout(store.setNextWorkout(fresh(), "push"));
  const first = () => state.active.items[0];
  assert.equal(store.cardioEnd(first()), "open");
  assert.equal(first().course, 1);
  state = store.setScore(state, 300);

  // 2 km today: the time over 1 km means nothing over 2, so it goes back to unentered.
  state = store.nudgeTodayLength(state, 1);
  state = store.nudgeTodayLength(state, 1);
  assert.equal(first().course, 2);
  assert.equal(first().seconds, null);
  assert.equal(workout(state, "push").cardio, undefined);
  assert.deepEqual(plain(store.plannedLength(state, first())), { course: 1 });

  // Never below one step.
  for (let i = 0; i < 6; i++) state = store.nudgeTodayLength(state, -1);
  assert.equal(first().course, 0.5);

  state = store.nudgeTodayLength(state, 1);
  state = store.nudgeTodayLength(state, 1);
  state = store.nudgeTodayLength(state, 1);
  state = store.keepTodayLength(state);
  assert.deepEqual(plain(workout(state, "push").cardio.open), { machine: "treadmill", course: 2 });
  assert.deepEqual(plain(workout(state, "pull").cardio ?? {}), {});
});

test("the finishing block is told apart from the warm-up, and each says how hard to go", () => {
  const state = store.buildWorkout(store.setNextWorkout(fresh(), "push"));
  const cardio = state.active.items.filter((it) => store.isCardio(it));
  assert.deepEqual(plain(cardio.map((it) => store.cardioEnd(it))), ["open", "close"]);
  assert.match(conditioning.EFFORT.open, /easy/i);
  // A machine's own tip is about how to use it, never how hard.
  assert.doesNotMatch(conditioning.cardioById("treadmill").cue, /tank|fast|hard/i);
});


test("custom cardio targets accept exact values, clear scores and leave Plan untouched", () => {
  let s = store.buildWorkout(fresh());
  const before = JSON.stringify(s.workouts);
  s = store.setScore(s, 347);
  s = store.setTodayLength(s, 1.37);
  assert.equal(s.active.items[s.active.cursor].course, 1.37);
  assert.equal(store.scoreOf(s.active.items[s.active.cursor]), null);
  assert.equal(JSON.stringify(s.workouts), before);
  assert.equal(store.setTodayLength(s, 0), s);
  assert.equal(store.setTodayLength(s, NaN), s);
  s = store.swapConditioning(s, "row");
  s = store.setTodayLength(s, 7.5);
  assert.equal(s.active.items[s.active.cursor].minutes, 7.5);
  assert.equal(JSON.stringify(s.workouts), before);
});

test("Plan display order survives save and reload alongside paused workouts", () => {
  let s = fresh();
  const order = s.workouts.map((w) => w.id);
  s = store.pauseWorkout(s, order[0]);
  s = store.movePlanWorkout(s, 0, 2);
  const back = storage.fromSaved(storage.toSaved(s));
  assert.deepEqual(plain(store.planWorkouts(back).map((w) => w.id)), [order[1], order[2], order[0]]);
});

test("shared targets apply across future workouts and survive saving without changing the active session", () => {
  let s = store.buildWorkout(fresh());
  s = store.setScore(s, 300);
  const active = s.active;
  s = store.setCardioTarget(s, "treadmill", { course: 1.5 });
  assert.equal(s.active, active);
  for (const w of s.workouts) assert.equal(store.cardioPlan(s, w, "open").course, 1.5);
  s = storage.fromSaved(storage.toSaved(s));
  assert.equal(s.active.items[0].course, 1);
  assert.equal(store.scoreOf(s.active.items[0]), 300);
  assert.deepEqual(plain(store.cardioTarget(s, "treadmill")), { course: 1.5 });
  s = store.setCardioTarget(s, "treadmill", { minutes: 10 });
  for (const w of s.workouts) {
    assert.equal(store.cardioPlan(s, w, "open").minutes, 10);
    assert.equal(store.cardioPlan(s, w, "open").course, undefined);
  }
});

test("session target switches clear results and never change future settings", () => {
  let s = store.setCardioTarget(fresh(), "treadmill", { course: 1.5 });
  s = store.buildWorkout(s);
  const saved = JSON.stringify({ workouts: s.workouts, targets: s.cardioTargets });
  s = store.setScore(s, 420);
  s = store.setTodayCardioTarget(s, { minutes: 10 });
  assert.equal(s.active.items[0].minutes, 10);
  assert.equal(store.scoreOf(s.active.items[0]), null);
  s = store.setScore(s, 1.8);
  s = store.setTodayCardioTarget(s, { course: 2 });
  assert.equal(store.scoreOf(s.active.items[0]), null);
  assert.equal(JSON.stringify({ workouts: s.workouts, targets: s.cardioTargets }), saved);
  s = store.swapConditioning(s, "outdoor");
  assert.equal(s.active.items[0].exerciseId, "outdoor");
  assert.equal(JSON.stringify({ workouts: s.workouts, targets: s.cardioTargets }), saved);
});

test("distance and time targets keep independent records, even when both units used to be m", () => {
  let s = fresh();
  const complete = (exerciseId, length, result) => {
    s = store.buildWorkout(store.setNextWorkout(s, "push"));
    s = store.swapConditioning(s, exerciseId);
    s = store.setTodayCardioTarget(s, length);
    s = store.setScore(s, result);
    s = store.finishWorkout(s);
  };
  complete("treadmill", { course: 1 }, 300);
  complete("treadmill", { course: 1.5 }, 500);
  complete("treadmill", { minutes: 10 }, 1.8);
  complete("row", { course: 10 }, 20);
  complete("row", { minutes: 10 }, 2000);
  assert.equal(Object.keys(s.conditioning).length, 5);
  assert.equal(s.conditioning[store.courseKey("treadmill", 1)].best, 300);
  assert.equal(s.conditioning[store.courseKey("treadmill", 1.5)].best, 500);
  assert.equal(s.conditioning[store.cardioKey("treadmill", 10)].best, 1.8);
  assert.notEqual(store.cardioKey("row", 10), store.courseKey("row", 10));
  complete("treadmill", { course: 1 }, 280);
  assert.equal(s.conditioning[store.courseKey("treadmill", 1)].best, 280);
  assert.equal(s.conditioning[store.courseKey("treadmill", 1.5)].best, 500);
  assert.equal(store.cardioKey("treadmill", 0.1 + 0.2), store.cardioKey("treadmill", 0.3));
});

test("Done cannot copy an old result or log an invalid result", () => {
  let s = store.buildWorkout(fresh());
  s = store.setScore(s, 300);
  s = store.finishWorkout(s);
  s = store.buildWorkout(store.setNextWorkout(s, "push"));
  assert.equal(store.scoreOf(s.active.items[0]), null);
  assert.equal(store.completeCardio(s), s);
  for (const value of [0, -1, NaN, Infinity]) {
    s = store.setScore(s, value);
    assert.equal(store.scoreOf(s.active.items[0]), null);
  }
  s = store.setScore(s, 310);
  assert.ok(store.completeCardio(s).active.cursor > s.active.cursor);
});

test("saved exercise swaps update the plan while leaving the current session alone", () => {
  let s = store.buildWorkout(fresh());
  const active = s.active;
  s = store.replacePlannedCardio(s, "push", "open", "outdoor");
  assert.equal(s.active, active);
  assert.equal(s.active.items[0].exerciseId, "treadmill");
  for (const w of s.workouts) assert.equal(store.cardioPlan(s, w, "open").machine.id, "outdoor");
  assert.equal(store.cardioPlan(s, workout(s, "push"), "close").machine.id, "ski_erg");
});

test("version 15 cardio records and session notes migrate without losing their values", () => {
  const old = store.buildWorkout(fresh());
  old.notes = { "cardio/treadmill": "Old note" };
  old.active.notes = { "cardio/treadmill": "Incline 2", db_bench: "Only this bench" };
  old.conditioning = {
    "treadmill:1km": { cardioId: "treadmill", course: 1, last: 300, best: 280, sessions: 8 },
    "row:10m": { cardioId: "row", minutes: 10, last: 2000, best: 2200, sessions: 3 },
  };
  const restored = storage.fromSaved(JSON.stringify({ version: 15, state: old }));
  assert.equal(store.noteFor(restored, "treadmill", "cardio"), "Incline 2");
  assert.equal(restored.active.notes.db_bench, "Only this bench");
  assert.equal(restored.active.notes["cardio/treadmill"], undefined);
  assert.equal(store.cardioRecord(restored, restored.active.items[0]).sessions, 8);
  assert.equal(restored.conditioning[store.cardioKey("row", 10)].best, 2200);
  assert.deepEqual(plain(storage.fromSaved(storage.toSaved(restored)).conditioning), plain(restored.conditioning));
});

test("the treadmill correction replaces saved time targets and the current card with 1 km", () => {
  let old = store.setCardioTarget(fresh(), "treadmill", { minutes: 5 });
  old = store.buildWorkout(old);
  old = store.setScore(old, 0.8);
  const records = { [store.cardioKey("treadmill", 5)]: { cardioId: "treadmill", minutes: 5, last: 0.9, best: 1, sessions: 4 } };
  old = { ...old, conditioning: records, treadmillTargetRevision: undefined };
  const corrected = store.correctTreadmillTarget(old);
  assert.deepEqual(plain(corrected.cardioTargets.treadmill), { course: 1 });
  assert.equal(corrected.active.items[0].course, 1);
  assert.equal(corrected.active.items[0].minutes, undefined);
  assert.equal(store.scoreOf(corrected.active.items[0]), null);
  assert.equal(corrected.conditioning, records);
  assert.equal(store.correctTreadmillTarget(corrected), corrected);
  const restored = storage.fromSaved(JSON.stringify({ version: 16, state: old }));
  assert.equal(restored.active.items[0].course, 1);
  assert.equal(store.cardioPlan(restored, workout(restored, "push"), "open").course, 1);
  assert.deepEqual(plain(restored.conditioning), plain(records));
});

test("legacy per-workout treadmill time settings are corrected, while distance targets and later choices survive", () => {
  let old = store.setCardio(fresh(), "push", "open", { machine: "treadmill", minutes: 10 });
  old = store.setCardio(old, "legs", "open", { machine: "treadmill", course: 1.5 });
  const corrected = storage.fromSaved(JSON.stringify({ version: 16, state: old }));
  assert.equal(store.cardioPlan(corrected, workout(corrected, "push"), "open").course, 1);
  assert.equal(store.cardioPlan(corrected, workout(corrected, "legs"), "open").course, 1.5);
  // The Library's target is the default; a workout's own length stays its own.
  let later = store.setCardio(corrected, "pull", "open", { machine: "treadmill" });
  later = storage.fromSaved(storage.toSaved(store.setCardioTarget(later, "treadmill", { minutes: 10 })));
  assert.equal(store.cardioPlan(later, workout(later, "pull"), "open").minutes, 10);
  assert.equal(store.cardioPlan(later, workout(later, "legs"), "open").course, 1.5);
});

test("an older pending session keeps its actual five-minute result before the target is corrected", () => {
  let old = store.buildWorkout(store.setCardioTarget(fresh(), "treadmill", { minutes: 5 }));
  old = store.setScore(old, 0.8);
  old.active.startedAt = Date.now() - 2 * 864e5;
  const restored = storage.fromSaved(JSON.stringify({ version: 16, state: old }));
  assert.equal(restored.active, null);
  assert.equal(restored.conditioning[store.cardioKey("treadmill", 5)].last, 0.8);
  assert.equal(restored.conditioning[store.courseKey("treadmill", 1)], undefined);
  assert.equal(store.cardioPlan(restored, workout(restored, "push"), "open").course, 1);
});

test("warm-up movements and sides can be skipped or completed independently and survive saving", () => {
  let state = store.buildWorkout(store.setNextWorkout(fresh(), "legs"));
  const index = state.active.items.findIndex((it) => it.slot === "Warm-up");
  state = store.goToCard(state, index);
  const routine = store.currentRoutine(state);
  assert.ok(routine);
  const poses = routine.moves.flatMap((move, i) => move.perSide ? [i, i] : [i]);
  const side = poses.findIndex((pose, i) => poses[i + 1] === pose);
  assert.ok(side >= 0);
  state = store.resolveRoutineStep(state, side, "skipped");
  state = store.resolveRoutineStep(state, side + 1, "done");
  assert.equal(state.active.items[index].moves[poses[side]], false, "a skipped side is not a completed pose");
  state = storage.fromSaved(storage.toSaved(state));
  assert.equal(state.active.items[index].routineSteps[side], "skipped");
  assert.equal(state.active.items[index].routineSteps[side + 1], "done");
  state = store.resolveRoutineStep(state, side, "done");
  assert.equal(state.active.items[index].moves[poses[side]], true, "returning to a skipped side can complete it");
  assert.equal(state.active.items[index].moves.filter(Boolean).length, 1, "other movements stay untouched");
  assert.equal(store.cardMark(state, index), "todo");
  for (let i = 0; i < poses.length; i++) state = store.resolveRoutineStep(state, i, "done");
  assert.equal(store.cardMark(state, index), "done");
  assert.equal(store.resolveRoutineStep(state, -1, "done").active.items[index], state.active.items[index]);
});

test("a workout takes as much cardio and as many routines as you like, in any block, in your order", () => {
  let state = fresh();
  const legs = workout(state, "legs");
  const firstLift = legs.exercises[0].id;
  // A second stretch at the finish, and a run in the middle of the lifts.
  state = store.addExtra(state, "legs", "finish", { routine: "everyday" }, "x1");
  state = store.addExtra(state, "legs", "main", { cardio: { machine: "treadmill", minutes: 4 } }, "x2");
  // The run goes first in Main.
  const main = store.partIds(workout(state, "legs"), "main");
  state = store.arrangePart(state, "legs", "main", ["x2", ...main.filter((id) => id !== "x2")]);

  const items = store.buildWorkout(store.setNextWorkout(state, "legs")).active.items.map((it) => it.id);
  const at = (id) => items.indexOf(id);
  assert.ok(at("x2") >= 0 && at("x2") < at(firstLift), "the run comes before the first lift");
  assert.equal(items.at(-1), "x1", "the added stretch comes last");
  assert.ok(at(store.MOBILITY_SLOT) >= 0, "the usual stretch is still there too");

  // Taking an extra out takes only it.
  const fewer = store.chooseRoutine(state, "legs", "x1", null);
  assert.equal(workout(fewer, "legs").extras.length, 1);
  assert.ok(store.workoutMinutes(state, workout(state, "legs")) > store.workoutMinutes(fewer, workout(fewer, "legs")));
});

test("a block's new order puts its exercises in that order too", () => {
  let state = fresh();
  const ids = store.partIds(workout(state, "push"), "main");
  state = store.arrangePart(state, "push", "main", [...ids].reverse());
  assert.deepEqual(plain(workout(state, "push").exercises.filter((e) => !e.part).map((e) => e.id)), [...ids].reverse());
});

test("a routine finished counts as done, even with a move left out", () => {
  let state = store.buildWorkout(store.setNextWorkout(fresh(), "legs"));
  const at = state.active.items.findIndex((it) => store.isMobility(it));
  state = { ...state, active: { ...state.active, cursor: at } };
  assert.equal(store.cardMark(state, at), "todo");
  state = store.resolveRoutineStep(state, 0, "skipped");
  state = store.finishRoutine(state);
  assert.equal(store.cardMark(state, at), "done");
});
