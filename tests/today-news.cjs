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
    "goblet_squat:6-10": done("goblet_squat", 20, 18),
    "db_rdl:6-10": done("db_rdl", 16, 18),
    "leg_press:6-10": done("leg_press", 60, 60),
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

test("Today explains actual heavier and lighter weights beside their exercises", () => {
  const rows = legs({
    "goblet_squat:6-10": done("goblet_squat", 20, 18),
    "db_rdl:6-10": done("db_rdl", 16, 18),
  });
  assert.equal(row(rows, "Goblet squat").adjustment, "Heavier this time — up from 18 kg.");
  assert.equal(row(rows, "DB Romanian deadlift").adjustment, "Lighter this time — down from 18 kg per hand.");
});

test("Today distinguishes fewer reps, more reps and consolidating the same weight", () => {
  const preview = (extra) => row(legs({ "goblet_squat:6-10": { ...done("goblet_squat", 20, 20), ...extra } }), "Goblet squat");
  assert.equal(preview({ rung: 0, deloads: 1 }).adjustment, "Same weight, fewer reps this time: 6. Build back up.");
  assert.equal(preview({ rung: 2 }).adjustment, "Same weight, up to 10 reps this time.");
  assert.match(preview({ rung: 1, reloading: true, lastPerformed: { weight: 20, target: 10, reps: [10, 10, 10] } }).adjustment, /back to 8 reps to practise control/);
  assert.equal(preview({ rung: 1 }).adjustment, undefined);
});

test("an older accepted adjustment is explained as today's number, without claiming time away", () => {
  const r = row(legs({ "goblet_squat:6-10": {
    ...done("goblet_squat", 18, 20), pendingDecay: { kind: "layoff", fraction: 0.05, days: 21 },
  } }), "Goblet squat");
  assert.equal(r.change, "down");
  assert.equal(r.adjustment, "Lighter this time — down from 20 kg.");
});

