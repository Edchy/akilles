/**
 * The logo film, five seconds: a lump of clay is shaped, frame by frame like
 * stop-motion, into the K; it settles; "Get in shape." comes in under it as
 * the voice says "Klay. Get in shape."
 *
 * The frames are art/logo/stage-0…3.png and k.png, cut out by art/cutout.py
 * into public/logo/. Voice: `npm run voice -- --logo`. Render: `npm run logo`.
 */
export const LOGO_LINE = "Klay. Get in shape.";

/** Each frame of the shaping, and how long it holds, in seconds. */
export const SHAPING = [
  { file: "logo/stage-0.png", hold: 0.5 },
  { file: "logo/stage-1.png", hold: 0.4 },
  { file: "logo/stage-2.png", hold: 0.4 },
  { file: "logo/stage-3.png", hold: 0.4 },
  { file: "logo/k.png", hold: 0 },
];
