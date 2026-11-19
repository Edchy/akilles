const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// The engine under load: long runs of what people really do — train, swap,
// add, remove, pause, reorder, change sets and weights, mid-session too — with
// the rules that must hold checked after every single step. Then the cases
// that matter most, one by one.
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
const { KIND_ORDER } = load("@/data/kinds");
const { setsFor } = load("@/data/split");

const DAY = 24 * 60 * 60 * 1000;

/** A small seeded random, so a failing run can be replayed exactly. */
const random = (seed) => () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296;
  return seed / 4294967296;
};

/** Everything that must be true of a saved state, whatever was done to it — in every loop. */
function check(state, step) {
  const at = (msg) => `${step}: ${msg}`;
  if (state.loops) {
    assert.equal(state.loops.filter((l) => !l.body).length, 1, at("exactly one loop is in use"));
    const names = state.loops.map((l) => l.name);
    assert.ok(names.every((n) => n.trim()), at("every loop has a name"));
    assert.equal(new Set(names).size, names.length, at(`loop names are unique (${names.join(", ")})`));
    assert.equal(new Set(state.loops.map((l) => l.id)).size, state.loops.length, at("loop ids are unique"));
  }
  const loops = store.loopsOf(state);
  const everywhere = loops.flatMap((l) => l.workouts);
  assert.equal(new Set(everywhere.map((w) => w.id)).size, everywhere.length, at("no workout is in two loops"));
  // A choice belongs to a slot that exists, in some loop.
  for (const k of Object.keys(state.choices)) {
    const [wid, eid] = k.split("/");
    const w = everywhere.find((x) => x.id === wid);
    assert.ok(w, at(`choice ${k} belongs to a workout`));
    assert.ok(w.exercises.some((e) => e.id === eid), at(`choice ${k} belongs to a slot`));
  }
  for (const l of loops) checkLoop(store.viewLoop(state, l.id), `${step} [loop ${l.name || "only"}${l.inUse ? ", in use" : ""}]`, l.inUse);
}

/** The rules for one loop, seen as the one in use. */
function checkLoop(state, step, inUse) {
  const at = (msg) => `${step}: ${msg}`;
  const running = state.workouts.map((w) => w.id);
  const paused = state.removedWorkouts.map((r) => r.workout.id);
  const all = [...running, ...paused];

  // The loop
  // Only a new plan is empty: once it has a workout, one always runs.
  assert.ok(running.length >= 1 || paused.length === 0, at("the loop is never empty once it has a workout"));
  assert.equal(new Set(all).size, all.length, at("no workout is both running and paused, or there twice"));
  if (running.length) assert.ok(running.includes(store.upNext(state).id), at("what's next is in the loop"));
  for (const id of state.workoutQueue ?? []) assert.ok(running.includes(id), at(`queued ${id} is in the loop`));
  for (const id of state.postponed ?? []) assert.ok(running.includes(id), at(`put-off ${id} is in the loop`));
  const plan = store.planWorkouts(state).map((w) => w.id);
  assert.equal([...plan].sort().join(), [...all].sort().join(), at("Plan shows every workout once"));

  // Workouts and their slots
  for (const w of [...state.workouts, ...state.removedWorkouts.map((r) => r.workout)]) {
    const ids = w.exercises.map((e) => e.id);
    assert.equal(new Set(ids).size, ids.length, at(`${w.name}: slot ids are unique`));
    for (const e of w.exercises) assert.ok(setsFor(e) >= 1, at(`${w.name}/${e.slot}: has sets`));
  }
  // What runs, in the plan in use: a waiting plan's lifts may still be in the
  // library, and come out of it when you switch to it.
  for (const w of inUse ? state.workouts : []) {
    const lifts = store.liftsToRun(state, w).map((l) => l.exerciseId);
    for (const id of lifts) assert.ok(store.lookup(state, id), at(`${w.name}: ${id} exists`));
    assert.equal(new Set(lifts).size, lifts.length, at(`${w.name}: no exercise twice (${lifts.join(", ")})`));
  }

  // Records
  for (const [k, r] of Object.entries(state.history)) {
    const ex = store.lookup(state, r.exerciseId);
    assert.ok(Number.isFinite(r.weight), at(`${k}: weight is a number`));
    if (ex && !ex.assistable) assert.ok(r.weight >= 0, at(`${k}: weight is not below zero`));
    assert.ok(Number.isInteger(r.rung) && r.rung >= 0, at(`${k}: rung ${r.rung}`));
  }

  // The session in progress
  if (state.active && inUse) {
    assert.ok(running.includes(state.active.workoutId), at("the workout being trained is in the loop"));
    const lifts = state.active.items.filter(store.isLift);
    for (const it of lifts) {
      assert.ok(Number.isFinite(it.weight), at(`${it.exerciseId}: session weight`));
      assert.equal(it.logged.length >= 1, true, at(`${it.exerciseId}: has circles`));
    }
    const ids = lifts.filter((it) => !it.skipped).map((it) => it.exerciseId);
    assert.equal(new Set(ids).size, ids.length, at(`session: no exercise twice (${ids.join(", ")})`));
  }
}

