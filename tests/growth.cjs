const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Growth: a plan starts small, and showing up earns more — offered, never
// done behind your back, and never undoing what you changed yourself.
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
const growth = load("@/data/growth");

const DAY = 24 * 60 * 60 * 1000;
const t0 = Date.UTC(2026, 10, 1);

/** A new person's plan, made on day one. */
const begin = () => store.applyPlan(store.resetToDefault(), { home: null, time: "long", easy: [], lifter: { experience: "new" } }, t0);

/** Train the next workout in full on a day. */
function train(state, now) {
  state = store.buildWorkout(state, now);
  while (!store.isComplete(state)) {
    const it = state.active.items[state.active.cursor];
    if (!store.isLift(it)) { state = store.skipExercise(state); continue; }
    for (let i = 0; i < it.logged.length; i++) state = store.tapSet(state, i);
    state = store.completeExercise(state);
  }
  return store.finishWorkout(state, now);
}

/** Come on `days` of the next three weeks. */
const weeks = (state, days, from = state.growth.since) => {
  for (let d = 1; d <= days; d++) state = train(state, from + d * (21 / days) * DAY - 1000);
  return state;
};

const lifts = (s, id) => store.workoutById(s, id).exercises.map((e) => e.id).join();
// Read from the plan, so these hold whatever the default workouts are.
const START = growth.START_SLOTS;
const GROW = growth.GROWTH_SLOTS;
const nameOf = (entry) => store.lookup(store.resetToDefault(), entry.options[0]).name;
const plus = (id, ...n) => [...START[id], ...n.map((i) => GROW[id][i].id)].join();

test("a new plan starts small: three lifts, cardio to open, nothing to close on", () => {
  const s = begin();
  for (const id of ["push", "pull", "legs"]) {
    assert.equal(START[id].length, 3);
    assert.equal(lifts(s, id), START[id].join());
  }
  for (const w of s.workouts) {
    assert.ok(store.cardioPlan(s, w, "open"), `${w.name} opens with cardio`);
    assert.equal(store.cardioPlan(s, w, "close"), null, `${w.name} has no closing cardio`);
  }
});

test("a plan from before growth is never offered anything", () => {
  let s = store.resetToDefault();
  for (let d = 1; d <= 40; d++) s = train(s, t0 + d * DAY);
  assert.equal(s.growth, undefined);
  assert.equal(store.growthOffer(s, t0 + 41 * DAY), null);
});

test("no offer before three weeks, or without twelve workouts in them", () => {
  let s = begin();
  for (let d = 1; d <= 15; d++) s = train(s, t0 + d * DAY);
  assert.equal(store.growthOffer(s, t0 + 16 * DAY), null, "fifteen workouts, but only sixteen days");
  let few = begin();
  few = weeks(few, 10);
  assert.equal(store.growthOffer(few, t0 + 22 * DAY), null, "three weeks, but only ten workouts");
  assert.ok(store.growthOffer(s, t0 + 22 * DAY), "three weeks and fifteen workouts");
});

test("the offer says exactly what each choice adds, where", () => {
  const s = weeks(begin(), 14);
  const offer = store.growthOffer(s, t0 + 22 * DAY);
  assert.equal(offer.map((c) => c.track).join(), "lift,cardio,stretch");
  const lift = offer[0].changes.map((c) => `${c.workout}: ${c.what}`).join(" | ");
  assert.equal(lift, ["push", "pull", "legs"].map((id) => `${id[0].toUpperCase()}${id.slice(1)}: ${nameOf(GROW[id][0])}`).join(" | "));
  assert.equal(offer[1].changes.length, 3);
  assert.equal(offer[2].changes[0].what, "Yoga flow to finish");
});

test("yes adds exactly that, and the next offer waits three more weeks", () => {
  let s = weeks(begin(), 14);
  const now = t0 + 22 * DAY;
  s = store.acceptGrowth(s, "lift", now);
  assert.equal(lifts(s, "push"), plus("push", 0));
  assert.equal(lifts(s, "legs"), plus("legs", 0));
  assert.equal(store.growthOffer(s, now + DAY), null);
  s = weeks(s, 14, now);
  const next = store.growthOffer(s, now + 22 * DAY);
  assert.equal(next[0].changes.map((c) => c.what).join(), ["push", "pull", "legs"].map((id) => nameOf(GROW[id][1])).join(), "then the next slot");
});

