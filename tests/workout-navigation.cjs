const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
let state, slots = [], at = 0;
const react = { ...require("react"), useEffect() {}, useState(initial) { const i = at++; if (!(i in slots)) slots[i] = typeof initial === "function" ? initial() : initial; return [slots[i], (v) => { slots[i] = typeof v === "function" ? v(slots[i]) : v; }]; }, useRef(initial) { const i = at++; return slots[i] ??= { current: initial }; } };
const cache = new Map();
let store;
function load(name) {
  if (name === "react") return react;
  if (name === "react-native") return { View: "View", Pressable: "Pressable", ScrollView: "ScrollView", Animated: {}, StyleSheet: { create: (v) => v } };
  if (name === "react-native-reanimated") return { __esModule: true, default: { View: "AnimatedView", ScrollView: "ScrollView" }, useAnimatedStyle: (fn) => fn() };
  if (name === "expo-haptics") return { impactAsync() {}, ImpactFeedbackStyle: {}, notificationAsync() {}, NotificationFeedbackType: {} };
  if (name === "@react-native-async-storage/async-storage") return {};
  if (name.startsWith("expo-") || name.startsWith("react-native-")) return {};
  if (name === "@/store/session" && store) return { ...store, useSession: () => ({ state }) };
  if (name === "@/components/field") return { useColors: () => load("@/constants/theme").colors };
  if (name === "@/components/card-context") return { useCardActive: () => true };
  if (name.startsWith("@/components/")) return new Proxy({}, { get: (_, key) => String(key) });
  if (name === "@/data/photos") return { PHOTOS: {} };
  if (!name.startsWith("@/")) return require(name);
  const base = path.resolve(__dirname, "../src", name.slice(2));
  const file = fs.existsSync(base + ".ts") ? base + ".ts" : base + ".tsx";
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  let source = fs.readFileSync(file, "utf8");
  if (name === "@/app/workout") source += "\nexport { MobilityDeck, WorkoutCard, DeckTrack };";
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText, { module, exports: module.exports, require: load, console, process, Date });
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

test("the stretch card: Up next skips one, and the skipped one comes back round at the end", () => {
  slots = [];
  state = store.buildWorkout(store.setNextWorkout(store.resetToDefault(), "legs"));
  state = store.goToCard(state, state.active.items.findIndex((it) => it.slot === "Warm-up"));
  const routine = store.currentRoutine(state);
  const cards = routine.moves.flatMap((m) => m.perSide ? [m, m] : [m]);
  const count = cards.length;
  const draw = () => render(MobilityDeck, { routine, barSpace: 0, completed: state.active.items[state.active.cursor].moves, steps: state.active.items[state.active.cursor].routineSteps, onStep: (i, status) => { state = store.resolveRoutineStep(state, i, status); }, onFinish() {} });
  const upNext = (tree) => findAll(tree, (n) => typeof n.props?.accessibilityLabel === "string" && n.props.accessibilityLabel.startsWith("Up next: "))[0];
  const card = (tree) => findAll(tree, (n) => n.type === "Pressable" && typeof n.props?.accessibilityHint === "string" && n.props.accessibilityHint.startsWith("Tap"))[0];
  let tree = draw();
  assert.equal(card(tree).props.accessibilityHint, cards[0].reps ? "Tap when you've done them" : "Tap anywhere to start");
  // Skip the first: it is left undone, and the card moves on.
  upNext(tree).props.onPress();
  tree = draw();
  assert.equal(state.active.items[state.active.cursor].routineSteps[0], "skipped");
  assert.ok(card(tree).props.accessibilityLabel.startsWith(cards[1].name), "on to the second");
  // Skip on to the last: its Up next is the skipped first one, come back round.
  for (let i = 1; i < count - 1; i++) { upNext(draw()).props.onPress(); }
  tree = draw();
  assert.equal(upNext(tree).props.accessibilityLabel.startsWith(`Up next: ${cards[0].name}`), true, "the skipped one comes back round");
  // A rep movement is done with a tap on the card.
  const repStep = cards.findIndex((m) => m.reps);
  if (repStep >= 0) {
    slots = []; state = store.buildWorkout(store.setNextWorkout(store.resetToDefault(), "legs"));
    state = store.goToCard(state, state.active.items.findIndex((it) => it.slot === "Warm-up"));
    for (let i = 0; i < repStep; i++) upNext(draw()).props.onPress();
    tree = draw();
    card(tree).props.onPress();
    assert.equal(state.active.items[state.active.cursor].routineSteps[repStep], "done");
    assert.equal(state.active.items[state.active.cursor].routineSteps[0], "skipped", "doing another movement does not do the skipped one");
  }
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
