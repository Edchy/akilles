const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
let state, store, slots = [], at = 0;
const hooks = new Map();
const fakeReact = { ...require("react"), useState: (initial) => {
  const current = slots, i = at++;
  if (!(i in current)) current[i] = typeof initial === "function" ? initial() : initial;
  return [current[i], (value) => { current[i] = typeof value === "function" ? value(current[i]) : value; }];
}, useRef: (value) => { const i = at++; return slots[i] ??= { current: value }; },
  // Effects don't run in these renders; memos and stores are read as they stand.
  useEffect() {}, useMemo: (make) => make(), useCallback: (fn) => fn, useSyncExternalStore: (_subscribe, read) => read() };
class Value { constructor(value) { this.value = value; } setValue(value) { this.value = value; } interpolate() { return 0; } }
const native = { StyleSheet: { absoluteFill: { position: "absolute", top: 0, bottom: 0, left: 0, right: 0 } }, Platform: { OS: "ios" }, View: "View", Pressable: "Pressable", ScrollView: "ScrollView", Animated: { View: "AnimatedView", Value,
  spring: (value, options) => ({ start: () => value.setValue(options.toValue) }),
}, PanResponder: { create: (handlers) => ({ panHandlers: handlers }) } };
const routes = [], replacements = [];
let pathname = "/";
const router = { push: (route) => routes.push(route), replace: (route) => replacements.push(route), back() {} };
const Stack = () => null;
Stack.Screen = "StackScreen";
const cache = new Map();
function load(name) {
  if (name === "react") return fakeReact;
  if (name === "react-native") return native;
  if (name === "react-native-safe-area-context") return { SafeAreaProvider: "SafeAreaProvider", SafeAreaView: "SafeAreaView", initialWindowMetrics: { insets: { top: 62, bottom: 34 } }, useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) };
  if (name === "expo-router") return { router, useRouter: () => router, usePathname: () => pathname, useLocalSearchParams: () => ({}), Stack };
  if (name === "@/components/bar-actions") return { useHideBar() {} };
  if (name === "@react-native-async-storage/async-storage") return {};
  if (name === "@/store/session" && store) return { ...store, useSession: () => ({ state, setState: (value) => { state = typeof value === "function" ? value(state) : value; } }) };
  if (name.startsWith("@/components/") && !["@/components/modules", "@/components/swipe", "@/components/screen", "@/components/tab-bar", "@/components/loop-scope"].includes(name)) return new Proxy({}, { get: (_, key) => String(key) });
  if (!name.startsWith("@/")) return require(name);
  const base = path.resolve(__dirname, "../src", name.slice(2));
  const file = fs.existsSync(base + ".ts") ? base + ".ts" : base + ".tsx";
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const result = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  vm.runInNewContext(result.outputText, { module, exports: module.exports, require: load, process, console, Date });
  return module.exports;
}
store = load("@/store/session");
const { Modules, WorkoutSheet, NewWorkoutOptions } = load("@/components/modules");
const { Swipe } = load("@/components/swipe");
function render(Component, props = {}) { if (!hooks.has(Component)) hooks.set(Component, []); slots = hooks.get(Component); at = 0; return Component(props); }
function find(node, predicate) {
  if (Array.isArray(node)) return node.map((child) => find(child, predicate)).find(Boolean);
  if (!node || typeof node !== "object") return;
  if (predicate(node)) return node;
  return find(node.props.page, predicate) || find(node.props.children, predicate);
}
const byType = (tree, type) => find(tree, (node) => node.type === type);
const byLabel = (tree, label) => find(tree, (node) => node.props?.accessibilityLabel === label);
const plan = () => render(Modules, { onDragChange: () => {} });
/** The list of the loop on screen, which Modules renders inside its LoopScope. */
const loopList = () => {
  const element = find(plan(), (node) => node.type?.name === "LoopWorkouts");
  return render(element.type, element.props);
};
const workoutRow = (id) => {
  const list = byType(loopList(), "DragList");
  const item = list.props.data.find((w) => w.id === id);
  const element = list.props.renderItem(item, { active: false, index: 0, count: list.props.data.length, start() {}, cancel() {}, moveBy() {} });
  return render(element.type, element.props);
};

