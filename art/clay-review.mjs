// Every clay picture laid out for looking through one by one:
//
//   node art/clay-review.mjs
//
// Writes art/clay/review/ (not committed): one image per stretch, lift, scene
// and character, its pictures side by side as the app flips between them —
// the breathing faces where they are made. Open the folder in Preview and
// arrow through. Run again after a batch to bring it up to date.
//
//   stretch - <id>.jpg            what the mobility card shows
//   lift - <rating> - <id> - <who>.jpg   start | finish (5 = most common)
//   scene - <id>.jpg              the intro's pictures
//   cast - <who>.jpg              each person's sheet; gear - <n>.jpg the equipment

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "clay");
const out = join(dir, "review");
rmSync(out, { recursive: true, force: true });
mkdirSync(out);
const read = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));
const png = (n) => join(dir, `${n}.png`);
const face = (b) => (b === "inhale" ? "in" : "out");

/** Pictures side by side, each 640 wide, into one jpg. */
function sheet(names, file) {
  const have = names.filter((n) => existsSync(png(n)));
  if (!have.length) return false;
  const inputs = have.flatMap((n) => ["-i", png(n)]);
  const scale = have.map((_, i) => `[${i}]scale=640:-2[s${i}]`).join(";");
  const join_ = have.length > 1 ? `;${have.map((_, i) => `[s${i}]`).join("")}hstack=${have.length}` : "";
  const filter = have.length > 1 ? scale + join_ : "[0]scale=640:-2";
  const run = spawnSync("ffmpeg", ["-v", "error", "-y", ...inputs, "-filter_complex", filter, "-q:v", "3", join(out, file)]);
  if (run.status !== 0) throw new Error(`${file}: ${run.stderr}`);
  return have.length === names.length;
}

let made = 0;
let partial = 0;
const count = (complete) => (complete === false ? 0 : (made++, complete || partial++));

for (const [id, s] of Object.entries(read("stretches.json"))) {
  let names = s.single !== undefined ? [`${id}-${s.single}`] : [`${id}-0`, `${id}-1`];
  const faces =
    s.single !== undefined
      ? [`${id}-${s.single}-in`, `${id}-${s.single}-out`]
      : s.breath !== "steady"
        ? [`${id}-0-${face(s.breath.to0)}`, `${id}-1-${face(s.breath.to1)}`]
        : null;
  if (faces?.every((n) => existsSync(png(n)))) names = faces;
  count(sheet(names, `stretch - ${id}.jpg`));
}
for (const [id, l] of Object.entries(read("lifts.json"))) {
  const who = l.cast ?? "klay";
  const stem = l.cast ? `${id}@${l.cast}` : id;
  const names = l.single !== undefined ? [`${stem}-${l.single}`] : [`${stem}-0`, `${stem}-1`];
  count(sheet(names, `lift - ${l.common ?? 3} - ${id} - ${who}.jpg`));
}
for (const id of Object.keys(read("scenes.json"))) count(sheet([`${id}-0`], `scene - ${id}.jpg`));
count(sheet(["sheet"], "cast - klay.jpg"));
for (const who of Object.keys(read("cast.json"))) count(sheet([`sheet-${who}`], `cast - ${who}.jpg`));
for (const n of [1, 2, 3, 4, 5, 6]) count(sheet([n === 1 ? "gear" : `gear-${n}`], `gear - ${n}.jpg`));

console.log(`${made} in ${out}${partial ? ` (${partial} only half made: the start, no finish yet)` : ""}`);
