const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Exercise the real catalogue, guides and save format without a native runtime.
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

const exercises = load("@/data/exercises");
const guides = load("@/data/guides");
const conditioning = load("@/data/conditioning");
const store = load("@/store/session");
const storage = load("@/store/storage");

/** Through JSON, so values made inside the sandbox compare as plain ones. */
const plain = (value) => JSON.parse(JSON.stringify(value));
const { EXERCISES } = exercises;
const LEAN = plain(exercises.LEAN);
const ids = plain(EXERCISES.map((e) => e.id));
const fresh = () => store.resetToDefault();

/** The movement types, read from the `Pattern` union itself. */
const PATTERNS = (() => {
  const source = fs.readFileSync(path.resolve(__dirname, "../src/data/exercises.ts"), "utf8");
  const union = source.match(/export type Pattern =([^;]+);/)[1];
  return [...union.matchAll(/"([a-z_]+)"/g)].map((m) => m[1]);
})();

/** Every built-in as of version 10, the last save format before the list grew. */
const V10 = [
  "bench", "db_bench", "incline_bench", "machine_chest", "incline_db_press", "dips", "cable_fly",
  "cable_crossover", "ohp", "db_shoulder", "machine_shoulder", "kb_press", "pullup",
  "lat_pulldown", "chinup", "bb_row", "cable_row", "chest_supported_row", "machine_row",
  "db_row", "back_squat", "front_squat", "goblet_squat", "kb_goblet_squat", "hack_squat",
  "leg_press", "deadlift", "rdl", "good_morning", "hip_thrust", "back_ext", "db_rdl",
  "nordic_curl", "kb_swing", "bulgarian", "walking_lunge", "step_up", "leg_ext", "leg_curl",
  "lateral_raise", "rear_delt_fly", "face_pull", "db_curl", "bb_curl", "hammer_curl",
  "cable_curl", "spider_curl", "pushdown", "overhead_ext", "skullcrusher", "kickback",
  "calf_raise", "seated_calf", "leg_press_calf", "box_jump", "broad_jump", "depth_jump",
  "jump_squat", "speed_squat", "speed_deadlift", "hanging_leg_raise", "rotation_machine",
  "cable_crunch", "ab_machine", "plank",
];
const added = ids.filter((id) => !V10.includes(id));
/** What a version 10 install started with: its pool, and everything else hidden. */
const v10Lean = LEAN.filter((id) => V10.includes(id));
const v10Hidden = V10.filter((id) => !v10Lean.includes(id));

/** The common lifts the user asked to have in the catalogue from the start. */
const APPROVED = [
  "push_up", "pec_deck", "cable_lateral_raise", "reverse_fly_machine", "db_shrug",
  "preacher_curl", "tbar_row", "smith_squat", "hip_abduction", "glute_bridge", "crunch",
  "ab_wheel",
];

test("every built-in has an id of its own", () => {
  assert.equal(new Set(ids).size, ids.length, "duplicate ids");
  for (const id of ids) {
    assert.match(id, /^[a-z0-9]+(_[a-z0-9]+)*$/, `${id} is not snake_case`);
    // Exercises you create are `custom_…`; a built-in must never shadow one.
    assert.ok(!id.startsWith("custom_"), `${id} looks like a custom id`);
  }
  // Guides and photos are keyed by id across lifts, machines and stretches.
  const others = [
    ...conditioning.CARDIO.map((c) => c.id),
    ...conditioning.STRETCHES.map((s) => s.id),
    ...conditioning.MOBILITY.map((m) => m.id),
    ...conditioning.RETIRED_MOBILITY,
  ];
  for (const id of ids) assert.ok(!others.includes(id), `${id} is also a machine or stretch`);
  // The snapshot below is only meaningful if nothing in it has gone.
  for (const id of V10) assert.ok(ids.includes(id), `${id} was removed`);
});

test("every built-in counts as at least one real movement type", () => {
  assert.deepEqual(plain(Object.keys(exercises.PATTERN_LABEL)).sort(), [...PATTERNS].sort());
  for (const e of EXERCISES) {
    assert.ok(e.patterns.length > 0, `${e.id} has no movement type`);
    assert.equal(new Set(e.patterns).size, e.patterns.length, `${e.id} repeats a type`);
    for (const p of e.patterns) assert.ok(PATTERNS.includes(p), `${e.id}: ${p} is not a Pattern`);
  }
});

test("every built-in has a guide and a way to own it", () => {
  for (const e of EXERCISES) {
    const guide = guides.guideFor(e.id);
    assert.ok(guide, `${e.id} has no guide`);
    assert.ok(guide.steps.length >= 1 && guide.steps.length <= 4, `${e.id}: 1–4 steps`);
    for (const step of guide.steps) assert.ok(step.trim().length > 0, `${e.id} has an empty step`);
    assert.ok(guide.avoid.trim().length > 0, `${e.id} has nothing to avoid`);
    assert.ok(guide.own && guide.own.trim().length > 0, `${e.id} has no way to own it`);
  }
  for (const id of added) assert.equal(guides.guideFor(id).steps.length, 3, `${id}: three steps`);
});

