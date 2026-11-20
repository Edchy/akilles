// The narration, in one take: public/voice/film.mp3, and public/voice/film.json
// with when every line and every word starts and ends.
//
//   npm run voice                      ElevenLabs, the voice in KLAY_VOICE_ID (or the user's pick)
//   npm run voice -- --voice=<id>      another ElevenLabs voice
//   npm run voice -- --model=<id>      another model (eleven_v4 by default)
//
// One take, so the lines run into each other as one talk; the timings come back
// with it (ElevenLabs' with-timestamps), and the film is cut to them.
//
// The key is read from ELEVENLABS_API_KEY or ELEVEN_API_KEY, set in .local.env
// at the top of the project or in video/.env. Both are ignored by git, so the
// key never leaves this machine. (The key can't list voices or models.)

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SCENES } from "../src/script.ts";

const OUT = new URL("../public/voice/", import.meta.url).pathname;
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

for (const file of ["../.env", "../../.local.env"]) {
  const path = new URL(file, import.meta.url).pathname;
  if (existsSync(path)) process.loadEnvFile(path);
}
const key = (process.env.ELEVENLABS_API_KEY ?? process.env.ELEVEN_API_KEY)?.trim() ?? "";
if (!key) throw new Error("No key: put ELEVENLABS_API_KEY=… in .local.env or video/.env");

// The user's pick (2026-11-19). Was George, JBFqnCBsd6RMkjVDRZzb.
const voice = args.voice ?? process.env.KLAY_VOICE_ID ?? "jv41DhCf464zw0TI7I1w";
const model = args.model ?? "eleven_v4";

// A blank line between lines: a breath.
const SEP = "\n\n";
const text = SCENES.map((s) => s.line).join(SEP);

const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voice}/with-timestamps?output_format=mp3_44100_128`, {
  method: "POST",
  headers: { "xi-api-key": key, "content-type": "application/json" },
  body: JSON.stringify({ text, model_id: model }),
});
if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
const { audio_base64, alignment } = await res.json();
const { characters, character_start_times_seconds: starts, character_end_times_seconds: ends } = alignment;
if (characters.join("") !== text) console.warn("The timings' text differs from the script's; lines are matched by position.");

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "film.mp3"), Buffer.from(audio_base64, "base64"));

// Each line's characters, then its words.
const lines = {};
let i = 0;
for (const scene of SCENES) {
  const from = i;
  const to = i + scene.line.length; // exclusive
  const words = [];
  for (const m of scene.line.matchAll(/[A-Za-z']+/g)) {
    const a = from + m.index;
    const b = a + m[0].length - 1;
    words.push({ word: m[0], start: starts[a], end: ends[b] });
  }
  lines[scene.id] = { start: starts[from], end: ends[to - 1], words };
  i = to + SEP.length;
  console.log(`${scene.id.padEnd(10)} ${starts[from].toFixed(2)}–${ends[to - 1].toFixed(2)} s`);
}

writeFileSync(
  join(OUT, "film.json"),
  JSON.stringify({ voice: `elevenlabs ${voice} ${model}`, seconds: ends.at(-1), lines }, null, 1) + "\n",
);
console.log(`${ends.at(-1).toFixed(1)} s in all`);
