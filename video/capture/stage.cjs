// Builds the saved states the video's stills need, from Humbell's real store.
const fs = require("node:fs"), path = require("node:path"), vm = require("node:vm"), ts = require("typescript");
const ROOT = "/Users/eddietovebeppearonelsa/dev/wip/achilles";
const cache = new Map();
function load(name) {
  if (name === "@react-native-async-storage/async-storage") return {};
  if (!name.startsWith("@/")) return require(require.resolve(name, { paths: [ROOT] }));
  const base = path.resolve(ROOT, "src", name.slice(2));
  const file = fs.existsSync(base + ".ts") ? base + ".ts" : base + ".tsx";
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} }; cache.set(file, module);
  const out = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(out, { module, exports: module.exports, require: load, process, console, Date }, { filename: file });
  return module.exports;
}
const store = load("@/store/session"), storage = load("@/store/storage");
const DAY = 864e5;
let state = store.resetToDefault();
state = { ...state, onboarded: Date.now() - 20 * DAY, introSeen: Date.now() - 20 * DAY };
// Two weeks of honest training, so every lift has its weight.
const realNow = Date.now;
for (let round = 0; round < 4; round++) {
  for (const id of ["push", "pull", "legs"]) {
    const t = realNow() - (14 - round * 3 - ["push", "pull", "legs"].indexOf(id)) * DAY;
    Date.now = () => t;
    state = store.buildWorkout(store.setNextWorkout(state, id));
    state.active.items.forEach((it, i) => {
      if (store.isConditioning(it) || !Array.isArray(it.logged)) return;
      state = { ...state, active: { ...state.active, cursor: i } };
      for (let k = 0; k < it.logged.length; k++) state = store.tapSet(state, k);
    });
    state = store.finishWorkout(state);
  }
}
Date.now = realNow;
state = store.setNextWorkout(state, "push");
const out = {};
out.home = state;
// The first lift, sets ticked one at a time.
let live = store.buildWorkout(state);
const first = live.active.items.findIndex((it) => !store.isConditioning(it) && it.exerciseId);
live = { ...live, active: { ...live.active, cursor: first } };
out.lift0 = live;
let s = live;
const n = live.active.items[first].logged.length;
for (let i = 0; i < n; i++) { s = store.tapSet(s, i); out[`lift${i + 1}`] = s; }
// Workouts reordered: Legs moved above Pull.
out.reordered = store.moveWorkout(state, 2, 1);
// Pull paused.
out.paused = store.pauseWorkout(state, "pull");
// Push's second exercise dragged to the top.
const push = store.workoutById(state, "push");
out.entryMoved = store.moveEntry(state, "push", 1, 0);
fs.mkdirSync("states", { recursive: true });
for (const [k, v] of Object.entries(out)) fs.writeFileSync(`states/${k}.json`, storage.toSaved(v));
console.log(Object.keys(out).join(" "), "| first lift:", live.active.items[first].exerciseId, "sets", n, "weight", live.active.items[first].weight);
console.log("push entries", push.exercises.map((e) => e.id || e.slot).join(","));
