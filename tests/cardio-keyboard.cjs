const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");
let hooks = [], at = 0, effects = [], context = null, dismissals = 0;
const listeners = new Map();
const react = { ...require("react"), createContext: () => ({ Provider: "Provider" }), useContext: () => context,
  useRef: (value) => { const i = at++; return hooks[i] ??= { current: value }; },
  useId: () => "cardio-input",
  useState: (value) => { const i = at++; if (!(i in hooks)) hooks[i] = value; return [hooks[i], (v) => { hooks[i] = typeof v === "function" ? v(hooks[i]) : v; }]; },
  useEffect: (fn) => effects.push(fn),
};
const native = { View: "View", ScrollView: "ScrollView", Pressable: "Pressable", InputAccessoryView: "InputAccessoryView", Platform: { OS: "ios" },
  Keyboard: { dismiss: () => dismissals++, addListener: (name, fn) => { listeners.set(name, fn); return { remove: () => listeners.delete(name) }; } },
};
const moduleCache = new Map();
function load(name) {
  if (name === "react") return react;
  if (name === "react-native") return native;
  if (name === "@/components/text") return { Text: "Text", TextInput: "TextInput" };
  if (!name.startsWith("@/")) return require(name);
  const base = path.resolve(__dirname, "../src", name.slice(2));
  const file = fs.existsSync(base + ".ts") ? base + ".ts" : base + ".tsx";
  if (moduleCache.has(file)) return moduleCache.get(file).exports;
  const module = { exports: {} }; moduleCache.set(file, module);
  const result = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } });
  vm.runInNewContext(result.outputText, { module, exports: module.exports, require: load, requestAnimationFrame: (fn) => { fn(); return 1; }, cancelAnimationFrame: () => {} });
  return module.exports;
}
const { CardioKeyboardArea, CardioInput } = load("@/components/cardio-keyboard");
const render = (component, props = {}) => { at = 0; return component(props); };
function find(node, type) {
  if (Array.isArray(node)) return node.map((child) => find(child, type)).find(Boolean);
  if (!node || typeof node !== "object") return;
  if (node.type === type) return node;
  return find(node.props.children, type);
}

test("the active input is scrolled above the keyboard, and the card returns to a fixed position on dismissal", () => {
  hooks = []; effects = []; listeners.clear(); dismissals = 0;
  let root = render(CardioKeyboardArea);
  let scroll = find(root, "ScrollView");
  const movements = [];
  scroll.props.ref.current = { getNativeScrollRef: () => ({ measureInWindow: (fn) => fn(0, 180, 350, 450) }), scrollTo: (value) => movements.push(value) };
  const clean = effects[0]();
  assert.equal(scroll.props.scrollEnabled, false);
  root.props.value.focus({ measureInWindow: (fn) => fn(10, 500, 200, 80) });
  listeners.get("keyboardWillShow")({ endCoordinates: { screenY: 400 } });
  assert.equal(movements.at(-1).y, 240);
  root = render(CardioKeyboardArea);
  scroll = find(root, "ScrollView");
  assert.equal(scroll.props.scrollEnabled, true);
  assert.ok(scroll.props.contentContainerStyle.paddingBottom >= 230);
  scroll.props.onTouchStart();
  root.props.value.touchedInput();
  scroll.props.onTouchEnd();
  assert.equal(dismissals, 0, "tapping an input must keep the keyboard open");
  scroll.props.onTouchStart();
  scroll.props.onTouchEnd();
  assert.equal(dismissals, 1, "tapping blank space must dismiss the keyboard");
  listeners.get("keyboardDidHide")();
  root = render(CardioKeyboardArea);
  assert.equal(find(root, "ScrollView").props.scrollEnabled, false);
  assert.equal(movements.at(-1).y, 0);
  clean();
  assert.equal(listeners.size, 0);
});

test("numeric inputs have an iOS Done accessory and Return dismisses the keyboard", () => {
  hooks = []; effects = []; context = null; dismissals = 0;
  const root = render(CardioInput, { keyboardType: "decimal-pad" });
  const input = find(root, "TextInput");
  const accessory = find(root, "InputAccessoryView");
  assert.equal(input.props.inputAccessoryViewID, accessory.props.nativeID);
  find(accessory, "Pressable").props.onPress();
  assert.equal(dismissals, 1);
  input.props.onSubmitEditing({});
  assert.equal(dismissals, 2);
});
