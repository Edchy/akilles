// The clay fellow: Codex image generation, one picture at a time.
//
//   node art/clay.mjs sheet                 # the character sheet: art/clay/sheet.png
//   node art/clay.mjs gear [2]              # an equipment sheet: art/clay/gear.png, gear-2.png
//   node art/clay.mjs <lift-id> [0|1]       # a lift's start and finish, from art/clay/lifts.json
//   node art/clay.mjs <stretch-id> [0|1]    # a stretch's two moments, from art/clay/stretches.json
//   node art/clay.mjs <scene-id>            # an intro picture, from art/clay/scenes.json
//   node art/clay.mjs <id> <n> in|out       # picture n again, only the face breathing in or out:
//                                           # art/clay/<id>-<n>-in.png (or -out)
//
// Every picture has the sheet attached, so it is always the same figure; a
// lift has the equipment sheet too, so a dumbbell is always the same dumbbell. A
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
// `--cast <who>` draws a lift with one of the cast (art/clay/cast.json) instead of the first figure.
const argv = process.argv.slice(2);
const castAt = argv.indexOf("--cast");
const castId = castAt >= 0 ? argv[castAt + 1] : undefined;
const [id, frameArg, breathArg] = argv.filter((_, i) => castAt < 0 || (i !== castAt && i !== castAt + 1));
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
/**
 * The cast: people of every age, build and skin tone, in the first figure's
 * clay style — the big round head, the dot eyes, the mitten hands — each with
 * hair, clothes and small things of their own (art/clay/cast.json).
 */
const CAST = existsSync(join(dir, "cast.json")) ? JSON.parse(readFileSync(join(dir, "cast.json"), "utf8")) : {};
const STYLE =
  "A small, friendly person sculpted from matte modelling clay, like a stop-motion character, in" +
  " exactly the style of the attached figure: smooth soft rounded forms, a big round head with two" +
  " tiny black dot eyes and a small smile, simple mitten-like hands, real adult proportions so every" +
  " pose is anatomically correct, a faint fingerprint texture and soft handmade imperfections.";
const castFigure = (c) =>
  `${STYLE} This person: ${c.who} Wears ${c.wears} Clothes fitted close to the body, so the shape of` +
  " the back, hips and joints always shows; hair kept off the neck and back. Keep exactly the sheet's proportions: a short neck, the head sitting on the shoulders, never a long stretched neck.";
if (castId && !CAST[castId]) throw new Error(`No ${castId} in art/clay/cast.json`);
const figure = castId ? castFigure(CAST[castId]) : FIGURE;
const sheet = join(dir, castId ? `sheet-${castId}.png` : "sheet.png");
/** Pictures with one of the cast are named <id>@<who>-<n>.png, beside the first figure's. */
const named = (n) => join(dir, castId ? `${id}@${castId}-${n}.png` : `${id}-${n}.png`);

/** An equipment sheet by number: 1 is gear.png, the rest gear-<n>.png. */
const gearFile = (n = 1) => join(dir, n === 1 ? "gear.png" : `gear-${n}.png`);

/** Every piece the lifts use, in one sheet, so each picture copies it. */
const GEAR = [
  "an Olympic barbell: a long silver-grey clay bar with two thick black clay plates on each end",
  "a pair of black clay hexagonal dumbbells with grey handles",
  "a black clay kettlebell with a smooth round handle (it must be in the sheet)",
  "a flat weight bench: a black padded top on a grey clay metal frame",
  "a lat pulldown station: a grey clay frame with a black padded seat and thigh pad, a weight stack, and a long straight black bar hanging from a cable",
  "a squat rack: two grey clay uprights with J-hooks",
];