test("not now waits three more weeks of showing up", () => {
  let s = weeks(begin(), 14);
  const now = t0 + 22 * DAY;
  s = store.declineGrowth(s, now);
  assert.equal(store.growthOffer(s, now + 5 * DAY), null);
  s = weeks(s, 13, now);
  assert.ok(store.growthOffer(s, now + 22 * DAY));
});

test("a slot growth added and you swapped is never added again", () => {
  let s = weeks(begin(), 14);
  const now = t0 + 22 * DAY;
  s = store.acceptGrowth(s, "lift", now);
  const first = GROW.push[0];
  const other = store.poolFor(s, "push", first).find((id) => id !== first.options[0] && id !== GROW.push[1].options[0]);
  s = store.swapInPlan(s, "push", first.id, other);
  s = weeks(s, 14, now);
  const push = store.growthOffer(s, now + 22 * DAY)[0].changes.find((c) => c.workoutId === "push");
  assert.equal(push.what, nameOf(GROW.push[1]), "the next slot comes, not the swapped one again");
});

test("a slot growth added and you removed never comes back", () => {
  let s = weeks(begin(), 14);
  const now = t0 + 22 * DAY;
  s = store.acceptGrowth(s, "lift", now);
  s = store.removeEntry(s, "pull", GROW.pull[0].id);
  s = weeks(s, 14, now);
  const later = now + 22 * DAY;
  s = store.acceptGrowth(s, "lift", later);
  assert.equal(lifts(s, "pull"), plus("pull", 1), "the next slot, and not the removed one again");
});

test("a workout you filled yourself is left alone, and the cap is five", () => {
  let s = weeks(begin(), 14);
  for (const id of ["face_pull", "lateral_raise"]) s = store.addExerciseToWorkout(s, "push", id, `s_${id}`);
  const offer = store.growthOffer(s, t0 + 22 * DAY);
  assert.ok(!offer[0].changes.some((c) => c.workoutId === "push"), "Push already has five");
  s = store.acceptGrowth(s, "lift", t0 + 22 * DAY);
  assert.equal(store.workoutById(s, "push").exercises.length, 5);
});

test("paused workouts and workouts you made are never touched", () => {
  let s = weeks(begin(), 14);
  s = store.pauseWorkout(s, "legs");
  s = store.addWorkoutOfKind(s, "mine", "push");
  const before = JSON.stringify(store.workoutById(s, "mine"));
  s = store.acceptGrowth(s, "lift", t0 + 22 * DAY);
  assert.equal(JSON.stringify(store.workoutById(s, "mine")), before);
  assert.equal(s.removedWorkouts[0].workout.exercises.length, 3);
});

test("cardio and stretch steps: cardio to finish, then the Yoga flow; then nothing more of either", () => {
  let s = weeks(begin(), 14);
  let now = t0 + 22 * DAY;
  s = store.acceptGrowth(s, "cardio", now);
  for (const w of s.workouts) assert.ok(store.cardioPlan(s, w, "close"), `${w.name} finishes with cardio`);
  s = weeks(s, 14, now);
  now += 22 * DAY;
  s = store.acceptGrowth(s, "stretch", now);
  for (const w of s.workouts) assert.equal(store.mobilityPlan(s, w).id, "yoga");
  s = weeks(s, 14, now);
  assert.equal(store.growthOffer(s, now + 22 * DAY).map((c) => c.track).join(), "lift");
});

test("fully grown: today's full plan, and no more offers", () => {
  let s = weeks(begin(), 14);
  let now = t0 + 22 * DAY;
  for (const track of ["lift", "lift", "cardio", "stretch"]) {
    s = store.acceptGrowth(s, track, now);
    s = weeks(s, 14, now);
    now += 22 * DAY;
  }
  assert.equal(store.growthOffer(s, now), null);
  assert.equal(store.workoutById(s, "push").exercises.length, 5);
  assert.equal(store.workoutById(s, "legs").exercises.length, 5);
});
