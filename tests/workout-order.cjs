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
const ids = store.initialState.workouts.map((w) => w.id);
const fresh = (next = ids[0], workouts = store.initialState.workouts) => ({
  ...store.resetToDefault(), workouts, nextWorkout: next,
});
const next = (state) => store.upNext(state).id;
function finish(state) {
  const started = store.buildWorkout(state);
  const lift = started.active.items.find((item) => !store.isConditioning(item));
  lift.logged[0] = 8;
  return store.finishWorkout(started);
}
function order(state, count) {
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(next(state));
    state = finish(state);
  }
  return result;
}

test("postpone returns the workout next session, then resumes the normal cycle", () => {
  const state = fresh(ids[2]);
  const postponed = store.postponeWorkout(state);
  assert.deepEqual(order(postponed, 7), [ids[3], ids[2], ids[4], ids[0], ids[1], ids[2], ids[3]]);
  assert.equal(postponed.workouts, state.workouts);
  assert.equal(postponed.history, state.history);
  assert.equal(postponed.log, state.log);
});

test("skip this round leaves the workout until the cycle repeats", () => {
  assert.deepEqual(order(store.skipWorkout(fresh(ids[2])), 5), [ids[3], ids[4], ids[0], ids[1], ids[2]]);
});

test("postponing across the end of the cycle does not repeat or omit a workout", () => {
  assert.deepEqual(order(store.postponeWorkout(fresh(ids[4])), 6), [ids[0], ids[4], ids[1], ids[2], ids[3], ids[4]]);
});

test("a two-workout cycle returns to its normal order", () => {
  assert.deepEqual(order(store.postponeWorkout(fresh(ids[0], store.initialState.workouts.slice(0, 2))), 4), [ids[1], ids[0], ids[1], ids[0]]);
});

test("reopening the app preserves the one-time queue and next-workout preview", () => {
  const postponed = storage.fromSaved(storage.toSaved(store.postponeWorkout(fresh(ids[2]))));
  assert.equal(next(postponed), ids[3]);
  const started = store.buildWorkout(postponed);
  assert.equal(store.nextAfterSession(started).id, ids[2]);
  assert.equal(next(finish(postponed)), ids[2]);
});

test("leaving an empty session keeps the scheduled workout and queue", () => {
  const postponed = store.postponeWorkout(fresh(ids[2]));
  const empty = store.finishWorkout(store.buildWorkout(postponed));
  assert.equal(next(empty), ids[3]);
  assert.deepEqual(empty.workoutQueue, postponed.workoutQueue);
  assert.equal(empty.log.length, 0);
});

test("repeated postpones and explicit round skips consume the pending order", () => {
  const postponed = store.postponeWorkout(fresh(ids[2]));
  // Putting off the one that came up walks on; both wait, in the order they were due.
  assert.deepEqual(order(store.postponeWorkout(postponed), 5), [ids[4], ids[2], ids[3], ids[0], ids[1]]);
  // Skipping the one that came up walks on too; the one put off still waits.
  assert.deepEqual(order(store.skipWorkout(postponed), 3), [ids[4], ids[2], ids[0]]);
  assert.deepEqual(order(store.skipWorkout(finish(postponed)), 3), [ids[4], ids[0], ids[1]]);
});

test("manual Do next replaces the temporary queue; deletion removes queued workouts", () => {
  const postponed = store.postponeWorkout(fresh(ids[2]));
  const chosen = store.setNextWorkout(postponed, ids[0]);
  assert.equal(chosen.workoutQueue, undefined);
  assert.deepEqual(order(chosen, 3), [ids[0], ids[1], ids[2]]);
  assert.deepEqual(order(store.pauseWorkout(postponed, ids[2]), 4), [ids[3], ids[4], ids[0], ids[1]]);
  assert.equal(next(store.pauseWorkout(postponed, ids[3])), ids[2]);
});

test("postponing twice never swaps back to the workout just put off", () => {
  let state = fresh(ids[0]);
  state = store.postponeWorkout(state);
  assert.equal(next(state), ids[1]);
  state = store.postponeWorkout(state);
  assert.equal(next(state), ids[2]);
  assert.deepEqual([...state.postponed], [ids[0], ids[1]]);
  state = store.postponeWorkout(state);
  assert.equal(next(state), ids[3]);
  assert.deepEqual(order(state, 6), [ids[3], ids[0], ids[1], ids[2], ids[4], ids[0]]);
});

