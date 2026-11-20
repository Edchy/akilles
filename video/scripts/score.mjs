// The music and the sounds under the voice, from ElevenLabs: public/sound/*.mp3.
//
//   npm run score               everything
//   npm run score -- music      just one (music, giggle, sofa, gym, tap, steps, evening)
//
// The chime for a set is the app's own (assets/sounds/hold-done.wav), copied over.

import { copyFileSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = new URL("../public/sound/", import.meta.url).pathname;
for (const file of ["../.env", "../../.local.env"]) {
  const path = new URL(file, import.meta.url).pathname;
  if (existsSync(path)) process.loadEnvFile(path);
}
const key = (process.env.ELEVENLABS_API_KEY ?? process.env.ELEVEN_API_KEY)?.trim() ?? "";
if (!key) throw new Error("No key: put ELEVENLABS_API_KEY=… in .local.env or video/.env");

const MUSIC =
  "Gentle, warm, playful instrumental for a short claymation film about the human body wanting to move." +
  " Felt piano, soft plucked nylon-string guitar, a little glockenspiel, light brushed percussion only later." +
  " Tender and a little whimsical at first, like childhood memories; quieter and more still in the middle;" +
  " then hopeful, lifting gently, and ending warm and resolved. Unhurried, about 80 bpm. No vocals.";

/** Sound effects: what, and how long. */
const SFX = {
  giggle: ["A small child's happy giggle, short, close and warm, no words.", 1.6],
  sofa: ["Someone slowly sinking into a soft cushioned armchair: a gentle squish and a soft creak.", 2],
  gym: ["Quiet gym ambience: distant weights clinking softly now and then, a faint air-conditioning hum, no voices, no music.", 10],
  tap: ["A single soft, short tap of a fingertip on a phone screen, subtle and clean.", 0.5],
  steps: ["Light relaxed footsteps outdoors on a path, an easy walking pace.", 6],
  evening: ["A calm evening outdoors: a few distant birds, a soft breeze, very quiet.", 7],
};

const post = (url, body) =>
  fetch(url, { method: "POST", headers: { "xi-api-key": key, "content-type": "application/json" }, body: JSON.stringify(body) });

async function make(name) {
  const res =
    name === "music"
      ? await post("https://api.elevenlabs.io/v1/music", { prompt: MUSIC, music_length_ms: 62000 })
      : await post("https://api.elevenlabs.io/v1/sound-generation", { text: SFX[name][0], duration_seconds: SFX[name][1], prompt_influence: 0.5 });
  if (!res.ok) throw new Error(`${name}: ${res.status} ${await res.text()}`);
  writeFileSync(join(OUT, `${name}.mp3`), Buffer.from(await res.arrayBuffer()));
  console.log(name);
}

mkdirSync(OUT, { recursive: true });
copyFileSync(new URL("../../assets/sounds/hold-done.wav", import.meta.url).pathname, join(OUT, "chime.wav"));
const only = process.argv[2];
// Three at a time: the plan allows four requests at once.
const queue = only ? [only] : ["music", ...Object.keys(SFX)];
await Promise.all([0, 1, 2].map(async () => {
  while (queue.length) await make(queue.shift());
}));
