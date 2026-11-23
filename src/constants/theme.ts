import type { Family } from "@/data/families";

/**
 * Clay. The app is made of modelling clay, like its figures: soft, rounded
 * cards in each family's colour, lit from above and sitting on a warm
 * shadow, on a sand page, in one warm dark-brown ink. Bebas Neue for names
 * and headings, M PLUS Rounded for everything else.
 *
 * (Until 23 November 2026 there were looks to choose between in a Lab:
 * Dusk, Poster, Concrete and Clay. Clay stayed; see git history for the rest.)
 *
 * Each family of exercise — push, pull, legs, core, cardio, stretch — has
 * its own clay (`CLAY_TONE`): a workout's cards, a Plan row, a shape. A done
 * set is pressed in, a shade deeper. Every word on a colour is the ink.
 */

/**
 * Clay: the cards are lumps of modelling clay in the family's colour — soft,
 * rounded, lit from above and sitting on a warm shadow — on a sand page. One
 * warm dark-brown ink. `deep` is the clay pressed in: a done set, a well.
 */
export const CLAY_TONE: Record<Family, { card: string; deep: string; ink: string }> = {
  push: { card: "#F0703F", deep: "#E06438", ink: "#2A160C" },
  pull: { card: "#4FAAA7", deep: "#3F9894", ink: "#0B2222" },
  legs: { card: "#F4C542", deep: "#DDAA22", ink: "#2A160C" },
  core: { card: "#B497EA", deep: "#977AD0", ink: "#1E1030" },
  cardio: { card: "#7DBD5A", deep: "#5FA03E", ink: "#14240C" },
  mobility: { card: "#F2A3C6", deep: "#DD84AC", ink: "#2A160C" },
  goal: { card: "#F2B33D", deep: "#D9961F", ink: "#2A160C" },
  full: { card: "#CBD85E", deep: "#AFBC41", ink: "#22260C" },
};
export const CLAY_LOOK = {
  page: "#F3ECE2",
  /** The cream pressed into a card: a list, a number. */
  well: "#FBF5EC",
  ink: "#2A160C",
  corner: 30,
  /** Lit from above, a little shadow in its foot, and a warm shadow under it. */
  puff: "inset 0 3px 0 rgba(255, 255, 255, 0.4), inset 0 -10px 20px rgba(0, 0, 0, 0.14), 0 16px 26px -12px rgba(80, 40, 10, 0.5)",
  /** The same, smaller: a button, a row. */
  bump: "inset 0 2px 0 rgba(255, 255, 255, 0.45), inset 0 -5px 10px rgba(0, 0, 0, 0.12), 0 8px 14px -8px rgba(80, 40, 10, 0.45)",
  /** Pressed in: a well in the card. */
  dent: "inset 0 3px 8px rgba(80, 40, 10, 0.2)",
};

/** The page and what sits on it, in sand and the warm ink. */
export const colors = {
  /** Page background: sand. */
  bg: CLAY_LOOK.page,
  /** Raised panels and every secondary control. */
  surface: "#EADFD0",
  /** A step above surface, for controls that sit on it. */
  raised: "#E0D3C1",
  /** Hairlines and progress tracks. */
  line: "#DCCFBF",
  /** A card that has to stand off the page: the workout card above the deck. */
  panel: CLAY_LOOK.well,
  panelEdge: CLAY_LOOK.ink,
  /** Primary text: the warm ink. */
  text: CLAY_LOOK.ink,
  /** Secondary text: targets, explanations, inactive tabs. Still 4.5:1 on sand. */
  muted: "#6B5546",
  /** Hints. */
  faint: "#6B5546",
  /** A placeholder — last time's number, shown as a starting point. */
  dim: "#7A6454",
  /** The weight, a hit, the active thing. */
  rise: CLAY_LOOK.ink,
  /** A pressed row, a selected option. */
  riseWash: "rgba(42, 22, 12, 0.06)",
  /** Missed the target, or about to undo: information, not an error. */
  bend: CLAY_LOOK.ink,
  /** For what removes or deletes. Used sparingly. */
  danger: "#B42318",
  /** The primary button and anything filled. */
  cloud: CLAY_LOOK.ink,
  /** What a logged set fills with. */
  wash: CLAY_LOOK.ink,
  /** Text and glyphs on a filled button. */
  ink: CLAY_LOOK.well,
  white: "#FFFFFF",
  /** What a screen paints behind itself. */
  ground: CLAY_LOOK.page as string,
};

/** The palette a screen draws with — the page above, or a family's card. */
export type Palette = typeof colors;

