// Klay's logo: the letter K moulded in clay, and the stages of shaping it.
// Codex image generation, like art/clay.mjs; --eleven uses ElevenLabs (needs Pro).
//
//   node art/logo.mjs k        # the finished K: art/logo/k.png
//   node art/logo.mjs 0..3     # the stages before it, as edits of k.png:
//                              # art/logo/stage-0.png (a lump) … stage-3.png (nearly there)
//
// All on plain white, so art/cutout.py can lift the K off for the logo. The
// clay is the figure's, from the sheet, so the K and the fellow are one world.

import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "logo");
const sheet = join(here, "clay", "sheet.png");
const which = process.argv[2];
if (!which) throw new Error("k, or a stage 0 to 3");

const CLAY =
  "Matte modelling clay, exactly the warm light beige clay of the character in the first attached" +
  " image: smooth soft rounded forms, a faint fingerprint texture and small handmade imperfections," +
  " like a stop-motion set piece.";

const PICTURE =
  "Photographed straight on from the front, square 1:1, soft even studio light from the front and" +
  " above. The background is one seamless flat pure white, exactly #FFFFFF, edge to edge: no floor," +
  " no horizon, no shadow under or behind it, no props, no hands, no tools, no text other than the" +
  " letter itself. Centred, with clear white space all round.";

const K =
  "A capital letter K, hand-moulded from clay: chunky, upright, friendly and rounded, its strokes" +
  " thick like rolled clay, the ends soft and blunt, the two arms joining the upright stroke in a" +
  " soft pinched join. Standing flat facing the camera like a cut-out letter with some depth.";

const STAGES = [
  "Before any shaping: the same amount of clay as one smooth, slightly squashed round lump, sitting where the K will be.",
  "The lump pressed and pulled upward into a rough tall chunk, as tall as the K will be: the first hint of the upright stroke, no arms yet.",
  "The upright stroke is clearly formed; the two arms of the K are just starting to be pulled out of its side as rough stubby bulges.",
  "Almost the finished K: both arms pulled out to nearly their full length, but the edges still rough and lumpy, with fresh thumb marks, not yet smoothed.",
];

const ask = (body) =>
  "Use your image generation tool to make the image described below. Do not write any code or" +
  " files; just generate the image once and reply 'done'.\n\n" + body;

let prompt;
let images = [sheet];
let out;
if (which === "k") {
  prompt = ask(`Generate a logo picture for an app called Klay.\n\nTHE CLAY\n${CLAY}\n\nTHE LETTER\n${K}\n\nTHE PICTURE\n${PICTURE}`);
  out = join(dir, "k.png");
} else {
  const n = Number(which);
  const done = join(dir, "k.png");
  if (!STAGES[n]) throw new Error("a stage 0 to 3");
  if (!existsSync(done)) throw new Error("Make the K first: node art/logo.mjs k");
  prompt = ask(
    "Generate one frame of a stop-motion film where a clay letter K is shaped.\n\n" +
      `THE CLAY\n${CLAY}\nThe second attached image is the finished K, already made. Make this picture` +
      " as an edit of it: the same camera, framing, scale, light, background and clay colour, the clay" +
      " in the same place, so the frames can play one after another without the camera jumping.\n\n" +
      `THIS FRAME\n${STAGES[n]}\n\nTHE PICTURE\n${PICTURE}`,
  );
  images = [sheet, done];
  out = join(dir, `stage-${n}.png`);
}

// ElevenLabs Image & Video (the same key as the voice), GPT Image 2, square.
async function viaEleven() {
  for (const p of ["video/.env", ".local.env"]) {
    const path = join(here, "..", p);
    if (existsSync(path)) process.loadEnvFile(path);
  }
  const key = (process.env.ELEVENLABS_API_KEY ?? process.env.ELEVEN_API_KEY)?.trim();
  if (!key) throw new Error("No ElevenLabs key in .local.env");
  const API = "https://api.elevenlabs.io/v1/flows/image";
  const headers = { "xi-api-key": key, "content-type": "application/json" };
  const body = {
    model_id: "gpt-image-2",
    prompt: prompt.replace(/^Use your image generation tool[^\n]*\n\n/, ""),
    aspect_ratio: "1:1",
    resolution: "2K",
    quality: "high",
    images: images.map((i) => ({
      type: "inline_base64",
      mime_type: "image/png",
      content_base64: readFileSync(i).toString("base64"),
    })),
  };
  const made = await fetch(API, { method: "POST", headers, body: JSON.stringify(body) });
  const job = await made.json();
  if (!made.ok) throw new Error(`${which}: ${made.status} ${JSON.stringify(job).slice(0, 400)}`);
  let result = job;
  while (result.status === "pending" || result.status === "generating") {
    await new Promise((r) => setTimeout(r, 3000));
    result = await (await fetch(`${API}/${job.id}`, { headers })).json();
  }
  if (result.status !== "completed") throw new Error(`${which}: ${JSON.stringify(result).slice(0, 400)}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(out, Buffer.from(await (await fetch(result.content_url)).arrayBuffer()));
}

function viaCodex() {
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
  mkdirSync(dir, { recursive: true });
  copyFileSync(newest, out);
}

if (!process.argv.includes("--eleven")) viaCodex();
else await viaEleven();
console.log(out);
