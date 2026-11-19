const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Two built-in plans: Push, pull, legs to start, and PPLPPL to switch to in Settings.
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

// An easy week every three months or so, and rest between sets.
const store = load("@/store/session");

const DAY = 24 * 60 * 60 * 1000;
const t0 = Date.UTC(2026, 0, 5);

/** Started at t0 and trained `n` times, a day apart from the next day on. */
const trained = (n) => {
  let s = { ...store.resetToDefault(), onboarded: t0 };
  for (let i = 0; i < n; i++) {
    s = store.buildWorkout(s, t0 + (i + 1) * DAY);
    s = { ...s, active: { ...s.active, items: s.active.items.map((it) => (store.isLift(it) ? { ...it, logged: it.logged.map(() => 8) } : it)) } };
    s = store.finishWorkout(s, t0 + (i + 1) * DAY);
  }
  return s;
};

test("an easy week is offered after twelve weeks and three dozen workouts — not before", () => {
  const s = trained(40);
  assert.equal(store.easyWeekOffer(s, t0 + 60 * DAY), false, "too soon");
  assert.equal(store.easyWeekOffer(s, t0 + 85 * DAY), true);
  assert.equal(store.easyWeekOffer(trained(10), t0 + 85 * DAY), false, "too few workouts");
  // Not now: asked again in three weeks.
  const later = store.declineEasyWeek(s, t0 + 85 * DAY);
  assert.equal(store.easyWeekOffer(later, t0 + 90 * DAY), false);
  assert.equal(store.easyWeekOffer(later, t0 + 107 * DAY), true);
});

test("in an easy week: 60% of the weight, a set fewer, and no record moves", () => {
  let s = trained(40);
  const now = t0 + 85 * DAY;
  const before = JSON.stringify(Object.fromEntries(Object.entries(s.history).map(([k, r]) => [k, [r.weight, r.rung]])));
  s = store.setNextWorkout(store.startEasyWeek(s, now), "push");
  assert.equal(store.easyWeek(s, now + 2 * DAY).day, 3);
  const full = store.buildWorkout({ ...s, recovery: undefined }, now);
  const easy = store.buildWorkout(s, now);
  assert.ok(easy.active.easy);
  const bench = (st) => st.active.items.find((it) => it.exerciseId === "db_bench");
  assert.ok(bench(easy).weight < bench(full).weight, `${bench(easy).weight} < ${bench(full).weight}`);
  assert.equal(bench(easy).logged.length, bench(full).logged.length - 1);
  // Today says the same as Start.
  const row = store.workoutPreview(s, store.workoutById(s, "push"), now).find((r) => r.name === "DB bench press");
  assert.ok(row.weight.startsWith(String(bench(easy).weight)), `${row.weight} vs ${bench(easy).weight} (full ${bench(full).weight})`);
  // Short of every rep: nothing moves, and the log says it was easy.
  let done = { ...easy, active: { ...easy.active, items: easy.active.items.map((it) => (store.isLift(it) ? { ...it, logged: it.logged.map(() => 1) } : it)) } };
  done = store.finishWorkout(done, now);
  const after = JSON.stringify(Object.fromEntries(Object.entries(done.history).map(([k, r]) => [k, [r.weight, r.rung]])));
  assert.equal(after, before);
  assert.equal(done.log.at(-1).easy, true);
  // A week later it is over, and the next one counts from its end.
  assert.equal(store.easyWeek(done, now + 7 * DAY), null);
  assert.equal(store.easyWeekOffer(done, now + 30 * DAY), false);
});

test("an easy week can end early", () => {
  const now = t0 + 85 * DAY;
  const s = store.endEasyWeek(store.startEasyWeek(trained(40), now), now + DAY);
  assert.equal(store.easyWeek(s, now + DAY), null);
  assert.ok(!store.buildWorkout(s, now + DAY).active.easy);
});

test("rest between sets: longest on the day's first lift, shortest for small muscles and the core", () => {
  const s = store.buildWorkout(store.resetToDefault());
  const at = (id) => store.restSeconds({ ...s, active: { ...s.active, cursor: s.active.items.findIndex((it) => it.exerciseId === id) } });
  const lifts = s.active.items.filter(store.isLift).map((it) => it.exerciseId);
  assert.equal(at(lifts[0]), store.REST.first);
  assert.equal(at(lifts[1]), store.REST.main);
  const s2 = store.buildWorkout(store.setNextWorkout(store.addExerciseToWorkout(store.resetToDefault(), "push", "lateral_raise", "s_raise"), "push"));
  const raise = s2.active.items.findIndex((it) => it.exerciseId === "lateral_raise");
  if (raise >= 0) assert.equal(store.restSeconds({ ...s2, active: { ...s2.active, cursor: raise } }), store.REST.small);
  assert.equal(store.restSeconds({ ...s, active: { ...s.active, cursor: 0 } }), null, "cardio has no rest");
});
