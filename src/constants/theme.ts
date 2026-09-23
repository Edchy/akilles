/**
 * Dark palette. The app is black-first: the exercise and the weight are the
 * surface, and everything else recedes into the background.
 */
export const colors = {
  /** Page background. True black so the screen reads as one surface. */
  bg: "#0A0A08",
  /** Raised panels — the superset block, the tab bar, pickers. */
  surface: "#161613",
  /** A step above surface, for controls that sit on it. */
  raised: "#232320",
  /** Hairlines and empty circle borders. */
  line: "#2E2E29",

  /** Primary text. */
  text: "#F5F3EA",
  /** Secondary text: targets, explanations, inactive tabs. */
  muted: "#8A8880",
  /** Barely-there text, for hints. */
  faint: "#55544C",

  /** Hit the target. Also the weight, and the active tab. */
  acid: "#D9FF57",
  /** Missed the target. Used sparingly — it is not an error colour. */
  coral: "#FF745C",

  ink: "#0A0A08",
  white: "#FFFFFF",
};

export const radii = {
  card: 28,
  button: 18,
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
