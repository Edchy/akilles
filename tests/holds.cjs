const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Lifts you cannot load progress by holding; a plank counts real seconds.
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
const guides = load("@/data/guides");
const prog = load("@/lib/progression");
const warmup = load("@/lib/warmup");
const store = load("@/store/session");
const storage = load("@/store/storage");

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const SCHEME = "6-12";
const record = (exerciseId, weight, extra = {}) => ({ exerciseId, weight, rung: 0, downStreak: 0, deloads: 0, ...extra });
const target = (st) => prog.ladderOf(exercises.byId(st.exerciseId), SCHEME)[st.rung];
const hit = (st) => prog.applyResult(st, SCHEME, [target(st), target(st)], NOW);
const miss = (st) => prog.applyResult(st, SCHEME, [target(st), target(st) - 1], NOW);

test("a hanging leg raise earns a second's hold at the top, never kilograms, and stops at five", () => {
  let st = record("hanging_leg_raise", 0);
  const seen = [];
  for (let i = 0; i < 30; i++) {
    seen.push(`${st.weight}s x${target(st)}${st.reloading ? " reload" : ""}`);
    st = hit(st);
  }
  // Core work: 10 → 12 → 14 even in a 6–12 slot.
  assert.deepEqual(seen.slice(0, 17), [
    "0s x10", "0s x12", "0s x14",
    "1s x10", "1s x12", "1s x14",
    "2s x10", "2s x12", "2s x14",
    "2s x12 reload", "2s x14 reload",
    "3s x10", "3s x12", "3s x14",
    "4s x10", "4s x12", "4s x14",
  ]);
  // Five seconds is the top: fourteen reps there, every time after.
  assert.equal(st.weight, prog.HOLD_MAX);
  assert.equal(target(st), 14);
  assert.deepEqual(seen.slice(-2), ["5s x14", "5s x14"]);
  assert.ok(!st.reloading);
});

test("the lifts nobody can load are holds lifts; the ones with a belt or a plate keep kilograms", () => {
  for (const id of ["push_up", "hanging_leg_raise", "nordic_curl", "inverted_row", "bench_dip", "ab_wheel", "lying_leg_raise", "captains_chair"]) {
    const ex = exercises.byId(id);
    assert.ok(ex.holds, `${id} holds`);
    assert.equal(ex.increment, 1, `${id} steps a second`);
  }
  for (const id of ["pullup", "chinup", "dips", "back_ext"]) {
    assert.ok(!exercises.byId(id).holds, `${id} keeps kg`);
  }
  assert.equal(warmup.weightLabel(exercises.byId("hanging_leg_raise"), 0), "Bodyweight");
  assert.equal(warmup.weightLabel(exercises.byId("hanging_leg_raise"), 2), "2 s hold");
});

test("two misses take the reps down a rung; on the bottom rung, a second off the hold, never below one once earned", () => {
  const twice = (st) => miss(miss(st));
  assert.equal(twice(record("hanging_leg_raise", 3, { rung: 2 })).weight, 3);
  assert.equal(twice(record("hanging_leg_raise", 3, { rung: 2 })).rung, 1);
  assert.equal(twice(record("hanging_leg_raise", 3, { rung: 0 })).weight, 2);
  assert.equal(twice(record("hanging_leg_raise", 1, { rung: 0 })).weight, 1);
  assert.equal(twice(record("hanging_leg_raise", 0, { rung: 0 })).weight, 0);
});

test("a plank holds 30, 40, 50, then 60 seconds, and stays at a minute", () => {
  assert.deepEqual([...prog.ladderOf(exercises.byId("plank"), SCHEME)], [30, 40, 50, 60]);
  let st = record("plank", 0);
  const seen = [];
  for (let i = 0; i < 6; i++) {
    seen.push(target(st));
    st = hit(st);
  }
  assert.deepEqual(seen, [30, 40, 50, 60, 60, 60]);
  assert.equal(st.weight, 0);
  assert.equal(prog.prescribe(record("plank", 0, { rung: 1 }), SCHEME, 2).reps, 40);
  // Logged in seconds, a 55-second hold short of a minute is short.
  assert.equal(prog.applyResult(record("plank", 0, { rung: 3 }), SCHEME, [60, 55], NOW).downStreak, 1);
});

