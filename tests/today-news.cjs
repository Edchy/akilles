const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Exercise the real store and voice without a native runtime.
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
const voice = load("@/data/voice");

const ago = Date.now() - 3 * 864e5;
/** A lift done before at `last`, now set to `weight`. */
const done = (exerciseId, weight, last) => ({
  exerciseId, weight, rung: 0, downStreak: 0, deloads: 0, skippedLast: false,
  lastTrainedAt: ago, bestWeight: last, lastPerformed: { weight: last, reps: [8, 8, 8], target: 8 },
});
const legs = (history) => {
  const s = store.resetToDefault();
  const workout = store.workoutById(s, "legs");
  const withHistory = { ...s, history: { ...s.history, ...history } };
  return store.workoutPreview(withHistory, workout);
};
const row = (rows, id) => rows.find((r) => r.name === id);

test("a lift never done is new, and its opening guess is marked as a guess", () => {
  const squat = row(legs({}), "Goblet squat");
  assert.equal(squat.change, "new");
  assert.equal(squat.guess, true);
});

test("a weight above last time is up, below is down, the same is no news", () => {
  const rows = legs({
    "goblet_squat:6-12": done("goblet_squat", 20, 18),
    "db_rdl:6-12": done("db_rdl", 16, 18),
    "leg_press:6-12": done("leg_press", 60, 60),
  });
  const squat = row(rows, "Goblet squat");
  assert.equal(squat.change, "up");
  assert.equal(squat.guess, false);
  assert.equal(squat.weight, "20 kg");
  assert.equal(row(rows, "DB Romanian deadlift")?.change, "down");
  assert.equal(row(rows, "Leg press")?.change, undefined);
});

test("cardio and the stretch carry no news", () => {
  for (const r of legs({})) {
    if (r.family === "cardio" || r.family === "mobility") assert.equal(r.change, undefined);
  }
});

test("one kind of news is voiced; several are said plainly; none says nothing", () => {
  const empty = { up: [], fresh: [], reload: [], down: [] };
  assert.equal(voice.newsLine(empty, "x"), null);

  const up = voice.newsLine({ ...empty, up: [{ name: "Back squat", weight: "60 kg" }] }, "x");
  assert.match(up, /Back squat/);
  assert.match(up, /60 kg/);

  const many = voice.newsLine({ ...empty, fresh: [{ name: "Dips" }, { name: "Cable crossover" }] }, "x");
  assert.match(many, /^Two /);

  const mixed = voice.newsLine(
    { up: [{ name: "Back squat", weight: "60 kg" }], fresh: [{ name: "Dips" }], reload: [], down: [] },
    "x",
  );
  assert.equal(mixed, "Back squat goes up to 60 kg. First go at the dips.");
});
