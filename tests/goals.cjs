const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Goals: a ladder of steps, each owned on target two sessions running, done as
// its own block straight after the warm-up in the workouts you choose.
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
const goals = load("@/data/goals");

const fresh = () => store.resetToDefault();
const plain = (value) => JSON.parse(JSON.stringify(value));

/** Handstand push-up: a plank, pike push-ups, kick-ups, in Push A. */
const withGoal = (state = fresh()) => {
  let s = store.addGoal(state, "hspu", "Handstand push-up", Date.UTC(2026, 9, 14));
  s = store.addStep(s, "hspu", { id: "plank", name: "Wall plank", measure: "hold", sets: 3, target: 30 });
  s = store.addStep(s, "hspu", { id: "pike", name: "Pike push-up", measure: "reps", sets: 3, target: 8 });
  s = store.addStep(s, "hspu", { id: "kick", name: "Kick-ups to the wall", measure: "practice", sets: 1, target: 5 });
  return store.practiseIn(s, "hspu", "push", true);
};

/** Start Push A and move to its goal block. */
const startPush = (state) => {
  const started = store.buildWorkout(store.setNextWorkout(state, "push"));
  const at = started.active.items.findIndex((it) => store.isGoal(it));
  return { ...started, active: { ...started.active, cursor: at } };
};

const goalOf = (state) => store.goalById(state, "hspu");

test("a goal is its own block, straight after the warm-up, in the workouts you choose", () => {
  const state = withGoal();
  const started = store.buildWorkout(store.setNextWorkout(state, "push"));
  const kinds = started.active.items.map((it) => it.kind ?? "lift");
  // Push presses: its shoulder warm-up comes before the goal, readying the shoulders for it.
  assert.equal(kinds.slice(0, 4).join(","), "cardio,mobility,goal,lift");
  const block = started.active.items[2];
  assert.equal(block.exerciseId, "hspu");
  assert.equal(block.step, "plank");
  assert.equal(block.logged.length, 3);
  assert.equal(store.itemFamily(block), "goal");

  // Not in a workout it isn't practised in.
  const legs = store.buildWorkout(store.setNextWorkout(state, "legs"));
  assert.ok(!legs.active.items.some((it) => store.isGoal(it)));
  // A goal with no steps has nothing to do, so it stays out.
  const empty = store.practiseIn(store.addGoal(fresh(), "g", "Muscle-up"), "g", "push", true);
  assert.ok(!store.buildWorkout(store.setNextWorkout(empty, "push")).active.items.some((it) => store.isGoal(it)));
});

test("a step is owned on target two sessions running, and a short one starts the count again", () => {
  let state = store.startFrom(withGoal(), "hspu", 1);
  const session = (reps) => {
    let s = startPush(state);
    reps.forEach((r, i) => {
      s = store.resetGoalSet(s, i);
      for (let n = 8; n > r; n--) s = store.tapGoalSet(s, i);
    });
    return s;
  };

  // On target once: one more to go.
  let s = session([8, 8, 8]);
  assert.equal(store.goalVerdict(s, s.active.items[s.active.cursor]).outcome, "hit");
  state = store.finishWorkout(s);
  assert.equal(goalOf(state).at, 1);
  assert.equal(goalOf(state).streak, 1);

  // Short: back to none running.
  state = store.finishWorkout(session([8, 7, 8]));
  assert.equal(goalOf(state).streak, 0);

  // Twice running: owned, on to the next step.
  state = store.finishWorkout(session([8, 8, 8]));
  s = session([8, 8, 8]);
  assert.equal(store.goalVerdict(s, s.active.items[s.active.cursor]).outcome, "owned");
  state = store.finishWorkout(s);
  assert.equal(goalOf(state).at, 2);
  assert.equal(goalOf(state).streak, 0);
  assert.equal(typeof goalOf(state).owned.pike, "number");

  const entry = state.log.at(-1).entries.find((e) => e.kind === "goal");
  assert.equal(plain(entry).outcome, "owned");
  assert.equal(entry.step, "Pike push-up");
  assert.equal(entry.goal, "Handstand push-up");
  assert.equal(entry.reps.join(","), "8,8,8");
});

