import { createContext, useContext, useMemo, type PropsWithChildren } from "react";

import { CLAY_CARD, colors, fieldColors, type Palette } from "@/constants/theme";
import type { Family } from "@/data/families";

/**
 * Which palette the screen is drawn in. Everywhere it is the white one; while
 * you lift, the whole screen takes the exercise's family colour, and the
 * parts that sit on it — the rest timer, the how-to button, the set circles —
 * ask here rather than reaching for `colors` directly.
 */
const FieldContext = createContext<Palette>(colors);

export const useColors = () => useContext(FieldContext);

/** Draw everything inside on the family's colour. */
export function Field({ family, children }: PropsWithChildren<{ family: Family }>) {
  const palette = useMemo(() => fieldColors(family), [family]);
  return <FieldContext.Provider value={palette}>{children}</FieldContext.Provider>;
}

/** The mobility card: ink on the clay pictures' white (see `CLAY_CARD`). */
// No ground of its own: the card's white-to-grey shows through (see `ClayGround`).
const CLAY_PALETTE: Palette = { ...colors, bg: CLAY_CARD.top, ground: "transparent" };
export function ClayField({ children }: PropsWithChildren) {
  return <FieldContext.Provider value={CLAY_PALETTE}>{children}</FieldContext.Provider>;
}

/** Back to white: a sheet slides up over a coloured field, but is white itself. */
export function Plain({ children }: PropsWithChildren) {
  return <FieldContext.Provider value={colors}>{children}</FieldContext.Provider>;
}
