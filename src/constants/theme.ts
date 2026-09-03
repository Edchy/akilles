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
 * Sized to hold a 44pt touch target — the platform minimum — plus its label.
 */
export const TAB_BAR_HEIGHT = 72;
