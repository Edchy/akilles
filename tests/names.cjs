const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Names use the gym's shorthand — DB, BB, KB — and the full words still find them.
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
const { searchExercises, hasName } = load("@/lib/find-exercise");

test("no catalogue name spells out the gear", () => {
  const long = EXERCISES.filter((e) => /dumbbell|barbell|kettlebell/i.test(e.name)).map((e) => e.name);
  assert.equal(long.join(", "), "");
  assert.equal(byId("db_bench").name, "DB bench press");
  assert.equal(byId("bb_row").name, "BB row");
  assert.equal(byId("kb_swing").name, "KB swing");
  assert.equal(byId("incline_db_press").name, "Incline DB press");
});

test("the full words still find them", () => {
  assert.equal(searchExercises(EXERCISES, "dumbbell bench press")[0].id, "db_bench");
  assert.equal(searchExercises(EXERCISES, "barbell row")[0].id, "bb_row");
  assert.equal(searchExercises(EXERCISES, "kettlebell swing")[0].id, "kb_swing");
  assert.equal(searchExercises(EXERCISES, "db shoulder")[0].id, "db_shoulder");
  // Adding your own "Dumbbell row" is the one already there.
  assert.ok(hasName(EXERCISES, "Dumbbell row"));
  assert.ok(hasName(EXERCISES, "incline dumbbell curl"));
});

