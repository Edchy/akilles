import { View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { CLAY_CARD } from "@/constants/theme";

/**
 * Behind the mobility card: the clay pictures' white, darkening softly to a
 * pale grey at the foot — a soft fall of light.
 */
export function ClayGround({ corner = 0, from = 0.62 }: { corner?: number; /** Where the grey starts, 0–1 down. */ from?: number }) {
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id="clay-card" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={CLAY_CARD.top} />
            <Stop offset={String(from)} stopColor={CLAY_CARD.top} />
            <Stop offset="1" stopColor={CLAY_CARD.foot} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" rx={corner} ry={corner} fill="url(#clay-card)" />
      </Svg>
    </View>
  );
}
