// Puts the approved clay stretch pictures into the app.
//
//   node art/clay-export.mjs
//
// Shrinks each picture in art/clay to app size (assets/clay/<id>-<n>.jpg) and
// writes src/data/clay.ts (and the intro's pictures, from scenes.json): for every stretch in art/clay/stretches.json with
// its pictures made, the frames and the breath between them. Don't edit
// clay.ts by hand: change stretches.json and run this again.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const out = join(root, "assets", "clay");
mkdirSync(out, { recursive: true });
const spec = JSON.parse(readFileSync(join(here, "clay", "stretches.json"), "utf8"));

const entries = [];
for (const [id, s] of Object.entries(spec)) {
  const shown = s.single === undefined ? [0, 1] : [s.single];
  const pngs = shown.map((n) => join(here, "clay", `${id}-${n}.png`));
  if (!pngs.every(existsSync)) {
    console.log(`skipping ${id}: not every picture is made`);
    continue;
  }
  const files = shown.map((n, i) => {
    const file = `${id}-${n}.jpg`;
    // 960 wide is sharp on a phone at full width; quality 82 keeps them ~50 KB.
    const run = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", pngs[i], "-vf", "scale=960:-2",
      "-q:v", "4", join(out, file)]);
    if (run.status !== 0) throw new Error(`${file}: ${run.stderr}`);
    return file;
  });
  const frames = files.map((f) => `require("../../assets/clay/${f}")`).join(", ");
  const breath = s.breath === "steady" ? '"steady"' : `{ to1: "${s.breath.to1}", to0: "${s.breath.to0}" }`;
  entries.push(`  ${id}: { frames: [${frames}], breath: ${breath} },`);
}

// The intro's pictures (art/clay/scenes.json): one each, as assets/clay/<id>.jpg,
// required by name in components/intro.tsx.
const scenes = JSON.parse(readFileSync(join(here, "clay", "scenes.json"), "utf8"));
for (const id of Object.keys(scenes)) {
  const png = join(here, "clay", `${id}-0.png`);
  if (!existsSync(png)) throw new Error(`${id}: make it first, node art/clay.mjs ${id}`);
  const run = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-vf", "scale=960:-2", "-q:v", "4",
    join(out, `${id}.jpg`)]);
  if (run.status !== 0) throw new Error(`${id}: ${run.stderr}`);
}

writeFileSync(
  join(root, "src", "data", "clay.ts"),
  `/**
 * The clay figure's pictures of each stretch (see art/clay.mjs), and the breath
 * that goes with moving between them, from art/clay/stretches.json by
 * art/clay-export.mjs. Don't edit by hand: change stretches.json and run that.
 *
 * A stretch shown in two pictures flips from the first to the second on
 * \`breath.to1\` and back on \`breath.to0\`; a hold shown in one picture, or a
 * movement with no set breath, is "steady".
 */

import type { ImageSourcePropType } from "react-native";

export type Breath = "inhale" | "exhale";

export type ClayStretch = {
  frames: ImageSourcePropType[];
  breath: { to1: Breath; to0: Breath } | "steady";
};

export const CLAY: Record<string, ClayStretch> = {
${entries.join("\n")}
};
`,
);
console.log(`wrote ${entries.length} stretches`);
