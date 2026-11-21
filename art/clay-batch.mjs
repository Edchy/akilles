// Many clay pictures in one go, unattended:
//
//   node art/clay-batch.mjs stretches          # any stretch picture that is missing
//   node art/clay-batch.mjs breaths            # every stretch's breathing faces
//   node art/clay-batch.mjs lifts [id ...]     # lifts.json (or just these): start, then finish
//   node art/clay-batch.mjs lifts --min 4      # only the common ones: rated 4 or 5
//
// Lifts go most common first, by their "common" rating in lifts.json: 5 is
// a staple of every gym (and everything in the starting plan), 1 is niche.
//
// Three at a time. Skips any picture already made, so it can be stopped and
// run again. A picture that fails is tried again (Codex's safety filter
// sometimes blocks one, then passes it); when Codex is out of usage, waits
// until the time it gives and carries on.

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, "clay");
const [what, ...rest] = process.argv.slice(2);
const minAt = rest.indexOf("--min");
const min = minAt >= 0 ? Number(rest[minAt + 1]) : 1;
const only = minAt >= 0 ? rest.filter((_, i) => i !== minAt && i !== minAt + 1) : rest;
const read = (f) => JSON.parse(readFileSync(join(dir, f), "utf8"));

/** Each job: the arguments to clay.mjs, the file it makes, and what it waits for. */
let jobs = [];
if (what === "breaths") {
  const face = (b) => (b === "inhale" ? "in" : "out");
  for (const [id, s] of Object.entries(read("stretches.json"))) {
    if (only.length && !only.includes(id)) continue;
    // A face that can't be seen (lying face down) has no breathing faces.
    if (s.faces === false) continue;
    // Faces are edits of the pictures: wait until those are made.
    const base = (n) => ({ after: `${id}-${n}.png` });
    if (s.single !== undefined) {
      for (const b of ["in", "out"]) jobs.push({ args: [id, String(s.single), b], out: `${id}-${s.single}-${b}.png`, ...base(s.single) });
    } else if (s.breath !== "steady") {
      jobs.push({ args: [id, "0", face(s.breath.to0)], out: `${id}-0-${face(s.breath.to0)}.png`, ...base(0) });
      jobs.push({ args: [id, "1", face(s.breath.to1)], out: `${id}-1-${face(s.breath.to1)}.png`, ...base(1) });
    }
  }
} else if (what === "stretches") {
  // Stretch pictures that are missing (set aside for a redraw): the start, then the
  // other moment as an edit of it. Their breathing faces follow with "breaths".
  for (const [id, s] of Object.entries(read("stretches.json"))) {
    if (only.length && !only.includes(id)) continue;
    jobs.push({ args: [id, "0"], out: `${id}-0.png` });
    // A hold shown in one picture needs only up to that one (its frame 1 is drawn from frame 0).
    const last = s.single !== undefined ? s.single : s.frames.length - 1;
    if (last >= 1) jobs.push({ args: [id, "1"], out: `${id}-1.png`, after: `${id}-0.png` });
  }
} else if (what === "lifts") {
  const lifts = read("lifts.json");
  const order = Object.keys(lifts).sort((a, b) => (lifts[b].common ?? 3) - (lifts[a].common ?? 3));
  for (const id of order) {
    if (only.length && !only.includes(id)) continue;
    if ((lifts[id].common ?? 3) < min) continue;
    // Drawn with its own person from the cast, if it has one (lifts.json "cast").
    const who = lifts[id].cast;
    const cast = who ? ["--cast", who] : [];
    const name = (n) => (who ? `${id}@${who}-${n}.png` : `${id}-${n}.png`);
    jobs.push({ args: [id, "0", ...cast], out: name(0) });
    // The finish is an edit of the start, so it waits for it. A hold has none.
    if (lifts[id].single === undefined) jobs.push({ args: [id, "1", ...cast], out: name(1), after: name(0) });
  }
} else {
  throw new Error("stretches, breaths or lifts?");
}
jobs = jobs.filter((j) => !existsSync(join(dir, j.out)));
// A job waiting on a picture that neither exists nor is made in this run would wait forever.
jobs = jobs.filter((j) => {
  if (!j.after || existsSync(join(dir, j.after)) || jobs.some((k) => k.out === j.after)) return true;
  console.log(`skipping ${j.out}: needs ${j.after} first`);
  return false;
});
console.log(`${jobs.length} to make`);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Until when Codex said to come back, from "try again at 1:52 PM". */
function resumeAt(text) {
  const m = text.match(/try again at (\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!m) return Date.now() + 30 * 60 * 1000;
  let h = Number(m[1]) % 12;
  if (m[3].toUpperCase() === "PM") h += 12;
  const at = new Date();
  at.setHours(h, Number(m[2]) + 2, 0, 0);
  if (at.getTime() < Date.now()) at.setDate(at.getDate() + 1);
  return at.getTime();
}

let pausedUntil = 0;

function run(args) {
  return new Promise((resolve) => {
    const child = spawn("node", [join(here, "clay.mjs"), ...args]);
    let text = "";
    child.stdout.on("data", (d) => (text += d));
    child.stderr.on("data", (d) => (text += d));
    child.on("close", (code) => resolve({ code, text }));
  });
}

async function worker() {
  for (;;) {
    const i = jobs.findIndex((j) => !j.taken && (!j.after || existsSync(join(dir, j.after))));
    if (i < 0) {
      // Something may still be waiting on a start being made by another worker.
      if (jobs.some((j) => !j.taken)) {
        if (jobs.every((j) => j.taken || (j.after && jobs.find((k) => k.out === j.after)?.failed))) return;
        await sleep(5000);
        continue;
      }
      return;
    }
    const job = jobs[i];
    job.taken = true;
    for (let attempt = 1; ; attempt++) {
      while (Date.now() < pausedUntil) await sleep(30000);
      const { code, text } = await run(job.args);
      if (code === 0) {
        console.log(`made ${job.out}`);
        break;
      }
      if (/usage limit/i.test(text)) {
        pausedUntil = Math.max(pausedUntil, resumeAt(text));
        console.log(`out of usage: waiting until ${new Date(pausedUntil).toLocaleTimeString()}`);
        attempt--;
        continue;
      }
      if (attempt >= 3) {
        job.failed = true;
        console.log(`FAILED ${job.out}: ${(text.match(/"text":"([^"]{0,160})/) ?? [])[1] ?? text.slice(-160)}`);
        break;
      }
    }
  }
}

await Promise.all([worker(), worker(), worker()]);
console.log("all done");