/** Train the next workout: every lift tapped, some short, some skipped. */
function train(state, rnd, now, chances) {
  return carryOn(store.buildWorkout(state, now), rnd, now, chances);
}

/** Finish the session in progress from wherever it is. */
function carryOn(state, rnd, now, { shortChance = 0.2, skipChance = 0.1 } = {}) {
  let guard = 0;
  while (!store.isComplete(state) && guard++ < 200) {
    const item = state.active.items[state.active.cursor];
    if (!store.isLift(item) || rnd() < skipChance) {
      state = store.skipExercise(state);
      continue;
    }
    for (let i = 0; i < item.logged.length; i++) {
      state = store.tapSet(state, i);
      // Counting down: fewer reps than the target.
      if (rnd() < shortChance) state = store.tapSet(state, i);
    }
    state = store.completeExercise(state);
  }
  return store.finishWorkout(state, now);
}

const pick = (rnd, list) => list[Math.floor(rnd() * list.length)];

/** One thing a person might do in Plan, or during a workout. */
function act(state, rnd, now, planOnly = false) {
  // A new plan has no workouts yet: only filling it, or the plans, then.
  const empty = state.workouts.length === 0;
  const w = pick(rnd, state.workouts) ?? { id: "none", exercises: [] };
  const entry = w.exercises.length ? pick(rnd, w.exercises) : undefined;
  const moves = [
    ["train", () => train(state, rnd, now)],
    ["skip workout", () => store.skipWorkout(state)],
    ["put off", () => store.postponeWorkout(state)],
    ["do next", () => store.setNextWorkout(state, w.id)],
    ["reorder", () => store.moveWorkout(state, Math.floor(rnd() * state.workouts.length), Math.floor(rnd() * state.workouts.length))],
    ["reorder in Plan", () => {
      const n = store.planWorkouts(state).length;
      return store.movePlanWorkout(state, Math.floor(rnd() * n), Math.floor(rnd() * n));
    }],
    ["pause", () => store.pauseWorkout(state, w.id)],
    ["resume", () => state.removedWorkouts.length ? store.resumeWorkout(state, pick(rnd, state.removedWorkouts).workout.id) : state],
    ["delete", () => store.deleteWorkout(state, pick(rnd, store.planWorkouts(state)).id)],
    ["new workout", () => store.addWorkoutOfKind(state, `w_${Math.floor(rnd() * 1e9)}`, pick(rnd, KIND_ORDER))],
    ["copy", () => store.copyWorkout(state, w.id, `c_${Math.floor(rnd() * 1e9)}`)],
    ["add exercise", () => {
      const ex = pick(rnd, store.everyExercise(state));
      return store.addExerciseToWorkout(state, w.id, ex.id, `s_${Math.floor(rnd() * 1e9)}`);
    }],
    ["remove exercise", () => entry ? store.removeEntry(state, w.id, entry.id) : state],
    ["move exercise", () => store.moveEntry(state, w.id, Math.floor(rnd() * w.exercises.length), Math.floor(rnd() * w.exercises.length))],
    ["swap", () => {
      if (!entry) return state;
      return store.swapInPlan(state, w.id, entry.id, pick(rnd, store.poolFor(state, w.id, entry)));
    }],
    ["sets", () => entry ? store.updateEntry(state, w.id, entry.id, { sets: 1 + Math.floor(rnd() * 5) }) : state],
    ["reps", () => entry ? store.updateEntry(state, w.id, entry.id, { scheme: pick(rnd, ["6-12", "8-12", "10-14", "6-10"]) }) : state],
    ["set weight", () => {
      if (!entry) return state;
      const id = store.chosen(state, w.id, entry);
      return store.setExerciseWeight(state, id, Math.round(rnd() * 60));
    }],
    ["remove from library", () => {
      const id = pick(rnd, store.catalogue(state)).id;
      return store.removeExercise(state, id);
    }],
    ["mid-session", () => {
      // Start, do a little, change the plan from inside the workout, finish.
      let s = store.buildWorkout(state, now);
      const it = s.active.items[s.active.cursor];
      if (store.isLift(it)) s = store.tapSet(s, 0);
      const live = store.workoutById(s, s.active.workoutId);
      if (live.exercises.length) s = store.removeEntry(s, live.id, pick(rnd, live.exercises).id);
      s = store.pauseWorkout(s, s.active.workoutId); // refused: it's being trained
      s = store.deleteWorkout(s, s.active.workoutId); // refused too
      const pool = store.currentPool(s);
      if (pool.length && store.isLift(s.active.items[s.active.cursor])) s = store.swapForSession(s, pick(rnd, pool));
      check(s, "mid-session, before finishing");
      return carryOn(s, rnd, now);
    }],
  ];
  const loops = store.loopsOf(state);
  const inUse = store.loopInUse(state);
  const other = pick(rnd, loops).id;
  const id = () => `${Math.floor(rnd() * 1e9)}`;
  moves.push(
    ["new plan", () => store.newLoop(state, `p_${id()}`, pick(rnd, ["Travel", "Home", ""]))],
    ["switch loop", () => store.switchLoop(state, other)],
    ["delete loop", () => store.deleteLoop(state, other)],
    ["rename loop", () => store.renameLoop(state, other, pick(rnd, ["Gym", "Holiday", "Home", " "]))],
    ["edit another loop", () => store.inLoop(state, other, (s) => {
      // Anything but training, done to a loop that may not be the one in use.
      const [, next] = act({ ...s }, rnd, now, true);
      return next;
    })],
  );
  const plans = ["new workout", "new plan", "switch loop", "delete loop", "rename loop", "edit another loop"];
  const possible = empty ? moves.filter(([n]) => plans.includes(n)) : moves;
  const usable = planOnly ? possible.filter(([n]) => !["train", "mid-session", "switch loop", "new plan", "delete loop", "rename loop", "edit another loop"].includes(n)) : possible;
  const [name, run] = pick(rnd, usable);
  return [name, run()];
}

