// Klay's logo: a capital K in matte black modelling clay, made by Codex.
//
//   node art/logo.mjs k       # the logo:                     art/logo/k-black.png
//   node art/logo.mjs white   # the logo reversed:            art/logo/k-white.png
//                             # (an edit of k-black.png: the same K in white clay on a black set)
//   node art/logo.mjs ball    # the logo film's first frame:  art/logo/ball-black.png
//                             # (an edit of k-black.png: the same set, the K still a ball of clay)
//
// The two share camera, light and set, so a video model (ElevenLabs) can shape
// the ball into the K: ball-black.png first frame, k-black.png last.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const dir = join(dirname(fileURLToPath(import.meta.url)), "logo");
const which = process.argv[2];

const CLAY =
  "matte black modelling clay (plasticine), like a stop-motion set piece: deep soft black, not" +
  " glossy, with a faint fingerprint texture, tiny tool marks and soft handmade imperfections that" +
  " catch the light; smooth, plump, rounded forms.";

const SET =
  "Photographed like a stop-motion set: soft studio light from the front and above, gentle" +
  " highlights along the rounded edges so the black reads as a 3D form, a soft natural contact" +
  " shadow under it. Camera straight on at eye level, a little above the table. The background" +
  " and the surface it stands on are one seamless flat colour, exactly #FCFCFA (warm paper white)," +
  " edge to edge, no horizon line. Square 1:1, centred, with generous clear space all round. No" +
  " text, no other letters, no props, no hands, no tools.";

const ask = (body) =>
  "Use your image generation tool to make the image described below. Do not write any code or" +
  " files; just generate the image once and reply 'done'.\n\n" + body;

let prompt;
let images = [];
let out;

if (which === "k") {
  prompt = ask(
    "The logo of a fitness app called Klay: a single capital letter K, sculpted by hand from " + CLAY +
      "\n\nTHE LETTER\nA bold, chunky, friendly K standing upright, made of thick rounded clay" +
      " rolls: one straight vertical stroke, and two diagonal arms that meet it in a soft join, all" +
      " ends rounded like the ends of a rolled clay sausage. Clean and well balanced, so it works as" +
      " a logo at small sizes: an even stroke weight, no thin parts, no decoration. It looks" +
      " sculpted from one lump, with soft creases where the arms join the stem.\n\n" + SET,
  );
  out = join(dir, "k-black.png");
} else if (which === "white") {
  const k = join(dir, "k-black.png");
  if (!existsSync(k)) throw new Error("Make the K first: node art/logo.mjs k");
  prompt = ask(
    "The attached image is the logo of a fitness app: a K sculpted from black clay on a warm white" +
      " set. Make the reversed version of the logo as an edit of the attached image.\n\n" +
      "Keep exactly the same K: the same shape, size, position, camera, framing and light, the same" +
      " fingerprint texture and soft handmade imperfections. Change only the colours: the K is now" +
      " matte white modelling clay (plasticine), a soft chalky white, not glossy, with gentle grey" +
      " shading in the creases and under the rounded edges so it reads as a 3D form. The background" +
      " and the surface it stands on are one seamless flat colour, exactly #0B0B0B (deep black)," +
      " edge to edge, no horizon line, with a soft natural contact shadow under the K. No text, no" +
      " other letters, no props, no hands, no tools.",
  );
  images = [k];
  out = join(dir, "k-white.png");
} else if (which === "ball") {
  const k = join(dir, "k-black.png");
  if (!existsSync(k)) throw new Error("Make the K first: node art/logo.mjs k");
  prompt = ask(
    "The attached image is the logo of a fitness app: a K sculpted from black clay. Make the first" +
      " frame of a short stop-motion film in which a ball of clay is shaped into that K.\n\n" +
      "Make this picture as an edit of the attached one: exactly the same camera, framing, light," +
      " background, surface and colours. Replace the K with one round ball of the same black clay," +
      " about the same amount of clay as the K, resting in the centre where the K stands, slightly" +
      " flattened where it touches the surface, with a soft contact shadow. Freshly rolled by hand:" +
      " faint fingerprints and a few soft dents, not a perfect sphere.\n\nThe clay: " + CLAY +
      " No text, no letters, no hands, no tools.",
  );
  images = [k];
  out = join(dir, "ball-black.png");
} else {
  throw new Error("k, white or ball?");
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
  throw new Error(`${which}: Codex never started a thread`);
}
const made = join(homedir(), ".codex", "generated_images", thread);
const newest = (existsSync(made) ? readdirSync(made) : [])
  .filter((f) => f.endsWith(".png"))
  .map((f) => join(made, f))
  .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs)[0];
if (!newest) {
  console.error(run.stdout.slice(-2000));
  throw new Error(`${which}: no image made`);
}
mkdirSync(dirname(out), { recursive: true });
copyFileSync(newest, out);
console.log(out);
