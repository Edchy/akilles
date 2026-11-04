const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

const filename = path.resolve(__dirname, "../src/lib/typography.ts");
const loaded = { exports: {} };
vm.runInNewContext(
  ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText,
  { module: loaded, exports: loaded.exports },
  { filename },
);
const { noOrphan } = loaded.exports;
const NBSP = "\u00A0";

test("the last two words of a paragraph wrap together", () => {
  assert.equal(
    noOrphan("pause at the bottom, staying tight. Then stand."),
    `pause at the bottom, staying tight. Then${NBSP}stand.`,
  );
  assert.equal(noOrphan("Same weight and reps next time."), `Same weight and reps next${NBSP}time.`);
  // Trailing space is kept where it was.
  assert.equal(noOrphan("Hold the legs up. No swing. "), `Hold the legs up. No${NBSP}swing. `);
});

test("labels and long endings are left free to wrap", () => {
  assert.equal(noOrphan("stand."), "stand.");
  assert.equal(noOrphan("Add superset"), "Add superset");
  assert.equal(noOrphan(" kg"), " kg");
  assert.equal(noOrphan(""), "");
  const long = "Rest as long as you need between overwhelmingly demanding";
  assert.equal(noOrphan(long), long);
});