test("aliases are lower case, distinct, and more than the name again", () => {
  for (const e of EXERCISES) {
    const aliases = e.aliases ?? [];
    assert.equal(new Set(aliases).size, aliases.length, `${e.id} repeats an alias`);
    for (const a of aliases) {
      assert.equal(a, a.trim().toLowerCase(), `${e.id}: "${a}" is not trimmed lower case`);
      assert.ok(a.length > 0, `${e.id} has an empty alias`);
      assert.notEqual(a, e.name.toLowerCase(), `${e.id}: "${a}" is just its name`);
    }
  }
  for (const id of added) {
    assert.ok((exercises.byId(id).aliases ?? []).length > 0, `${id} has no aliases`);
  }
});

test("weights fit the equipment", () => {
  for (const e of EXERCISES) {
    assert.ok(e.increment >= 0, `${e.id}: negative step`);
    if (e.unloaded) assert.equal(e.increment, 0, `${e.id}: nothing to load, so no step`);
    if (e.assistable) assert.ok(e.bodyweight, `${e.id}: assistance subtracts from bodyweight`);
    if (e.timed && !e.bodyweight) {
      assert.ok(e.movements?.includes("carry"), `${e.id}: loaded timed work must explicitly be a carry`);
      assert.ok(e.increment > 0, `${e.id}: a loaded carry needs a load increment`);
    }
    if (e.startWeight !== undefined) {
      assert.ok(e.startWeight > 0, `${e.id}: start weight`);
      const steps = e.startWeight / e.increment;
      assert.equal(steps, Math.round(steps), `${e.id}: start weight is off its steps`);
    }
  }
});

test("the starting pool names only built-ins, and a fresh install hides the rest", () => {
  assert.equal(new Set(LEAN).size, LEAN.length, "LEAN repeats an id");
  for (const id of LEAN) {
    assert.ok(ids.includes(id), `${id} in LEAN is not a built-in`);
    assert.notEqual(exercises.byId(id).enabled, false, `${id} in LEAN is disabled`);
  }
  for (const id of APPROVED) assert.ok(LEAN.includes(id), `${id} should start in the pool`);

  const hidden = plain(fresh().hidden);
  assert.deepEqual([...hidden].sort(), ids.filter((id) => !LEAN.includes(id)).sort());
  const pool = plain(store.catalogue(fresh()).map((e) => e.id));
  for (const id of APPROVED) assert.ok(pool.includes(id), `${id} is not in a fresh pool`);
});

test("a version 10 save hides the new library lifts and keeps the new common ones", () => {
  // A catalogue curated by hand: front squat brought in, plank taken out.
  const hidden = [...v10Hidden.filter((id) => id !== "front_squat"), "plank"];
  const old = { ...plain(fresh()), hidden };
  const restored = storage.fromSaved(JSON.stringify({ version: 10, state: old }));
  assert.equal(typeof restored, "object");

  for (const id of added) {
    assert.equal(restored.hidden.includes(id), !LEAN.includes(id), `${id} after migrating`);
  }
  assert.ok(added.some((id) => LEAN.includes(id)), "no new lift joins the pool");
  assert.ok(added.some((id) => !LEAN.includes(id)), "no new lift goes to the library");

  // Nothing already decided moves, and nothing is listed twice.
  for (const id of hidden) assert.ok(restored.hidden.includes(id), `${id} came back`);
  assert.ok(!restored.hidden.includes("front_squat"));
  assert.equal(new Set(restored.hidden).size, restored.hidden.length);
  const library = added.filter((id) => !LEAN.includes(id));
  assert.equal(restored.hidden.length, hidden.length + library.length);

  const pool = plain(store.catalogue(restored).map((e) => e.id));
  for (const id of APPROVED) assert.ok(pool.includes(id), `${id} is not in the migrated pool`);
});

test("the migration runs once: a lift brought in after updating stays in", () => {
  const old = { ...plain(fresh()), hidden: v10Hidden };
  let state = storage.fromSaved(JSON.stringify({ version: 10, state: old }));
  assert.ok(state.hidden.includes("sumo_deadlift"));
  state = store.restoreExercise(state, "sumo_deadlift");
  const reloaded = storage.fromSaved(storage.toSaved(state));
  assert.ok(!reloaded.hidden.includes("sumo_deadlift"));
  assert.deepEqual(plain(reloaded.hidden), plain(state.hidden));
});

test("a much older save, whose library is rebuilt, lists each lift once", () => {
  const old = { ...plain(fresh()), hidden: [], courses: {} };
  const restored = storage.fromSaved(JSON.stringify({ version: 6, state: old }));
  assert.equal(typeof restored, "object");
  assert.equal(new Set(restored.hidden).size, restored.hidden.length);
  for (const id of added) {
    assert.equal(restored.hidden.includes(id), !LEAN.includes(id), `${id} after migrating`);
  }
});
