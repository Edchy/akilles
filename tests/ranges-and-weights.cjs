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
const split = load("@/data/split");

const DAY = 24 * 60 * 60 * 1000;
const lifts = (state) => state.active.items.filter((item) => !store.isConditioning(item));

test("every rep target is 6, 8, 10 or 12, and abs are two sets", () => {
  assert.deepEqual([...split.ladderFor("6-12")], [6, 8, 10, 12]);
  assert.deepEqual([...split.ladderFor("10-12")], [10, 12]);
  assert.equal(split.rangeScheme(5, 13), "6-12");
  assert.equal(split.rangeScheme(9, 11), "10-12");
  for (const workout of split.DEFAULT_WORKOUTS) {
    for (const entry of workout.exercises) {
      for (const reps of split.ladderFor(entry.scheme)) assert.ok([6, 8, 10, 12].includes(reps), `${workout.id} ${entry.slot}`);
      if (entry.pattern === "abs") assert.equal(split.setsFor(entry), 2);
    }
  }
  const state = store.addEntry(store.resetToDefault(), "legs", "abs");
  assert.equal(split.setsFor(state.workouts.find((w) => w.id === "legs").exercises.at(-1)), 2);
});

test("an old save moves to 6–12 and keeps each lift's weight", () => {
  const now = Date.now();
  const base = store.resetToDefault();
  const record = (exerciseId, weight, rung, lastTrainedAt) => ({ exerciseId, weight, rung, downStreak: 0, deloads: 0, lastTrainedAt });
  const old = {
    ...base,
    workouts: base.workouts.map((w) => ({
      ...w,
      exercises: w.exercises.map((e) => ({ ...e, scheme: e.pattern === "abs" ? "10-15" : "10-12" })),
    })),
    history: {
      // Heavy day at 8 reps, light day more recently: the heavy weight is kept.
      "db_bench:6-10": record("db_bench", 22, 1, now - 3 * DAY),
      "db_bench:10-12": record("db_bench", 18, 0, now - 1 * DAY),
      // On the old 6-9-12 ladder, rung 1 was 9 reps.
      "dips:6-12": record("dips", -10, 1, now - 2 * DAY),
      // A range left for weeks is not the weight you lift now.
      "rdl:6-10": record("rdl", 100, 0, now - 60 * DAY),
      "rdl:8-10": record("rdl", 70, 2, now - 2 * DAY),
    },
  };
  const restored = storage.fromSaved(JSON.stringify({ version: 8, state: old }));

  for (const w of restored.workouts) {
    for (const e of w.exercises) {
      assert.equal(e.scheme, "6-12");
      if (e.pattern === "abs") assert.equal(e.sets, 2);
    }
  }
  assert.deepEqual(Object.keys(restored.history).sort(), ["db_bench:6-12", "dips:6-12", "rdl:6-12"]);
  assert.equal(restored.history["db_bench:6-12"].weight, 22);
  assert.equal(restored.history["db_bench:6-12"].rung, 1);
  assert.equal(restored.history["db_bench:6-12"].lastTrainedAt, now - 1 * DAY);
  assert.equal(restored.history["dips:6-12"].rung, 1);
  assert.equal(restored.history["rdl:6-12"].weight, 70);
  assert.equal(restored.history["rdl:6-12"].rung, 2);
  // Already on the new shape: a second load changes nothing.
  const plain = (value) => JSON.parse(JSON.stringify(value));
  assert.deepEqual(plain(storage.fromSaved(storage.toSaved(restored)).history), plain(restored.history));
});

test("a starting weight set before training is what the workout opens at", () => {
  let state = store.addExercise(store.resetToDefault(), {
    id: "custom_kb_clean", name: "KB clean", patterns: ["hinge"], increment: 4, startWeight: 16,
  });
  assert.equal(store.nextWeight(state, "custom_kb_clean"), 16);

  state = store.setExerciseWeight(state, "db_bench", 14);
  const started = store.buildWorkout(state);
  assert.equal(lifts(started).find((it) => it.exerciseId === "db_bench").weight, 14);
});

test("changing a weight mid-session moves only exercises not yet started", () => {
  const started = store.buildWorkout(store.resetToDefault());
  const [first, second] = lifts(started);
  first.logged[0] = 6;
  let state = store.setExerciseWeight(started, first.exerciseId, 99);
  state = store.setExerciseWeight(state, second.exerciseId, 12);
  assert.equal(lifts(state)[0].weight, first.weight);
  assert.equal(lifts(state)[1].weight, 12);

  const trained = store.finishWorkout(state);
  const moved = store.setExerciseWeight(trained, second.exerciseId, 20);
  const records = Object.values(moved.history).filter((r) => r.exerciseId === second.exerciseId);
  assert.ok(records.length > 0 && records.every((r) => r.weight === 20));
});

test("Today continues a workout you stepped out of, and End commits it", () => {
  let state = store.buildWorkout(store.resetToDefault());
  const at = state.active.items.findIndex((item) => !store.isConditioning(item));
  state.active.cursor = at;
  state.active.items[at].logged[0] = 6;
  const workoutId = state.active.workoutId;

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
  let pushed = 0;
  const uiRequire = (name) => {
    if (name === "react") return fakeReact;
    if (name === "react-native") return { Pressable: "Pressable", ScrollView: "ScrollView", Text: "Text", View: "View" };
    if (name === "expo-router") return { router: { push: () => { pushed++; } } };
    if (name === "react-native-safe-area-context") return { useSafeAreaInsets: () => ({ top: 0 }) };
    if (name === "@/store/session") return { ...store, useSession: () => ({ state, setState: (fn) => { state = fn(state); } }) };
    if (name === "@/components/bottom-bar") return { useBarSpace: () => 80 };
    if (name === "@/components/screen") return { Column: "Column", COLUMN: 460 };
    if (name === "@/components/sheet") return { Sheet: "Sheet", OpenRow: "OpenRow" };
    if (name === "@/components/icon") return { Icon: "Icon" };
    if (name === "@/components/text") return { Text: "Text" };
    if (name === "@/components/mark") return { Mark: "Mark" };
    if (name === "@/components/place") return { PlaceLine: "PlaceLine" };
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
  const button = (label) => find(render(), (node) => node.props?.label === label);

  assert.equal(button("Start"), undefined);
  assert.equal(button("Skip"), undefined);
  button("Continue").props.onPress();
  assert.equal(pushed, 1);
  assert.equal(state.active.cursor, at);
  assert.equal(state.active.items[at].logged[0], 6);

  button("End").props.onPress();
  find(render(), (node) => node.props?.title === "End workout").props.onPress();
  assert.equal(state.active, null);
  assert.equal(state.log.length, 1);
  assert.notEqual(store.upNext(state).id, workoutId);
  assert.ok(button("Start"));
});
