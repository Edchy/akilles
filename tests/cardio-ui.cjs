const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const modules = new Map();
let hooks = [], hookIndex = 0;
const react = { ...require("react"), useEffect: () => {}, useState: (initial) => {
  const at = hookIndex++;
  if (!(at in hooks)) hooks[at] = typeof initial === "function" ? initial() : initial;
  return [hooks[at], (value) => { hooks[at] = typeof value === "function" ? value(hooks[at]) : value; }];
} };
function load(name) {
  if (name === "react") return react;
  if (name === "react-native") return { View: "View", Pressable: "Pressable", Keyboard: { dismiss: () => {} } };
  if (name === "@react-native-async-storage/async-storage") return {};
  if (name === "@/components/field") return { useColors: () => load("@/constants/theme").colors };
  if (name === "@/components/cardio-keyboard") return { CardioInput: "TextInput" };
  if (name === "@/components/text") return { Text: "Text", TextInput: "TextInput" };
  if (!name.startsWith("@/")) return require(name);
  const base = path.resolve(__dirname, "../src", name.slice(2));
  const file = fs.existsSync(base + ".ts") ? base + ".ts" : base + ".tsx";
  if (modules.has(file)) return modules.get(file).exports;
  const module = { exports: {} };
  modules.set(file, module);
  const { outputText } = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  vm.runInNewContext(outputText, { module, exports: module.exports, require: load, process, console, Date });
  return module.exports;
}
const { CardioTarget } = load("@/components/cardio-target");
const { CardioResult } = load("@/components/cardio-result");
const { cardioById } = load("@/data/conditioning");
const plain = (value) => JSON.parse(JSON.stringify(value));
function nodes(root) {
  const list = [];
  const walk = (node) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    list.push(node);
    walk(node.props?.children);
  };
  walk(root);
  return list;
}
const render = (Component, props) => { hookIndex = 0; return nodes(Component(props)); };
const field = (list, label) => list.find((node) => node.props?.accessibilityLabel === label);
const text = (list) => list.filter((node) => node.type === "Text").map((node) => Array.isArray(node.props.children) ? node.props.children.join("") : node.props.children).join(" ");

test("the target starts with its saved number and switches explicitly between Distance and Time", () => {
  hooks = [];
  const changes = [];
  const props = { exercise: cardioById("treadmill"), target: { course: 1 }, onChange: (v) => changes.push(plain(v)) };
  const list = render(CardioTarget, props);
  assert.equal(field(list, "Distance target in km").props.value, "1");
  const time = list.find((node) => node.props?.accessibilityRole === "tab" && node.props.children.props.children === "Time");
  time.props.onPress();
  assert.deepEqual(changes.pop(), { minutes: 5 });
  field(list, "Distance target in km").props.onChangeText("1,5");
  assert.deepEqual(changes.pop(), { course: 1.5 });
  field(list, "Distance target in km").props.onChangeText("invalid");
  assert.equal(changes.length, 0);
});

test("the default treadmill target is 1 km, with last time and fastest shown separately from the result", () => {
  hooks = [];
  let result;
  const store = load("@/store/session");
  const item = store.buildWorkout(store.resetToDefault()).active.items[0];
  assert.equal(item.exerciseId, "treadmill");
  assert.equal(item.course, 1);
  assert.equal(item.minutes, undefined);
  const props = { cardio: cardioById("treadmill"), item, record: { last: 347, best: 330 }, onSet: (v) => { result = v; } };
  let list = render(CardioResult, props);
  let input = field(list, "Your time, minutes and seconds");
  assert.equal(input.props.value, "");
  assert.equal(input.props.placeholder, "0:00");
  assert.equal(list.filter((node) => node.type === "TextInput").length, 1);
  assert.match(text(list), /Last time: 5:47/);
  assert.match(text(list), /Fastest: 5:30/);
  assert.doesNotMatch(text(list), /type 5:30|min:sec|Warm-up/);
  for (const value of ["5:30", "530", "5.30"]) {
    input.props.onChangeText(value);
    assert.equal(result, 330);
  }
  for (const value of ["", "0", "5:60", "560", "nope", "-1"]) {
    input.props.onChangeText(value);
    assert.equal(result, null);
  }
  input.props.onChangeText("530");
  list = render(CardioResult, props);
  field(list, "Your time, minutes and seconds").props.onBlur();
  list = render(CardioResult, props);
  assert.equal(field(list, "Your time, minutes and seconds").props.value, "5:30");
});

test("a time target asks for distance, accepts a decimal comma and rejects invalid results", () => {
  hooks = [];
  let result;
  const list = render(CardioResult, { cardio: cardioById("treadmill"), item: { kind: "cardio", minutes: 10 }, onSet: (v) => { result = v; } });
  const input = field(list, "Result in km");
  assert.equal(input.props.placeholder, "0.00");
  assert.match(text(list), /Your distance/);
  assert.doesNotMatch(text(list), /type 5:30|min:sec|In 10 minutes/);
  input.props.onChangeText("1,25");
  assert.equal(result, 1.25);
  for (const invalid of ["", "-1", "Infinity", "0", "1oops"]) {
    input.props.onChangeText(invalid);
    assert.equal(result, null);
  }
});

test("bodyweight cardio supports reps as well as time without calling it distance", () => {
  hooks = [];
  const list = render(CardioTarget, { exercise: cardioById("jumping_jacks"), target: { minutes: 5 }, onChange: () => {} });
  assert.match(text(list), /Reps/);
  assert.doesNotMatch(text(list), /Distance/);
});
