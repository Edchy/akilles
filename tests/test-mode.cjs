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
  getAllKeys: async () => [...disk.keys()],
  multiRemove: async (ks) => ks.forEach((k) => disk.delete(k)),
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

test("a save from a newer version is never written to", async () => {
  disk.clear();
  const newer = JSON.stringify({ version: 9999, state: { history: {} } });
  disk.set("achilles/state", newer);
  await storage.load("real");
  assert.equal(storage.isLocked("real"), true);
  await storage.save(mine(), "real");
  assert.equal(disk.get("achilles/state"), newer, "left exactly as it was");
  storage.unlock("real");
});

test("a save that cannot be read is kept aside before a fresh start writes over it", async () => {
  for (const unreadable of ["{ not json"]) {
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
  assert.ok(!named({ ...s, shortWorkouts: true }).includes("Dips"));
  assert.ok(named(s).includes("Dips"));
});

test("a save with loops from before they were folded away keeps every workout", () => {
  let s = store.addWorkoutOfKind(store.resetToDefault(), "bw1", "bodyweight");
  const bw = s.workouts.at(-1);
  s = { ...s, workouts: s.workouts.slice(0, -1), loops: [{ id: "main", name: "Gym" }, { id: "l_away", name: "Bodyweight", body: { workouts: [bw], nextWorkout: "bw1", removedWorkouts: [] } }] };
  const now = storage.fromSaved(JSON.stringify({ version: 21, state: s }));
  assert.equal(store.loopInUse(now), "ppl");
  assert.ok(now.workouts.some((w) => w.id === "push"));
  assert.ok(now.removedWorkouts.some((r) => r.workout.id === "bw1"), "the away workout waits, paused");
});

test("saving the editor's draft keeps only what the editor changed", () => {
  const base = store.resetToDefault();
  const draft = store.renameWorkout(base, base.workouts[0].id, { name: "Chest" });
  // Meanwhile, elsewhere: test mode's short workouts were switched on.
  const current = { ...base, shortWorkouts: true };
  const saved = store.mergeDraft(base, current, draft);
  assert.equal(saved.workouts[0].name, "Chest");
  assert.equal(saved.shortWorkouts, true, "a change made elsewhere is kept");
  // A draft with no changes saves nothing.
  assert.equal(store.mergeDraft(base, current, base).workouts, current.workouts);
});

test("dragged below Paused a workout pauses; dragged above, it resumes, in the order dropped", () => {
  let s = store.resetToDefault();
  const [push, pull, legs] = s.workouts.map((w) => w.id);
  s = store.setNextWorkout(s, pull);
  // Pull dragged down into Paused: it pauses, and the next active one after it is next.
  let after = store.arrangePlan(s, [push, legs], [pull]);
  assert.equal(after.workouts.map((w) => w.id).join(), [push, legs].join());
  assert.equal(after.removedWorkouts.map((r) => r.workout.id).join(), pull);
  assert.equal(after.nextWorkout, legs);
  // And back up, to the top.
  after = store.arrangePlan(after, [pull, push, legs], []);
  assert.equal(after.workouts.map((w) => w.id).join(), [pull, push, legs].join());
  assert.equal(after.removedWorkouts.length, 0);
  // Nothing left active: refused.
  assert.equal(store.arrangePlan(s, [], [push, pull, legs]), s);
});