/** The second sheet: the cable and machine stations, matched to the first. */
const GEAR_2 = [
  "a cable column: a tall grey clay tower with a pulley that slides up and down it, a black weight stack, and on the floor beside it three attachments: a short straight bar, a rope with two black ends, and a single D-shaped handle",
  "a seated cable row station: a long low grey clay frame with a black padded seat, a black foot plate, a low pulley at the front and a black V-shaped handle on the cable",
  "a pull-up station: two grey clay uprights holding a straight black bar high overhead, high enough to hang from with straight arms",
  "a seated leg curl machine: a black padded seat and back, a padded roller for the back of the lower legs, a thigh pad over the knees, and a weight stack, in grey clay",
  "a dark grey exercise mat, rolled flat",
];

/** Big machines. */
const GEAR_3 = [
  "a Smith machine: a barbell fixed between two grey clay vertical rails it slides up and down on, in a tall frame",
  "a 45-degree leg press: a black padded seat reclined low, a large grey footplate on a sled running up a 45-degree track, black plates on its pegs",
  "a hack squat machine: an angled sled with black shoulder pads and back pad, a large footplate at the bottom",
  "a seated chest press machine: a black seat and back pad, two handles at chest height on arms that push forward, a weight stack",
  "a pec deck machine: a black seat and back pad, two padded arms at shoulder height that swing together in front, a weight stack",
  "a seated shoulder press machine: a black seat and back pad, two handles at shoulder height that press up, a weight stack",
  "a seated row machine: a black seat, a black chest pad in front, two handles out in front at chest height, a weight stack",
];

/** Smaller machines and benches. */
const GEAR_4 = [
  "a leg extension machine: a black seat and back pad, a padded roller in front of the shins, a weight stack",
  "a seated hip abduction machine: a black seat, two padded leg pads on the outside of the knees that swing apart, a weight stack",
  "a seated calf raise machine: a low black seat, a thigh pad over the knees, a small foot platform",
  "a standing calf raise machine: two black shoulder pads above a small step block for the toes",
  "an ab crunch machine: a black seat and two padded handles over the shoulders that curl forward",
  "a captain's chair: a tall grey clay frame with a black back pad and two padded forearm rests with handles, the feet hanging free",
  "a 45-degree back extension bench: a black hip pad high up and a foot plate with ankle rollers behind it",
  "a preacher curl bench: a black seat and a sloped black arm pad in front of it",
  "an adjustable bench set to an incline of about 35 degrees: a black back pad and seat on a grey frame",
  "a dip station: two parallel grey bars with black grips at waist height",
];

/** Small things. */
const GEAR_5 = [
  "an EZ curl bar: a short bar with a wavy, zig-zag middle and black plates on each end",
  "a trap bar: a hexagon-shaped bar you stand inside, with two handles at the sides and black plates on each end",
  "a landmine T-bar row: a barbell with one end fixed in a floor hinge, black plates on the free end and a V-shaped handle under it",
  "a black medicine ball",
  "a sturdy grey clay plyometric box, knee height",
  "suspension straps: two black straps with handles hanging from a high grey anchor",
  "a large pale grey stability ball",
  "an ab wheel: a black wheel with two handles through its middle",
  "a decline sit-up bench: a black padded bench sloping down, with ankle rollers at its high end",
];

/** Cardio machines. */
const GEAR_6 = [
  "a treadmill: a long black running belt with a grey clay frame, side rails and a small console",
  "a rowing machine: a long low grey clay rail with a black sliding seat, black foot plates and a handle on a strap from a round fan housing at the front",
  "a ski erg: a tall grey clay upright with two handles on cords hanging from the top",
  "an upright exercise bike: a black saddle, handlebars and pedals on a grey clay frame",
  "an air bike: a grey clay exercise bike with a big round fan at the front and long moving handles",
  "a stair climber: a grey clay machine with a short moving staircase of black steps and handrails",
  "an elliptical trainer: two long black foot pedals and two tall moving handles on a grey clay frame",
];

