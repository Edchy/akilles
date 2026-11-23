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

test("every stretch has the clay figure and a guide, and so does every hold in the everyday stretch", () => {
  const clay = fs.readFileSync(path.resolve(__dirname, "../src/data/clay.ts"), "utf8");
  for (const s of conditioning.STRETCHES) {
    assert.match(clay, new RegExp(`\\n  ${s.id}: \\{ frames`), `${s.id} has no clay picture`);
    assert.ok(guides.guideFor(s.id), `${s.id} has no guide`);
  }
  for (const m of conditioning.mobilityById("everyday").moves) {
    assert.ok(conditioning.stretchById(conditioning.pictureOf(m)), `${m.name} is not in the library`);
  }
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

test("a removed machine falls back, and comes back when restored", () => {
  let state = fresh();
  state = store.chooseCardio(state, "legs", "close", "row");
  state = store.removeConditioning(state, "row");
  assert.deepEqual(blocks(state, "legs")[2], { slot: "Cardio · finish", id: "ski_erg", minutes: 5 });
  state = store.restoreConditioning(state, "row");
  assert.deepEqual(blocks(state, "legs")[2], { slot: "Cardio · finish", id: "row", minutes: 5 });
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
    // Pull opens on its own rower; the rest kept the shared default.
    if (w.id !== "pull") assert.equal(w.cardio, undefined);
  }
  assert.equal(blocks(restored, "legs")[3].id, "custom_couch");
});

test("per-workout blocks survive a save and reload", () => {
  let state = fresh();
  state = store.chooseCardio(state, "legs", "open", "row");
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

test("the finishing block is told apart from the warm-up, and each says how hard to go", () => {
  const state = store.buildWorkout(store.setNextWorkout(fresh(), "push"));
  const cardio = state.active.items.filter((it) => store.isCardio(it));
  assert.deepEqual(plain(cardio.map((it) => store.cardioEnd(it))), ["open", "close"]);
  assert.match(conditioning.EFFORT.open, /easy/i);
  // A machine's own tip is about how to use it, never how hard.
  assert.doesNotMatch(conditioning.cardioById("treadmill").cue, /tank|fast|hard/i);
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
