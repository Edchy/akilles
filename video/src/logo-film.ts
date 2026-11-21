/**
 * The logo film, about five seconds: a lump of clay flows, shape into shape,
 * into the K; it settles; "Get in shape." comes in under it as the voice says
 * "Klay. Get in shape."
 *
 * The frames are art/logo/stage-0…3.png and k.png, cut out by art/cutout.py
 * into public/logo/. Voice: `npm run voice -- --logo`. Render: `npm run logo`.
 */
export const LOGO_LINE = "Klay. Get in shape.";

/**
 * Each shape of the clay: how long it is held, then how long it takes to melt
 * into the next, in seconds.
 */
export const SHAPING = [
  { file: "logo/stage-0.png", hold: 0.35, morph: 0.6 },
  { file: "logo/stage-1.png", hold: 0.08, morph: 0.5 },
  { file: "logo/stage-2.png", hold: 0.08, morph: 0.5 },
  { file: "logo/stage-3.png", hold: 0.1, morph: 0.6 },
  { file: "logo/k.png", hold: 0, morph: 0 },
];

/** In-between shapes per melt, from art/morph.py: logo/morph/<from>-<step>.png. */
export const MORPH_STEPS = 24;