test("a dead hang starts at 10 seconds and climbs five at a time, to a minute", () => {
  assert.deepEqual([...prog.ladderOf(exercises.byId("dead_hang"), SCHEME)], [10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60]);
  // Its own ladder, whatever range the slot is set to.
  assert.deepEqual([...prog.ladderOf(exercises.byId("dead_hang"), "volume")].slice(0, 3), [10, 15, 20]);
  let st = record("dead_hang", 0);
  const seen = [];
  for (let i = 0; i < 4; i++) {
    seen.push(target(st));
    st = hit(st);
  }
  assert.deepEqual(seen, [10, 15, 20, 25]);
  // Falling short twice takes it back down five.
  const short = prog.applyResult(prog.applyResult(record("dead_hang", 0, { rung: 2 }), SCHEME, [20, 14, 12], NOW), SCHEME, [20, 14, 12], NOW);
  assert.equal(target(short), 15);
});

/** Push's abs, done: every set at its target, with the slot holding `rec`. */
const absDone = (rec, reps) => {
  const base = store.resetToDefault();
  let state = store.buildWorkout({ ...base, history: { [`${rec.exerciseId}:6-10`]: rec } });
  const at = state.active.items.findIndex(
    (it) => it.exerciseId && exercises.byId(it.exerciseId)?.patterns.includes("abs"),
  );
  assert.ok(at >= 0, "Push has an abs exercise");
  const goal = prog.ladderOf(exercises.byId(rec.exerciseId), SCHEME)[rec.rung];
  const items = state.active.items.map((it, i) =>
    i === at
      ? { ...it, exerciseId: rec.exerciseId, weight: rec.weight, logged: it.logged.map(() => reps ?? goal) }
      : it,
  );
  return { ...state, active: { ...state.active, items, cursor: at } };
};

test("what next time says, in seconds and holds", () => {
  const fact = (rec, reps) => store.nextTime(absDone({ lastTrainedAt: NOW - 3 * DAY, ...rec }, reps)).fact;
  assert.equal(fact(record("hanging_leg_raise", 1, { rung: 2 })), "Up to 2 s hold next time.");
  assert.equal(fact(record("hanging_leg_raise", 0, { rung: 0 })), "12 reps next time.");
  assert.equal(fact(record("hanging_leg_raise", 5, { rung: 2 })), "14 reps with a 5 s hold again next time. That's the top.");
  assert.equal(fact(record("hanging_leg_raise", 2, { rung: 2, climbs: 2 })), "Reload next time: 2 s hold again, from 12 reps.");
  assert.equal(fact(record("hanging_leg_raise", 2, { rung: 1 }), 6), "Same hold and reps next time.");
  assert.equal(fact(record("hanging_leg_raise", 3, { rung: 1, downStreak: 1 }), 6), "Same hold, back to 10 reps next time.");
  assert.equal(fact(record("hanging_leg_raise", 3, { rung: 0, downStreak: 1 }), 6), "Back to a 2 s hold next time.");
  assert.equal(fact(record("hanging_leg_raise", 0, { rung: 1, downStreak: 1 }), 6), "Back to 10 reps next time.");
  assert.equal(fact(record("plank", 0, { rung: 0 })), "40 s next time.");
  assert.equal(fact(record("plank", 0, { rung: 2 })), "50 s again next time. That's the top.");
  assert.equal(fact(record("plank", 0, { rung: 2 }), 45), "The same again next time.");
});

test("tapping a plank's circle counts down five seconds at a time", () => {
  let state = absDone(record("plank", 0, { rung: 1 }));
  const at = state.active.cursor;
  state = { ...state, active: { ...state.active, items: state.active.items.map((it, i) => (i === at ? { ...it, logged: it.logged.map(() => null) } : it)) } };
  const taps = [];
  for (let i = 0; i < 11; i++) {
    state = store.tapSet(state, 0);
    taps.push(state.active.items[at].logged[0]);
  }
  // Past five seconds, 0: a hold not done; then empty again.
  assert.deepEqual(taps, [40, 35, 30, 25, 20, 15, 10, 5, 0, null, 40]);
});

