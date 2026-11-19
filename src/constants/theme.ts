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

/**
 * The workout's cards in their family's colour, on the paper app: each card
 * filled with it, its words white or navy (see `fieldColors`), framed in ink.
 * Today, Plan and the rest stay paper. Since 16 November 2026.
 */
export const COLOURED_CARDS = true;

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
  /**
   * What a screen paints behind itself: the page, or nothing at all on a dusk
   * card, where the card's own gradient is drawn under it (see `DuskGround`).
   */
  ground: base.bg as string,
};

/** The palette a screen draws with — the white one above, or a family's field. */
export type Palette = typeof colors;

/** Ice & acid: one hue per family, from the light card to its deep ink. */
type FamilyColour = { field: string; mark: string; dark: boolean; pastel?: string };

export const FAMILY: Record<Family, FamilyColour> = {
  push: { field: "#D7EFFF", mark: "#285C82", dark: false },
  pull: { field: "#AEB8A0", mark: "#30422D", dark: false },
  legs: { field: "#D5C7ED", mark: "#564177", dark: false },
  core: { field: "#EDCAD9", mark: "#783F5D", dark: false },
  cardio: { field: "#A6D8D5", mark: "#17504D", dark: false },
  mobility: { field: "#F4D681", mark: "#6C501B", dark: false },
  goal: { field: "#DFCEE8", mark: "#62406D", dark: false },
  full: { field: "#E9F056", mark: "#4E541C", dark: false },
};

/**
 * Letterpress: the workout's cards and the Plan rows as matte card stock in a
 * deep, muted family colour, with words in a light tint of the same hue
 * pressed into it — softer contrast than white on colour, still 4.5:1. A set
 * done is stamped in a pale ink of the hue and fills like a glass: 9 of 10 is
 * nine-tenths full (see `components/set-circle.tsx`). Since 18 November 2026;
 * `false` brings back the pale fields with ink words.
 */
export const LETTERPRESS = true;

/** Per family: the card, the words on it, and the stamp a done set leaves. */
export const PRESS: Record<Family, { card: string; ink: string; stamp: string }> = {
  push: { card: "#3D5A7C", ink: "#CBDAEB", stamp: "#B7CCE4" },
  pull: { card: "#4E6446", ink: "#D4DEC6", stamp: "#C2D1AF" },
  legs: { card: "#5C4B7A", ink: "#DCD2EB", stamp: "#CDBFE3" },
  core: { card: "#77485C", ink: "#EFD3DE", stamp: "#E3BFCE" },
  cardio: { card: "#2F6563", ink: "#CBE6E3", stamp: "#B2D8D4" },
  mobility: { card: "#735B2B", ink: "#F1E2BE", stamp: "#E6D19E" },
  goal: { card: "#634A6E", ink: "#E6D4EC", stamp: "#D6C0DF" },
  full: { card: "#585D2C", ink: "#E6E9BF", stamp: "#D6DB9C" },
};

/**
 * Dusk: the next workout on Today, as a deep two-tone card — the family's
 * colour at the top running down to near-black — with cream words and the
 * family's shape glowing faintly behind it. Each family's `glow` is its
 * shapes on the card. Since 18 November 2026; `false` brings back the pale
 * band over paper.
 */
export const DUSK_TODAY = true;
/**
 * Dusk everywhere a workout is a card: the workout's own cards and the Plan
 * rows too, so Today, Plan and the workout are one look. The stamp on a set
 * is the family's glow. `false` leaves them letterpress.
 */
export const DUSK_CARDS = true;
export const DUSK: Record<Family, { top: string; foot: string; glow: string }> = {
  push: { top: "#2B3F8C", foot: "#141A33", glow: "#6E8CFF" },
  pull: { top: "#22604A", foot: "#0F1F1A", glow: "#5FD39E" },
  legs: { top: "#5B2F8C", foot: "#1A1030", glow: "#B987FF" },
  core: { top: "#8C2F5B", foot: "#2A0F1C", glow: "#FF7FB4" },
  cardio: { top: "#1F6E73", foot: "#0C2224", glow: "#5FE0D8" },
  mobility: { top: "#8C5A14", foot: "#2A1A06", glow: "#FFC15E" },
  goal: { top: "#5E2F7A", foot: "#1C0F26", glow: "#D69BFF" },
  full: { top: "#5F6A1A", foot: "#1C2008", glow: "#D7E85A" },
};
/**
 * The mobility card: white, exactly the clay pictures' own white (sampled from
 * assets/clay), so the clay figure stands on the card with no box round it,
 * and a soft grey at the foot, the way the dusk cards darken downwards.
 */