/** How the breath shows: in the face and the shoulders, never the pose. */
const BREATHS = {
  in:
    "BREATHING IN through the nose: the mouth softly closed, a calm, content look with the eyes open," +
    " the chest a little fuller and the shoulders lifted only very slightly.",
  out:
    "BREATHING OUT slowly through the mouth: the lips in a small round 'o' as if gently blowing out a" +
    " candle, the eyes softly closed in two small curved lines, the shoulders dropped and relaxed.",
};

if (breathArg) {
  const breath = BREATHS[breathArg];
  if (!breath) throw new Error("in or out?");
  const base = join(dir, `${id}-${Number(frameArg ?? 0)}.png`);
  if (!existsSync(base)) throw new Error(`Make ${base} first`);
  prompt = ask(
    "Edit the second attached picture. The first attached image is the character's sheet, for reference.\n\n" +
      "Change ONLY the clay figure's face and, very slightly, its shoulders, so the figure is" +
      ` ${breath}\n\n` +
      "Everything else must stay exactly as it is: the same pose of every limb, the same camera," +
      " framing, scale, light, shadow and background. The new picture and the original will flip" +
      " back and forth in time with the breath, so anything else that changes will jump. Keep the" +
      " same clay, colours and style; the face stays the same simple character face (two small dot" +
      " eyes, a small mouth), just breathing.",
  );
  images = [sheet, base];
  out = join(dir, `${id}-${Number(frameArg ?? 0)}-${breathArg}.png`);
} else if (id === "gear") {
  const n = Number(frameArg ?? 1);
  const items = [GEAR, GEAR_2, GEAR_3, GEAR_4, GEAR_5, GEAR_6][n - 1];
  if (!items) throw new Error("gear 1 to 6?");
  prompt = ask(
    "Generate an equipment sheet for an exercise app whose pictures are stop-motion clay.\n\n" +
      "THE STYLE\nEverything is sculpted from matte modelling clay, like props on a stop-motion set:" +
      " smooth soft forms, slightly rounded edges, faint handmade imperfections, but in true" +
      " real-world proportions, so each piece reads as the real thing at a glance. Colours only" +
      " black, charcoal, mid grey and silver-grey clay. The attached picture shows this world's" +
      " gym equipment already made: match its clay, colours and finish exactly.\n\n" +
      `THE SHEET\nEach of these, once, side by side, evenly spaced, none overlapping, all at the same scale as each other (a person-sized world):\n- ${items.join("\n- ")}\n\n` +
      `THE PICTURE\n${PICTURE.replace("the whole figure in frame, centred", "every piece in frame")}`.replace(
        "no props unless named, ",
        "",
      ),
  );
  // The second sheet copies the first, so every piece is from one world.
  images = [n === 1 ? join(dir, "gym_lost-0.png") : gearFile(1)];
  out = gearFile(n);
} else if (id === "sheet" && castId) {
  // One of the cast: their own turnaround, in the first figure's clay.
  prompt = ask(
    "Generate a character turnaround sheet for an exercise app.\n\n" +
      `THE CHARACTER\n${figure}\nThe attached sheet is the app's first character: copy its clay,` +
      " its style, head size against the body, face and light exactly, but make this new person.\n\n" +
      "THE SHEET\nThe same person four times in a row, standing relaxed and tall, arms hanging by the" +
      " sides: from the front, from the side facing right, from the back, and at three-quarters." +
      " Same size, same height, evenly spaced, feet on one level.\n\n" +
      `THE PICTURE\n${PICTURE.replace("the whole figure in frame, centred", "all four figures in frame")}`,
  );
  images = [join(dir, "sheet.png")];
  out = sheet;
} else if (id === "sheet") {
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
  if (!existsSync(sheet)) throw new Error(`Make the sheet first: node art/clay.mjs sheet${castId ? ` --cast ${castId}` : ""}`);
  // A stretch, or a scene for the intro (art/clay/scenes.json): the same figure either way.
  const read = (file) => JSON.parse(readFileSync(join(dir, file), "utf8"))[id];
  const scene = existsSync(join(dir, "scenes.json")) ? read("scenes.json") : undefined;
  const lift = existsSync(join(dir, "lifts.json")) ? read("lifts.json") : undefined;
  const spec = read("stretches.json") ?? scene ?? lift;
  if (!spec) throw new Error(`No ${id} in art/clay/stretches.json, scenes.json or lifts.json`);
  const gear = gearFile(lift?.gear ?? 1);
  if (lift && !existsSync(gear)) throw new Error(`Make the equipment first: node art/clay.mjs gear ${lift.gear ?? 1}`);
  const n = Number(frameArg ?? 0);
  const moment = spec.frames[n];
  const first = named(0);
  const edit = n > 0 && existsSync(first);
  // A photo of a real person in this moment (spec.refs[n], under art/clay/), for the pose only:
  // some moves are far easier to show than to say. Always the last image attached.
  const ref = spec.refs?.[n] ? join(dir, spec.refs[n]) : undefined;
  if (ref && !existsSync(ref)) throw new Error(`${id}: no reference at ${ref}`);
  prompt = ask(
    `Generate one picture for an exercise app's ${lift ? "lifting" : "stretch"} guide.\n\n` +
      `THE CHARACTER\n${figure}\nThe first attached image is this character's sheet: draw exactly` +
      ` this ${castId ? "person, their clay, colours, face, hair, clothes and proportions" : "figure, its clay, colours, face, proportions and shorts"}.\n` +
      // A scene may dress the figure (a child in a sweater): this overrides "no other clothes".
      (spec.wears ? `In this picture the figure also wears ${spec.wears}; that is the only exception to "no other clothes".\n` : "") +
      (edit
        ? "The second attached image is the other moment of this same movement, already made. Make" +
          " this picture as an edit of it: the same camera, framing, scale, light and figure; move" +
          " only the parts of the body that move between the two moments, into the pose below. The" +
          " two pictures will flip back and forth, so anything that changes by accident will jump.\n"
        : "") +
      (lift && !edit
        ? `The second attached image is the equipment sheet: any equipment in the` +
          " picture is copied exactly from it, its clay, colours, shape and size against the figure.\n"
        : "") +
      (ref
        ? "The LAST attached image is a photo of a real person in this exact moment. Use it ONLY" +
          " for the pose: how the body, limbs, hands and joints are placed, and how the person sits in" +
          " or holds any equipment. Do NOT copy the person, their clothes, the background, the gym," +
          " the light or the photographic look: the picture stays this clay character on the plain" +
          ` background, and ${spec.refCamera ? "the camera is the same as the photo's: the same angle and height" : "the camera is the one given under THE VIEW, not the photo's"}.\n`
        : "") +
      `\n${scene ? "THE SCENE" : "THE MOVEMENT"}\n${spec.what}\n\nTHIS MOMENT\n${moment}` +
      (scene
        ? ""
        : " The form must be correct, and more than correct: the optimal form a top coach would" +
          " demonstrate, because this picture teaches the movement. A neutral spine; the head and" +
          " neck always in line with the spine (in a hinge, row, plank or push-up the eyes look at" +
          " the floor, never up or forward); joints stacked; shoulders down and away from the ears;" +
          " nothing sloppy.") +
      (lift ? " Exactly ONE figure in the picture, in this one moment: never a before-and-after, never two figures side by side." : "") +
      "\n\n" +
      `THE VIEW\n${ref && spec.refCamera ? "Exactly the camera angle of the reference photo." : spec.view}\n\n` +
      `THE PICTURE\n${PICTURE}${spec.props && spec.props !== "none" ? ` The only props: ${spec.props}.` : ""}`,
  );
  // The second moment copies the first, equipment and all: a third picture only pulls it about.
  images = [sheet, ...(edit ? [first] : lift ? [gear] : []), ...(ref ? [ref] : [])];
  out = named(n);
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
