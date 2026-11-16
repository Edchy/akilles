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

test("everyone starts on Push, Pull, Legs, whatever else is said", () => {
  for (const time of ["short", "medium", "long"]) assert.equal(names(plan({ time })), "push,pull,legs");
  for (const experience of ["new", "some", "lots"]) assert.equal(names(plan({ time: "long", lifter: { experience } })), "push,pull,legs");
  // The other shapes still build when asked for by name.
  assert.equal(names(plan({ time: "long", shape: "full" })), "full_a,full_b");
  assert.equal(names(plan({ time: "long", shape: "upper_lower" })), "upper,lower");
  assert.equal(plan({ time: "long", shape: "full" })[0].exercises.length, 3);
  assert.equal(plan({ time: "long", shape: "upper_lower" })[0].exercises.length, 5);
});

test("at a gym with an hour, the plan is the one Humbell has always started with", () => {
  const got = plan({ time: "long" });
  const want = templates.SHAPES.ppl;
  assert.equal(got.map((w) => ids(w).join()).join("|"), want.map((w) => ids(w).join()).join("|"));
});

test("a shape asked for overrides Push, Pull, Legs", () => {
  assert.equal(names(plan({ time: "short", shape: "full" })), "full_a,full_b");
});

test("at home, every exercise in the plan can be done there", () => {
  const home = { gear: ["dumbbells", "bench"] };
  for (const shape of ["full", "upper_lower", "ppl"]) {
    for (const w of plan({ time: "long", shape, home })) {
      for (const id of ids(w)) assert.ok(kit.fits({ id }, home), `${shape} ${w.id} ${id}`);
    }
  }
  assert.equal(ids(plan({ time: "long", shape: "full", home })[0])[1], "db_bench");
});

test("going easy on the shoulders leaves out pressing overhead", () => {
  const got = plan({ time: "long", shape: "full", easy: ["shoulders"] });
  const b = got.find((w) => w.id === "full_b");
  assert.ok(!b.exercises.some((e) => e.pattern === "vertical_push"));
  for (const w of got) for (const id of ids(w)) assert.ok(!templates.EASY_ON.shoulders.includes(id), id);
});

test("applying a plan makes it yours: next up, in the catalogue, the home kit saved", () => {
  const home = { gear: ["kettlebell"], weights: { kettlebell: [16] } };
  const state = store.applyPlan(fresh(), { home, time: "long", shape: "upper_lower", easy: ["back"] });
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
  const lower = plan({ time: "long", shape: "upper_lower" }).find((w) => w.id === "lower");
  assert.equal(ids(lower).join(), "goblet_squat,db_rdl,split_squat,leg_curl,plank");
});

test("bodyweight only, every workout still has a full set of lifts", () => {
  for (const shape of ["full", "upper_lower"]) {
    for (const w of plan({ time: "long", shape, home: kit.BODYWEIGHT })) {
      const want = templates.SHAPES[shape].find((t) => t.id === w.id);
      assert.equal(w.exercises.length, want.exercises.length, `${shape} ${w.id}: ${ids(w).join()}`);
    }
  }
});