test("with everything else waiting there is nothing to put off for", () => {
  const two = store.postponeWorkout(fresh(ids[0], store.initialState.workouts.slice(0, 2)));
  assert.equal(next(two), ids[1]);
  assert.equal(store.postponeWorkout(two), two);
});

test("finishing or skipping a waiting workout takes it off the waiting line", () => {
  const twice = store.postponeWorkout(store.postponeWorkout(fresh(ids[0])));
  const done = finish(finish(twice));
  assert.equal(next(done), ids[1]);
  assert.deepEqual([...done.postponed], [ids[1]]);
  assert.equal(finish(done).postponed, undefined);
  assert.equal(store.setNextWorkout(twice, ids[4]).postponed, undefined);
});

test("skip and postpone cannot change a workout in progress or a single-workout plan", () => {
  const active = store.buildWorkout(fresh());
  assert.equal(store.postponeWorkout(active), active);
  assert.equal(store.skipWorkout(active), active);
  const single = fresh(ids[0], store.initialState.workouts.slice(0, 1));
  assert.equal(store.postponeWorkout(single), single);
});

test("Today opens both choices, cancels without changes, and Undo restores an existing queue", () => {
  let state = fresh(ids[2]);
  const hooks = [];
  let hookIndex = 0;
  const fakeReact = {
    ...require("react"),
    useEffect: () => {},
    useState: (initial) => {
      const index = hookIndex++;
      if (!(index in hooks)) hooks[index] = initial;
      return [hooks[index], (value) => { hooks[index] = typeof value === "function" ? value(hooks[index]) : value; }];
    },
  };
  const uiRequire = (name) => {
    if (name === "react") return fakeReact;
    if (name === "react-native") return { Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View" };
    if (name === "expo-router") return { router: { push: () => {} } };
    if (name === "react-native-safe-area-context") return { useSafeAreaInsets: () => ({ top: 0 }) };
    if (name === "@/store/session") return { ...store, useSession: () => ({ state, setState: (fn) => { state = fn(state); } }) };
    if (name === "@/components/bottom-bar") return { useBarSpace: () => 80 };
    if (name === "@/components/screen") return { Column: "Column", COLUMN: 460 };
    if (name === "@/components/sheet") return { Sheet: "Sheet", OpenRow: "OpenRow" };
    if (name === "@/components/icon") return { Icon: "Icon" };
    if (name === "@/components/text") return { Text: "Text" };
    if (name === "@/components/mark") return { Mark: "Mark" };
    return load(name);
  };
  const module = { exports: {} };
  const { outputText } = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, "../src/app/index.tsx"), "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  vm.runInNewContext(outputText, { module, exports: module.exports, require: uiRequire, Date });
  const render = () => { hookIndex = 0; return module.exports.default(); };
  function find(node, predicate) {
    if (!node || typeof node !== "object") return;
    if (predicate(node)) return node;
    const children = node.props?.children;
    for (const child of Array.isArray(children) ? children : [children]) {
      const found = find(child, predicate);
      if (found) return found;
    }
  }
  const row = (title) => find(render(), (node) => node.props?.title === title);
  const sheet = () => find(render(), (node) => node.type === "Sheet");
  const undo = () => find(render(), (node) => node.props?.accessibilityLabel?.startsWith("Undo skipping"));
  find(render(), (node) => node.props?.label === "Skip").props.onPress();
  assert.equal(sheet().props.visible, true);
  assert.equal(row("Do it next time").props.detail, "Push B today → Legs → Pull B");
  assert.equal(row("Skip it").props.detail, "Push B today → Pull B → Push A");
  sheet().props.onClose();
  assert.equal(next(state), ids[2]);
  row("Do it next time").props.onPress();
  assert.equal(sheet().props.visible, false);
  assert.equal(next(state), ids[3]);
  const pending = state;
  row("Skip it").props.onPress();
  // Legs was put off, so skipping Push B walks on to Pull B rather than back to Legs.
  assert.equal(next(state), ids[4]);
  undo().props.onPress();
  assert.equal(next(state), ids[3]);
  assert.deepEqual(state.workoutQueue, pending.workoutQueue);
  assert.deepEqual(state.postponed, pending.postponed);
});