test("holds come down five seconds a tap, and a clock logs what it read", () => {
  let s = startPush(withGoal());
  s = store.logGoalSet(s, 0, 30);
  s = store.logGoalSet(s, 1, 24.4);
  assert.equal(s.active.items[s.active.cursor].logged.join(","), "30,24,");
  s = store.tapGoalSet(s, 0);
  assert.equal(s.active.items[s.active.cursor].logged[0], 25);
  s = store.resetGoalSet(s, 0);
  assert.equal(s.active.items[s.active.cursor].logged[0], 30);
  assert.ok(s.active.lastSetAt, "a hold logged starts the rest");
});

test("practice moves on when you say you've got it, and counts as done when you move on", () => {
  let state = store.startFrom(withGoal(), "hspu", 2);
  // Practised, not got: the step stays.
  let s = startPush(state);
  assert.equal(store.goalVerdict(s, s.active.items[s.active.cursor]), null);
  s = store.completeGoal(s);
  assert.equal(s.active.items[s.active.cursor - 1].logged[0], 300);
  state = store.finishWorkout(s);
  assert.equal(goalOf(state).at, 2);
  assert.equal(plain(state.log.at(-1).entries.find((e) => e.kind === "goal")).outcome, "practised");

  // Got it on the last step: the goal is learned, and leaves the workout.
  s = store.setGot(startPush(state), true);
  const verdict = store.goalVerdict(s, s.active.items[s.active.cursor]);
  assert.equal(verdict.outcome, "owned");
  assert.equal(verdict.learned, true);
  state = store.finishWorkout(store.completeGoal(s, 140));
  assert.equal(typeof goalOf(state).learned, "number");
  assert.equal(state.log.at(-1).entries.find((e) => e.kind === "goal").reps[0], 140);
  assert.ok(!store.buildWorkout(store.setNextWorkout(state, "push")).active.items.some((it) => store.isGoal(it)));

  // A new step at the top gives it somewhere to go again.
  state = store.addStep(state, "hspu", { id: "neg", name: "Slow negatives", measure: "reps", sets: 3, target: 3 });
  assert.equal(goalOf(state).learned, undefined);
  assert.equal(goals.currentStep(goalOf(state)).id, "neg");
});

test("skipping a goal block, or leaving it untouched, moves nothing", () => {
  let state = store.startFrom(withGoal(), "hspu", 1);
  let s = startPush(state);
  s = store.resetGoalSet(s, 0);
  state = store.finishWorkout(s);
  assert.equal(goalOf(state).streak, 0, "partly done is short");
  state = { ...state, goals: state.goals.map((g) => ({ ...g, streak: 1 })) };
  // Some lift logged so the session counts, the goal skipped.
  s = startPush(state);
  s = store.skipExercise(s);
  s = store.tapSet(s, 0);
  state = store.finishWorkout(s);
  assert.equal(goalOf(state).streak, 1);
  assert.ok(!state.log.at(-1).entries.some((e) => e.kind === "goal"));
});

test("reordering and removing steps keeps you on the step you were on", () => {
  let state = store.startFrom(withGoal(), "hspu", 1);
  state = store.moveStep(state, "hspu", 2, 0);
  assert.equal(goalOf(state).steps.map((st) => st.id).join(","), "kick,plank,pike");
  assert.equal(goals.currentStep(goalOf(state)).id, "pike");
  state = store.removeStep(state, "hspu", "kick");
  assert.equal(goals.currentStep(goalOf(state)).id, "pike");
  // Remove the one you are on: the next one up — here the one below, since it was the top.
  state = store.removeStep(state, "hspu", "pike");
  assert.equal(goals.currentStep(goalOf(state)).id, "plank");
});

test("a step changed in Plan mid-session is logged but moves nothing", () => {
  let state = store.startFrom(withGoal(), "hspu", 1);
  state = { ...state, goals: state.goals.map((g) => ({ ...g, streak: 1 })) };
  let s = startPush(state);
  for (let i = 0; i < 3; i++) s = store.resetGoalSet(s, i);
  s = store.startFrom(s, "hspu", 0);
  state = store.finishWorkout(s);
  assert.equal(goalOf(state).at, 0);
  assert.equal(goalOf(state).streak, 0);
  assert.equal(plain(state.log.at(-1).entries.find((e) => e.kind === "goal")).outcome, "hit");
});

