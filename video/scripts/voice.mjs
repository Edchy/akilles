// The narration, one file per scene, and how long each takes.
//
//   npm run voice                      ElevenLabs, with the voice in KLAY_VOICE_ID (or George)
//   npm run voice -- --voice=<id>      another ElevenLabs voice
//   npm run voice -- --voices          list the voices on your account
//   npm run voice -- --scratch         the Mac's own voice, to time scenes with no key
//   npm run voice -- --only=end        just these scenes (comma-separated); the rest stay
//   npm run voice -- --logo            the logo film's one line: public/voice/logo.mp3
//
// The key is read from ELEVENLABS_API_KEY or ELEVEN_API_KEY, set in .local.env
// at the top of the project or in video/.env. Both are ignored by git, so the
// key never leaves this machine.

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { LOGO_LINE } from "../src/logo-film.ts";
import { SCENES as ALL } from "../src/script.ts";

const OUT = new URL("../public/voice/", import.meta.url).pathname;
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);

// video/.env, or .local.env at the top of the project (where the key lives now).
for (const file of ["../.env", "../../.local.env"]) {
  const path = new URL(file, import.meta.url).pathname;
  if (existsSync(path)) process.loadEnvFile(path);
}
const key = (process.env.ELEVENLABS_API_KEY ?? process.env.ELEVEN_API_KEY)?.trim() ?? "";
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

// The user's pick (2026-11-19). Change with --voice= or KLAY_VOICE_ID. (Was George, JBFqnCBsd6RMkjVDRZzb.)
const voice = args.voice ?? process.env.KLAY_VOICE_ID ?? "jv41DhCf464zw0TI7I1w";
const model = args.model ?? "eleven_v4";

mkdirSync(OUT, { recursive: true });
const seconds = (file) => Number(/estimated duration: ([\d.]+)/.exec(execFileSync("afinfo", [file], { encoding: "utf8" }))[1]);
// The logo film is one scene of its own, with no lines either side.
const SCENES = args.logo
  ? [{ id: "logo", line: LOGO_LINE }]
  : args.only
    ? ALL.filter((s) => String(args.only).split(",").includes(s.id))
    : ALL;
const listed = join(OUT, "durations.json");
// Only some scenes: the others keep the lengths they have.
const durations = !args.logo && args.only && existsSync(listed) ? JSON.parse(readFileSync(listed, "utf8")).scenes : {};

for (const scene of SCENES) {
  const i = ALL.findIndex((s) => s.id === scene.id);
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
        previous_text: ALL[i - 1]?.line,
        next_text: ALL[i + 1]?.line,
        voice_settings: { stability: 0.55, similarity_boost: 0.8, style: 0.1, use_speaker_boost: true, speed: 0.95 },
      }),
    });
    if (!res.ok) throw new Error(`${scene.id}: ${res.status} ${await res.text()}`);
    writeFileSync(join(OUT, file), Buffer.from(await res.arrayBuffer()));
  }
  durations[scene.id] = { file, seconds: seconds(join(OUT, file)) };
  console.log(`${scene.id}  ${durations[scene.id].seconds.toFixed(2)} s`);
}

if (args.logo) {
  writeFileSync(join(OUT, "logo.json"), JSON.stringify(durations.logo, null, 2) + "\n");
  process.exit(0);
}
writeFileSync(
  listed,
  JSON.stringify({ voice: scratch ? "scratch (macOS Daniel)" : `elevenlabs ${voice} ${model}`, scenes: durations }, null, 2) + "\n",
);
