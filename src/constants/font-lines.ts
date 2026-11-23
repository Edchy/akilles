/**
 * How tall a line each font needs, as a share of its size, so iOS never cuts
 * the tops off its letters. iOS keeps the foot of a line too short for its
 * font and cuts what rises above it — the tops of a 7.5 set in a rounded face on a
 * line exactly its size. Measured from the fonts by `art/font-lines.py`: the
 * font's descent plus its tallest letter or figure, and a hair more.
 * Used by `Text` (components/text.tsx); a font missing here is left alone.
 */
export const LINE: Record<string, number> = {
  BebasNeue_400Regular: 1.03,
  MPLUSRounded1c_400Regular: 1.09,
  MPLUSRounded1c_500Medium: 1.09,
  MPLUSRounded1c_700Bold: 1.09,
  MPLUSRounded1c_800ExtraBold: 1.09,
};
