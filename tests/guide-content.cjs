const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
const modules = new Map();
function load(name) {
  if (name === "@react-native-async-storage/async-storage") return {};
  if (!name.startsWith("@/")) return require(name);
  const file = path.resolve(__dirname, "../src", name.slice(2)) + ".ts";
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} }; modules.set(file, module);
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020,
  } }).outputText, { module, exports: module.exports, require: load, process, console, Date }, { filename: file });
  return module.exports;
}
const { guideFor, ownCue } = load("@/data/guides");
const { REVIEWED_GUIDES } = load("@/data/reviewed-guides");
const { byId, MOVEMENT_EXPANSION_IDS } = load("@/data/exercises");
const { SHAPES } = load("@/data/templates");
const { CARDIO } = load("@/data/conditioning");
const store = load("@/store/session");
const storage = load("@/store/storage");
const prog = load("@/lib/progression");
const { weightLabel, warmupFor } = load("@/lib/warmup");
const { totalLifted } = load("@/lib/insights");

test("every default-plan option has dated technique and mistake references", () => {
  for (const workouts of Object.values(SHAPES)) for (const w of workouts) for (const slot of w.exercises) for (const id of slot.options) {
    const guide = guideFor(id);
    assert.ok(guide?.reviewedOn && guide.sources?.length, `${w.name}/${id} needs source review`);
    assert.ok(guide.avoid && guide.own, id);
  }
});

test("machine cardio guides teach technique without prescribing the session finish", () => {
  for (const exercise of CARDIO) {
    const guide = guideFor(exercise.id);
    assert.ok(guide?.sources?.length && guide.reviewedOn, exercise.id);
    assert.doesNotMatch(guide.steps.join(" "), /empty the tank|last stretch|lifts come next|this is a warm-up/i);
    assert.equal(guide.own, undefined, "cardio must not inherit a static strength hold");
  }
  const treadmill = guideFor("treadmill");
  assert.match(treadmill.steps.join(" "), /arms swing naturally/);
  assert.match(treadmill.steps.join(" "), /safety tether/);
  assert.match(treadmill.avoid, /rails.*support/);
});

test("a kettlebell swing cannot inherit the slow paused-lift instruction", () => {
  assert.match(ownCue("kb_swing"), /Do not hold it at the top/);
  assert.match(guideFor("kb_swing").steps.join(" "), /hips|hip/);
  assert.ok(guideFor("kb_swing").sources.some((s) => s.url.includes("two-handed-kettlebell-swing")));
});

test("new library exercises have traceable demonstrations and exercise-specific holds", () => {
  for (const id of MOVEMENT_EXPANSION_IDS) {
    const guide = guideFor(id);
    assert.ok(guide.reviewedOn && guide.sources.length, id);
    assert.equal(guide.steps.length, 3, id);
    assert.ok(guide.sources.some((s) => s.url === guide.demonstration?.url), id);
    if (byId(id).holds) {
      assert.ok(guide.hold?.includes("{s}"), id);
      assert.match(ownCue(id, 2), /2 seconds/, id);
    }
    assert.equal(byId(id).autoSelect, false, `${id} must be chosen before entering automatic substitutions`);
  }
  for (const [id, guide] of Object.entries(REVIEWED_GUIDES)) {
    assert.ok(!guide.stepTitles || guide.stepTitles.length === guide.steps.length, id);
    for (const s of guide.sources) assert.match(s.url, /^https:\/\//, id);
  }
});

test("loaded carries track seconds and kilograms independently, never kg multiplied by seconds", () => {
  const carry = byId("farmer_carry");
  const fresh = prog.freshState(carry);
  assert.equal(weightLabel(carry, fresh.weight), "7.5 kg ×2");
  assert.equal(prog.ladderOf(carry, "6-12").join(), "30,40,50,60");
  assert.equal(warmupFor(carry, 20).length, 0);
  const next = prog.applyResult({ ...fresh, rung: 3 }, "6-12", [60, 60, 60], Date.now());
  assert.equal(next.weight, 10);
  assert.equal(next.rung, 0);
  const volume = totalLifted([{ entries: [{ kind: "lift", exerciseId: carry.id, weight: 7.5, reps: [60, 60], outcome: "hit" }] }]);
  assert.equal(volume, 0);
});

test("version 19 saves keep their actual workouts, choices and history when the library expands", () => {
  const saved = store.resetToDefault();
  saved.workouts = [{ ...saved.workouts[0], exercises: [{ id: "Old fly", slot: "Old fly", pattern: "chest_iso", options: ["cable_crossover"], scheme: "6-12" }] }];
  saved.nextWorkout = saved.workouts[0].id;
  saved.choices = { "push/Old fly": "pec_deck" };
  saved.history = { "bench/6-12": { exerciseId: "bench", weight: 40, rung: 1, downStreak: 0, deloads: 0 } };
  saved.hidden = saved.hidden.filter((id) => !MOVEMENT_EXPANSION_IDS.includes(id));
  const restored = storage.fromSaved(JSON.stringify({ version: 19, state: saved }));
  assert.equal(restored.workouts[0].exercises[0].id, "Old fly");
  assert.equal(restored.choices["push/Old fly"], "pec_deck");
  assert.equal(restored.history["bench/6-12"].weight, 40);
  assert.ok(restored.hidden.includes("suitcase_carry"));
  const chosen = store.restoreExercise(restored, "suitcase_carry");
  assert.ok(!storage.fromSaved(storage.toSaved(chosen)).hidden.includes("suitcase_carry"));
});
