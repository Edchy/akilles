const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { test } = require("node:test");
const ts = require("typescript");

// The Lab's looks: wearing one changes how cards are drawn, and Dusk comes
// back exactly as it was.
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

test("Poster draws flat colour in one ink, in its own faces", () => {
  const dusk = { fonts: { ...theme.fonts }, card: theme.cardOf("push"), field: theme.fieldColors("pull") };
  theme.applyLook("poster");
  assert.equal(theme.worn.poster, true);
  assert.equal(theme.worn.dusk, false);
  same(theme.cardOf("push"), { bg: "#FF4A1C", ink: "#111111" });
  assert.equal(theme.fieldColors("pull").bg, "#1F3BFF");
  assert.equal(theme.fieldColors("pull").text, "#FFFFFF");
  assert.equal(theme.fieldIsDark("pull"), true);
  assert.equal(theme.fieldIsDark("push"), false);
  assert.equal(theme.fonts.display, "Anton_400Regular");
  assert.equal(theme.worn.fontScale, 1);

  theme.applyLook("dusk");
  same({ ...theme.fonts }, dusk.fonts);
  same(theme.cardOf("push"), dusk.card);
  same(theme.fieldColors("pull"), dusk.field);
  assert.equal(theme.worn.fontScale, 1.12);
});

test("every family has a Poster colour, and its words read on it", () => {
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  for (const [family, { card, ink }] of Object.entries(theme.POSTER_COLOUR)) {
    const [a, b] = [lum(card), lum(ink)].sort((x, y) => y - x);
    assert.ok((a + 0.05) / (b + 0.05) >= 4.5, `${family}: ${card} / ${ink}`);
  }
});

test("a Poster headline face is worn only with Poster", () => {
  const garamond = theme.fonts.display;
  theme.applyLook("poster", "bebas");
  assert.equal(theme.fonts.display, "BebasNeue_400Regular");
  assert.equal(theme.fonts.displayBold, "BebasNeue_400Regular");
  assert.equal(theme.fonts.regular, "Archivo_400Regular");
  theme.applyLook("dusk");
  assert.equal(theme.fonts.display, garamond);
  // Remembered for next time Poster is worn.
  theme.applyLook("poster");
  assert.equal(theme.fonts.display, "BebasNeue_400Regular");
  theme.applyLook("dusk", "anton");
});

test("Concrete: white cards, Inter Tight and soft corners; Dusk comes back", () => {
  const dusk = { fonts: { ...theme.fonts }, radii: { ...theme.radii }, field: theme.fieldColors("legs") };
  theme.applyLook("concrete");
  assert.equal(theme.worn.concrete, true);
  same(theme.cardOf("pull"), { bg: "#FFFFFF", ink: "#1A1A1A" });
  assert.equal(theme.fieldColors("push").bg, "#FFFFFF");
  assert.equal(theme.fieldIsDark("push"), false);
  assert.equal(theme.fonts.display, "InterTight_700Bold");
  assert.equal(theme.radii.card, 22);
  assert.equal(theme.worn.fontScale, 1);
  theme.applyLook("dusk");
  same({ ...theme.fonts }, dusk.fonts);
  same({ ...theme.radii }, dusk.radii);
  same(theme.fieldColors("legs"), dusk.field);
});

test("every Concrete grey keeps its words readable", () => {
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  for (const [family, { tone, ink }] of Object.entries(theme.CONCRETE_TONE)) {
    const [a, b] = [lum(tone), lum(ink)].sort((x, y) => y - x);
    assert.ok((a + 0.05) / (b + 0.05) >= 4.5, `${family}: ${tone} / ${ink}`);
  }
});
