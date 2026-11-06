// Draws one frame of a movement with Codex's image generation.
//
//   node art/draw.mjs <id> <frame> [--ref art/drawn/back_squat-1.png] [--tag b]
//   node art/draw.mjs <id> 1 --base art/drawn/<id>-0.png
//
// Fills STYLE.md with the frame's moment from frames.json, attaches the frame's
// photo (the pose to copy) and, with --ref, an approved drawing (the house style
// to match), and saves the result to art/drawn/<id>-<frame>[<tag>].png. With
// --base, the drawing is an edit of the lift's other frame instead, so the two
// flip without the figure, the camera or the equipment jumping. The
// drawings are greyscale on purpose: trace.py snaps them to three tones and turns
// them into paths the app colours with the family's field and ink.

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i === -1 ? undefined : args.splice(i, 2)[1];
};
const ref = flag("--ref");
const base = flag("--base");
const tag = flag("--tag") ?? "";
const [id, frameArg] = args;
const frame = Number(frameArg ?? 0);

const spec = JSON.parse(readFileSync(join(here, "frames.json"), "utf8"))[id]?.frames[frame];
if (!spec) throw new Error(`No frame ${frame} for ${id} in frames.json`);

const styleRef = base
  ? "\nTHE OTHER FRAME\nThe second attached image is the other frame of this same exercise," +
    " already drawn in the house style. Make this picture as an edit of it: keep the figure's" +
    " size and proportions, the head, the camera, the floor line, and every piece of equipment" +
    " that stays still exactly where and how they are, pixel for pixel. Move only the parts of" +
    " the body, and what they hold, that move in this exercise, into the pose of the photo." +
    " The two pictures will flip back and forth, so anything that changes by accident will" +
    " jump.\n"
  : ref
    ? "\nSTYLE\nThe second attached image is the house style. Match its figure, proportions," +
      " white gaps, tones and scale exactly. It shows a different moment, so take nothing of its" +
      " pose from it.\n"
    : "";
const prompt =
  "Use your image generation tool to make the image described below. Do not write any code or" +
  " files; just generate the image once and reply 'done'.\n\n" +
  readFileSync(join(here, "STYLE.md"), "utf8")
    .replace("{moment}", spec.moment)
    .replace("{view}", spec.view)
    .replace("{style_ref}", styleRef);

const photo = join(here, "..", "assets", "photos", spec.photo);
const second = base ?? ref;
const images = ["--image", photo, ...(second ? ["--image", second] : [])];
const run = spawnSync(
  "codex",
  [
    "exec",
    "--json",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "-c",
    'model_reasoning_effort="low"',
    ...images,
    "--",
    prompt,
  ],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 15 * 60 * 1000 },
);

const thread = run.stdout
  ?.split("\n")
  .map((line) => {
    try {
      return JSON.parse(line);
    } catch {
      return undefined;
    }
  })
  .find((event) => event?.type === "thread.started")?.thread_id;
if (!thread) {
  console.error(run.stdout, run.stderr);
  throw new Error(`${id}-${frame}: Codex never started a thread`);
}

const made = join(homedir(), ".codex", "generated_images", thread);
let newest;
try {
  newest = readdirSync(made)
    .filter((f) => f.endsWith(".png"))
    .map((f) => join(made, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
} catch {}
if (!newest) {
  console.error(run.stdout.slice(-3000), run.stderr.slice(-3000));
  throw new Error(`${id}-${frame}: no image in ${made}`);
}

const out = join(here, "drawn", `${id}-${frame}${tag}.png`);
mkdirSync(dirname(out), { recursive: true });
copyFileSync(newest, out);
console.log(out);
