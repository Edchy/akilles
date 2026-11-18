const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
let state, slots = [], at = 0;
const react = { ...require("react"), useEffect() {}, useLayoutEffect() {}, useState(initial) { const i = at++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], (v) => { slots[i] = typeof v === "function" ? v(slots[i]) : v; }]; }, useRef(initial) { const i = at++; return slots[i] ??= { current: initial }; } };
const cache = new Map();
let store;
function load(name) {
  if (name === "react") return react;
  if (name === "react-native") return { View: "View", Pressable: "Pressable", ScrollView: "ScrollView", Animated: {}, StyleSheet: { create: (v) => v } };
  if (name === "react-native-reanimated") return {
    __esModule: true, default: { View: "AnimatedView", ScrollView: "ScrollView" }, useAnimatedStyle: (fn) => fn(),
    useSharedValue: (value) => ({ value }),
    // Animations land at once: a card thrown is gone.
    withTiming: (to, _config, done) => { done?.(true); return to; },
    withSpring: (to) => to,
  };
  if (name === "react-native-worklets") return { scheduleOnRN: (fn, ...args) => fn(...args) };
  if (name === "react-native-gesture-handler") {
    const chain = new Proxy({}, { get: () => () => chain });
    return { Gesture: { Pan: () => chain }, GestureDetector: "GestureDetector" };
  }
  if (name === "expo-haptics") return { impactAsync() {}, ImpactFeedbackStyle: {}, notificationAsync() {}, NotificationFeedbackType: {} };
  if (name === "@react-native-async-storage/async-storage") return {};
  if (name.startsWith("expo-") || name.startsWith("react-native-")) return {};
  if (name === "@/store/session" && store) return { ...store, useSession: () => ({ state }) };
  if (name === "@/components/field") return { useColors: () => load("@/constants/theme").colors };
  if (name === "@/components/card-context") return { useCardActive: () => true };
  if (name.startsWith("@/components/")) return new Proxy({}, { get: (_, key) => String(key) });
  if (name === "@/lib/chime") return { chime() {}, cue() {} };
  if (!name.startsWith("@/")) return require(name);
  const base = path.resolve(__dirname, "../src", name.slice(2));
  const file = fs.existsSync(base + ".ts") ? base + ".ts" : base + ".tsx";
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  let source = fs.readFileSync(file, "utf8");
  if (name === "@/app/workout") source += "\nexport { MobilityDeck, WorkoutCard, DeckTrack };";
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { module, exports: module.exports, require: load, console, process, Date, setTimeout: () => 0, clearTimeout() {} });
  return module.exports;
}
store = load("@/store/session");
const { MobilityDeck, WorkoutCard, DeckTrack } = load("@/app/workout");
function render(Component, props = {}) { at = 0; return Component(props); }
function findAll(node, predicate) {
  if (Array.isArray(node)) return node.flatMap((n) => findAll(n, predicate));
  if (!node || typeof node !== "object") return [];
  return [...(predicate(node) ? [node] : []), ...findAll(node.props?.children, predicate)];
}
const label = (tree, text) => findAll(tree, (n) => n.props?.label === text)[0];

test("the stretch card: one card a move, thrown away to move on, and a tap sets it running", () => {
  slots = [];
  state = store.buildWorkout(store.setNextWorkout(store.resetToDefault(), "legs"));
  state = store.goToCard(state, state.active.items.findIndex((it) => it.slot === "Warm-up"));
  const routine = store.currentRoutine(state);
  const moves = routine.moves;
  const item = () => state.active.items[state.active.cursor];
  let finished = false;
  const draw = () => render(MobilityDeck, { routine, barSpace: 0, completed: item().moves, steps: item().routineSteps, onStep: (i, status) => { state = store.resolveRoutineStep(state, i, status); }, onFinish() { finished = true; } });
  const card = (tree) => findAll(tree, (n) => n.type === "Pressable" && n.props?.accessibilityActions)[0];
  const throwAway = (tree) => card(tree).props.onAccessibilityAction({ nativeEvent: { actionName: "next" } });

  let tree = draw();
  // One card a move — a move with two sides is one card, on one clock.
  assert.ok(findAll(tree, (n) => n.props?.accessibilityLabel === `Move 1 of ${moves.length}`).length, "counted by moves, not sides");
  assert.ok(card(tree).props.accessibilityLabel.startsWith(moves[0].name));
  // Thrown away before it was held: nothing is recorded for it, and the next is on top.
  throwAway(tree);
  tree = draw();
  assert.equal(item().routineSteps?.[0] ?? null, null);
  assert.ok(card(tree).props.accessibilityLabel.startsWith(moves[1].name), "on to the second");

  // A tap starts it, and from then on it runs itself.
  card(tree).props.onPress();
  tree = draw();
  assert.ok(card(tree).props.accessibilityHint.startsWith("Tap to pause"), "running");
  // The last one thrown away finishes the routine.
  for (let i = 0; i < moves.length && !finished; i++) throwAway(draw());
  assert.ok(finished);
});

test("twenty-card overview keeps every row scrollable and its current progress mark visible", () => {
  slots = [];
  state = store.addWorkout(store.resetToDefault(), "long", "Long");
  for (const ex of store.everyExercise(state).filter((e) => !e.restricted).slice(0, 20)) state = store.addExerciseToWorkout(state, "long", ex.id);
  state = store.buildWorkout(store.setNextWorkout(state, "long"));
  for (const cursor of [0, 9, 19]) {
    state = store.goToCard(state, cursor);
    const track = render(DeckTrack);
    const circles = findAll(track, (n) => n.props?.style?.borderWidth === 2.5);
    assert.equal(circles.length, 10);
    assert.equal(circles.filter((n) => n.props.style.width === 24).length, 1, "the current circle remains in the visible window");
    assert.equal(findAll(track, (n) => n.props?.style?.borderWidth === 3).length, 1, "the current circle sits inside one navy ring");
  }
  let picked;
  const list = { ref: {}, y: { value: 0 }, max: { value: 0 }, top: { value: 0 } };
  const tree = render(WorkoutCard, { opened: { value: 1 }, open: true, shut: 100, room: 500, list, onShut() {}, onToggle() {}, onPick: (i) => { picked = i; }, onLeave() {} });
  const scroll = findAll(tree, (n) => n.type === "ScrollView")[0];
  assert.ok(scroll);
  const rows = findAll(scroll, (n) => n.type === "Pressable");
  // Twenty cards, and Finish last.
  assert.equal(rows.length, 21);
  // Twenty don't fit: every row at its tightest, still a full thumb high, and the list scrolls.
  assert.ok(rows.every((n) => n.props.style({ pressed: false }).height === 48));
  assert.equal(findAll(scroll, (n) => n.props?.children === "Now").length, 1, "only the current row says Now");
  rows[19].props.onPress();
  assert.equal(picked, 19);
  rows[20].props.onPress();
  assert.equal(picked, 20, "Finish goes to the end card");
});

 test("an empty workout has no invalid progress track", () => {
  state = store.addWorkout(store.resetToDefault(), "empty", "Empty");
  state = store.buildWorkout(store.setNextWorkout(state, "empty"));
  assert.equal(render(DeckTrack), null);
});
