const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Exercise the real progression engine, store and voice without a native runtime.
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

const prog = load("@/lib/progression");
const split = load("@/data/split");
const store = load("@/store/session");
const voice = load("@/data/voice");

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();
const SCHEME = "6-12";
/** The range the default plan's slots climb. */
const PLAN = "6-10";
const target = (st) => split.ladderFor(SCHEME)[st.rung];
const record = (exerciseId, weight, extra = {}) => ({ exerciseId, weight, rung: 0, downStreak: 0, deloads: 0, ...extra });
const hit = (st) => prog.applyResult(st, SCHEME, [target(st), target(st), target(st)], NOW);
const miss = (st) => prog.applyResult(st, SCHEME, [target(st), target(st), target(st) - 2], NOW);

test("two steps up, then the top of the ladder is climbed again before the next", () => {
  let st = record("db_bench", 20);
  const seen = [];
  for (let i = 0; i < 24; i++) {
    seen.push(`${st.weight}x${target(st)}${st.reloading ? " reload" : ""}`);
    st = hit(st);
  }
  assert.deepEqual(seen, [
    "20x6", "20x8", "20x10", "20x12",
    "22.5x6", "22.5x8", "22.5x10", "22.5x12",
    "25x6", "25x8", "25x10", "25x12",
    "25x10 reload", "25x12 reload",
    "27.5x6", "27.5x8", "27.5x10", "27.5x12",
    "30x6", "30x8", "30x10", "30x12",
    "30x10 reload", "30x12 reload",
  ]);
  assert.equal(st.weight, 32.5);
});

test("a lift saved before reloads is not sent back the day they ship", () => {
  const after = hit(record("db_bench", 25, { rung: 3 }));
  assert.equal(after.weight, 27.5);
  assert.ok(!after.reloading);
  assert.equal(after.climbs, 1);
});

test("a reload starts two rungs from the top: the whole ladder when it is that short", () => {
  assert.equal(prog.reloadRung(split.ladderFor("6-12")), 2);
  assert.equal(prog.reloadRung(split.ladderFor("8-12")), 1);
  assert.equal(prog.reloadRung(split.ladderFor("10-12")), 0);
  const short = prog.applyResult(record("db_bench", 25, { rung: 1, climbs: 2 }), "10-12", [12, 12, 12], NOW);
  assert.equal(short.rung, 0);
  assert.equal(short.reloading, true);
});

test("the screen hears about the first reload session, then the climb", () => {
  const at = (rung) => prog.prescribe(record("db_bench", 25, { rung, reloading: true }), SCHEME, 3).reload;
  assert.equal(at(2), "start");
  assert.equal(at(3), "climb");
  assert.equal(prog.prescribe(record("db_bench", 25), SCHEME, 3).reload, undefined);
});

test("two misses during a reload take it a rung down, and the count starts again", () => {
  let st = record("db_bench", 25, { rung: 2, reloading: true });
  st = miss(miss(st));
  assert.equal(st.weight, 25);
  assert.equal(st.rung, 1);
  assert.ok(!st.reloading);
  assert.equal(st.climbs, 0);
});

test("a deload gives an assisted lift more help, never added weight", () => {
  const twice = (st) => miss(miss(st));
  assert.ok(twice(record("pullup", -20)).weight < -20);
  assert.ok(twice(record("dips", 0)).weight < 0);
  // A plain bodyweight lift has nothing to take off.
  assert.equal(twice(record("hanging_leg_raise", 0)).weight, 0);
});

test("two misses take the reps down a rung first; only on the bottom rung does the weight drop", () => {
  // 60 kg at 10 reps, short twice: 60 kg at 8.
  let st = miss(miss(record("rdl", 60, { rung: 2 })));
  assert.equal(st.weight, 60);
  assert.equal(target(st), 8);
  assert.equal(st.deloadHeld, true);
  const shown = prog.prescribe(st, SCHEME, 3);
  assert.equal(shown.deloaded, true);
  assert.equal(shown.deloadHeld, true);
  st = miss(miss(st));
  assert.equal(target(st), 6);
  assert.equal(st.weight, 60);
  // On 6, nothing left to drop but the weight: 10% off 60 is 54, so 55.
  st = miss(miss(st));
  assert.equal(st.weight, 55);
  assert.equal(target(st), 6);
  assert.equal(st.deloadHeld, false);
  // Light dumbbells still go down a whole step from the bottom rung.
  assert.equal(miss(miss(record("db_bench", 10))).weight, 7.5);
});

