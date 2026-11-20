// The clay fellow's scenes for the film: every pose, art/clay/<id>-<n>.png →
// public/clay/<id>-<n>.jpg, for every scene in art/clay/scenes.json that is made.
//
//   npm run pictures

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

const art = new URL("../../art/clay/", import.meta.url).pathname;
const out = new URL("../public/clay/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
const scenes = JSON.parse(readFileSync(art + "scenes.json", "utf8"));
for (const [id, spec] of Object.entries(scenes)) {
  spec.frames.forEach((_, n) => {
    const png = `${art}${id}-${n}.png`;
    if (!existsSync(png)) return console.log(`not made yet: ${id} ${n}`);
    const run = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-vf", "scale=1800:-2", "-q:v", "2", `${out}${id}-${n}.jpg`]);
    if (run.status !== 0) throw new Error(`${id} ${n}: ${run.stderr}`);
  });
}
// Lift pictures the film uses too (art/clay/lifts.json).
for (const id of ["goblet_squat"]) {
  for (const n of [0, 1]) {
    const run = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", `${art}${id}-${n}.png`, "-vf", "scale=1800:-2", "-q:v", "2", `${out}${id}-${n}.jpg`]);
    if (run.status !== 0) throw new Error(`${id} ${n}: ${run.stderr}`);
  }
}
console.log("done");