for (const seed of [1, 7, 42, 2026, 31337]) {
  test(`a long run of everything, seed ${seed}: every rule holds after every step`, () => {
    const rnd = random(seed);
    let state = store.resetToDefault();
    let now = Date.UTC(2026, 10, 1);
    const trail = [];
    for (let i = 0; i < 400; i++) {
      now += rnd() < 0.5 ? DAY : DAY / 4;
      const [name, next] = act(state, rnd, now);
      trail.push(name);
      try {
        check(next, `step ${i} (${name})`);
      } catch (e) {
        e.message += `\n  last steps: ${trail.slice(-8).join(" → ")}`;
        throw e;
      }
      state = next;
    }
  });
}

// ---- one by one ----

// Chains placed at the exercise itself; chains are tested on their own.
const fresh = () => ({ ...store.resetToDefault(), steps: { push_up: 3, pullup: 3 } });
const push = (s) => store.workoutById(s, "push");
const slot = (s, wid, label) => store.workoutById(s, wid).exercises.find((e) => e.slot === label);
/** Push's third slot, whatever the default plan puts there. */
const third = (s) => push(s).exercises[2];
const now0 = Date.UTC(2026, 10, 1);

test("a weight belongs to the exercise: swapped out and back, it is where it was", () => {
  let s = fresh();
  s = train(s, random(1), now0, { shortChance: 0, skipChance: 0 });
  const bench = slot(s, "push", "Horizontal press");
  const before = store.nextWeight(s, "db_bench");
  const other = store.poolFor(s, "push", bench).find((id) => id !== "db_bench");
  s = store.swapInPlan(s, "push", bench.id, other);
  assert.equal(store.chosen(s, "push", bench), other);
  s = store.swapInPlan(s, "push", bench.id, "db_bench");
  assert.equal(store.nextWeight(s, "db_bench"), before);
});