test("a lift with no weight step never reloads", () => {
  const after = hit(record("plank", 0, { rung: 3, climbs: 5 }));
  assert.ok(!after.reloading);
});

test("only a layoff eases weights back: no monthly trim on a lift you train", () => {
  const trained = record("db_bench", 25, { lastTrainedAt: NOW - 3 * DAY, lastBackOffAt: NOW - 90 * DAY });
  assert.equal(prog.decayFor(trained, NOW), null);
  const away = record("db_bench", 25, { lastTrainedAt: NOW - 50 * DAY });
  assert.deepEqual({ ...prog.decayFor(away, NOW) }, { kind: "layoff", fraction: 0.15, days: 50 });
});

test("a layoff ends a reload; declining one settles it without counting as training", () => {
  const state = {
    ...store.resetToDefault(),
    history: {
      "db_bench:6-12": record("db_bench", 25, { rung: 2, reloading: true, climbs: 0, lastTrainedAt: NOW - 50 * DAY }),
    },
  };
  assert.equal(store.decayOffers(state, NOW).length, 1);

  const accepted = store.acceptDecay(state, NOW).history["db_bench:6-12"];
  assert.ok(accepted.weight < 25);
  assert.equal(accepted.rung, 0);
  assert.ok(!accepted.reloading);

  const declined = store.declineDecay(state, NOW);
  assert.equal(declined.history["db_bench:6-12"].weight, 25);
  assert.equal(store.decayOffers(declined, NOW).length, 0);
  assert.equal(store.trainedToday(declined, NOW), false);
  assert.equal(store.daysSinceTrained(declined, NOW), 50);
});

/** Start Push A with DB bench in a given state, every set logged at its target. */
const benchDone = (rec) => {
  const base = store.resetToDefault();
  let state = store.buildWorkout({ ...base, history: { [`db_bench:${PLAN}`]: rec } });
  const at = state.active.items.findIndex((it) => it.exerciseId === "db_bench");
  assert.ok(at >= 0, "Push A opens with DB bench");
  const reps = split.ladderFor(PLAN)[rec.rung];
  const items = state.active.items.map((it, i) => (i === at ? { ...it, logged: it.logged.map(() => reps) } : it));
  return { ...state, active: { ...state.active, items, cursor: at } };
};
const last = { weight: 25, reps: [10, 10, 10], target: 10 };

test("topping out into a reload is a hit, and says so before you move on", () => {
  const state = benchDone(record("db_bench", 25, { rung: 2, climbs: 2, lastPerformed: last, lastTrainedAt: NOW - 3 * DAY }));
  const verdict = store.nextTime(state);
  assert.equal(verdict.outcome, "hit");
  assert.equal(verdict.say, "reload");
  assert.equal(verdict.fact, "Reload next time: 25 kg ×2 again, from 8 reps.");
  assert.ok(voice.OUTCOME_LINES.reload.length > 0);
  assert.equal(store.sessionTally(state).reload, 1);

  const finished = store.finishWorkout(state);
  const entry = finished.log.at(-1).entries.find((e) => e.exerciseId === "db_bench");
  assert.equal(entry.outcome, "hit");
  assert.equal(finished.history["db_bench:6-10"].reloading, true);
  assert.equal(finished.history["db_bench:6-10"].weight, 25);
});

test("finishing a reload is owned, and earns the next step", () => {
  const state = benchDone(record("db_bench", 25, { rung: 2, reloading: true, climbs: 0, lastPerformed: last, lastTrainedAt: NOW - 3 * DAY }));
  const verdict = store.nextTime(state);
  assert.equal(verdict.say, "owned");
  assert.equal(verdict.fact, "Up to 27.5 kg ×2 next time.");
});

