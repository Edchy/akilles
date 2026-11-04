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

test("a note is there until you change it, and clearing it removes it", () => {
  let state = store.resetToDefault();
  assert.equal(store.noteFor(state, "treadmill", "cardio"), "");

  state = store.setNote(state, "treadmill", "Speed 10.5, incline 1 ", "cardio");
  assert.equal(store.noteFor(state, "treadmill", "cardio"), "Speed 10.5, incline 1");

  state = store.setNote(state, "treadmill", "Speed 11", "cardio");
  assert.equal(store.noteFor(state, "treadmill", "cardio"), "Speed 11");

  state = store.setNote(state, "treadmill", "   ", "cardio");
  assert.equal(store.noteFor(state, "treadmill", "cardio"), "");
  assert.deepEqual(Object.keys(state.notes), []);
});

test("a lift and a machine with the same id keep notes of their own", () => {
  let state = store.resetToDefault();
  state = store.setNote(state, "custom_sled", "Two plates");
  state = store.setNote(state, "custom_sled", "Push to the cones", "cardio");
  assert.equal(store.noteFor(state, "custom_sled"), "Two plates");
  assert.equal(store.noteFor(state, "custom_sled", "cardio"), "Push to the cones");
});

test("a note stays a line or two", () => {
  const state = store.setNote(store.resetToDefault(), "db_bench", "x".repeat(500));
  assert.equal(store.noteFor(state, "db_bench").length, store.NOTE_MAX);
});

test("notes are saved, and a save from before notes loads with none", () => {
  const state = store.setNote(store.resetToDefault(), "leg_press", "Seat on 4");
  const back = storage.fromSaved(storage.toSaved(state));
  assert.equal(store.noteFor(back, "leg_press"), "Seat on 4");

  const { notes: _none, ...old } = store.resetToDefault();
  const restored = storage.fromSaved(JSON.stringify({ version: 12, state: old }));
  assert.deepEqual({ ...restored.notes }, {});
});

test("a note survives the workout it was written in", () => {
  let state = store.buildWorkout(store.resetToDefault());
  state = store.setNote(state, "db_bench", "Bench on the third notch");
  state = store.finishWorkout(state);
  assert.equal(store.noteFor(state, "db_bench"), "Bench on the third notch");
});