test("left swipe reveals Pause and Delete without executing either; vertical/right drags are ignored", () => {
  hooks.clear(); let paused = 0, deleted = 0;
  const props = { radius: 28, actions: [{ label: "Pause", onPress: () => paused++ }, { label: "Delete", onPress: () => deleted++, destructive: true }] };
  let root = render(Swipe, props);
  const claim = (dx, dy) => root.props.onMoveShouldSetPanResponderCapture(null, { dx, dy });
  assert.equal(claim(60, 0), false);
  assert.equal(claim(-5, 0), false);
  assert.equal(claim(-30, 45), false);
  assert.equal(claim(-80, 5), true);
  assert.equal(byLabel(root, "Delete").props.disabled, true);
  root.props.onPanResponderRelease(null, { dx: -130, vx: 0 });
  root = render(Swipe, props);
  assert.equal(byLabel(root, "Delete").props.disabled, undefined);
  assert.equal(paused + deleted, 0);
  byLabel(root, "Delete").props.onPress();
  assert.equal(deleted, 1);
  assert.equal(paused, 0);
  root = render(Swipe, props);
  assert.equal(byLabel(root, "Delete").props.disabled, true);
  root = render(Swipe, { ...props, disabled: true });
  assert.equal(root.props.onMoveShouldSetPanResponderCapture(null, { dx: -100, dy: 0 }), false);
});

test("workout actions delete immediately with Undo, while preserving history and paused-row Resume", () => {
  hooks.clear(); state = store.resetToDefault();
  const before = state;
  let row = workoutRow("legs");
  assert.deepEqual([...row.props.actions.map((a) => a.label)], ["Pause", "Delete"]);
  row.props.actions[1].onPress();
  assert.ok(!state.workouts.some((w) => w.id === "legs"));
  assert.equal(state.history, before.history);
  assert.equal(state.log, before.log);
  const said = plan();
  assert.ok(find(said, (n) => n.props?.children === "Legs deleted."), "it says what happened");
  byLabel(said, "Undo").props.onPress();
  assert.equal(state, before);
  workoutRow("legs").props.actions[0].onPress();
  row = workoutRow("legs");
  assert.deepEqual([...row.props.actions.map((a) => a.label)], ["Resume", "Delete"]);
  row.props.actions[0].onPress();
  assert.ok(state.workouts.some((w) => w.id === "legs"));
});

test("Undo cannot overwrite a later edit to the plan", () => {
  hooks.clear(); state = store.resetToDefault();
  workoutRow("legs").props.actions[1].onPress();
  const undo = byLabel(plan(), "Undo");
  state = store.renameWorkout(state, "push", { name: "Edited push" });
  assert.equal(byLabel(plan(), "Undo"), undefined);
  undo.props.onPress();
  assert.equal(state.workouts.find((w) => w.id === "push").name, "Edited push");
  assert.ok(!state.workouts.some((w) => w.id === "legs"));
});

test("New workout opens a page without editing the plan; its choices and copy action remain available", () => {
  hooks.clear(); state = store.resetToDefault();
  const element = find(plan(), (node) => node.type?.name === "NewWorkout");
  let kind, copied;
  const props = { onKind: (k) => { kind = k; }, onCopy: (id) => { copied = id; } };
  const before = state;
  render(element.type, element.props).props.onPress();
  assert.equal(routes.at(-1).pathname, "/new-workout");
  assert.equal(state, before, "opening the page must not create a workout");
  const form = () => render(NewWorkoutOptions, props);
  let tree = form();
  for (const label of ["Push. chest, shoulders, arms", "Pull. back, arms", "Legs. legs, hips", "Full body. a bit of everything", "Bodyweight. no equipment needed", "Build your own. you add the exercises"]) {
    assert.ok(byLabel(tree, label), label);
  }
  assert.equal(byLabel(tree, "Legs. 4 exercises"), undefined, "copy sources stay out of the way");
  byLabel(tree, "Pull. back, arms").props.onPress();
  assert.equal(kind, "pull");
  assert.equal(copied, undefined);

  tree = form();
  find(tree, (n) => n.type === "Button" && n.props.label === "Copy a workout").props.onPress();
  tree = form();
  byLabel(tree, "Legs. 4 exercises").props.onPress();
  assert.equal(copied, "legs");
});

