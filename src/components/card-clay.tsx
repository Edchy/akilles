import { View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

/**
 * A workout's card, the same on Plan and on Today: a lump of the day's
 * clay, lit from above. (The family's shape pressed in behind the name was
 * tried, and dropped on 23 November 2026: it looked odd.)
 */

/**
 * Light falling on the clay from above: a soft sheen at the top of a card,
 * gone by `reach` of the way down. Fills its card; never takes a touch.
 */
export function ClaySheen({ id, reach = "60%" }: { id: string; reach?: `${number}%` }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, height: reach }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={`sheen-${id}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.22} />
            <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#sheen-${id})`} />
      </Svg>
    </View>
  );
}
