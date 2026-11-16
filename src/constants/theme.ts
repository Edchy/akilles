import type { Family } from "@/data/families";

/**
 * Ink on paper. Colour is earned.
 *
 * Everything is drawn in near-black ink on white paper, and colour arrives
 * only when you do something: a logged set washes its circle in the lift's
 * colour, a finished workout, a day trained. Each family keeps its colour
 * (`FAMILY`), but as a wash and a mark, no longer as a whole coloured screen.
 *
 * Before 16 November 2026 it was navy on white, with the lift screen filled
 * with its family's colour; `PAPER = false` puts that back.
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
export const PAPER = true;

const NAVY = {
  bg: "#FFFFFF",
  surface: "#F0F2F5",
  raised: "#E6E9EE",
  line: "#DDE1E6",
  panel: "#E1E8F2",
  panelEdge: "#C3CEDD",
  text: "#13325B",
  muted: "#4E6585",
  faint: "#596E8E",
  dim: "#596E8E",
  rise: "#2277BB",
  riseWash: "rgba(34, 119, 187, 0.10)",
  bend: "#13325B",
  cloud: "#2277BB",
};

// Paper with the faintest warmth, ink with no blue in it, and greys that lean
// the same way, so nothing reads as a default.
const INK = {
  bg: "#FCFCFA",
  surface: "#F1F0EB",
  raised: "#E7E6E0",
  line: "#DCDBD4",
  panel: "#FCFCFA",
  panelEdge: "#1C1C1A",
  text: "#1C1C1A",
  muted: "#5C5B55",
  faint: "#5C5B55",
  dim: "#66655E",
  rise: "#1C1C1A",
  riseWash: "rgba(28, 28, 26, 0.06)",
  bend: "#1C1C1A",
  cloud: "#1C1C1A",
};

const base = PAPER ? INK : NAVY;

export const colors = {
  /** Page background. */
  bg: base.bg,
  /** Raised panels and every secondary control: one soft grey. */
  surface: base.surface,
  /** A step above surface, for controls that sit on it. */
  raised: base.raised,
  /** Hairlines and progress tracks. */
  line: base.line,
  /**
   * A card that has to stand off the white: the workout card above the deck.
   * A cool blue-grey, clearly not white, with `panelEdge` around it.
   */
  panel: base.panel,
  panelEdge: base.panelEdge,

  /** Primary text: ink. */
  text: base.text,
  /** Secondary text: targets, explanations, inactive tabs. */
  muted: base.muted,
  /** Hints. Still 4.5:1 on white and on `surface`. */
  faint: base.faint,
  /**
   * A placeholder — last time's number, shown as a starting point rather
   * than something already entered. A shade back from the text, and still
   * 4.5:1, since it is a number you read.
   */
  dim: base.dim,

  /** The weight, a hit, the active thing. */
  rise: base.rise,
  /** A pressed row, a selected option. */
  riseWash: base.riseWash,
  /** Missed the target, or about to undo. */
  bend: base.bend,
  /** For what removes or deletes, and what has been removed. Used sparingly. */
  danger: "#B42318",
  /** The primary button and anything filled, white on top. */
  cloud: base.cloud,
  /** The watercolour a logged set leaves: the lift's family colour while you lift. */
  wash: "#2277BB",

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
  // A full body day: the three shapes together, in the one strong hue the
  // others leave free — a red, clear of legs' orange and core's pink.
  full: { field: "#D2402E", mark: "#D2402E", dark: true },
};

/** One opaque category tint for Plan rows and the exercise rows inside them.
 * Mixing with white here keeps the colour identical over every section background.
 */
export function familyWash(family: Family): string {
  const hex = FAMILY[family].field.slice(1);
  // On paper only a breath of the colour: the mark beside it says the rest.
  const k = PAPER ? 0.12 : 128 / 255;
  return `#${[0, 2, 4].map((at) => {
    const channel = parseInt(hex.slice(at, at + 2), 16);
    return Math.round(channel * k + 252 * (1 - k)).toString(16).padStart(2, "0");
  }).join("")}`;
}