// The "Add" at the foot of a part, by what it says to a screen reader.
const addTo = (tree, label) => find(tree, (n) => n.type?.name === "Stop" && n.props.a11y?.accessibilityLabel === label);
const stopTitled = (tree, title) => find(tree, (n) => n.type?.name === "Stop" && n.props.title === title);
const named = (tree, name) => find(tree, (node) => node.type?.name === name);
function editorFor(id) {
  const row = workoutRow(id);
  byType(row, "Pressable").props.onPress();
  assert.equal(routes.at(-1).pathname, "/plan-editor");
  assert.equal(routes.at(-1).params.id, id);
  return () => render(WorkoutSheet, { workout: store.workoutById(state, id), embedded: true, naming: false, onClose() {} });
}

test("adding cardio to an empty workout opens a chooser before adding anything", () => {
  hooks.clear(); state = store.addWorkout(store.resetToDefault(), "blank", "Blank");
  const editor = editorFor("blank");
  let tree = editor();
  const before = state;
  addTo(tree, "Add to the warm-up").props.onPress();
  assert.equal(state, before, "opening Add must not silently add default cardio");
  tree = editor();
  // One Add sheet, with cardio and mobility offered at the top, chosen there.
  const sheet = byType(tree, "AddExerciseSheet");
  assert.equal(JSON.stringify(sheet.props.blocks.map((b) => b.label)), JSON.stringify(["Cardio", "Mobility"]));
  const cardio = sheet.props.blocks[0];
  let done = false;
  const chooser = cardio.choose(() => { done = true; });
  chooser.props.onPick("outdoor");
  assert.ok(done);
  assert.equal(store.cardioPlan(state, store.workoutById(state, "blank"), "open").machine.id, "outdoor");
  assert.equal(store.cardioPlan(state, store.workoutById(state, "blank"), "close"), null);
});

