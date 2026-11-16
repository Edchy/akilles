// The narration, one file per scene, and how long each takes.
//
//   npm run voice                      ElevenLabs, with the voice in HUMBELL_VOICE_ID (or George)
//   npm run voice -- --voice=<id>      another ElevenLabs voice
//   npm run voice -- --voices          list the voices on your account
//   npm run voice -- --scratch         the Mac's own voice, to time scenes with no key
//
// The key is read from ELEVENLABS_API_KEY, which video/.env can set
// (ELEVENLABS_API_KEY=…). That file is ignored by git, so the key never
// leaves this machine.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { SCENES } from "../src/script.ts";

const OUT = new URL("../public/voice/", import.meta.url).pathname;
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

const envFile = new URL("../.env", import.meta.url).pathname;
if (existsSync(envFile)) process.loadEnvFile(envFile);
const key = process.env.ELEVENLABS_API_KEY?.trim() ?? "";
const API = "https://api.elevenlabs.io/v1";

if (args.voices) {
  if (!key) throw new Error("No key: put ELEVENLABS_API_KEY=… in video/.env");
  const res = await fetch(`${API}/voices`, { headers: { "xi-api-key": key } });
  const { voices } = await res.json();
  for (const v of voices) console.log(`${v.voice_id}  ${v.name}  ${Object.values(v.labels ?? {}).join(", ")}`);
  process.exit(0);
}

const scratch = args.scratch || !key;
if (!args.scratch && !key) console.warn("No ElevenLabs key in video/.env, so this is the Mac's scratch voice.");

// George: warm, calm, unhurried. Change with --voice= or HUMBELL_VOICE_ID.
const voice = args.voice ?? process.env.HUMBELL_VOICE_ID ?? "JBFqnCBsd6RMkjVDRZzb";
const model = args.model ?? "eleven_multilingual_v2";

mkdirSync(OUT, { recursive: true });
const seconds = (file) => Number(/estimated duration: ([\d.]+)/.exec(execFileSync("afinfo", [file], { encoding: "utf8" }))[1]);
const durations = {};

for (const [i, scene] of SCENES.entries()) {
  for (const ext of ["mp3", "wav"]) rmSync(join(OUT, `${scene.id}.${ext}`), { force: true });
  let file;
  if (scratch) {
    file = `${scene.id}.wav`;
    execFileSync("say", ["-v", "Daniel", "-r", "165", "--file-format=WAVE", "--data-format=LEI16@44100", "-o", join(OUT, file), scene.line]);
  } else {
    file = `${scene.id}.mp3`;
    const res = await fetch(`${API}/text-to-speech/${voice}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": key, "content-type": "application/json" },
      body: JSON.stringify({
        text: scene.line,
        model_id: model,
        // The lines either side, so each reads as part of one talk.
        previous_text: SCENES[i - 1]?.line,
        next_text: SCENES[i + 1]?.line,
        voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.1, use_speaker_boost: true, speed: 0.95 },
      }),
    });
    if (!res.ok) throw new Error(`${scene.id}: ${res.status} ${await res.text()}`);
    writeFileSync(join(OUT, file), Buffer.from(await res.arrayBuffer()));
  }
  durations[scene.id] = { file, seconds: seconds(join(OUT, file)) };
  console.log(`${scene.id}  ${durations[scene.id].seconds.toFixed(2)} s`);
}

writeFileSync(
  join(OUT, "durations.json"),
  JSON.stringify({ voice: scratch ? "scratch (macOS Daniel)" : `elevenlabs ${voice} ${model}`, scenes: durations }, null, 2) + "\n",
);