/** Whether the lift screen's ground is dark: never, on paper. */
export const fieldIsDark = (family: Family): boolean => !PAPER && FAMILY[family].dark;

/** Quiet backgrounds for the three connected stages in the workout editor. */
export const WORKOUT_STAGE = {
  warmup: "#FFF6D6",
  exercises: "#EAF2FA",
  cooldown: "#E5F4ED",
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
  // On paper the screen stays paper; the family's colour is the wash.
  if (PAPER) return { ...colors, wash: FAMILY[family].field };
  const { field, dark } = FAMILY[family];
  const on = dark ? colors.white : colors.text;
  return {
    bg: field,
    surface: dark ? "rgba(8, 28, 60, 0.20)" : "rgba(255, 255, 255, 0.38)",
    raised: dark ? "rgba(8, 28, 60, 0.30)" : "rgba(255, 255, 255, 0.55)",
    line: dark ? "rgba(255, 255, 255, 0.28)" : "rgba(19, 50, 91, 0.22)",
    panel: dark ? "rgba(8, 28, 60, 0.20)" : "rgba(255, 255, 255, 0.38)",
    panelEdge: dark ? "rgba(255, 255, 255, 0.28)" : "rgba(19, 50, 91, 0.22)",
    text: on,
    muted: on,
    faint: on,
    // As far back as a field allows while staying 4.5:1: on the dark fields
    // that is no distance at all, so there the line under the number says it.
    dim: dark ? on : "rgba(19, 50, 91, 0.9)",
    rise: on,
    riseWash: dark ? "rgba(8, 28, 60, 0.20)" : "rgba(255, 255, 255, 0.38)",
    bend: on,
    // On a coloured field, plain red would fight the field: the words' own colour.
    danger: on,
    cloud: on,
    ink: field,
    white: colors.white,
    wash: on,
  };
}

/**
 * EB Garamond, throughout. A classic book face: sentence case, with italics
 * for Humbell's voice. Custom faces ignore `fontWeight` on iOS, so each weight
 * is its own family name; `Text` in `components/text.tsx` picks the right one
 * from an ordinary `fontWeight`, so most text never names a face at all.
 */
export const fonts = {
  /** Names and headings. */
  display: "EBGaramond_500Medium",
  /** Numbers: the weight, the circles, scores. */
  displayBold: "EBGaramond_600SemiBold",
  /** Humbell talking: a quip, in italics. */
  voice: "EBGaramond_400Regular_Italic",
  regular: "EBGaramond_400Regular",
  medium: "EBGaramond_500Medium",
  semibold: "EBGaramond_600SemiBold",
  bold: "EBGaramond_700Bold",
  italic: "EBGaramond_400Regular_Italic",
  mediumItalic: "EBGaramond_500Medium_Italic",
  semiboldItalic: "EBGaramond_600SemiBold_Italic",
  /**
   * The interface — tabs, buttons, chips, small labels, sets and reps — in
   * Atkinson Hyperlegible Next: a sans made for low vision, every letter
   * told apart. Garamond stays for what you read: names, headings, numbers,
   * Humbell's voice. Reached with `<Text ui>`.
   */
  ui: "AtkinsonHyperlegibleNext_400Regular",
  uiItalic: "AtkinsonHyperlegibleNext_400Regular_Italic",
  uiMedium: "AtkinsonHyperlegibleNext_500Medium",
  uiSemibold: "AtkinsonHyperlegibleNext_600SemiBold",
  uiBold: "AtkinsonHyperlegibleNext_700Bold",
};

/**
 * Soft square, like a page with its corners just taken off: cards, buttons
 * and the bar all share one small radius. Only what you tap over and over —
 * a set, a dot — stays round, so round still means "tap me".
 * (Before 16 November 2026: pills for controls, 28 for cards.)
 */
export const radii = {
  card: 12,
  /** Buttons and the bar. */
  button: 10,
  /** The big buttons you move on with: Start, Next, Done. */
  action: 10,
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