test("a slot keeps its id through a swap, and the swap stays with the slot when slots move", () => {
  let s = fresh();
  const fly = third(s);
  const other = store.poolFor(s, "push", fly).find((id) => !store.liftsToRun(s, push(s)).some((l) => l.exerciseId === id));
  s = store.swapInPlan(s, "push", fly.id, other);
  s = store.moveEntry(s, "push", push(s).exercises.findIndex((e) => e.id === fly.id), 0);
  assert.equal(push(s).exercises[0].id, fly.id);
  assert.equal(store.chosen(s, "push", push(s).exercises[0]), other);
});

test("removed and added back, an exercise opens at the weight it had", () => {
  let s = fresh();
  s = train(s, random(2), now0, { shortChance: 0, skipChance: 0 });
  const row = slot(s, "pull", "One-arm row");
  const w = store.nextWeight(s, "db_row");
  s = store.removeEntry(s, "pull", row.id);
  assert.ok(!store.workoutById(s, "pull").exercises.some((e) => e.id === row.id));
  assert.ok(!(store.slotKey("pull", row.id) in s.choices), "its choice goes with it");
  s = store.addExerciseToWorkout(s, "pull", "db_row", "s_back");
  assert.equal(store.nextWeight(s, "db_row"), w);
});

test("the same exercise can't be added to a workout twice", () => {
  let s = fresh();
  const before = push(s).exercises.length;
  s = store.addExerciseToWorkout(s, "push", "db_bench", "s_twice");
  assert.equal(push(s).exercises.length, before);
});

test("a swap for today leaves the plan alone", () => {
  let s = store.buildWorkout(fresh(), now0);
  while (!store.isLift(s.active.items[s.active.cursor])) s = store.skipExercise(s);
  const planned = s.active.items[s.active.cursor].exerciseId;
  const other = store.currentPool(s).find((id) => id !== planned);
  s = store.swapForSession(s, other);
  assert.equal(s.active.items[s.active.cursor].exerciseId, other);
  s = store.tapSet(s, 0);
  s = store.finishWorkout(s, now0);
  const entry = store.workoutById(s, "push").exercises.find((e) => e.options[0] === planned);
  assert.equal(store.chosen(s, "push", entry), planned, "next time it's the usual one again");
});

test("changing the sets changes the circles next time, and the weight stays", () => {
  let s = train(fresh(), random(3), now0, { shortChance: 0, skipChance: 0 });
  const bench = slot(s, "push", "Horizontal press");
  const w = store.nextWeight(s, "db_bench");
  s = store.updateEntry(s, "push", bench.id, { sets: 5 });
  s = store.setNextWorkout(s, "push");
  s = store.buildWorkout(s, now0 + DAY);
  const item = s.active.items.find((it) => store.isLift(it) && it.exerciseId === "db_bench");
  assert.equal(item.logged.length, 5);
  assert.equal(item.weight, w);
});

test("every set clean at the top of the range: the weight goes up, never down", () => {
  let s = fresh();
  let now = now0;
  const start = store.nextWeight(s, "db_bench");
  let last = start;
  for (let i = 0; i < 12; i++) {
    s = store.setNextWorkout(s, "push");
    s = train(s, random(i), (now += DAY), { shortChance: 0, skipChance: 0 });
    const w = store.nextWeight(s, "db_bench");
    assert.ok(w >= last, `session ${i}: ${w} after ${last}`);
    last = w;
  }
  assert.ok(last > start, `climbed from ${start} to ${last}`);
});

test("pausing what's next moves next on; resuming changes nothing about next", () => {
  let s = fresh();
  assert.equal(store.upNext(s).id, "push");
  s = store.pauseWorkout(s, "push");
  assert.equal(store.upNext(s).id, "pull");
  s = store.resumeWorkout(s, "push");
  assert.equal(store.upNext(s).id, "pull");
  assert.equal(s.workouts.map((w) => w.id).join(), "push,pull,legs", "back in its place");
});

test("the last workout in the loop can't be paused or deleted", () => {
  let s = fresh();
  s = store.pauseWorkout(s, "push");
  s = store.pauseWorkout(s, "pull");
  const one = store.pauseWorkout(s, "legs");
  assert.equal(one.workouts.length, 1);
  assert.equal(store.deleteWorkout(one, "legs").workouts.length, 1);
});

test("a workout being trained can't be paused or deleted out from under you", () => {
  let s = store.buildWorkout(fresh(), now0);
  assert.equal(store.pauseWorkout(s, "push"), s);
  assert.equal(store.deleteWorkout(s, "push"), s);
});

