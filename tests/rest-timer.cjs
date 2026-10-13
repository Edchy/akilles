const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Exercise the real store, progression engine and save format without a native runtime.
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

function lifting() {
  const state = store.buildWorkout(store.resetToDefault());
  state.active.cursor = state.active.items.findIndex((item) => !store.isConditioning(item));
  return state;
}

function withClock(run) {
  const original = Date.now;
  let now = original();
  Date.now = () => now;
  try { run(() => { now += 15_000; return now; }); }
  finally { Date.now = original; }
}

test("new sets restart rest; corrections, resets of logged sets and clearing do not", () => {
  withClock((advance) => {
    let state = lifting();
    assert.equal(state.active.lastSetAt, undefined);
    const first = advance();
    state = store.tapSet(state, 0);
    assert.equal(state.active.lastSetAt, first);
    advance();
    state = store.tapSet(state, 0);
    assert.equal(state.active.lastSetAt, first);
    state = store.resetSet(state, 0);
    assert.equal(state.active.lastSetAt, first);
    while (state.active.items[state.active.cursor].logged[0] !== null) {
      state = store.tapSet(state, 0);
    }
    assert.equal(state.active.lastSetAt, first);
    const second = advance();
    state = store.tapSet(state, 0);
    assert.equal(state.active.lastSetAt, second);
    const third = advance();
    state = store.tapSet(state, 1);
    assert.equal(state.active.lastSetAt, third);
  });
});

test("logging an empty circle with a long press also starts rest", () => {
  withClock((advance) => {
    const now = advance();
    const state = store.resetSet(lifting(), 0);
    assert.equal(state.active.lastSetAt, now);
  });
});

test("superset partners share the timer without restarting it on corrections", () => {
  withClock((advance) => {
    let state = lifting();
    const partner = store.supersetOptions(state)[0];
    assert.ok(partner);
    state = store.addSuperset(state, partner.id);
    const first = advance();
    state = store.tapSet(state, 0);
    assert.equal(state.active.lastSetAt, first);
    const second = advance();
    state = store.tapSet(state, 0, "partner");
    assert.equal(state.active.lastSetAt, second);
    advance();
    state = store.tapSet(state, 0, "partner");
    assert.equal(state.active.lastSetAt, second);
  });
});

test("rest timestamp survives saving, reopening, and exercise navigation; a new workout starts fresh", () => {
  let state = store.tapSet(lifting(), 0);
  const timestamp = state.active.lastSetAt;
  const restored = storage.fromSaved(storage.toSaved(state));
  assert.equal(restored.active.lastSetAt, timestamp);
  state = store.skipExercise(restored);
  assert.equal(state.active.lastSetAt, timestamp);
  state = store.previousExercise(state);
  assert.equal(state.active.lastSetAt, timestamp);
  const nextWorkout = store.buildWorkout(store.finishWorkout(state));
  assert.equal(nextWorkout.active.lastSetAt, undefined);
});
