// The clay fellow's scenes for the film: art/clay/<id>-0.png → public/clay/<id>.jpg,
// for every scene in art/clay/scenes.json that is made.
//
//   npm run pictures

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";

const art = new URL("../../art/clay/", import.meta.url).pathname;
const out = new URL("../public/clay/", import.meta.url).pathname;
mkdirSync(out, { recursive: true });
for (const id of Object.keys(JSON.parse(readFileSync(art + "scenes.json", "utf8")))) {
  const png = `${art}${id}-0.png`;
  if (!existsSync(png)) {
    console.log(`not made yet: ${id}`);
    continue;
  }
  const run = spawnSync("ffmpeg", ["-v", "error", "-y", "-i", png, "-vf", "scale=1600:-2", "-q:v", "3", `${out}${id}.jpg`]);
  if (run.status !== 0) throw new Error(`${id}: ${run.stderr}`);
}
console.log("done");
