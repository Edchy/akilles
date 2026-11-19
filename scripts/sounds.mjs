// The routine's three sounds, made from scratch: node scripts/sounds.mjs
//
// Calm on purpose: low notes like a small singing bowl, a soft start with no
// click, a long fade, and quiet. They should feel like a nudge, never make you
// jump (the first ones, bright beeps, did: 18 November 2026).
//
//   hold-start.wav     one note: hold now
//   hold-done.wav      two notes rising: the hold is over
//   routine-done.wav   three notes, slowly: the routine is done
//   rest-done.wav      two notes, a fifth up and a little brighter: rest is over, next set
//
// Writes assets/sounds/*.wav (mono, 44.1 kHz, 16-bit).

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const RATE = 44100;
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "assets", "sounds");

/** How loud the loudest moment is, 0–1: about −15 dB, gentle next to music. */
const PEAK = 0.18;

const A3 = 220;
const CS4 = 277.18;
const D4 = 293.66;
const E4 = 329.63;
const A4 = 440;

/**
 * One struck note of a small bowl: the note itself, a soft octave, and a
 * faint bowl-like overtone, each fading at its own pace (higher ones sooner),
 * with a slow beat between two near-equal tones so it shimmers a little.
 */
function bowl(buffer, at, freq, length) {
  const start = Math.round(at * RATE);
  const partials = [
    { ratio: 1, gain: 1, decay: length * 0.55 },
    { ratio: 1.003, gain: 0.35, decay: length * 0.5 },
    { ratio: 2, gain: 0.18, decay: length * 0.25 },
    { ratio: 2.76, gain: 0.06, decay: length * 0.15 },
  ];
  const attack = 0.035;
  for (let i = 0; start + i < buffer.length; i++) {
    const t = i / RATE;
    if (t > length) break;
    // A soft rise instead of a click, and a fade to true silence at the end.
    const rise = t < attack ? Math.sin((t / attack) * (Math.PI / 2)) ** 2 : 1;
    const tail = t > length - 0.2 ? (length - t) / 0.2 : 1;
    let v = 0;
    for (const p of partials) v += p.gain * Math.exp(-t / p.decay) * Math.sin(2 * Math.PI * freq * p.ratio * t);
    buffer[start + i] += v * rise * tail;
  }
}

function write(name, seconds, notes) {
  const buffer = new Float64Array(Math.round(seconds * RATE));
  for (const n of notes) bowl(buffer, n.at, n.freq, Math.min(n.length, seconds - n.at));
  const max = buffer.reduce((m, v) => Math.max(m, Math.abs(v)), 0) || 1;
  const data = Buffer.alloc(44 + buffer.length * 2);
  data.write("RIFF", 0);
  data.writeUInt32LE(36 + buffer.length * 2, 4);
  data.write("WAVEfmt ", 8);
  data.writeUInt32LE(16, 16);
  data.writeUInt16LE(1, 20);
  data.writeUInt16LE(1, 22);
  data.writeUInt32LE(RATE, 24);
  data.writeUInt32LE(RATE * 2, 28);
  data.writeUInt16LE(2, 32);
  data.writeUInt16LE(16, 34);
  data.write("data", 36);
  data.writeUInt32LE(buffer.length * 2, 40);
  buffer.forEach((v, i) => data.writeInt16LE(Math.round((v / max) * PEAK * 32767), 44 + i * 2));
  writeFileSync(join(out, name), data);
  console.log(name, `${seconds} s`);
}

write("hold-start.wav", 1.8, [{ at: 0, freq: A3, length: 1.8 }]);
write("hold-done.wav", 2.2, [
  { at: 0, freq: A3, length: 2.2 },
  { at: 0.45, freq: D4, length: 1.75 },
]);
write("routine-done.wav", 3.2, [
  { at: 0, freq: A3, length: 3.2 },
  { at: 0.55, freq: CS4, length: 2.65 },
  { at: 1.1, freq: E4, length: 2.1 },
]);
// Higher than the hold sounds, so "next set" is never mistaken for "hold over".
write("rest-done.wav", 2.2, [
  { at: 0, freq: E4, length: 2.2 },
  { at: 0.3, freq: A4, length: 1.9 },
]);
