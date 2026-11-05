const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// The intro: six pages on how Milo works, opened by itself only on a phone
// that has trained nothing, and from Plan's ? after that.
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

test("a new phone gets the intro, once", () => {
  const fresh = store.resetToDefault();
  assert.equal(store.wantsIntro(fresh), true);
  const seen = store.seeIntro(fresh, 1000);
  assert.equal(store.wantsIntro(seen), false);
  // Seeing it again from Plan's ? keeps the first time.
  assert.equal(store.seeIntro(seen, 2000).introSeen, 1000);
});

test("someone who has trained is never greeted as new", () => {
  const fresh = store.resetToDefault();
  // From before the intro existed, or a backup put back: training, no flag.
  assert.equal(store.wantsIntro({ ...fresh, history: { db_bench: {} } }), false);
  assert.equal(store.wantsIntro({ ...fresh, log: [{}] }), false);
  // Mid-workout, it waits too.
  assert.equal(store.wantsIntro(store.buildWorkout(fresh)), false);
});

test("having seen it survives a save, and a save from before it has none", () => {
  const seen = store.seeIntro(store.resetToDefault(), 1000);
  assert.equal(storage.fromSaved(storage.toSaved(seen)).introSeen, 1000);
  const old = JSON.parse(storage.toSaved(store.resetToDefault()));
  delete old.state.introSeen;
  assert.equal(storage.fromSaved(JSON.stringify(old)).introSeen, undefined);
});
