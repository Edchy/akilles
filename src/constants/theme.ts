import type { Family } from "@/data/families";

/**
 * Navy on white, with one colour per kind of exercise.
 *
 * The ground is white and the words are a deep navy. Colour is kept for
 * meaning: each family of exercise — push, pull, legs, core, cardio, stretch
 * — has its own, after the Munich ’72, Mexico ’68 and LA ’84 Olympic
 * identities, and it shows as a solid shape beside the exercise and as the
 * whole field behind it while you lift (see `FAMILY` and `fieldColors`).
 *
 * The token names keep their jobs from before. `rise` — the weight, a hit,
 * the active thing — is the push blue on white. `bend` — a target missed, or
 * something you are about to undo — is the navy itself: a miss is
 * information, not an error.
 */
export const colors = {
  /** Page background. */
  bg: "#FFFFFF",
  /** Raised panels and every secondary control: one soft grey. */
  surface: "#F0F2F5",
  /** A step above surface, for controls that sit on it. */
  raised: "#E6E9EE",
  /** Hairlines and progress tracks. */
  line: "#DDE1E6",

  /** Primary text: navy. */
  text: "#13325B",
  /** Secondary text: targets, explanations, inactive tabs. */
  muted: "#4E6585",
  /** Hints. Still 4.5:1 on white and on `surface`. */
  faint: "#596E8E",
  /**
   * A placeholder — last time's number, shown as a starting point rather
   * than something already entered. A shade back from the text, and still
   * 4.5:1, since it is a number you read.
   */
  dim: "#596E8E",

  /** The weight, a hit, the active thing: the push blue. */
  rise: "#2277BB",
  /** A wash of the blue: a pressed row, a selected option. */
  riseWash: "rgba(34, 119, 187, 0.10)",
  /** Missed the target, or about to undo: navy. */
  bend: "#13325B",
  /** The primary button and anything filled: solid blue, white on top. */
  cloud: "#2277BB",

  /** Text and glyphs on a filled button. */
  ink: "#FFFFFF",
  white: "#FFFFFF",
};

/** The palette a screen draws with — the white one above, or a family's field. */
export type Palette = typeof colors;

/**
 * Each family's colour, twice. `field` fills the whole lift screen; `mark` is
 * the solid shape on white, a shade deeper where the field colour would be
 * too faint on white to see in a bright gym. Dark fields carry white, light
 * fields carry navy.
 */
export const FAMILY: Record<Family, { field: string; mark: string; dark: boolean }> = {
  push: { field: "#2277BB", mark: "#2277BB", dark: true },
  pull: { field: "#23864D", mark: "#23864D", dark: true },
  legs: { field: "#F08A24", mark: "#E07400", dark: false },
  core: { field: "#D6287E", mark: "#D6287E", dark: true },
  cardio: { field: "#3CC2CB", mark: "#1E9CA6", dark: false },
  mobility: { field: "#F6C12A", mark: "#BC8B00", dark: false },
  // The one hue the six leave free: something you are learning, not lifting.
  goal: { field: "#6A4AB0", mark: "#6A4AB0", dark: true },
};

/**
 * The lift screen's palette: the family's colour as the ground, and every
 * word on it in one colour — white or navy — at full strength. Hierarchy
 * comes from size and italics rather than faded text, so nothing drops below
 * a readable contrast. Secondary controls are a tint of the field itself;
 * filled things (a logged set, the way on) are solid white or navy with the
 * field's colour on top.
 */
export function fieldColors(family: Family): Palette {
  const { field, dark } = FAMILY[family];
  const on = dark ? colors.white : colors.text;
  return {
    bg: field,
    surface: dark ? "rgba(8, 28, 60, 0.20)" : "rgba(255, 255, 255, 0.38)",
    raised: dark ? "rgba(8, 28, 60, 0.30)" : "rgba(255, 255, 255, 0.55)",
    line: dark ? "rgba(255, 255, 255, 0.28)" : "rgba(19, 50, 91, 0.22)",
    text: on,
    muted: on,
    faint: on,
    // As far back as a field allows while staying 4.5:1: on the dark fields
    // that is no distance at all, so there the line under the number says it.
    dim: dark ? on : "rgba(19, 50, 91, 0.9)",
    rise: on,
    riseWash: dark ? "rgba(8, 28, 60, 0.20)" : "rgba(255, 255, 255, 0.38)",
    bend: on,
    cloud: on,
    ink: field,
    white: colors.white,
  };
}

/**
 * EB Garamond, throughout. A classic book face: sentence case, with italics
 * for Milo's voice. Custom faces ignore `fontWeight` on iOS, so each weight
 * is its own family name; `Text` in `components/text.tsx` picks the right one
 * from an ordinary `fontWeight`, so most text never names a face at all.
 */
export const fonts = {
  /** Names and headings. */
  display: "EBGaramond_500Medium",
  /** Numbers: the weight, the circles, scores. */
  displayBold: "EBGaramond_600SemiBold",
  /** Milo talking: a quip, in italics. */
  voice: "EBGaramond_400Regular_Italic",
  regular: "EBGaramond_400Regular",
  medium: "EBGaramond_500Medium",
  semibold: "EBGaramond_600SemiBold",
  bold: "EBGaramond_700Bold",
  italic: "EBGaramond_400Regular_Italic",
  mediumItalic: "EBGaramond_500Medium_Italic",
  semiboldItalic: "EBGaramond_600SemiBold_Italic",
};

export const radii = {
  card: 28,
  /** Pills: secondary buttons and the bar. */
  button: 999,
  /**
   * The big buttons you move on with: Start, Next, Done. Full pills, the
   * same shape as the bar under them — everything you tap is a circle or a
   * pill; only cards keep a corner.
   */
  action: 999,
};

/**
 * The bottom bar: a floating white capsule, the same shape whether it
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
  glyph: 24,
  label: 15,
} as const;