/**
 * Each family's colour where it is a mark rather than a card — the dots of
 * a workout's track, a shape in History: `field` its clay, `mark` its
 * pressed-in shade.
 */
export const FAMILY: Record<Family, { field: string; mark: string; dark: boolean }> = Object.fromEntries(
  Object.entries(CLAY_TONE).map(([family, { card, deep }]) => [family, { field: card, mark: deep, dark: false }]),
) as Record<Family, { field: string; mark: string; dark: boolean }>;

/**
 * The mobility card: white, exactly the clay pictures' own white (sampled from
 * assets/clay), so the clay figure stands on the card with no box round it,
 * and a soft grey at the foot.
 */
export const CLAY_CARD = { top: "#F9F9F7", foot: "#E3E0D8" };

/** A family's row or card: its clay, and the ink. */
export const cardOf = (family: Family): { bg: string; ink: string } => ({ bg: CLAY_TONE[family].card, ink: CLAY_TONE[family].ink });

/** Outlined geometry uses its family's ink, rather than a second colour. */
export const MARK_EDGE = true;

/** One opaque tint of a family's colour, the same over every background. */
export function familyWash(family: Family): string {
  return mix(CLAY_LOOK.page, CLAY_TONE[family].card, 0.12);
}

/** A workout card's palette: its family's clay, in the one warm ink; a done set pressed in, a shade deeper. */
export function fieldColors(family: Family): Palette {
  const { card, deep, ink } = CLAY_TONE[family];
  return {
    bg: card,
    surface: CLAY_LOOK.well,
    raised: mix(card, ink, 0.15),
    line: mix(card, ink, 0.45),
    panel: CLAY_LOOK.well,
    panelEdge: ink,
    text: ink,
    muted: mix(ink, card, 0.15),
    faint: mix(ink, card, 0.15),
    dim: mix(ink, card, 0.25),
    rise: ink,
    riseWash: mix(card, ink, 0.1),
    bend: ink,
    danger: ink,
    cloud: deep,
    // The number on a done set: the ink, on the pressed-in clay.
    ink,
    white: colors.white,
    wash: deep,
    ground: card,
  };
}

/** Mix two colours: `amount` of the way from one to the other. */
export function mix(from: string, to: string, amount: number): string {
  return `#${[1, 3, 5].map((at) => {
    const a = parseInt(from.slice(at, at + 2), 16);
    const b = parseInt(to.slice(at, at + 2), 16);
    return Math.round(a + (b - a) * amount).toString(16).padStart(2, "0");
  }).join("")}`;
}

/**
 * Two faces. Bebas Neue, tall and condensed, for names and headings — a long
 * exercise name stays on one line — and M PLUS Rounded, calm and soft like
 * the clay, for everything else: sentences, buttons, labels and numbers.
 * Bebas has capitals only and no italics, so it is never set as a sentence;
 * M PLUS Rounded has no italics, so the upright stands in. Custom faces
 * ignore `fontWeight` on iOS, so each weight is its own family name; `Text`
 * in `components/text.tsx` picks the right one from an ordinary
 * `fontWeight`, so most text never names a face at all.
 */
export const fonts = {
  /** Names and headings. */
  display: "BebasNeue_400Regular",
  /** Numbers: the weight, the circles, scores. */
  displayBold: "MPLUSRounded1c_800ExtraBold",
  /** Klay talking. */
  voice: "MPLUSRounded1c_500Medium",
  regular: "MPLUSRounded1c_400Regular",
  medium: "MPLUSRounded1c_500Medium",
  semibold: "MPLUSRounded1c_700Bold",
  bold: "MPLUSRounded1c_800ExtraBold",
  italic: "MPLUSRounded1c_400Regular",
  mediumItalic: "MPLUSRounded1c_500Medium",
  semiboldItalic: "MPLUSRounded1c_700Bold",
  /** The interface — tabs, buttons, chips, small labels. Reached with `<Text ui>`. */
  ui: "MPLUSRounded1c_500Medium",
  uiItalic: "MPLUSRounded1c_500Medium",
  uiMedium: "MPLUSRounded1c_500Medium",
  uiSemibold: "MPLUSRounded1c_700Bold",
  uiBold: "MPLUSRounded1c_800ExtraBold",
};

/** Soft and round, like pressed clay: cards, buttons, and the big buttons a pill. */
export const radii = {
  card: 26,
  /** Buttons and the bar. */
  button: 20,
  /** The big buttons you move on with: Start, Next, Done. */
  action: 32,
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