test("Today says a lift reloads", () => {
  const base = store.resetToDefault();
  const state = {
    ...base,
    history: {
      "db_bench:6-10": record("db_bench", 25, { rung: 1, reloading: true, lastPerformed: { weight: 25, reps: [10, 10, 10], target: 10 }, lastTrainedAt: NOW - 3 * DAY }),
    },
  };
  const rows = store.workoutPreview(state, store.workoutById(state, "push"));
  const bench = rows.find((r) => r.name === "DB bench press");
  assert.equal(bench.change, "reload");
  assert.equal(bench.amount, "3 × 8");

  const line = voice.newsLine({ up: [], fresh: [], reload: [{ name: bench.name, weight: bench.weight }], down: [] }, "x");
  assert.match(line, /DB bench press reloads/);
});

test("an unfinished attempt never advances or counts as a second miss", () => {
  let st = miss(record("db_bench", 20, { rung: 2 }));
  st = prog.applyResult(st, SCHEME, [10, null, 8], NOW);
  assert.equal(st.weight, 20);
  assert.equal(st.rung, 2);
  assert.equal(st.downStreak, 1);
  st = miss(st);
  assert.equal(st.weight, 20);
  assert.equal(st.rung, 1);
});

test("the verdict states the real reduced weight without claiming an exact percentage", () => {
  const state = benchDone(record("db_bench", 10, { rung: 0, downStreak: 1 }));
  const at = state.active.cursor;
  const missed = { ...state, active: { ...state.active, items: state.active.items.map((it, i) =>
    i === at ? { ...it, logged: it.logged.map(() => 4) } : it,
  ) } };
  assert.equal(store.nextTime(missed).fact, "Lighter next time: 7.5 kg ×2.");
  assert.equal(store.finishWorkout(missed).history["db_bench:6-10"].weight, 7.5);
});

test("a trained manual weight carries to the same exercise in another workout and rep range", () => {
  let state = store.addWorkout(store.resetToDefault(), "other", "Other");
  state = store.addExerciseToWorkout(state, "other", "db_bench");
  const other = store.workoutById(state, "other");
  state = { ...state, workouts: state.workouts.map((w) => w.id === "other" ? { ...w, exercises: w.exercises.map((e) => ({ ...e, scheme: "8-12" })) } : w), history: {
    "db_bench:6-12": record("db_bench", 50, { lastTrainedAt: NOW - DAY }),
    "db_bench:8-12": record("db_bench", 40, { rung: 2, lastTrainedAt: NOW - 2 * DAY }),
  } };
  let active = store.buildWorkout(store.setNextWorkout(state, "push"));
  active = store.goToCard(active, active.active.items.findIndex((it) => it.exerciseId === "db_bench"));
  active = store.editWeight(active, 60);
  active = store.tapSet(active, 0); // Partial session: carries the actual load without advancing the ladder.
  state = store.finishWorkout(active, NOW);
  const next = store.buildWorkout(store.setNextWorkout(state, "other"));
  assert.equal(next.active.items[0].weight, 60);
  assert.equal(store.currentPrescription(next).reps, 8, "stale top-rung progress resets at the shared new load");
  assert.equal(state.log.at(-1).entries.find((e) => e.exerciseId === "db_bench").weight, 60);
  assert.equal(state.history["db_bench:8-12"].weight, 40, "old records remain historical; prescriptions resolve the latest shared load");
});

test("editing a weight without training does not change another workout's prescription", () => {
  let state = benchDone(record("db_bench", 50, { lastTrainedAt: NOW - DAY }));
  state = { ...state, active: { ...state.active, items: state.active.items.map((it) => ({ ...it, logged: it.logged.map(() => null) })) } };
  state = store.editWeight(state, 60);
  state = store.finishWorkout(state, NOW);
  state = store.buildWorkout(state);
  assert.equal(state.active.items.find((it) => it.exerciseId === "db_bench").weight, 50);
});

test("legacy records without timestamps resolve to one consistent weight across ranges", () => {
  let state = store.addWorkout(store.resetToDefault(), "legacy", "Legacy");
  state = store.addExerciseToWorkout(state, "legacy", "db_bench");
  const entry = store.workoutById(state, "legacy").exercises[0];
  state = { ...state, history: { "db_bench:6-12": record("db_bench", 50), "db_bench:8-12": record("db_bench", 40) } };
  state = store.updateEntry(state, "legacy", entry.id, { scheme: "8-12" });
  const built = store.buildWorkout(store.setNextWorkout(state, "legacy"));
  assert.equal(built.active.items[0].weight, store.nextWeight(state, "db_bench"));
});
