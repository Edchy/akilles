// Puts the approved clay pictures — stretches and lifts — into the app.
//
//   node art/clay-export.mjs
//
// Shrinks each picture in art/clay to app size (assets/clay/<id>-<n>.webp) and
// writes src/data/clay.ts (and the intro's pictures, from scenes.json): for every stretch in
// art/clay/stretches.json with its pictures made, the frames and the breath between them;
// for every lift in art/clay/lifts.json, its two frames and which way is the effort.
// Don't edit clay.ts by hand: change the JSON and run this again.
//
// The pictures are WebP (about half a jpg's size, 23 November 2026), made with
// sharp: `npm i -D sharp` once, or point SHARP_FROM at a folder that has it.

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
let sharp;
try {
  sharp = createRequire(process.env.SHARP_FROM ? join(process.env.SHARP_FROM, "x.js") : import.meta.url)("sharp");
} catch {
  throw new Error("clay-export needs sharp to write WebP: run `npm i -D sharp` (or set SHARP_FROM)");
}
/** 960 wide is sharp on a phone at full width; quality 80 keeps one about 15 KB. */
const webp = (from, to) => sharp(from).resize({ width: 960 }).webp({ quality: 80 }).toFile(to);
const root = join(here, "..");
const out = join(root, "assets", "clay");
mkdirSync(out, { recursive: true });
const spec = JSON.parse(readFileSync(join(here, "clay", "stretches.json"), "utf8"));
const lifts = JSON.parse(readFileSync(join(here, "clay", "lifts.json"), "utf8"));
for (const [id, l] of Object.entries(lifts)) {
  // A hold (a dead hang, a plank) is one picture; a rep is two, with its effort one way.
  if (l.single === undefined && !["to0", "to1"].includes(l.effort)) throw new Error(`${id}: lifts.json needs "effort": "to0" or "to1"`);
  spec[id] = { ...l, breath: "steady", lift: true };
}

const entries = [];
/** Every picture this run puts in the app: anything else in assets/clay is left over. */
const written = new Set();
// A picture set aside for a redraw keeps showing from art/clay/standin/ until the new one is made.
const png = (name) => {
  const made = join(here, "clay", `${name}.png`);
  const standin = join(here, "clay", "standin", `${name}.png`);
  return existsSync(made) || !existsSync(standin) ? made : standin;
};
const face = (b) => (b === "inhale" ? "in" : "out");

for (const [id, s0] of Object.entries(spec)) {
  let s = s0;
  // A lift drawn with one of the cast is <id>@<who>-<n>.png; in the app it is still <id>-<n>.jpg.
  const who = s.cast ? `@${s.cast}` : "";
  let names = (s.single === undefined ? [0, 1] : [s.single]).map((n) => `${id}${who}-${n}`);
  // The breathing faces (art/clay.mjs <id> <n> in|out), where they are made:
  // a hold becomes two pictures, in and out, flipping with the breath; a
  // pair gets each picture's face for the breath that brings it.
  if (!s.effort && !s.lift && s.faces !== false) {
    if (s.single !== undefined) {
      const breathing = [`${id}-${s.single}-in`, `${id}-${s.single}-out`];
      if (breathing.every((n) => existsSync(png(n)))) {
        names = breathing;
        s = { ...s, breath: { to1: "exhale", to0: "inhale" } };
      }
    } else if (s.breath !== "steady") {
      const breathing = [`${id}-0-${face(s.breath.to0)}`, `${id}-1-${face(s.breath.to1)}`];
      if (breathing.every((n) => existsSync(png(n)))) names = breathing;
    }
  }
  const shown = names;
  const pngs = names.map(png);
  if (!pngs.every(existsSync)) {
    console.log(`skipping ${id}: not every picture is made`);
    continue;
  }
  const files = await Promise.all(
    shown.map(async (n, i) => {
      const file = `${n.replace(/@[a-z]+/, "")}.webp`;
      await webp(pngs[i], join(out, file));
      written.add(file);
      return file;
    }),
  );
  const frames = files.map((f) => `require("../../assets/clay/${f}")`).join(", ");
  const breath = s.breath === "steady" ? '"steady"' : `{ to1: "${s.breath.to1}", to0: "${s.breath.to0}" }`;
  const effort = s.effort ? `, effort: "${s.effort}"` : "";
  entries.push(`  ${id}: { frames: [${frames}], breath: ${breath}${effort} },`);
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
  written.add(`${id}.jpg`);
}

writeFileSync(
  join(root, "src", "data", "clay.ts"),
  `/**
 * The clay figure's pictures of each stretch and lift (see art/clay.mjs), from
 * art/clay/stretches.json and lifts.json by art/clay-export.mjs. Don't edit by
 * hand: change the JSON and run that.
 *
 * A stretch shown in two pictures flips from the first to the second on
 * \`breath.to1\` and back on \`breath.to0\`; a hold shown in one picture, or a
 * movement with no set breath, is "steady".
 *
 * A lift is two pictures, start and other end, moving at lifting pace: the
 * way to \`effort\` (to the second picture, or back to the first) is the lift.
 */

import type { ImageSourcePropType } from "react-native";

export type Breath = "inhale" | "exhale";

export type ClayStretch = {
  frames: ImageSourcePropType[];
  breath: { to1: Breath; to0: Breath } | "steady";
  /** A lift: which way between the pictures is the effort. */
  effort?: "to0" | "to1";
};

export const CLAY: Record<string, ClayStretch> = {
${entries.join("\n")}
};
`,
);
// Pictures nothing uses any more (a hold that now breathes, say) leave the app.
// Only pictures of a stretch, lift or scene this script knows: anything else in
// assets/clay was put there by hand (gym_ready.jpg) and stays.
// (The jpgs of before 23 November 2026 go this way too, now that each is a .webp.)
const ours = (f) => Object.keys(spec).concat(Object.keys(scenes)).some((id) => f === `${id}.jpg` || f.startsWith(`${id}-`));
for (const f of readdirSync(out))
  if (/\.(jpg|webp)$/.test(f) && !written.has(f) && ours(f)) rmSync(join(out, f));
console.log(`wrote ${entries.length} stretches and lifts`);