test("exercise and routine alternatives stay collapsed until explicitly opened", () => {
  hooks.clear(); state = store.resetToDefault();
  const editor = editorFor("push");
  let tree = editor();
  const dragList = find(tree, (n) => n.type === "DragList" && n.props.data.length > 0);
  const lift = dragList.props.renderItem(dragList.props.data[0], { active: false, start() {}, cancel() {}, moveBy() {}, index: 0, count: 5 });
  const stop = render(lift.type, lift.props);
  byType(render(stop.type, stop.props), "Pressable").props.onPress();
  tree = editor();
  const slotSheet = named(tree, "SlotSheet");
  let details = render(slotSheet.type, slotSheet.props);
  assert.equal(named(details, "Choice"), undefined);
  // Swap and How to do it share the top; removal comes after settings.
  const actions = find(details, (n) => n.type?.name === "Action" && n.props.label === "Swap exercise");
  assert.ok(find(details, (n) => n.type?.name === "Action" && n.props.label === "How to do it"));
  assert.equal(find(details, (n) => n.type?.name === "Action" && n.props.label === "Remove"), undefined);
  assert.ok(find(details, (n) => n.type === "BigButton" && n.props.label === "Remove from this workout"));
  assert.equal(byType(details, "Sheet").props.embedded, true, "exercise pages reuse the workout modal");
  actions.props.onPress();
  details = render(slotSheet.type, slotSheet.props);
  assert.ok(named(details, "Choice"));
  assert.equal(byType(details, "Sheet").props.title, "Replace DB bench press");
  assert.equal(named(details, "Action"), undefined, "Remove and Swap stay out of the chooser");
  assert.equal(byType(details, "WeightField"), undefined, "the old exercise's weight stays out of the chooser");
  assert.equal(byType(details, "Setting"), undefined, "sets and reps stay out of the chooser");
  const beforeCancel = state;
  byType(details, "Sheet").props.onClose();
  details = render(slotSheet.type, slotSheet.props);
  assert.equal(state, beforeCancel, "Cancel leaves the plan unchanged");
  assert.equal(named(details, "Choice"), undefined);
  assert.equal(byType(details, "WeightField").props.exerciseId, "db_bench");
  find(details, (n) => n.type?.name === "Action" && n.props.label === "Swap exercise").props.onPress();
  details = render(slotSheet.type, slotSheet.props);
  // The library is in reach too: picking one from it swaps it in and adds it to the catalogue.
  const library = find(details, (n) => n.type?.name === "Choice" && n.props.label === "Incline BB press");
  assert.ok(library, "a library press is offered");
  const beforePreview = state;
  library.props.onPreview();
  assert.equal(routes.at(-1).pathname, "/plan-editor/guide");
  assert.equal(routes.at(-1).params.id, "incline_bench");
  assert.equal(state, beforePreview, "previewing must not select the exercise");
  details = render(slotSheet.type, slotSheet.props);
  assert.ok(named(details, "Choice"), "the replacement list remains mounted under the guide route");
  const renderedChoice = render(library.type, library.props);
  byLabel(renderedChoice, "How to do Incline BB press").props.onPress();
  assert.equal(state, beforePreview);
  library.props.onPress();
  assert.equal(store.chosen(state, "push", store.workoutById(state, "push").exercises[0]), "incline_bench");
  assert.ok(!state.hidden.includes("incline_bench"));
  const freshSlot = named(editor(), "SlotSheet");
  details = render(freshSlot.type, freshSlot.props);
  assert.equal(byType(details, "Sheet").props.title, "Incline BB press");
  assert.equal(named(details, "Choice"), undefined);
  assert.equal(byType(details, "WeightField").props.exerciseId, "incline_bench");
  assert.ok(byType(details, "Setting"), "settings return for the replacement exercise");
  find(details, (n) => n.type?.name === "Action" && n.props.label === "How to do it").props.onPress();
  details = render(freshSlot.type, freshSlot.props);
  assert.equal(routes.at(-1).pathname, "/plan-editor/guide");
  assert.equal(routes.at(-1).params.id, "incline_bench");
  details = render(freshSlot.type, freshSlot.props);
  assert.ok(byType(details, "WeightField"), "guide navigation keeps exercise settings mounted");
  assert.equal(named(details, "Choice"), undefined);
  const beforeRemove = state;
  find(details, (n) => n.type === "BigButton" && n.props.label === "Remove from this workout").props.onPress();
  details = render(freshSlot.type, freshSlot.props);
  assert.equal(state, beforeRemove, "the first Remove tap only asks for confirmation");
  find(details, (n) => n.type === "TextButton" && n.props.label === "Keep it").props.onPress();
  details = render(freshSlot.type, freshSlot.props);
  assert.equal(state, beforeRemove);
  find(details, (n) => n.type === "BigButton" && n.props.label === "Remove from this workout").props.onPress();
  details = render(freshSlot.type, freshSlot.props);
  find(details, (n) => n.type === "BigButton" && n.props.danger).props.onPress();
  assert.ok(!store.workoutById(state, "push").exercises.some((e) => e.id === freshSlot.props.entry.id));
  assert.equal(byType(editor(), "Sheet").props.page, undefined, "removal returns to the workout in the same modal");
});

