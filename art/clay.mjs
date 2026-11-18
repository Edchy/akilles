// The clay fellow: Codex image generation, one picture at a time.
//
//   node art/clay.mjs sheet                 # the character sheet: art/clay/sheet.png
//   node art/clay.mjs <stretch-id> [0|1]    # a stretch's two moments, from art/clay/stretches.json
//   node art/clay.mjs <scene-id>            # an intro picture, from art/clay/scenes.json
//
// Every picture has the sheet attached, so it is always the same figure. A
// stretch's second moment also has its first attached, so the camera, the
// scale and everything that doesn't move stay put: the two flip in the app.
// Background exactly the app's page colour (#FCFCFA). Saves art/clay/<id>-<n>.png.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "clay");
const [id, frameArg] = process.argv.slice(2);
if (!id) throw new Error("sheet, or which stretch?");

const FIGURE =
  "A small, friendly figure sculpted from matte modelling clay, like a stop-motion character:" +
  " smooth, soft rounded forms, a big round head with two tiny black dot eyes and a small smile," +
  " simple mitten-like hands and rounded feet, a slim but sturdy body with real adult proportions" +
  " so every pose is anatomically correct. Light warm beige clay for the body, a faint fingerprint" +
  " texture and soft handmade imperfections; black clay boxer shorts. No hair, no other clothes.";

const PICTURE =
  "Photographed like a stop-motion set: soft studio light from the front and above, a soft natural" +
  " shadow under the figure, gentle shallow depth of field. The background and floor are one" +
  " seamless flat colour, exactly #FCFCFA, edge to edge, no horizon line, no props unless named, no" +
  " text, no arrows, no labels. Landscape 3:2, the whole figure in frame, centred, with clear space" +
  " round it.";

const ask = (body) =>
  "Use your image generation tool to make the image described below. Do not write any code or" +
  " files; just generate the image once and reply 'done'.\n\n" + body;

let prompt;
let images = [];
let out;
const sheet = join(dir, "sheet.png");

if (id === "sheet") {
  const first = join(here, "photos", "downward_dog-clay.png");
  prompt = ask(
    "Generate a character turnaround sheet for an exercise app.\n\n" +
      `THE CHARACTER\n${FIGURE}\nThe attached photo is this exact character, already made: copy` +
      " its clay, colours, face, head size, proportions and shorts exactly.\n\n" +
      "THE SHEET\nThe same figure four times in a row, standing relaxed and tall, arms hanging by the" +
      " sides: from the front, from the side facing right, from the back, and at three-quarters." +
      " Same size, same height, evenly spaced, feet on one level.\n\n" +
      `THE PICTURE\n${PICTURE.replace("the whole figure in frame, centred", "all four figures in frame")}`,
  );
  images = [first];
  out = sheet;
} else {
  if (!existsSync(sheet)) throw new Error("Make the sheet first: node art/clay.mjs sheet");
  // A stretch, or a scene for the intro (art/clay/scenes.json): the same figure either way.
  const read = (file) => JSON.parse(readFileSync(join(dir, file), "utf8"))[id];
  const scene = existsSync(join(dir, "scenes.json")) ? read("scenes.json") : undefined;
  const spec = read("stretches.json") ?? scene;
  if (!spec) throw new Error(`No ${id} in art/clay/stretches.json or scenes.json`);
  const n = Number(frameArg ?? 0);
  const moment = spec.frames[n];
  const first = join(dir, `${id}-0.png`);
  const edit = n > 0 && existsSync(first);
  prompt = ask(
    "Generate one picture for an exercise app's stretch guide.\n\n" +
      `THE CHARACTER\n${FIGURE}\nThe first attached image is this character's sheet: draw exactly` +
      " this figure, its clay, colours, face, proportions and shorts.\n" +
      (edit
        ? "The second attached image is the other moment of this same movement, already made. Make" +
          " this picture as an edit of it: the same camera, framing, scale, light and figure; move" +
          " only the parts of the body that move between the two moments, into the pose below. The" +
          " two pictures will flip back and forth, so anything that changes by accident will jump.\n"
        : "") +
      `\n${scene ? "THE SCENE" : "THE MOVEMENT"}\n${spec.what}\n\nTHIS MOMENT\n${moment}` +
      (scene ? "" : " The form must be correct: this picture teaches the movement.") +
      "\n\n" +
      `THE VIEW\n${spec.view}\n\n` +
      `THE PICTURE\n${PICTURE}${spec.props && spec.props !== "none" ? ` The only props: ${spec.props}.` : ""}`,
  );
  images = [sheet, ...(edit ? [first] : [])];
  out = join(dir, `${id}-${n}.png`);
}

const run = spawnSync(
  "codex",
  [
    "exec", "--json", "--skip-git-repo-check", "--sandbox", "read-only",
    "-c", 'model_reasoning_effort="low"',
    ...images.flatMap((i) => ["--image", i]),
    "--", prompt,
  ],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024, timeout: 15 * 60 * 1000 },
);
const thread = run.stdout
  ?.split("\n")
  .map((l) => { try { return JSON.parse(l); } catch { return undefined; } })
  .find((e) => e?.type === "thread.started")?.thread_id;
if (!thread) {
  console.error(run.stdout, run.stderr);
  throw new Error(`${id}: Codex never started a thread`);
}
const made = join(homedir(), ".codex", "generated_images", thread);
const newest = (existsSync(made) ? readdirSync(made) : [])
  .filter((f) => f.endsWith(".png"))
  .map((f) => join(made, f))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
if (!newest) {
  console.error(run.stdout.slice(-2000));
  throw new Error(`${id}: no image made`);
}
mkdirSync(dirname(out), { recursive: true });
copyFileSync(newest, out);
console.log(out);
