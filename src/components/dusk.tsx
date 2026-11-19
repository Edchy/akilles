import { View } from "react-native";
import Svg, { Defs, LinearGradient, Rect, Stop } from "react-native-svg";

import { Mark } from "@/components/mark";
import { CLAY_CARD, DUSK } from "@/constants/theme";
import type { Family } from "@/data/families";

/**
 * Behind a dusk card's words: the family's colour running down to near-black,
 * and, where there is room for it, the family's shape big off the top right,
 * glowing faintly. Lies under everything and never takes a touch. The parent
 * clips it to its own corners.
 */
export function DuskGround({ family, shape = 0 }: { family: Family; /** The shape's size; 0 for none. */ shape?: number }) {
  const { top, foot, glow } = DUSK[family];
  const id = `dusk-${family}`;
  return (
    <View pointerEvents="none" style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}>
      <Svg width="100%" height="100%">
        <Defs>
          <LinearGradient id={id} x1="0.2" y1="0" x2="0.5" y2="1">
            <Stop offset="0" stopColor={top} />
            <Stop offset="0.75" stopColor={foot} />
          </LinearGradient>
        </Defs>
        <Rect x="0" y="0" width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
      {shape > 0 ? (
        <View
          style={{
            position: "absolute",
            top: shape * 0.35,
            right: -shape * 0.25,
            opacity: 0.24,
            transform: [{ rotate: "12deg" }],
            shadowColor: glow,
            shadowOpacity: 0.9,
            shadowRadius: 24,
            shadowOffset: { width: 0, height: 0 },
          }}
        >
          <Mark family={family} size={shape} color={glow} plain />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Behind the mobility card: the clay pictures' white, darkening softly to a
 * pale grey at the foot — the dusk cards' fall of light, in daylight.
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
