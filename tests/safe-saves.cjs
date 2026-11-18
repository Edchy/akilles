const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// The rules that keep gym training safe: run from the Mac, the real save is
// never written; and the phone keeps one copy a day, for two weeks.
function phone() {
  const disk = new Map();
  return {
    disk,
    getItem: async (k) => (disk.has(k) ? disk.get(k) : null),
    setItem: async (k, v) => void disk.set(k, v),
    removeItem: async (k) => void disk.delete(k),
    getAllKeys: async () => [...disk.keys()],
    multiRemove: async (ks) => ks.forEach((k) => disk.delete(k)),
  };
}

/** A fresh copy of the app's modules, on a given phone, clock and build. */
function app({ storage, now = () => Date.now(), dev = false }) {
  const modules = new Map();
  class Clock extends Date {
    constructor(...a) { super(...(a.length ? a : [now()])); }
    static now() { return now(); }
  }
  const load = (name) => {
    if (name === "@react-native-async-storage/async-storage") return storage;
    if (!name.startsWith("@/")) return require(name);
    const filename = path.resolve(__dirname, "../src", name.slice(2)) + ".ts";
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
    });
    vm.runInNewContext(outputText, { module, exports: module.exports, require: load, process, console, Date: Clock, __DEV__: dev }, { filename });
    return module.exports;
  };
  return { store: load("@/store/session"), storage: load("@/store/storage") };
}

test("run from the Mac, the app is in test mode and never writes the real training", async () => {
  const p = phone();
  const gym = app({ storage: p });
  await gym.storage.save({ ...gym.store.resetToDefault(), shortWorkouts: false }, "real");
  const mine = p.disk.get("achilles/state");

  const mac = app({ storage: p, dev: true });
  assert.equal(mac.storage.FROM_MAC, true);
  assert.equal(await mac.storage.loadProfile(), "test");
  await mac.storage.save({ ...mac.store.resetToDefault(), shortWorkouts: true }, "real");
  await mac.storage.saveProfile("test");
  assert.equal(p.disk.get("achilles/state"), mine, "the gym training is untouched");
  assert.equal(p.disk.has("achilles/mode"), false, "the gym app still opens on the real training");
  // It can still be read, to test with a copy of it.
  assert.equal((await mac.storage.load("real")).shortWorkouts, false);
  // The test save is the Mac's to write.
  await mac.storage.save({ ...mac.store.resetToDefault(), shortWorkouts: true }, "test");
  assert.ok(p.disk.has("achilles/test"));
});

test("one copy a day of the training as it was that morning, the last fourteen kept", async () => {
  const p = phone();
  const DAY = 86_400_000;
  const start = new Date(2026, 10, 1, 9).getTime();
  for (let d = 0; d < 20; d++) {
    // Each day is a launch of its own: the app starts afresh.
    const { store, storage } = app({ storage: p, now: () => start + d * DAY });
    const today = { ...store.resetToDefault(), shortWorkouts: d % 2 === 0 };
    await storage.save(today, "real");
    await storage.save(today, "real"); // a second save the same day copies nothing more
  }
  const days = [...p.disk.keys()].filter((k) => k.startsWith("achilles/daily/")).sort();
  assert.equal(days.length, 14);
  assert.equal(days.at(-1), "achilles/daily/2026-11-20");
  // That day's copy is the day before's training: what you had that morning.
  const { storage } = app({ storage: p, now: () => start + 19 * DAY });
  const copies = await storage.dailyCopies();
  assert.equal(copies[0].day, "2026-11-20");
  // Day 18 saved short workouts on; day 19 turned them off after its copy.
  assert.equal(copies[0].state.shortWorkouts, true, "the copy is the morning's, before that day's change");
  assert.equal((await storage.load("real")).shortWorkouts, false);
});
