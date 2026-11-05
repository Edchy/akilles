import { View, type ViewStyle } from "react-native";
import Svg, { Polygon } from "react-native-svg";

import { FAMILY } from "@/constants/theme";
import type { Family } from "@/data/families";

/**
 * The family's shape: push a triangle pointing away, pull one pointing back,
 * legs the square base, core the circle at the centre, cardio a diamond on
 * the move, a stretch a quarter-circle sweep. A goal is a star: something to
 * reach for, not a lift.
 *
 * Six solid primitives on one 48-unit grid, each sized to carry the same
 * visual weight — a circle is drawn a little larger than a square to look the
 * same size. Plain views (a border, a radius, a turn), so they need nothing
 * beyond React Native and are crisp at any size.
 */
export function Mark({
  family,
  size,
  color,
}: {
  family: Family;
  size: number;
  /** Defaults to the family's colour on white. */
  color?: string;
}) {
  const c = color ?? FAMILY[family].mark;
  const u = size / 48;

  // Five points don't fall out of a border and a turn, so the star is drawn.
  if (family === "goal") {
    return (
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={{ width: size, height: size }}
      >
        <Svg width={size} height={size} viewBox="0 0 48 48">
          <Polygon points={STAR} fill={c} />
        </Svg>
      </View>
    );
  }

  let shape: ViewStyle;
  switch (family) {
    case "push":
    case "pull":
      shape = {
        left: 3 * u,
        top: (family === "push" ? 1 : 10) * u,
        width: 0,
        height: 0,
        borderLeftWidth: 21 * u,
        borderRightWidth: 21 * u,
        borderLeftColor: "transparent",
        borderRightColor: "transparent",
        ...(family === "push"
          ? { borderBottomWidth: 37 * u, borderBottomColor: c }
          : { borderTopWidth: 37 * u, borderTopColor: c }),
      };
      break;
    case "legs":
      shape = { left: 6.5 * u, top: 6.5 * u, width: 35 * u, height: 35 * u, backgroundColor: c };
      break;
    case "core":
      shape = { left: 5 * u, top: 5 * u, width: 38 * u, height: 38 * u, borderRadius: 19 * u, backgroundColor: c };
      break;
    case "cardio": {
      // A square on its point: 44 units corner to corner.
      const side = 44 / Math.SQRT2;
      shape = {
        left: ((48 - side) / 2) * u,
        top: ((48 - side) / 2) * u,
        width: side * u,
        height: side * u,
        backgroundColor: c,
        transform: [{ rotate: "45deg" }],
      };
      break;
    }
    case "mobility":
      shape = { left: 9 * u, top: 3 * u, width: 36 * u, height: 36 * u, borderTopRightRadius: 36 * u, backgroundColor: c };
      break;
  }

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size }}
    >
      <View style={[{ position: "absolute" }, shape]} />
    </View>
  );
}

/** A five-point star on the 48 grid, its points on a circle of radius 22. */
export const STAR =
  "24,3 29.6,18.2 45.9,18.9 33.1,29 37.5,44.6 24,35.6 10.5,44.6 14.9,29 2.1,18.9 18.4,18.2";