test("a deleted workout takes its swaps with it, and a paused one keeps them", () => {
  let s = fresh();
  const fly = third(s);
  const other = store.poolFor(s, "push", fly).find((id) => !store.liftsToRun(s, push(s)).some((l) => l.exerciseId === id));
  s = store.swapInPlan(s, "push", fly.id, other);
  const paused = store.resumeWorkout(store.pauseWorkout(s, "push"), "push");
  assert.equal(store.chosen(paused, "push", fly), other);
  const gone = store.deleteWorkout(s, "push");
  assert.ok(!Object.keys(gone.choices).some((k) => k.startsWith("push/")));
});

test("plan edits during a workout: the session keeps its shape, and finishing still records it", () => {
  let s = store.buildWorkout(fresh(), now0);
  const lifts = s.active.items.filter(store.isLift).length;
  const doneToday = store.chosen(s, "push", third(s));
  s = store.removeEntry(s, "push", third(s).id);
  assert.equal(s.active.items.filter(store.isLift).length, lifts);
  while (!store.isComplete(s)) {
    const it = s.active.items[s.active.cursor];
    if (store.isLift(it)) {
      for (let i = 0; i < it.logged.length; i++) s = store.tapSet(s, i);
      s = store.completeExercise(s);
    } else s = store.skipExercise(s);
  }
  s = store.finishWorkout(s, now0);
  assert.ok(s.history[store.key(doneToday, third(store.resetToDefault()).scheme)]?.lastTrainedAt, "the lift done today is recorded");
  assert.equal(store.upNext(s).id, "pull");
});

test("started and left with nothing done: nothing is recorded and the same workout is next", () => {
  let s = store.buildWorkout(fresh(), now0);
  s = store.finishWorkout(s, now0);
  assert.equal(s.log.length, 0);
  assert.equal(store.upNext(s).id, "push");
});

test("a skipped lift keeps its weight and its place on the ladder", () => {
  let s = train(fresh(), random(4), now0, { shortChance: 0, skipChance: 0 });
  const before = { ...s.history[store.key("db_bench", "6-10")] };
  s = store.setNextWorkout(s, "push");
  s = store.buildWorkout(s, now0 + DAY);
  while (!store.isComplete(s)) {
    const it = s.active.items[s.active.cursor];
    if (store.isLift(it) && it.exerciseId !== "db_bench") {
      for (let i = 0; i < it.logged.length; i++) s = store.tapSet(s, i);
      s = store.completeExercise(s);
    } else s = store.skipExercise(s);
  }
  s = store.finishWorkout(s, now0 + DAY);
  const after = s.history[store.key("db_bench", "6-10")];
  assert.equal(after.weight, before.weight);
  assert.equal(after.rung, before.rung);
});

test("removing an exercise from the library: a slot that used it falls back, never to a duplicate", () => {
  let s = fresh();
  const bench = slot(s, "push", "Horizontal press");
  const other = store.poolFor(s, "push", bench).find((id) => id !== "db_bench");
  s = store.swapInPlan(s, "push", bench.id, other);
  s = store.removeExercise(s, other);
  const lifts = store.liftsToRun(s, push(s)).map((l) => l.exerciseId);
  assert.ok(!lifts.includes(other));
  assert.equal(new Set(lifts).size, lifts.length);
});

test("sets that keep falling short: the weight never goes up, and in time it comes down", () => {
  let s = train(fresh(), random(5), now0, { shortChance: 0, skipChance: 0 });
  let now = now0;
  const start = store.nextWeight(s, "db_bench");
  let last = start;
  for (let i = 0; i < 10; i++) {
    s = store.setNextWorkout(s, "push");
    // Every set counted down three times: well short of the target.
    s = store.buildWorkout(s, (now += DAY));
    while (!store.isComplete(s)) {
      const it = s.active.items[s.active.cursor];
      if (!store.isLift(it)) { s = store.skipExercise(s); continue; }
      for (let j = 0; j < it.logged.length; j++) for (let t = 0; t < 4; t++) s = store.tapSet(s, j);
      s = store.completeExercise(s);
    }
    s = store.finishWorkout(s, now);
    const w = store.nextWeight(s, "db_bench");
    assert.ok(w <= last, `session ${i}: ${w} after ${last}`);
    last = w;
  }
  assert.ok(last < start, `came down from ${start} to ${last}`);
});