test("a hold can be set by hand, but only in whole seconds up to five", () => {
  const base = store.resetToDefault();
  const set = (w) => store.setExerciseWeight(base, "hanging_leg_raise", w).exerciseEdits.hanging_leg_raise.startWeight;
  assert.equal(set(9), prog.HOLD_MAX);
  assert.equal(set(2.4), 2);
  assert.equal(set(-3), 0);
});

test("a bodyweight exercise of your own progresses by holds", () => {
  const base = store.resetToDefault();
  const made = store.addExercise(base, {
    id: "custom_l_sit", name: "L-sit", patterns: ["abs"], increment: 1, bodyweight: true, holds: true,
  });
  const mine = store.lookup(made, made.custom.at(-1).id);
  assert.equal(prog.freshState(mine).weight, 0);
  assert.equal(warmup.weightLabel(mine, 3), "3 s hold");
  assert.equal(guides.ownCue(mine.id, 3), "Hold where it's hardest for 3 seconds.");
});

test("Own it says how long to hold", () => {
  assert.equal(guides.ownCue("hanging_leg_raise", 2), "Hold the legs up for 2 seconds. No swing.");
  assert.equal(guides.ownCue("push_up", 1), "Pause for 1 second with your chest just off the floor.");
  assert.equal(guides.ownCue("hanging_leg_raise", 0), guides.ownCue("hanging_leg_raise"));
});

test("a version 11 save turns kilograms on a holds lift into seconds, and leaves loaded lifts alone", () => {
  const base = store.resetToDefault();
  const old = {
    ...base,
    custom: [
      { id: "custom_l_sit", name: "L-sit", patterns: ["abs"], increment: 2.5, bodyweight: true, startWeight: 5 },
      { id: "custom_ring_dip", name: "Ring dip", patterns: ["triceps"], increment: 2.5, bodyweight: true, assistable: true },
    ],
    exerciseEdits: { hanging_leg_raise: { name: "HLR", increment: 2.5 }, dips: { increment: 5 } },
    history: {
      "hanging_leg_raise:6-12": record("hanging_leg_raise", 2.5, { rung: 1, lastTrainedAt: NOW - 2 * DAY }),
      "custom_l_sit:6-12": record("custom_l_sit", 20, { lastTrainedAt: NOW - 2 * DAY }),
      "dips:6-12": record("dips", 10, { lastTrainedAt: NOW - 2 * DAY }),
    },
    log: [{
      workoutId: "push", name: "Push A", startedAt: NOW - 2 * DAY, finishedAt: NOW - 2 * DAY,
      entries: [
        { kind: "lift", exerciseId: "hanging_leg_raise", scheme: "6-12", weight: 2.5, reps: [12, 12], target: 12, outcome: "hit" },
        { kind: "lift", exerciseId: "dips", scheme: "6-12", weight: 10, reps: [8, 8, 8], target: 8, outcome: "hit" },
      ],
    }],
  };
  const state = storage.fromSaved(JSON.stringify({ version: 11, state: old }));

  assert.equal(state.history["hanging_leg_raise:6-10"].weight, 1);
  assert.equal(state.history["custom_l_sit:6-10"].weight, prog.HOLD_MAX);
  assert.equal(state.history["dips:6-10"].weight, 10);
  assert.deepEqual([...state.log[0].entries.map((e) => e.weight)], [1, 10]);
  assert.deepEqual({ ...state.exerciseEdits.hanging_leg_raise }, { name: "HLR" });
  assert.deepEqual({ ...state.exerciseEdits.dips }, { increment: 5 });

  const lsit = state.custom.find((e) => e.id === "custom_l_sit");
  assert.equal(lsit.holds, true);
  assert.equal(lsit.increment, 1);
  assert.equal(lsit.startWeight, 2);
  assert.ok(!state.custom.find((e) => e.id === "custom_ring_dip").holds);

  // And a save already in seconds is left as it is.
  const again = storage.fromSaved(storage.toSaved(state));
  assert.equal(again.history["hanging_leg_raise:6-10"].weight, 1);
});