test("Today renders per-exercise changes, includes them in accessibility labels, and never applies calendar cuts", () => {
  let state = { ...store.resetToDefault(), nextWorkout: "legs", history: {
    "goblet_squat:6-10": { ...done("goblet_squat", 20, 18), lastTrainedAt: Date.now() - 30 * 864e5 },
    "db_rdl:6-10": { ...done("db_rdl", 16, 18), pendingDecay: { kind: "layoff", fraction: 0.05, days: 21 } },
  } };
  const fakeReact = { ...require("react"), useState: (initial) => [initial, () => {}], useLayoutEffect: () => {} };
  const uiRequire = (name) => {
    if (name === "react") return fakeReact;
    if (name === "react-native") return { Pressable: "Pressable", ScrollView: "ScrollView", View: "View", useWindowDimensions: () => ({ width: 390, height: 844 }) };
    if (name === "react-native-gesture-handler") {
      const chain = new Proxy({}, { get: () => () => chain });
      return { Gesture: { Pan: () => chain }, GestureDetector: "GestureDetector" };
    }
    if (name === "react-native-worklets") return { scheduleOnRN: () => {} };
    if (name === "expo-router") return { router: { push: () => {} } };
    if (name === "react-native-safe-area-context") return { useSafeAreaInsets: () => ({ top: 0 }) };
    if (name === "react-native-svg") return { __esModule: true, default: "Svg", Defs: "Defs", LinearGradient: "LinearGradient", Rect: "Rect", Stop: "Stop" };
    if (name === "@/store/session") return { ...store, useSession: () => ({ state, setState: (fn) => { state = fn(state); } }) };
    if (name === "@/components/bottom-bar") return { useBarSpace: () => 80 };
    if (name === "@/components/screen") return { Column: "Column", COLUMN: 460 };
    if (name === "@/components/sheet") return { Sheet: "Sheet", OpenRow: "OpenRow" };
    if (name === "@/components/text") return { Text: "Text" };
    if (name === "@/components/buttons") return { Button: "Button", LinkButton: "LinkButton", Chip: "Chip" };
    if (name === "@/components/mark") return { Mark: "Mark" };
    if (name === "@/components/icon") return { Icon: "Icon" };
    if (name === "@/components/card-clay") return { ClaySheen: "ClaySheen" };
    if (name === "@/components/easy-week") return { EasyWeek: "EasyWeek", easyWeekShowing: () => false };
    if (name === "@/components/growth-offer") return { GrowthOffer: "GrowthOffer" };
    if (name === "@/lib/use-reduce-motion") return { useReduceMotion: () => true };
    if (name === "react-native-reanimated") return { __esModule: true, default: { View: "AnimatedView" }, useSharedValue: (v) => ({ value: v }), useAnimatedStyle: () => ({}), withSpring: (v) => v, withTiming: (v) => v };
    return load(name);
  };
  const module = { exports: {} };
  const source = fs.readFileSync(path.resolve(__dirname, "../src/app/index.tsx"), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  vm.runInNewContext(outputText, { module, exports: module.exports, require: uiRequire, Date });
  const nodes = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    if (typeof node.type === "function") return walk(node.type(node.props));
    // A memo'd component: the function is inside.
    if (typeof node.type?.type === "function") return walk(node.type.type(node.props));
    nodes.push(node);
    walk(node.props?.children);
  };
  walk(module.exports.default());
  const text = nodes.filter((n) => n.type === "Text").map((n) => n.props.children).join(" ");
  assert.match(text, /Heavier/);
  assert.doesNotMatch(text, /Heavier this time|Build back up|previously/);
  assert.match(text, /Lighter/);
  assert.doesNotMatch(text, /Weights adjusted|weeks away|since your last workout/);
  assert.ok(nodes.some((n) => n.props?.accessibilityLabel?.includes("Goblet squat. 20 kg. Heavier this time")));
  const before = JSON.stringify(state.history);
  const start = nodes.find((n) => n.type === "Button" && n.props.label === "Start");
  assert.ok(start);
  start.props.onPress();
  assert.equal(JSON.stringify(state.history), before);
  assert.equal(state.active.items.find((i) => i.exerciseId === "goblet_squat").weight, 20);

  // Completing a workout changes the next card, never closes Today for the day.
  state = { ...state, active: { ...state.active, items: state.active.items.map((it) =>
    it.exerciseId === "goblet_squat" ? { ...it, logged: it.logged.map(() => 6) } : it,
  ) } };
  state = store.finishWorkout(state);
  assert.equal(store.trainedToday(state), true);
  assert.equal(store.upNext(state).id, "push");
  nodes.length = 0;
  walk(module.exports.default());
  const afterText = nodes.filter((n) => n.type === "Text").map((n) => n.props.children).join(" ");
  assert.match(afterText, /Push/);
  assert.doesNotMatch(afterText, /Done for today|Go home|Trained already|Recovery is where/);
  const button = (label) => nodes.find((n) => n.type === "Button" && n.props.label === label);
  assert.ok(button("Start"));
  // No Skip: swiping the deck to another workout is the way to do something else.
  assert.ok(!button("Skip"));
  button("Start").props.onPress();
  assert.equal(state.active.workoutId, "push");
  nodes.length = 0;
  walk(module.exports.default());
  assert.ok(button("Continue"));
  assert.ok(!button("Skip"));
});

test("assisted lifts and timed holds explain the actual kind of change", () => {
  const base = store.resetToDefault();
  const pull = store.workoutById(base, "pull");
  const choices = { ...base.choices, "pull/Vertical pull": "pullup" };
  const state = { ...base, choices, history: {
    "pullup:6-10": done("pullup", -25, -20),
    "plank:6-10": { ...done("plank", 0, 0), rung: 1, lastPerformed: { weight: 0, target: 50, reps: [50, 50] } },
  } };
  const rows = store.workoutPreview(state, pull);
  assert.match(rows.find((r) => r.name === "Pull-up").adjustment, /^More assistance this time/);
  assert.equal(rows.find((r) => r.name === "Plank").adjustment, "Shorter hold this time: 40 seconds. Build back up.");
});