// ---- plans ----
// More in tests/plans.cjs.

/** A plan of its own with one Bodyweight workout, waiting. */
const holiday = (s) =>
  store.inLoop(store.newLoop(s, "away", "Travel"), "away", (v) => store.addWorkoutOfKind(v, "bw", "bodyweight"));

test("holiday: a plan of its own, and the gym plan waits where you left it", () => {
  let s = fresh();
  s = train(s, random(8), now0, { shortChance: 0, skipChance: 0 });
  assert.equal(store.upNext(s).id, "pull");
  const weights = JSON.stringify(s.history);
  s = holiday(s);
  assert.equal(store.loopInUse(s), store.FIRST_LOOP, "the new plan waits until you use it");
  assert.equal(store.upNext(s).id, "pull");
  s = store.switchLoop(s, "away");
  const logged = s.log.length;
  assert.equal(store.upNext(s).id, "bw");
  assert.equal(s.workouts.map((w) => w.id).join(), "bw", "only Bodyweight in the plan: nothing paused, nothing cluttered");
  s = train(s, random(9), now0 + DAY, { shortChance: 0, skipChance: 0 });
  s = train(s, random(10), now0 + 2 * DAY, { shortChance: 0, skipChance: 0 });
  s = store.switchLoop(s, store.FIRST_LOOP);
  assert.equal(store.upNext(s).id, "pull", "home again: Pull, where the gym plan stopped");
  assert.equal(s.workouts.map((w) => w.id).join(), "push,pull,legs");
  const away = new Set(s.log.slice(logged).flatMap((l) => l.entries.map((e) => e.exerciseId)));
  for (const [k, r] of Object.entries(JSON.parse(weights))) {
    if (away.has(r.exerciseId)) continue;
    assert.equal(s.history[k].weight, r.weight, `${k} untouched by the holiday`);
  }
});

test("one exercise, one climb: a weight is the same in every plan", () => {
  let s = holiday(fresh());
  s = store.inLoop(s, "away", (v) => store.addExerciseToWorkout(v, "bw", "goblet_squat", "s_goblet"));
  s = train(s, random(11), now0, { shortChance: 0, skipChance: 0 }); // Push, in the gym plan
  s = store.setNextWorkout(s, "legs");
  s = train(s, random(12), now0 + DAY, { shortChance: 0, skipChance: 0 });
  const w = store.nextWeight(s, "goblet_squat");
  s = store.switchLoop(s, "away");
  s = store.buildWorkout(s, now0 + 2 * DAY);
  const item = s.active.items.find((it) => store.isLift(it) && it.exerciseId === "goblet_squat");
  assert.equal(item.weight, w);
});

test("no switching plans in the middle of a workout", () => {
  let s = store.buildWorkout(holiday(fresh()), now0);
  assert.equal(store.switchLoop(s, "away"), s);
});

test("editing a plan that isn't in use leaves the one in use exactly as it was", () => {
  let s = holiday(fresh());
  const before = JSON.stringify(store.viewLoop(s, store.FIRST_LOOP).workouts) + store.upNext(s).id;
  s = store.inLoop(s, "away", (v) => store.addWorkoutOfKind(v, "bw2", "bodyweight"));
  s = store.inLoop(s, "away", (v) => store.removeEntry(v, "bw", store.workoutById(v, "bw").exercises[0].id));
  s = store.inLoop(s, "away", (v) => store.setNextWorkout(v, "bw2"));
  assert.equal(JSON.stringify(s.workouts) + store.upNext(s).id, before);
  assert.equal(store.loopInUse(s), store.FIRST_LOOP);
  s = store.switchLoop(s, "away");
  assert.equal(store.upNext(s).id, "bw2", "the edits are there when you use it");
  assert.equal(store.workoutById(s, "bw").exercises.length, 4);
});

test("deleting a plan takes its workouts and their swaps, and never the one in use", () => {
  let s = holiday(fresh());
  const gone = store.deleteLoop(s, "away");
  assert.ok(!store.loopsOf(gone).some((l) => l.id === "away"));
  assert.ok(!Object.keys(gone.choices).some((k) => k.startsWith("bw/")));
  assert.equal(store.deleteLoop(s, store.FIRST_LOOP), s, "not the plan in use");
});
