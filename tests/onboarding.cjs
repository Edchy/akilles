const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// The first-launch questions make the plan: time sets its shape, home sets its exercises.
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
const templates = load("@/data/templates");
const kit = load("@/data/kit");
const store = load("@/store/session");

const fresh = () => store.resetToDefault();
const plan = (answers) => store.makePlan(fresh(), { easy: [], home: null, ...answers });
const names = (workouts) => workouts.map((w) => w.id).join();
const ids = (w) => w.exercises.map((e) => e.options[0]);

test("a fresh phone is asked first; a phone that has trained never is", () => {
  assert.equal(store.wantsOnboarding(fresh()), true);
  const done = store.applyPlan(fresh(), { home: null, time: "long", easy: [] });
  assert.equal(store.wantsOnboarding(done), false);
  assert.equal(store.wantsIntro(done), true, "the intro still follows");
});

test("time sets the shape", () => {
  assert.equal(names(plan({ time: "short" })), "full_a,full_b");
  assert.equal(names(plan({ time: "medium" })), "upper,lower");
  assert.equal(names(plan({ time: "long" })), "push,pull,legs");
  assert.equal(plan({ time: "short" })[0].exercises.length, 3);
  assert.equal(plan({ time: "medium" })[0].exercises.length, 5);
});

test("at a gym with an hour, the plan is the one Milo has always started with", () => {
  const got = plan({ time: "long" });
  const want = templates.SHAPES.ppl;
  assert.equal(got.map((w) => ids(w).join()).join("|"), want.map((w) => ids(w).join()).join("|"));
});

test("a shape of your own overrides the one your time gets", () => {
  assert.equal(names(plan({ time: "short", shape: "ppl" })), "push,pull,legs");
});

test("at home, every exercise in the plan can be done there", () => {
  const home = { gear: ["dumbbells", "bench"] };
  for (const time of ["short", "medium", "long"]) {
    for (const w of plan({ time, home })) {
      for (const id of ids(w)) assert.ok(kit.fits({ id }, home), `${time} ${w.id} ${id}`);
    }
  }
  assert.equal(ids(plan({ time: "short", home })[0])[1], "db_bench");
});

test("going easy on the shoulders leaves out pressing overhead", () => {
  const got = plan({ time: "short", easy: ["shoulders"] });
  const b = got.find((w) => w.id === "full_b");
  assert.ok(!b.exercises.some((e) => e.pattern === "vertical_push"));
  for (const w of got) for (const id of ids(w)) assert.ok(!templates.EASY_ON.shoulders.includes(id), id);
});

test("applying a plan makes it yours: next up, in the catalogue, the home kit saved", () => {
  const home = { gear: ["kettlebell"], weights: { kettlebell: [16] } };
  const state = store.applyPlan(fresh(), { home, time: "medium", easy: ["back"] });
  assert.equal(state.nextWorkout, "upper");
  for (const w of state.workouts) for (const id of ids(w)) assert.ok(!state.hidden.includes(id), id);
  assert.equal(store.kitAt(state).weights.kettlebell[0], 16);
  assert.ok(state.avoid.includes("db_rdl"));
  // Plan and Today agree on what each slot holds.
  for (const w of state.workouts) {
    const today = store.liftsToRun(state, w).map((l) => l.exerciseId).join();
    assert.equal(today, w.exercises.map((e) => store.chosen(state, w.id, e)).join(), w.id);
  }
});

test("each slot holds the exercise its template names, even one not yet in the catalogue", () => {
  const lower = plan({ time: "medium" }).find((w) => w.id === "lower");
  assert.equal(ids(lower).join(), "goblet_squat,db_rdl,split_squat,leg_curl,plank");
});