test("deleting a goal drops its block from the rest of a running session", () => {
  const state = withGoal();
  const started = store.buildWorkout(store.setNextWorkout(state, "push"));
  const gone = store.deleteGoal(started, "hspu");
  assert.ok(!gone.goals.some((g) => g.id === "hspu"));
  assert.ok(!gone.active.items.some((it) => store.isGoal(it)));
  // Finishing with a block whose goal is gone writes nothing for it.
  const kept = store.deleteGoal(startPush(state), "hspu");
  assert.ok(kept.active.items.some((it) => store.isGoal(it)));
  const done = store.finishWorkout(store.tapSet({ ...kept, active: { ...kept.active, cursor: kept.active.cursor + 1 } }, 0));
  assert.ok(!done.log.at(-1).entries.some((e) => e.kind === "goal"));
});

test("a copied workout keeps its goals, and goals survive a save", () => {
  const state = store.copyWorkout(withGoal(), "push", "w_copy");
  assert.equal(goalOf(state).workouts.join(","), "push,w_copy");
  const back = storage.fromSaved(storage.toSaved(state));
  assert.equal(goalOf(back).name, "Handstand push-up");
  assert.equal(goalOf(back).steps.length, 3);
  // A save from before goals existed picks up the starting goal.
  const old = JSON.parse(storage.toSaved(fresh()));
  delete old.state.goals;
  assert.equal(storage.fromSaved(JSON.stringify(old)).goals.map((g) => g.id).join(","), "handstand_push_up");
});

test("a fresh install comes with the handstand push-up, switched off until you take it up", () => {
  const state = fresh();
  const hspu = store.goalById(state, "handstand_push_up");
  assert.equal(hspu.steps.length, 8);
  assert.equal(hspu.steps.map((st) => st.measure).join(","), "hold,hold,hold,hold,reps,reps,practice,practice");
  assert.match(hspu.link, /facebook\.com/);
  // In no workout, so no session meets it, and Progress leaves it out.
  for (const w of state.workouts) {
    const started = store.buildWorkout(store.setNextWorkout(state, w.id));
    assert.ok(!started.active.items.some((it) => store.isGoal(it)), w.id);
  }
  assert.equal(goals.isStarted(hspu), false);
  // Taken up: in Push A from today, and on Progress since then.
  const before = Date.now();
  const taken = store.practiseIn(state, "handstand_push_up", "push", true);
  const on = store.goalById(taken, "handstand_push_up");
  assert.ok(on.since >= before);
  assert.equal(goals.isStarted(on), true);
  const both = store.practiseIn(taken, "handstand_push_up", "pull", true);
  assert.equal(store.goalById(both, "handstand_push_up").since, on.since);
  // Started from a later step without a workout, it is dated too.
  const jumped = store.goalById(store.startFrom(state, "handstand_push_up", 3), "handstand_push_up");
  assert.ok(jumped.since >= before);
  const block = store.buildWorkout(store.setNextWorkout(taken, "push")).active.items.find((it) => store.isGoal(it));
  assert.equal(block.step, "crow");
  // Deleted, it stays deleted.
  const gone = store.deleteGoal(state, "handstand_push_up");
  assert.equal(storage.fromSaved(storage.toSaved(gone)).goals.length, 0);
});

test("the words under the circles", () => {
  const pike = { id: "p", name: "Pike push-up", measure: "reps", sets: 3, target: 8 };
  const wall = { id: "w", name: "Chest-to-wall handstand", measure: "hold", sets: 3, target: 45 };
  assert.equal(goals.ruleLine(pike), "Move on: every set at 8, two sessions running.");
  assert.equal(goals.ruleLine(wall), "Move on: every hold to 45 s, two sessions running.");
  assert.equal(goals.stepAmount(wall), "3 × 45 s");
  const goal = goalOf(withGoal());
  assert.equal(goals.nextStepLine(goal, 1), "Step 3 next time: kick-ups to the wall.");
  assert.match(goals.nextStepLine(goal, 2), /learned/);
});
