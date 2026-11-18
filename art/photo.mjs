// Makes one realistic studio photo of a stretch with Codex's image generation.
//
//   node art/photo.mjs model                       # the reference: the one person, standing
//   node art/photo.mjs <stretch-id>                # a stretch, with art/photos/model.png as the person
//
// Every picture is the same person, clothes, light and plain white studio, so
// the set reads as one shoot. Saves art/photos/<id>.png.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const id = process.argv[2];
if (!id) throw new Error("Which stretch?");

const PERSON =
  "An ordinary, healthy adult of about 35 with a natural, fit-but-normal build (not a bodybuilder," +
  " not a model), short dark hair, a calm neutral face. Plain heather-grey short-sleeved t-shirt," +
  " fitted, and plain black knee-length athletic shorts, no logos; barefoot.";

const STUDIO =
  "A seamless pure white photo studio: white floor and white wall with no visible horizon line," +
  " soft even light from the front and above, one soft natural shadow under the body. No mat, no" +
  " props, no furniture, no text, no logos, no watermark. Photorealistic, sharp, natural skin," +
  " like a high-end catalogue photo. Landscape 3:2, the whole body in frame with some space" +
  " around it, the camera at the body's height.";

const MOMENT = {
  model:
    "Standing tall and relaxed, arms by the sides, seen exactly from the side, facing right. This is" +
    " the reference for a set of stretch photos, so the person, clothes and studio must be easy to" +
    " repeat.",
  downward_dog:
    "Holding the downward dog stretch, seen exactly from the side, head to the left. Hands flat on" +
    " the floor shoulder-width apart, arms straight in line with a straight back, hips pushed high" +
    " and back so the body makes an upside-down V, legs straight, heels sinking toward the floor," +
    " head relaxed between the arms.",
  pigeon:
    "Holding the pigeon stretch, upright version, seen from the front-left at about 45 degrees so" +
    " both legs read clearly. The front leg bent with its shin lying across the floor in front of the" +
    " hips; the back leg stretched straight back, knee and top of the foot on the floor; hips settled" +
    " toward the floor and square; trunk upright; hands resting on the floor either side of the front" +
    " leg.",
  thread_needle:
    "Holding thread the needle, seen from the side and a little in front. On hands and knees, knees" +
    " under the hips. One hand stays planted under its shoulder, arm straight. The other arm slides" +
    " under the body along the floor, palm up, reaching across, so that shoulder and the side of the" +
    " head rest on the floor and the upper back turns. Hips stay high, right over the knees.",
};
const moment = MOMENT[id];
if (!moment) throw new Error(`No description for ${id}`);

// --mascot: the drawn fellow from art/photos/mascot.png instead of a real person.
const mascot = process.argv.includes("--mascot");
// --clay: the same fellow, made of modelling clay and photographed.
const clay = process.argv.includes("--clay");
const model = join(here, "photos", mascot ? "mascot.png" : "model.png");
const useModel = !clay && id !== "model" && existsSync(model);
const CLAY =
  "Use your image generation tool to make the image described below. Do not write any code or" +
  " files; just generate the image once and reply 'done'.\n\n" +
  "Generate one picture for an exercise app's stretch guide.\n\n" +
  "THE CHARACTER\nA small, friendly figure sculpted from matte modelling clay, like a" +
  " stop-motion character: smooth, soft rounded forms, a big round head with two tiny black dot" +
  " eyes and a small smile, simple mitten-like hands and rounded feet, a slim but sturdy body with" +
  " real adult proportions so the pose is correct. Warm off-white clay for the body, faint" +
  " fingerprint texture and soft handmade imperfections; black clay boxer shorts. No hair, no" +
  " other clothes.\n\n" +
  `THE POSE\n${moment} The form must be correct: this picture teaches the stretch.\n\n` +
  "THE PICTURE\nPhotographed like a stop-motion set: soft studio light from the front and" +
  " above, a soft natural shadow under the figure, gentle shallow depth of field. The background" +
  " and floor are one seamless flat colour, exactly #FCFCFA, edge to edge, no horizon line, no" +
  " props, no text. Landscape 3:2, the whole figure in frame, centred, with clear space round" +
  " it.\n";
const prompt = clay ? CLAY : mascot
  ? "Use your image generation tool to make the image described below. Do not write any code or" +
    " files; just generate the image once and reply 'done'.\n\n" +
    "Generate one illustration for an exercise app's stretch guide.\n\n" +
    "THE CHARACTER\nThe attached sheet shows the character from four sides: a friendly minimal" +
    " figure drawn as a clean black outline of even weight, filled pure white, a round head with a" +
    " small dot-eyes-and-smile face, simple hands and feet, black boxer shorts, and nothing else." +
    " Draw exactly this character, same proportions, line weight and shorts, in a new pose.\n" +
    "Where parts overlap, the nearer part is drawn whole on top and hides what is behind it, like" +
    " solid paper cut-outs: no line ever runs through the face, the head or another limb.\n\n" +
    `THE POSE\n${moment} The form must be correct: this picture teaches the stretch.\n\n` +
    "THE PICTURE\nThe background is one flat colour, exactly #FCFCFA, edge to edge (no white" +
    " box, no paper texture, no vignette). Under the character only a soft pale grey shadow, as" +
    " in the sheet; no floor line, no mat, no props, no text. Flat 2D line art, no shading" +
    " besides the black shorts. Landscape 3:2, the whole character in frame, centred, with" +
    " clear space round it.\n"
  :
  "Use your image generation tool to make the image described below. Do not write any code or" +
  " files; just generate the image once and reply 'done'.\n\n" +
  "Generate one photograph for an exercise app's stretch guide.\n\n" +
  `THE PERSON\n${PERSON}\n` +
  (useModel
    ? "The attached photo is this person: the same face, hair, build, skin, clothes and studio" +
      " exactly. Only the pose changes.\n"
    : "") +
  `\nTHE POSE\n${moment} The form must be correct: this photo teaches the stretch.\n\n` +
  `THE STUDIO\n${STUDIO}\n`;

const run = spawnSync(
  "codex",
  [
    "exec", "--json", "--skip-git-repo-check", "--sandbox", "read-only",
    "-c", 'model_reasoning_effort="low"',
    ...(useModel ? ["--image", model] : []),
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
const newest = readdirSync(made)
  .filter((f) => f.endsWith(".png"))
  .map((f) => join(made, f))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
if (!newest) throw new Error(`${id}: no image in ${made}`);
const out = join(here, "photos", `${id}${mascot ? "-mascot" : clay ? "-clay" : ""}.png`);
mkdirSync(dirname(out), { recursive: true });
copyFileSync(newest, out);
console.log(out);
