/**
 * The gravity-rain garden: a dusk-green ground where every colour is a rule.
 *
 * Blue rain rises — a target hit, the weight to lift, where you are. Red rain
 * bends — a target missed, or something you are about to undo. Cloud white
 * is the pill you press. Nothing else is coloured, so a colour always means
 * one of those three things.
 */
export const colors = {
  /** Page background: the garden at dusk. Dark, but green, not black. */
  bg: "#222A27",
  /** Raised panels — the superset block, the tab bar, pickers. */
  surface: "#2C3531",
  /** A step above surface, for controls that sit on it. */
  raised: "#37413D",
  /** Hairlines and empty circle borders. */
  line: "#4A5550",

  /** Primary text: clear cloud. */
  text: "#E7E8E2",
  /** Secondary text: targets, explanations, inactive tabs. Stone. */
  muted: "#B6BBB7",
  /** Hints. Still readable at arm's length on the ground and on panels. */
  faint: "#9AA49F",

  /** Blue rain rises: hit the target, the weight, the active tab. */
  rise: "#6AA7FF",
  /** Red rain bends: missed the target. Not an error colour — a miss is information. */
  bend: "#FF7A70",
  /** The primary pill and anything selected: clear cloud, ink on top. */
  cloud: "#E7E8E2",

  /** Orbit black: text on a filled pill. */
  ink: "#0F1113",
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
 * Height of the bottom bar, excluding the device's safe area.
 *
 * Deliberately oversized. The bar is used mid-set — sweaty hands, heart rate
 * up, half a glance — so its targets are about twice the 44pt platform
 * minimum, and the glyphs and labels are sized to read at arm's length.
 */
export const TAB_BAR_HEIGHT = 96;

/**
 * Sizes for everything in the bottom bar. `icon` is the box every glyph sits
 * in — the hold-to-leave circle is exactly this size — so all the labels
 * line up whatever is above them.
 */
export const BAR_TYPE = { icon: 44, glyph: 32, label: 12 } as const;

/**
 * The workout bar's larger icons — Back, Leave, Skip. Arrows are thin
 * characters and read smaller than the tab icons at the same size, and the
 * Leave circle has to stay visible around a thumb.
 */
export const ACTION_TYPE = { icon: 52, glyph: 40 } as const;
