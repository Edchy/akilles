const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// The real starting-weight rules, store and exercise list, without a native runtime.
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

const { EXERCISES, byId } = load("@/data/exercises");
const { START_RATIO } = load("@/data/start-ratios");
const start = load("@/lib/start-weight");
const store = load("@/store/session");

const loaded = EXERCISES.filter((e) => !e.bodyweight && !e.holds && !e.timed && !e.unloaded);

test("every loaded exercise has an existing ratio or an explicit starting placeholder", () => {
  for (const e of loaded) assert.ok(START_RATIO[e.id] || e.startWeight > 0, `${e.id} has no starting load`);
  const ids = new Set(EXERCISES.map((e) => e.id));
  for (const id of Object.keys(START_RATIO)) assert.ok(ids.has(id), `${id} is not an exercise`);
  for (const e of EXERCISES.filter((x) => x.bodyweight || x.unloaded)) assert.equal(START_RATIO[e.id], undefined, e.id);
});

test("a light newcomer starts far lighter than a heavy, experienced lifter", () => {
  const small = { experience: "new", bodyweight: 50, sex: "woman" };
  const big = { experience: "lots", bodyweight: 100, sex: "man" };
  for (const e of loaded) {
    const a = start.startGuess(e, small);
    const b = start.startGuess(e, big);
    assert.ok(a <= b, `${e.id}: ${a} > ${b}`);
    assert.ok(a >= (START_RATIO[e.id]?.bar ?? 0), `${e.id} goes under the bar`);
    assert.equal(Math.round(a / e.increment) * e.increment, a, `${e.id} is not a weight there is`);
  }
  // The goblet squat that used to open at 50 kg for everyone.
  assert.ok(start.startGuess(byId("goblet_squat"), small) <= 6);
  assert.ok(start.startGuess(byId("goblet_squat"), big) <= 25);
});

test("skipping weight and sex starts lighter than an average man who said them", () => {
  const skipped = { experience: "some" };
  const said = { experience: "some", bodyweight: 80, sex: "man" };
  for (const e of loaded) assert.ok(start.startGuess(e, skipped) <= start.startGuess(e, said), e.id);
});

test("a phone set up before the questions keeps a man's guess at 75 kg", () => {
  assert.equal(start.startGuess(byId("leg_press")), 75);
  assert.equal(start.startGuess(byId("deadlift")), 52.5);
});

test("your own lifts outweigh the questions for a lift you have never done", () => {
  const lifter = { experience: "new", bodyweight: 60, sex: "woman" };
  const press = byId("leg_press");
  const guess = start.startGuess(press, lifter);
  // Goblet squats at twice what Humbell would have guessed: the leg press follows, on the light side.
  const goblet = byId("goblet_squat");
  const trained = [{ exercise: goblet, weight: start.startGuess(goblet, lifter) * 2 }];
  const learnt = start.firstWeight(press, trained, lifter);
  assert.ok(learnt > guess && learnt < guess * 2, `${guess} → ${learnt}`);
  // Legs say nothing about arms while there are arms to go on, but stand in when there aren't.
  assert.ok(start.firstWeight(byId("db_curl"), trained, lifter) > start.startGuess(byId("db_curl"), lifter));
  const arms = [...trained, { exercise: byId("db_bench"), weight: start.startGuess(byId("db_bench"), lifter) }];
  assert.equal(start.firstWeight(byId("db_curl"), arms, lifter), start.startGuess(byId("db_curl"), lifter));
});

test("onboarding answers reach the plan and the first weights, and can be forgotten", () => {
  const fresh = store.resetToDefault();
  const answers = (lifter) => ({ home: null, time: "long", easy: [], lifter });
  assert.equal(store.shapeFor(answers({ experience: "new" })), "ppl");
  assert.equal(store.shapeFor(answers({ experience: "some" })), "ppl");
  assert.equal(store.shapeFor({ ...answers({ experience: "new" }), shape: "ppl" }), "ppl");

  const woman = store.applyPlan(fresh, answers({ experience: "new", bodyweight: 55, sex: "woman" }));
  const man = store.applyPlan(fresh, answers({ experience: "lots", bodyweight: 95, sex: "man" }));
  assert.equal(JSON.stringify(woman.lifter), JSON.stringify({ experience: "new", bodyweight: 55, sex: "woman" }));
  assert.ok(store.nextWeight(woman, "goblet_squat") < store.nextWeight(man, "goblet_squat"));

  const forgotten = store.forgetBody(woman);
  assert.equal(JSON.stringify(forgotten.lifter), JSON.stringify({ experience: "new" }));
  assert.ok(store.nextWeight(forgotten, "leg_press") > 0);
});

test("a first time that felt off moves the weight by a step or more, to a weight there is", () => {
  const goblet = byId("goblet_squat");
  assert.equal(start.feelWeight(goblet, 10, "right", null), 10);
  assert.equal(start.feelWeight(goblet, 10, "light", null), 12.5);
  assert.equal(start.feelWeight(goblet, 20, "light", null), 25);
  assert.equal(start.feelWeight(goblet, 10, "heavy", null), 7.5);
  assert.equal(start.feelWeight(goblet, 2.5, "heavy", null), 2.5, "never under the smallest weight");
  assert.equal(start.feelWeight(byId("bench"), 22.5, "heavy", null), 20, "never under the bar");
  assert.equal(start.feelWeight(goblet, 10, "light", [8, 12, 16]), 12);
  assert.equal(start.feelWeight(goblet, 16, "heavy", [8, 12, 16]), 12);
});

test("Humbell asks how a lift's first time felt, and the answer carries to next time", () => {
  const run = (feel) => {
    let state = store.buildWorkout(store.setNextWorkout(store.resetToDefault(), "legs"));
    const at = state.active.items.findIndex((it) => it.exerciseId === "goblet_squat");
    state = store.goToCard(state, at);
    assert.equal(store.asksFeel(state), false, "not before every set is in");
    for (let i = 0; i < state.active.items[at].logged.length; i++) state = store.tapSet(state, i);
    assert.equal(store.asksFeel(state), true);
    if (feel) state = store.setFeel(state, feel);
    const fact = store.nextTime(state)?.fact;
    const weight = state.active.items[at].weight;
    const done = store.finishWorkout(state);
    return { fact, weight, next: store.nextWeight(done, "goblet_squat"), done };
  };
  const light = run("light");
  assert.match(light.fact, /^Heavier next time/);
  assert.ok(light.next > light.weight);
  const heavy = run("heavy");
  assert.match(heavy.fact, /^Lighter next time/);
  assert.ok(heavy.next < heavy.weight);
  const right = run("right");
  assert.equal(right.next, right.weight, "about right keeps the weight; the reps climb");
  // Once trained, it never asks again for that lift.
  let again = store.buildWorkout(store.setNextWorkout(right.done, "legs"));
  const at = again.active.items.findIndex((it) => it.exerciseId === "goblet_squat");
  again = store.goToCard(again, at);
  for (let i = 0; i < again.active.items[at].logged.length; i++) again = store.tapSet(again, i);
  assert.equal(store.asksFeel(again), false);
});
