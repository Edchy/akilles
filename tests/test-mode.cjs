const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Test mode: a second save beside the real one. The real training is never
// written while it is on, and switching brings each one's own exercises back.
const disk = new Map();
const memory = {
  getItem: async (k) => (disk.has(k) ? disk.get(k) : null),
  setItem: async (k, v) => void disk.set(k, v),
  removeItem: async (k) => void disk.delete(k),
};

const modules = new Map();
function load(name) {
  if (name === "@react-native-async-storage/async-storage") return memory;
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
const exercises = load("@/data/exercises");

const MEADOWS = { id: "custom_meadows_row", name: "Meadows row", patterns: ["horizontal_pull"], increment: 2.5 };
const mine = () => store.createExerciseInWorkout(store.resetToDefault(), "pull", MEADOWS);

test("the test save and the real one never touch", async () => {
  disk.clear();
  const real = mine();
  await storage.save(real, "real");
  const before = disk.get("achilles/state");
  await storage.save(store.resetToDefault(), "test");
  await storage.save({ ...store.resetToDefault(), shortWorkouts: true }, "test");
  assert.equal(disk.get("achilles/state"), before);
  assert.ok((await storage.load("real")).custom.some((e) => e.id === MEADOWS.id));
  assert.equal((await storage.load("test")).shortWorkouts, true);
});

test("a save that cannot be read is kept aside before a fresh start writes over it", async () => {
  for (const unreadable of ["{ not json", JSON.stringify({ version: 9999, state: { history: {} } })]) {
    disk.clear();
    disk.set("achilles/state", unreadable);
    const fresh = await storage.load("real");
    assert.equal(fresh.log.length, 0);
    // What the app does next: save the fresh state over the old one.
    await storage.save(fresh, "real");
    const kept = [...disk.keys()].filter((k) => k.startsWith("achilles/kept/real/"));
    assert.equal(kept.length, 1);
    assert.equal(disk.get(kept[0]), unreadable);
  }
  // A save that reads keeps nothing aside.
  disk.clear();
  await storage.save(mine(), "real");
  await storage.load("real");
  assert.deepEqual([...disk.keys()], ["achilles/state"]);
});

test("test mode left on is still on next launch; leaving forgets it", async () => {
  disk.clear();
  assert.equal(await storage.loadProfile(), "real");
  await storage.saveProfile("test");
  assert.equal(await storage.loadProfile(), "test");
  await storage.saveProfile("real");
  assert.equal(await storage.loadProfile(), "real");
  assert.equal(disk.has("achilles/mode"), false);
});

test("there is something to carry on with only once a test was saved", async () => {
  disk.clear();
  assert.equal(await storage.hasSaved("test"), false);
  await storage.save(store.resetToDefault(), "test");
  assert.equal(await storage.hasSaved("test"), true);
});

test("a copy of your training brings its own exercises; a new phone has none", async () => {
  disk.clear();
  const real = mine();
  store.resetToDefault();
  assert.equal(exercises.byId(MEADOWS.id), undefined);
  const copy = storage.copyForTest(real);
  assert.ok(copy.custom.some((e) => e.id === MEADOWS.id));
  assert.equal(exercises.byId(MEADOWS.id)?.name, "Meadows row");
  // An empty test save opens as a new phone, with nothing of yours left over.
  const fresh = await storage.load("test");
  assert.equal(fresh.custom.length, 0);
  assert.equal(exercises.byId(MEADOWS.id), undefined);
  assert.equal(store.wantsIntro(fresh), true);
});

test("short workouts run, and show, only the first two exercises", () => {
  const s = store.resetToDefault();
  const push = store.workoutById(s, "push");
  const lifts = (state) => store.buildWorkout(state).active.items.filter((it) => store.isLift(it));
  assert.equal(lifts(s).length, 5);
  assert.equal(lifts({ ...s, shortWorkouts: true }).length, 2);
  assert.equal(store.exercisesToRun({ ...s, shortWorkouts: true }, push).length, 2);
  const named = (state) => store.workoutPreview(state, push).map((r) => r.name);
  assert.ok(!named({ ...s, shortWorkouts: true }).includes("Triceps pushdown"));
  assert.ok(named(s).includes("Triceps pushdown"));
});
