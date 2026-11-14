const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// A note per exercise or machine, kept until you change it.
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

const core = load("@/store/core");
const plain = (v) => JSON.parse(JSON.stringify(v));

test("the core session contains the next workout's lifts and leaves the saved plan untouched", () => {
  const original = store.resetToDefault();
  const plan = JSON.stringify(original.workouts);
  const s = core.startCoreWorkout(original);
  assert.ok(s.active.items.length > 0);
  assert.ok(s.active.items.every(store.isLift));
  assert.ok(s.active.items.every((item) => item.warmup === false));
  assert.equal(JSON.stringify(s.workouts), plan);
  assert.equal(s.nextWorkout, original.nextWorkout);
  assert.deepEqual(plain(s.history), plain(original.history));
});

test("continuing an existing session leaves all its work and activities intact", () => {
  const s = store.buildWorkout(store.resetToDefault());
  assert.equal(core.startCoreWorkout(s), s);
});

test("an explicit set count survives navigation and reload, then saves once on finishing", () => {
  let s = core.startCoreWorkout(store.resetToDefault());
  const item = s.active.items[0];
  s = core.logCoreSet(s, 0, 7);
  assert.equal(s.log.length, 0);
  assert.ok(s.active.lastSetAt);
  s = store.goToCard(s, 1);
  s = storage.fromSaved(storage.toSaved(s));
  s = store.goToCard(s, 0);
  assert.equal(s.active.items[0].logged[0], 7);
  s = store.finishWorkout(s);
  assert.equal(s.active, null);
  assert.equal(s.log.length, 1);
  const result = s.log[0].entries.find((entry) => entry.exerciseId === item.exerciseId);
  assert.equal(result.reps[0], 7);
  assert.equal(store.finishWorkout(s).log.length, 1);
});

test("editing a set revives a previously skipped exercise and validates counts", () => {
  let s = core.startCoreWorkout(store.resetToDefault());
  s.active.items[0].skipped = true;
  const skipped = s;
  for (const count of [-1, 1.5, NaN, Infinity, 1000]) assert.equal(core.logCoreSet(s, 0, count), s);
  assert.equal(core.logCoreSet(s, 99, 8), s);
  s = core.logCoreSet(s, 0, 0);
  assert.equal(s.active.items[0].skipped, false);
  assert.equal(s.active.items[0].logged[0], 0);
  assert.equal(skipped.active.items[0].logged[0], null);
});

test("leaving an untouched core session keeps the same workout next and adds no history", () => {
  const initial = store.resetToDefault();
  const s = store.finishWorkout(core.startCoreWorkout(initial));
  assert.equal(s.active, null);
  assert.equal(s.nextWorkout, initial.nextWorkout);
  assert.equal(s.log.length, 0);
  assert.deepEqual(plain(s.history), plain(initial.history));
});


test("a paired lift from an older session can still be logged independently", () => {
  let s = core.startCoreWorkout(store.resetToDefault());
  const candidate = store.supersetOptions(s)[0];
  assert.ok(candidate);
  s = store.addSuperset(s, candidate.id);
  assert.equal(core.startCoreWorkout(s), s);
  s = core.logCoreSet(s, 0, 6, "partner");
  assert.equal(s.active.items[0].supersetLogged[0], 6);
  assert.equal(s.active.items[0].logged[0], null);
  s = core.logCoreSet(s, 0, 8);
  assert.equal(s.active.items[0].logged[0], 8);
  assert.equal(s.active.items[0].supersetLogged[0], 6);
});