export const CLAY_CARD = { top: "#F9F9F7", foot: "#E3E0D8" };

/** Words on a dusk card: cream, and a softer cream. */
export const DUSK_INK = { ink: "#F3E9D6", soft: "#F3E9D6CC" };

/** A family's row or card colours: letterpress, or the pale field with its ink. */
export const cardOf = (family: Family): { bg: string; ink: string } =>
  DUSK_CARDS
    ? { bg: mix(DUSK[family].top, DUSK[family].foot, 0.45), ink: DUSK_INK.ink }
    : LETTERPRESS ? { bg: PRESS[family].card, ink: PRESS[family].ink } : { bg: FAMILY[family].field, ink: FAMILY[family].mark };

/** Outlined geometry uses its family's ink, rather than a second colour. */
export const MARK_EDGE = true;

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

/** Whether a family card needs light text. */
export const fieldIsDark = (family: Family): boolean =>
  (!PAPER || COLOURED_CARDS) && (LETTERPRESS || FAMILY[family].dark);

/** Quiet backgrounds for the three connected stages in the workout editor. */
export const WORKOUT_STAGE = {
  warmup: "#FFF6D6",
  exercises: "#EAF2FA",
  cooldown: "#E5F4ED",
};

/** A card uses one family hue for its background, ink, controls and set fills. */
export function fieldColors(family: Family): Palette {
  // On paper the screen stays paper; the family's colour is the wash.
  if (PAPER && !COLOURED_CARDS) return { ...colors, wash: FAMILY[family].field };
  if (DUSK_CARDS) {
    const { top, foot, glow } = DUSK[family];
    // One flat colour for what needs one — the knocked-out number on a
    // stamp, an opaque fill — between the gradient's two ends.
    const card = mix(top, foot, 0.45);
    const ink = DUSK_INK.ink;
    return {
      bg: card,
      surface: mix(card, ink, 0.1),
      raised: mix(card, ink, 0.16),
      line: mix(card, ink, 0.3),
      panel: card,
      panelEdge: ink,
      text: ink,
      muted: ink,
      faint: ink,
      dim: ink,
      rise: ink,
      riseWash: mix(card, ink, 0.1),
      bend: ink,
      danger: ink,
      cloud: ink,
      ink: foot,
      white: colors.white,
      wash: glow,
      ground: "transparent",
    };
  }
  if (LETTERPRESS) {
    const { card, ink, stamp } = PRESS[family];
    return {
      bg: card,
      surface: mix(card, ink, 0.1),
      raised: mix(card, ink, 0.16),
      line: mix(card, ink, 0.3),
      panel: card,
      panelEdge: ink,
      text: ink,
      muted: ink,
      faint: ink,
      dim: ink,
      rise: ink,
      riseWash: mix(card, ink, 0.1),
      bend: ink,
      danger: ink,
      cloud: ink,
      // The number on a stamped circle: the card's own colour, knocked out.
      ink: card,
      white: colors.white,
      wash: stamp,
      ground: card,
    };
  }
  const { field, mark } = FAMILY[family];
  return {
    bg: field,
    surface: mix(field, mark, 0.08),
    raised: mix(field, mark, 0.14),
    line: mix(field, mark, 0.3),
    panel: field,
    panelEdge: mark,
    text: mark,
    muted: mark,
    faint: mark,
    dim: mark,
    rise: mark,
    riseWash: mix(field, mark, 0.08),
    bend: mark,
    danger: mark,
    cloud: mark,
    ink: field,
    white: colors.white,
    wash: mark,
    ground: field,
  };
}

/** Mix two shades of the same family without adding a neutral overlay. */
export function mix(from: string, to: string, amount: number): string {
  return `#${[1, 3, 5].map((at) => {
    const a = parseInt(from.slice(at, at + 2), 16);
    const b = parseInt(to.slice(at, at + 2), 16);
    return Math.round(a + (b - a) * amount).toString(16).padStart(2, "0");
  }).join("")}`;
}

/**
 * EB Garamond, throughout. A classic book face: sentence case, with italics
 * for Klay's voice. Custom faces ignore `fontWeight` on iOS, so each weight
 * is its own family name; `Text` in `components/text.tsx` picks the right one
 * from an ordinary `fontWeight`, so most text never names a face at all.
 */
export const fonts = {
  /** Names and headings. */
  display: "EBGaramond_500Medium",
  /** Numbers: the weight, the circles, scores. */
  displayBold: "EBGaramond_600SemiBold",
  /** Klay talking: a quip, in italics. */
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
   * Klay's voice. Reached with `<Text ui>`.
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
