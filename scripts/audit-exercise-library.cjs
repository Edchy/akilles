// Read-only inventory. A linked source is traceability, not professional sign-off.
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const ts = require("typescript");
const cache = new Map();
function load(name) {
  if (!name.startsWith("@/")) return require(name);
  const filename = path.join(__dirname, "../src", name.slice(2)) + ".ts";
  if (cache.has(filename)) return cache.get(filename).exports;
  const module = { exports: {} };
  cache.set(filename, module);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  vm.runInNewContext(outputText, { module, exports: module.exports, require: load, process }, { filename });
  return module.exports;
}
const { EXERCISES } = load("@/data/exercises");
const { CARDIO, AWAY_CARDIO, STRETCHES } = load("@/data/conditioning");
const { guideFor } = load("@/data/guides");
const { SHAPES } = load("@/data/templates");
const defaults = new Set(Object.values(SHAPES).flatMap((workouts) => workouts.flatMap((w) => w.exercises.flatMap((e) => e.options))));
const seen = new Set();
const rows = [...EXERCISES.filter((e) => e.enabled !== false).map((e) => ({ ...e, kind: "Strength" })),
  ...[...CARDIO, ...AWAY_CARDIO].map((e) => ({ ...e, kind: "Cardio" })),
  ...STRETCHES.map((e) => ({ ...e, kind: "Mobility" }))]
  .filter((e) => !seen.has(e.id) && seen.add(e.id))
  .map((e) => {
    const guide = guideFor(e.id);
    return { id: e.id, name: e.name, kind: e.kind, default: defaults.has(e.id),
      status: guide?.reviewedOn && guide.sources?.length ? "Source checked" : guide ? "Needs source review" : "Missing guide",
      sources: guide?.sources ?? [] };
  });
if (process.argv.includes("--json")) {
  process.stdout.write(JSON.stringify(rows, null, 2) + "\n");
} else {
  const checked = rows.filter((r) => r.status === "Source checked");
  const lines = ["# Exercise guide audit", "", "Generated from the current exercise and guide data with `npm run audit:exercises`.", "",
    `${EXERCISES.length} strength entries (${EXERCISES.filter((e) => e.enabled !== false).length} enabled). ${checked.length}/${rows.length} active strength, cardio and mobility guides have dated source checks.`, "",
    "A source check records editorial comparison with linked references. It is not qualified professional review, individual advice, or a guarantee of injury-free exercise.", "",
    "## Default-plan coverage", "", ...rows.filter((r) => r.default).map((r) => `- ${r.name}: ${r.status}`), "",
    "## Source-checked guides", "", ...checked.map((r) => `- **${r.name}** (${r.id}): ${r.sources.map((s) => `[${s.title}](${s.url})`).join("; ")}`), "",
    "## Remaining review queue", "", "Review existing commonly used guides before expanding the next batch. Every item below still needs source comparison or a missing guide, then qualified review.", "",
    "| Type | Exercise | ID | Status |", "|---|---|---|---|", ...rows.filter((r) => r.status !== "Source checked").map((r) => `| ${r.kind} | ${r.name} | ${r.id} | ${r.status} |`), ""];
  process.stdout.write(lines.join("\n"));
}
