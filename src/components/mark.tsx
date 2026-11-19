import type { ReactNode } from "react";
import { View } from "react-native";
import Svg, { Circle, G, Path, Polygon, Rect } from "react-native-svg";

import { FAMILY, MARK_EDGE } from "@/constants/theme";
import type { Family } from "@/data/families";

/**
 * The family's shape: push a triangle pointing away, pull one pointing back,
 * legs the square base, core the circle at the centre, cardio a diamond on
 * the move, a stretch a quarter-circle sweep. A goal is a star: something to
 * reach for, not a lift.
 *
 * Six solid primitives on one 48-unit grid, each sized to carry the same
 * visual weight — a circle is drawn a little larger than a square to look the
 * same size. Drawn as SVG, so a pastel shape can carry its fine ink edge
 * (`MARK_EDGE`) and stays crisp at any size.
 */
export function Mark({
  family,
  size,
  color,
  plain,
}: {
  family: Family;
  size: number;
  /** Used by unoutlined palettes; outlined symbols keep their family fill. */
  color?: string;
  /** Drawn solid in `color` with no edge, whatever the palette: a watermark. */
  plain?: boolean;
}) {
  const { mark } = FAMILY[family];
  const edged = MARK_EDGE && !plain;
  // Strong family fills stay distinct against the softer coloured cards.
  const c = edged ? mark : (color ?? mark);
  // The edge stays about one point at any size; the shape draws in by half of
  // it, so the edge is never cut off at the frame.
  const edge = edged ? Math.max(1, size / 24) * (48 / size) : 0;
  const k = (48 - edge) / 48;
  const paint = { fill: c, stroke: edged ? mark : undefined, strokeWidth: edge || undefined, strokeLinejoin: "round" as const };

  let shape: ReactNode;
  switch (family) {
    case "full":
      // Push, pull and legs together, small — a bit of everything.
      shape = (
        <>
          <Polygon points="2,22 12,4 22,22" {...paint} />
          <Polygon points="26,4 46,4 36,22" {...paint} />
          <Rect x={15} y={27} width={18} height={18} {...paint} />
        </>
      );
      break;
    case "goal":
      shape = <Polygon points={STAR} {...paint} />;
      break;
    case "push":
      shape = <Polygon points="3,38 45,38 24,1" {...paint} />;
      break;
    case "pull":
      shape = <Polygon points="3,10 45,10 24,47" {...paint} />;
      break;
    case "legs":
      shape = <Rect x={6.5} y={6.5} width={35} height={35} {...paint} />;
      break;
    case "core":
      shape = <Circle cx={24} cy={24} r={19} {...paint} />;
      break;
    case "cardio":
      // A square on its point: 44 units corner to corner.
      shape = <Polygon points="24,2 46,24 24,46 2,24" {...paint} />;
      break;
    case "mobility":
      shape = <Path d="M9 39 L9 3 A36 36 0 0 1 45 39 Z" {...paint} />;
      break;
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <G transform={`translate(${edge / 2} ${edge / 2}) scale(${k})`}>{shape}</G>
      </Svg>
    </View>
  );
}

/** A five-point star on the 48 grid, its points on a circle of radius 22. */
export const STAR =
  "24,3 29.6,18.2 45.9,18.9 33.1,29 37.5,44.6 24,35.6 10.5,44.6 14.9,29 2.1,18.9 18.4,18.2";
