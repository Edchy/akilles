/**
 * Red on white: gym-poster colours. The ground is white, and everything on it
 * — words, numbers, the pill you press — is one red. Panels are the faintest
 * blush of it, so the page never needs a second hue.
 *
 * The token names keep their jobs from before. `rise` — a target hit, the
 * weight, where you are — is the same red, made loud by fill and weight
 * rather than by colour. `bend` — a target missed, or something you are about
 * to undo — is near-black, the one thing on the page that is not red, so a
 * miss still stands out at a glance.
 */
export const colors = {
  /** Page background. */
  bg: "#FFFFFF",
  /** Raised panels — the superset block, pickers, cards. A blush of red. */
  surface: "#FCF0EE",
  /** A step above surface, for controls that sit on it. */
  raised: "#F8E1DD",
  /** Hairlines and empty circle borders. */
  line: "#EDC4BE",

  /** Primary text: signal red. */
  text: "#D0142C",
  /** Secondary text: targets, explanations, inactive tabs. */
  muted: "#B03A48",
  /** Hints. Still readable at arm's length on white and on panels. */
  faint: "#BD5E69",

  /** Hit the target, the weight, the active tab: the red itself. */
  rise: "#D0142C",
  /** A wash of the red: the pill behind the current tab, a pressed button. */
  riseWash: "rgba(208, 20, 44, 0.10)",
  /** Missed the target, or about to undo: near-black. Not an error — a miss is information. */
  bend: "#231416",
  /** The primary pill and anything selected: solid red, white on top. */
  cloud: "#D0142C",

  /** Text and glyphs on a filled pill. */
  ink: "#FFFFFF",
  white: "#FFFFFF",
};

/**
 * Faces. Barlow Condensed is the gym's own lettering — the stencilled plates
 * and machine placards — and carries the loud moments: names in capitals,
 * the weight, the circles, Akilles' remarks. Being narrow, long exercise
 * names fit on one line at a size you can read at arm's length. Sentences
 * and labels stay in the system face, which reads better small. Custom faces
 * ignore `fontWeight` on iOS, so the weight is in the name.
 */
export const fonts = {
  /** Names and headings, set in capitals. */
  display: "BarlowCondensed_800ExtraBold",
  /** Numbers: the weight, the circles, scores. */
  displayBold: "BarlowCondensed_800ExtraBold",
  /** Akilles talking: a quip, in sentence case. */
  voice: "BarlowCondensed_700Bold",
};

export const radii = {
  card: 28,
  /** Pills, like the garden's drift buttons. */
  button: 999,
};

/**
 * The bottom bar: a floating capsule of glass, the same shape whether it
 * carries the tabs or the workout's Back, Leave and Skip.
 *
 * Deliberately oversized. The bar is used mid-set — sweaty hands, heart rate
 * up, half a glance — so each slot is a thumb-sized lozenge well past the 44pt
 * platform minimum, and the glyphs and labels read at arm's length.
 */
export const BAR = {
  /** Capsule height. */
  height: 80,
  /** Inset of the slots from the capsule's edge. */
  padding: 6,
  /**
   * Gap to the screen's sides — the content's own gutter, so the capsule
   * lines up with the buttons above it — and to its foot on phones without
   * a home bar.
   */
  margin: 22,
  glyph: 26,
  label: 14,
} as const;
