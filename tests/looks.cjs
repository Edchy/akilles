const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// Clay, the app's one look: its colours, its two faces, and lines tall
// enough for every font it loads.
const modules = new Map();
function load(name) {
  if (!name.startsWith("@/")) return require(name);
  const filename = path.resolve(__dirname, "../src", name.slice(2)) + ".ts";
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  vm.runInNewContext(outputText, { module, exports: module.exports, require: load, process, console }, { filename });
  return module.exports;
}

const theme = load("@/constants/theme");
// Objects from the sandbox: compared by value.
const same = (a, b) => assert.equal(JSON.stringify(a), JSON.stringify(b));

test("Clay: a sand page, puffy family colours, Bebas for names and M PLUS Rounded for the rest", () => {
  assert.equal(theme.colors.bg, "#F3ECE2");
  same(theme.cardOf("pull"), { bg: theme.CLAY_TONE.pull.card, ink: theme.CLAY_TONE.pull.ink });
  assert.equal(theme.fieldColors("legs").wash, theme.CLAY_TONE.legs.deep);
  assert.equal(theme.fieldColors("push").text, theme.CLAY_TONE.push.ink);
  same({ ...theme.radii }, { card: 26, button: 20, action: 32 });
  assert.equal(theme.fonts.display, "BebasNeue_400Regular");
  for (const [role, face] of Object.entries(theme.fonts)) {
    if (role !== "display") assert.match(face, /^MPLUSRounded1c_/, `${role} is ${face}`);
  }
});

test("every font Clay names is loaded", () => {
  const layout = fs.readFileSync(path.resolve(__dirname, "../src/app/_layout.tsx"), "utf8");
  for (const name of new Set(Object.values(theme.fonts))) {
    assert.match(layout, new RegExp(`\\b${name}\\b,`), `${name} is never loaded`);
  }
});

test("every Clay colour keeps its words readable, on the clay and pressed in", () => {
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  for (const [family, { card, deep, ink }] of Object.entries(theme.CLAY_TONE)) {
    assert.ok(ratio(card, ink) >= 4.5, `${family}: ${ink} on ${card}`);
    // A done set's number: whichever words the palette puts on it.
    const done = theme.fieldColors(family).ink;
    assert.ok(ratio(deep, done) >= 4.5, `${family}: ${done} on ${deep}`);
  }
  assert.ok(ratio(theme.CLAY_LOOK.well, theme.CLAY_LOOK.ink) >= 4.5);
});

test("every font the app loads knows how tall a line it needs, so its tops are never cut off", () => {
  const fs = require("node:fs");
  const path = require("node:path");
  const layout = fs.readFileSync(path.resolve(__dirname, "../src/app/_layout.tsx"), "utf8");
  const lines = fs.readFileSync(path.resolve(__dirname, "../src/constants/font-lines.ts"), "utf8");
  const loaded = new Set(layout.match(/\b[A-Z][A-Za-z0-9]+_[0-9]{3}[A-Za-z_]*\b/g));
  for (const name of loaded) assert.match(lines, new RegExp(`^  ${name}: \\d`, "m"), `${name}: run art/font-lines.py`);
});