test("a workout's start and finish take exercises of their own, run in their place", () => {
  hooks.clear(); state = store.resetToDefault();
  const editor = editorFor("push");
  let tree = editor();
  // Every part has one Add, and it opens the same sheet.
  assert.ok(addTo(tree, "Add to the cool-down") && addTo(tree, "Add an exercise"));
  addTo(tree, "Add to the warm-up").props.onPress();
  tree = editor();
  const sheet = byType(tree, "AddExerciseSheet");
  assert.equal(sheet.props.part, "start");
  // Push already has a treadmill: picking cardio here swaps it, and says so.
  assert.equal(sheet.props.blocks[0].detail, "Instead of Treadmill");
  addTo(tree, "Add an exercise").props.onPress();
  tree = editor();
  assert.equal(byType(tree, "AddExerciseSheet").props.blocks.length, 0);
  state = store.addExerciseToWorkout(state, "push", "face_pull", "s_start", "start");
  state = store.addExerciseToWorkout(state, "push", "plank", "s_finish", "finish");
  const run = store.buildWorkout(store.setNextWorkout(state, "push")).active.items.map((it) => it.exerciseId ?? it.slot);
  const at = (id) => run.indexOf(id);
  assert.ok(at("face_pull") > at("Warm-up") && at("face_pull") < at("db_bench"), JSON.stringify(run));
  assert.ok(at("plank") > at("ab_crunch_machine"), JSON.stringify(run));
  // Each part drags among its own.
  tree = editor();
  const all = [];
  find(tree, (n) => { if (n.type === "DragList") all.push(n); return false; });
  assert.deepEqual(all.map((l) => l.props.data.length), [1, 5, 1]);
});


test("only the guide route enables the native interactive swipe", () => {
  const Layout = load("@/app/plan-editor/_layout").default;
  const tree = render(Layout);
  const editor = find(tree, (n) => n.type === "StackScreen" && n.props.name === "index");
  const guide = find(tree, (n) => n.type === "StackScreen" && n.props.name === "guide");
  assert.equal(editor.props.options.gestureEnabled, false);
  assert.equal(guide.props.options.gestureEnabled, true);
  assert.equal(guide.props.options.fullScreenGestureEnabled, true);
  assert.equal(guide.props.options.animation, "default");
});


test("choosing a new workout template creates it once and replaces the chooser with its editor", () => {
  hooks.clear(); state = store.resetToDefault();
  const before = state;
  const Screen = load("@/app/new-workout").default;
  const tree = render(Screen);
  assert.equal(state, before);
  assert.ok(byType(tree, "Sheet").props.embedded);
  const picker = named(tree, "NewWorkoutOptions");
  picker.props.onKind("full");
  assert.equal(state.workouts.length, before.workouts.length + 1);
  const route = replacements.at(-1);
  assert.equal(route.pathname, "/plan-editor");
  const created = store.workoutById(state, route.params.id);
  assert.equal(created.kind, "full");
  assert.equal(created.exercises.length, 6);
  assert.equal(state.history, before.history);
});


test("editor safe areas are measured inside the native page even when inherited insets are zero", () => {
  const { SafeScreen } = load("@/components/screen");
  const tree = render(SafeScreen, { children: "page" });
  assert.equal(tree.type, "SafeAreaProvider");
  assert.equal(tree.props.initialMetrics.insets.top, 62);
  const safe = byType(tree, "SafeAreaView");
  assert.deepEqual([...safe.props.edges], ["top", "bottom"]);
  assert.equal(safe.props.children, "page");
  const page = render(load("@/app/new-workout").default);
  assert.equal(page.type, SafeScreen, "New workout uses the safe native boundary");
});


test("repeated taps on the current main tab do not navigate; other tabs still open", () => {
  const { TabButtons } = load("@/components/tab-bar");
  for (const [path, label] of [["/", "Next up"], ["/plan", "Plan"], ["/profile", "Profile"]]) {
    pathname = path;
    const tree = render(TabButtons);
    const selected = find(tree, (n) => n.type === "TabButton" && n.props.label === label);
    assert.equal(selected.props.active, true);
    const before = replacements.length;
    for (let i = 0; i < 5; i++) selected.props.onPress();
    assert.equal(replacements.length, before, `${label} must not navigate to itself`);
    const other = find(tree, (n) => n.type === "TabButton" && n.props.label !== label);
    other.props.onPress();
    assert.equal(replacements.length, before + 1);
  }
  // A highlighted parent tab still takes a detail screen back to its main screen.
  pathname = "/settings";
  const profile = find(render(TabButtons), (n) => n.type === "TabButton" && n.props.label === "Profile");
  assert.equal(profile.props.active, true);
  profile.props.onPress();
  assert.equal(replacements.at(-1), "/profile");
});
